import logging
from typing import Any, Dict, Optional
from shapely.geometry import base
from pyproj import CRS
from app.services.crs_service import CRSService
from app.utils.geometry import validate_and_repair_geometry, get_normalized_geometry_type

logger = logging.getLogger(__name__)


class FeatureMeasurementResult:
    """
    Data container for individual feature measurement outcome.
    """
    def __init__(
        self,
        feature_index: int,
        geometry_type: str,
        properties: Optional[Dict[str, Any]],
        area: Optional[float] = None,
        length: Optional[float] = None,
        measurement_unit: Optional[str] = None,
        measurement_status: str = "COMPLETED",
        error_message: Optional[str] = None,
        projected_crs: Optional[str] = None
    ):
        self.feature_index = feature_index
        self.geometry_type = geometry_type
        self.properties = properties or {}
        self.area = round(area, 4) if area is not None else None
        self.length = round(length, 4) if length is not None else None
        self.measurement_unit = measurement_unit
        self.measurement_status = measurement_status
        self.error_message = error_message
        self.projected_crs = projected_crs


class MeasurementService:
    """
    Dedicated service for calculating geometric measurements (Polygon area, LineString length)
    after invoking CRS transformation to projected coordinate space.
    """

    @classmethod
    def process_feature(
        cls,
        feature_index: int,
        raw_geom: base.BaseGeometry,
        properties: Optional[Dict[str, Any]],
        source_crs: Optional[CRS]
    ) -> FeatureMeasurementResult:
        """
        Processes a single feature independently.
        Ensures isolated error handling per feature so one malformed feature does not halt file processing.
        """
        properties = properties or {}

        if raw_geom is None or raw_geom.is_empty:
            return FeatureMeasurementResult(
                feature_index=feature_index,
                geometry_type="Unknown",
                properties=properties,
                measurement_status="FAILED",
                error_message="Feature contains empty or missing geometry."
            )

        # Step 1: Validate and attempt safe repair of invalid geometry
        repaired_geom, was_repaired, repair_msg = validate_and_repair_geometry(raw_geom)
        geom_type = get_normalized_geometry_type(repaired_geom)

        # Step 2: Branch based on geometry type
        try:
            if geom_type in ("Polygon", "MultiPolygon"):
                # Transform to projected CRS before calculating area
                projected_geom, target_crs_name, crs_info = CRSService.transform_geometry_to_projected(
                    repaired_geom, source_crs
                )

                if target_crs_name in ("UNKNOWN", "TRANSFORMATION_FAILED"):
                    return FeatureMeasurementResult(
                        feature_index=feature_index,
                        geometry_type=geom_type,
                        properties=properties,
                        measurement_status="FAILED",
                        error_message=crs_info or "CRS transformation failed for polygon area measurement.",
                        projected_crs=target_crs_name
                    )

                calculated_area = float(projected_geom.area)
                err_msg = repair_msg if was_repaired else None

                return FeatureMeasurementResult(
                    feature_index=feature_index,
                    geometry_type=geom_type,
                    properties=properties,
                    area=calculated_area,
                    measurement_unit="m²",
                    measurement_status="COMPLETED",
                    error_message=err_msg,
                    projected_crs=target_crs_name
                )

            elif geom_type in ("LineString", "MultiLineString"):
                # Transform to projected CRS before calculating length
                projected_geom, target_crs_name, crs_info = CRSService.transform_geometry_to_projected(
                    repaired_geom, source_crs
                )

                if target_crs_name in ("UNKNOWN", "TRANSFORMATION_FAILED"):
                    return FeatureMeasurementResult(
                        feature_index=feature_index,
                        geometry_type=geom_type,
                        properties=properties,
                        measurement_status="FAILED",
                        error_message=crs_info or "CRS transformation failed for linestring length measurement.",
                        projected_crs=target_crs_name
                    )

                length_meters = float(projected_geom.length)

                # Return in km if length >= 1000m, otherwise m
                if length_meters >= 1000.0:
                    length_val = length_meters / 1000.0
                    unit_str = "km"
                else:
                    length_val = length_meters
                    unit_str = "m"

                err_msg = repair_msg if was_repaired else None

                return FeatureMeasurementResult(
                    feature_index=feature_index,
                    geometry_type=geom_type,
                    properties=properties,
                    length=length_val,
                    measurement_unit=unit_str,
                    measurement_status="COMPLETED",
                    error_message=err_msg,
                    projected_crs=target_crs_name
                )

            elif geom_type in ("Point", "MultiPoint"):
                # Points do not require length/area measurements
                return FeatureMeasurementResult(
                    feature_index=feature_index,
                    geometry_type=geom_type,
                    properties=properties,
                    measurement_status="NOT_REQUIRED",
                    error_message=None
                )

            else:
                # Unsupported geometry type (e.g. GeometryCollection)
                return FeatureMeasurementResult(
                    feature_index=feature_index,
                    geometry_type=geom_type,
                    properties=properties,
                    measurement_status="UNSUPPORTED",
                    error_message=f"Measurement not supported for geometry type '{geom_type}'."
                )

        except Exception as e:
            logger.error(f"Error measuring feature index {feature_index}: {str(e)}")
            return FeatureMeasurementResult(
                feature_index=feature_index,
                geometry_type=geom_type,
                properties=properties,
                measurement_status="FAILED",
                error_message=f"Unhandled measurement error: {str(e)}"
            )
