import io
import zipfile
from fastapi import status


def test_malformed_kml(client):
    """
    Tests POST /api/files/ with malformed XML syntax KML file.
    """
    malformed_content = b"<?xml version='1.0'?><kml><Document><Placemark><unclosed_tag>"
    response = client.post(
        "/api/files/",
        files={"file": ("corrupted.kml", malformed_content, "application/vnd.google-earth.kml+xml")}
    )

    # File record created with FAILED status or 400 bad request error
    assert response.status_code in (status.HTTP_201_CREATED, status.HTTP_400_BAD_REQUEST)
    data = response.json()
    if response.status_code == status.HTTP_201_CREATED:
        assert data["status"] == "FAILED"
        assert "Malformed KML" in data["error_message"] or "XML" in data["error_message"]


def test_malformed_zip(client):
    """
    Tests POST /api/files/ with corrupted non-zip bytes.
    """
    response = client.post(
        "/api/files/",
        files={"file": ("corrupted.zip", b"Not a real zip file header", "application/zip")}
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    data = response.json()
    assert "corrupted or not a valid ZIP" in data["detail"]


def test_zip_missing_shapefile_components(client):
    """
    Tests POST /api/files/ with ZIP archive containing .shp but missing mandatory .dbf / .shx components.
    """
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w") as z:
        # Include only .shp file without .shx or .dbf
        z.writestr("test.shp", b"dummy shapefile bytes")

    zip_buffer.seek(0)
    response = client.post(
        "/api/files/",
        files={"file": ("incomplete.zip", zip_buffer.getvalue(), "application/zip")}
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    data = response.json()
    assert "Missing mandatory component" in data["detail"] or "Incomplete Shapefile" in data["detail"]


def test_zip_path_traversal_zip_slip(client):
    """
    Tests POST /api/files/ blocks ZIP archive containing Zip-Slip path traversal members.
    """
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w") as z:
        # Injected path traversal member filename
        z.writestr("../../etc/passwd", b"malicious content")

    zip_buffer.seek(0)
    response = client.post(
        "/api/files/",
        files={"file": ("zip_slip.zip", zip_buffer.getvalue(), "application/zip")}
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    data = response.json()
    assert "path traversal" in data["detail"].lower()
