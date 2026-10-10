import os
import uuid
from fastapi import status


def test_get_file_info_success(client, sample_dir):
    """
    Tests GET /api/files/{id}/ returns file metadata summary.
    """
    kml_path = os.path.join(sample_dir, "polygon.kml")
    with open(kml_path, "rb") as f:
        upload_res = client.post(
            "/api/files/",
            files={"file": ("polygon.kml", f, "application/vnd.google-earth.kml+xml")}
        )

    file_id = upload_res.json()["id"]

    res = client.get(f"/api/files/{file_id}/")
    assert res.status_code == status.HTTP_200_OK
    data = res.json()

    assert data["id"] == file_id
    assert data["filename"] == "polygon.kml"
    assert data["file_type"] == "kml"
    assert data["feature_count"] == 1
    assert data["processed_features"] == 1
    assert data["successful_measurements"] == 1
    assert data["failed_measurements"] == 0
    assert data["unsupported_geometries"] == 0
    assert data["status"] == "COMPLETED"
    assert data["crs"] is not None
    assert "created_at" in data
    assert "updated_at" in data


def test_get_file_measurements_success(client, sample_dir):
    """
    Tests GET /api/files/{id}/measurements/ returns 200 with measurements array and aliases.
    """
    kml_path = os.path.join(sample_dir, "polygon.kml")
    with open(kml_path, "rb") as f:
        upload_res = client.post(
            "/api/files/",
            files={"file": ("polygon.kml", f, "application/vnd.google-earth.kml+xml")}
        )

    file_id = upload_res.json()["id"]

    res = client.get(f"/api/files/{file_id}/measurements/")
    assert res.status_code == status.HTTP_200_OK
    data = res.json()
    assert data["file_id"] == file_id
    assert data["filename"] == "polygon.kml"
    assert data["total_features"] == 1
    assert len(data["measurements"]) == 1

    m = data["measurements"][0]
    assert m["feature_index"] == 0
    assert m["feature_id"] == 0
    assert m["geometry_type"] == "Polygon"
    assert m["area"] > 0
    assert m["measurement_unit"] == "m²"
    assert m["unit"] == "m²"
    assert m["measurement_status"] == "COMPLETED"
    assert m["status"] == "COMPLETED"


def test_get_file_info_not_found(client):
    """
    Tests GET /api/files/{id}/ returns 404 NOT FOUND for non-existent file ID.
    """
    random_id = str(uuid.uuid4())
    res = client.get(f"/api/files/{random_id}/")
    assert res.status_code == status.HTTP_404_NOT_FOUND
    data = res.json()
    assert f"Geospatial file with ID '{random_id}' not found." in data["detail"]


def test_get_file_measurements_not_found(client):
    """
    Tests GET /api/files/{id}/measurements/ returns 404 NOT FOUND for non-existent file ID.
    """
    random_id = str(uuid.uuid4())
    res = client.get(f"/api/files/{random_id}/measurements/")
    assert res.status_code == status.HTTP_404_NOT_FOUND
    data = res.json()
    assert f"Geospatial file with ID '{random_id}' not found." in data["detail"]
