import uuid
from typing import Optional
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from app.database import Base


class FileModel(Base):
    """
    Database model representing an uploaded geospatial file record.
    """
    __tablename__ = "files"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    filename = Column(String(255), nullable=False)
    stored_filename = Column(String(255), nullable=False, unique=True)
    file_type = Column(String(10), nullable=False)  # 'kml' or 'zip'
    file_size = Column(Integer, nullable=False)  # Size in bytes
    feature_count = Column(Integer, nullable=False, default=0)
    processed_features = Column(Integer, nullable=False, default=0)
    successful_measurements = Column(Integer, nullable=False, default=0)
    failed_measurements = Column(Integer, nullable=False, default=0)
    unsupported_geometries = Column(Integer, nullable=False, default=0)
    source_crs = Column(String(100), nullable=True)
    status = Column(String(20), nullable=False, default="PROCESSING", index=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    @property
    def crs(self) -> Optional[str]:
        return self.source_crs

    # 1 -> Many relationship with MeasurementModel
    measurements = relationship(
        "MeasurementModel",
        back_populates="file",
        cascade="all, delete-orphan",
        order_by="MeasurementModel.feature_index"
    )


class MeasurementModel(Base):
    """
    Database model representing measurement results for an individual geometry feature.
    """
    __tablename__ = "measurements"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    file_id = Column(String(36), ForeignKey("files.id", ondelete="CASCADE"), nullable=False, index=True)
    feature_index = Column(Integer, nullable=False)
    geometry_type = Column(String(50), nullable=False)
    properties = Column(JSON, nullable=True)
    area = Column(Float, nullable=True)
    length = Column(Float, nullable=True)
    measurement_unit = Column(String(20), nullable=True)
    measurement_status = Column(String(30), nullable=False, default="COMPLETED", index=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    @property
    def feature_id(self) -> int:
        return self.feature_index

    @property
    def unit(self) -> Optional[str]:
        return self.measurement_unit

    @property
    def status(self) -> str:
        return self.measurement_status

    file = relationship("FileModel", back_populates="measurements")
