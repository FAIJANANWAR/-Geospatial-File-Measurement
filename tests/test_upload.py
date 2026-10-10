import os
import pytest
from fastapi import status


def test_upload_valid_kml(client, sample_dir):
    """
    Tests POST /api/files/ with valid KML file.
    """
    kml_path = os.path.join(sample_dir, "polygon.kml")
    with open(kml_path, "rb") as f:
        response = client.post(
            "/api/files/",
            files={"file": ("polygon.kml", f, "application/vnd.google-earth.kml+xml")}
        )

    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert "id" in data
    assert data["filename"] == "polygon.kml"
    assert data["file_type"] == "kml"
    assert data["status"] == "COMPLETED"
    assert data["feature_count"] == 1
    assert "EPSG:4326" in data["source_crs"]


def test_upload_valid_shapefile_zip(client, sample_dir):
    """
    Tests POST /api/files/ with valid Shapefile ZIP archive.
    """
    zip_path = os.path.join(sample_dir, "shapefile_sample.zip")
    with open(zip_path, "rb") as f:
        response = client.post(
            "/api/files/",
            files={"file": ("shapefile_sample.zip", f, "application/zip")}
        )

    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert "id" in data
    assert data["filename"] == "shapefile_sample.zip"
    assert data["file_type"] == "zip"
    assert data["status"] == "COMPLETED"
    assert data["feature_count"] == 2


def test_upload_invalid_extension(client):
    """
    Tests POST /api/files/ rejects file with unsupported extension (e.g. .pdf).
    """
    response = client.post(
        "/api/files/",
        files={"file": ("document.pdf", b"%PDF-1.4 content", "application/pdf")}
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    data = response.json()
    assert "Unsupported file extension" in data["detail"]


def test_upload_empty_file(client):
    """
    Tests POST /api/files/ rejects 0-byte empty file upload.
    """
    response = client.post(
        "/api/files/",
        files={"file": ("empty.kml", b"", "application/vnd.google-earth.kml+xml")}
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    data = response.json()
    assert "Uploaded file is empty" in data["detail"]


def test_upload_oversized_file(client, monkeypatch):
    """
    Tests POST /api/files/ rejects file exceeding MAX_FILE_SIZE_MB limit.
    """
    from app.config import settings
    # Temporarily set max file size limit to 0 MB for test
    monkeypatch.setattr(settings, "MAX_FILE_SIZE_MB", 0)

    response = client.post(
        "/api/files/",
        files={"file": ("large.kml", b"Dummy KML content", "application/vnd.google-earth.kml+xml")}
    )

    assert response.status_code == getattr(status, "HTTP_413_CONTENT_TOO_LARGE", 413)
    data = response.json()
    assert "exceeds maximum allowed limit" in data["detail"]
