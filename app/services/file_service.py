import os
import shutil
import uuid
import logging
from typing import Tuple
from fastapi import UploadFile, HTTPException, status
from sqlalchemy.orm import Session

from app.config import settings
from app.models import FileModel, MeasurementModel
from app.utils.validators import (
    validate_file_extension,
    validate_file_size,
    sanitize_filename,
    safe_extract_zip,
    find_and_validate_shapefile
)
from app.services.geospatial_service import GeospatialService

logger = logging.getLogger(__name__)


class FileService:
    """
    Service layer responsible for handling file uploads, temporary file extraction,
    coordinating feature measurement parsing, and persisting records in the database.
    """

    @classmethod
    async def process_uploaded_file(cls, file: UploadFile, db: Session) -> FileModel:
        """
        Processes an incoming uploaded geospatial file (.kml or .zip).
        """
        # Validate filename and extension
        original_filename = file.filename or "uploaded_file"
        file_ext = validate_file_extension(original_filename)

        # Read contents to check file size and validate non-empty
        content = await file.read()
        file_size_bytes = len(content)
        validate_file_size(file_size_bytes)

        # Generate safe unique filename for storage
        file_uuid = str(uuid.uuid4())
        stored_filename = f"{file_uuid}.{file_ext}"
        saved_file_path = os.path.join(settings.UPLOAD_DIR, stored_filename)

        # Write uploaded file bytes safely to disk
        try:
            with open(saved_file_path, "wb") as f:
                f.write(content)
        except Exception as e:
            logger.error(f"Failed to write uploaded file to disk: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to store uploaded file: {str(e)}"
            )

        # Create initial database record with status PROCESSING
        db_file = FileModel(
            id=file_uuid,
            filename=sanitize_filename(original_filename),
            stored_filename=stored_filename,
            file_type=file_ext,
            file_size=file_size_bytes,
            feature_count=0,
            source_crs="UNKNOWN",
            status="PROCESSING",
            error_message=None
        )
        db.add(db_file)
        db.commit()
        db.refresh(db_file)

        # Process file content based on type
        temp_extract_dir = None
        try:
            if file_ext == "zip":
                temp_extract_dir = os.path.join(settings.PROCESSED_DIR, file_uuid)
                os.makedirs(temp_extract_dir, exist_ok=True)

                # Safely extract ZIP archive
                safe_extract_zip(saved_file_path, temp_extract_dir)

                # Find main .shp file and check for required components (.shx, .dbf)
                shp_path, _ = find_and_validate_shapefile(temp_extract_dir)

                processed_data = GeospatialService.process_file(shp_path, "zip")
            else:
                # Process KML file
                processed_data = GeospatialService.process_file(saved_file_path, "kml")

            # Persist per-feature measurements in database
            for m in processed_data.measurements:
                db_measurement = MeasurementModel(
                    id=str(uuid.uuid4()),
                    file_id=db_file.id,
                    feature_index=m.feature_index,
                    geometry_type=m.geometry_type,
                    properties=m.properties,
                    area=m.area,
                    length=m.length,
                    measurement_unit=m.measurement_unit,
                    measurement_status=m.measurement_status,
                    error_message=m.error_message
                )
                db.add(db_measurement)

            # Compute counts and status strategy
            total_features = len(processed_data.measurements)
            successful_count = sum(1 for m in processed_data.measurements if m.measurement_status in ("COMPLETED", "NOT_REQUIRED"))
            failed_count = sum(1 for m in processed_data.measurements if m.measurement_status == "FAILED")
            unsupported_count = sum(1 for m in processed_data.measurements if m.measurement_status == "UNSUPPORTED")

            # Determine file processing status strategy
            file_status = processed_data.status
            if file_status != "FAILED":
                if failed_count > 0 and successful_count > 0:
                    file_status = "PARTIALLY_COMPLETED"
                elif failed_count > 0 and successful_count == 0 and total_features > 0:
                    file_status = "FAILED"
                else:
                    file_status = "COMPLETED"

            # Update file record status and metadata
            db_file.feature_count = total_features
            db_file.processed_features = total_features
            db_file.successful_measurements = successful_count
            db_file.failed_measurements = failed_count
            db_file.unsupported_geometries = unsupported_count
            db_file.source_crs = processed_data.source_crs_str
            db_file.status = file_status
            db_file.error_message = processed_data.error_message

            db.commit()
            db.refresh(db_file)
            return db_file

        except HTTPException as he:
            # Update file record to FAILED on HTTP exception
            db_file.status = "FAILED"
            db_file.error_message = he.detail
            db.commit()
            db.refresh(db_file)
            raise he

        except Exception as e:
            logger.error(f"Error processing file {db_file.id}: {str(e)}")
            db_file.status = "FAILED"
            db_file.error_message = str(e)
            db.commit()
            db.refresh(db_file)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"An error occurred while processing the geospatial file: {str(e)}"
            )

        finally:
            # Clean up temporary zip extraction directory
            if temp_extract_dir and os.path.exists(temp_extract_dir):
                try:
                    shutil.rmtree(temp_extract_dir)
                except Exception as e:
                    logger.warning(f"Failed to clean temp directory {temp_extract_dir}: {str(e)}")

    @staticmethod
    def get_file_by_id(file_id: str, db: Session) -> FileModel:
        """
        Retrieves file database metadata record by ID or raises 404.
        """
        file_record = db.query(FileModel).filter(FileModel.id == file_id).first()
        if not file_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Geospatial file with ID '{file_id}' not found."
            )
        return file_record

    @staticmethod
    def get_file_measurements(file_id: str, db: Session) -> Tuple[FileModel, list]:
        """
        Retrieves file metadata and feature measurements for a given file ID or raises 404.
        """
        file_record = FileService.get_file_by_id(file_id, db)
        measurements = db.query(MeasurementModel).filter(
            MeasurementModel.file_id == file_id
        ).order_by(MeasurementModel.feature_index).all()

        return file_record, measurements
