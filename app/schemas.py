from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class HealthResponse(BaseModel):
    """
    Schema for GET /health endpoint.
    """
    status: str = Field(..., json_schema_extra={"example": "ok"})


class FileUploadResponse(BaseModel):
    """
    Schema for POST /api/files/ response.
    """
    id: str
    filename: str
    stored_filename: str
    file_type: str
    file_size: int
    feature_count: int
    processed_features: int = 0
    successful_measurements: int = 0
    failed_measurements: int = 0
    unsupported_geometries: int = 0
    source_crs: Optional[str] = None
    crs: Optional[str] = None
    status: str
    error_message: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class FileInfoResponse(BaseModel):
    """
    Schema for GET /api/files/{id}/ response.
    """
    id: str
    filename: str
    stored_filename: str
    file_type: str
    file_size: int
    feature_count: int
    processed_features: int = 0
    successful_measurements: int = 0
    failed_measurements: int = 0
    unsupported_geometries: int = 0
    source_crs: Optional[str] = None
    crs: Optional[str] = None
    status: str
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MeasurementItem(BaseModel):
    """
    Schema for individual feature measurement result.
    """
    id: str
    feature_index: int
    feature_id: Optional[int] = None
    geometry_type: str
    properties: Optional[Dict[str, Any]] = None
    area: Optional[float] = None
    length: Optional[float] = None
    measurement_unit: Optional[str] = None
    unit: Optional[str] = None
    measurement_status: str
    status: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MeasurementListResponse(BaseModel):
    """
    Schema for GET /api/files/{id}/measurements/ response.
    """
    file_id: str
    filename: str
    total_features: int
    measurements: List[MeasurementItem]

    model_config = ConfigDict(from_attributes=True)


class ErrorResponse(BaseModel):
    """
    Standardized API error response schema.
    """
    detail: str
