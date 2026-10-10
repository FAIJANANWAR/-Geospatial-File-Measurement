from fastapi import APIRouter, Depends, UploadFile, File, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import (
    FileUploadResponse,
    FileInfoResponse,
    MeasurementListResponse,
    ErrorResponse
)
from app.services.file_service import FileService

router = APIRouter(prefix="/api/files", tags=["Geospatial Files"])


@router.post(
    "/",
    response_model=FileUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload and Process Geospatial File",
    description=(
        "Upload a geospatial file (.kml or .zip containing Shapefile dataset). "
        "The application validates the file, extracts geometry features, detects or infers CRS, "
        "transforms coordinates into an appropriate projected CRS (e.g. UTM), calculates metric measurements "
        "(Polygon area in m², LineString length in m/km), and persists metadata and results."
    ),
    responses={
        400: {"model": ErrorResponse, "description": "Invalid file, unsupported extension, or missing Shapefile components."},
        413: {"model": ErrorResponse, "description": "Uploaded file exceeds maximum allowed size."},
        500: {"model": ErrorResponse, "description": "Internal server processing error."}
    }
)
async def upload_file(
    file: UploadFile = File(..., description="Geospatial file (.kml or .zip containing .shp, .shx, .dbf)"),
    db: Session = Depends(get_db)
):
    """
    Endpoint for uploading and parsing a geospatial file.
    """
    db_file = await FileService.process_uploaded_file(file, db)
    return db_file


@router.get(
    "/{id}/",
    response_model=FileInfoResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Geospatial File Metadata",
    description="Retrieve processing status and summary metadata for an uploaded geospatial file by unique file ID.",
    responses={
        404: {"model": ErrorResponse, "description": "File with the specified ID was not found."}
    }
)
def get_file_info(
    id: str,
    db: Session = Depends(get_db)
):
    """
    Endpoint for retrieving file metadata and status.
    """
    file_record = FileService.get_file_by_id(id, db)
    return file_record


@router.get(
    "/{id}/measurements/",
    response_model=MeasurementListResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Geospatial Feature Measurements",
    description=(
        "Retrieve geometric measurement results (area, length, unit, status) "
        "for every feature extracted from the specified geospatial file."
    ),
    responses={
        404: {"model": ErrorResponse, "description": "File with the specified ID was not found."}
    }
)
def get_file_measurements(
    id: str,
    db: Session = Depends(get_db)
):
    """
    Endpoint for retrieving feature measurement results for a file.
    """
    file_record, measurements = FileService.get_file_measurements(id, db)
    return {
        "file_id": file_record.id,
        "filename": file_record.filename,
        "total_features": file_record.feature_count,
        "measurements": measurements
    }
