import os
from fastapi import status


def test_polygon_area_measurement(client, sample_dir):
    """
    Tests Polygon area measurement calculation in projected CRS (m²).
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
    assert data["total_features"] == 1
    m = data["measurements"][0]

    assert m["geometry_type"] == "Polygon"
    assert m["measurement_status"] == "COMPLETED"
    assert m["area"] is not None
    assert m["area"] > 0
    assert m["measurement_unit"] == "m²"
    assert m["length"] is None


def test_linestring_length_measurement(client, sample_dir):
    """
    Tests LineString length measurement calculation in projected CRS (m or km).
    """
    kml_path = os.path.join(sample_dir, "linestring.kml")
    with open(kml_path, "rb") as f:
        upload_res = client.post(
            "/api/files/",
            files={"file": ("linestring.kml", f, "application/vnd.google-earth.kml+xml")}
        )

    file_id = upload_res.json()["id"]

    res = client.get(f"/api/files/{file_id}/measurements/")
    assert res.status_code == status.HTTP_200_OK
    data = res.json()
    assert data["total_features"] == 1
    m = data["measurements"][0]

    assert m["geometry_type"] == "LineString"
    assert m["measurement_status"] == "COMPLETED"
    assert m["length"] is not None
    assert m["length"] > 0
    assert m["measurement_unit"] in ("m", "km")
    assert m["area"] is None


def test_point_measurement_not_required(client, sample_dir):
    """
    Tests Point feature returns measurement_status = 'NOT_REQUIRED'.
    """
    kml_path = os.path.join(sample_dir, "point.kml")
    with open(kml_path, "rb") as f:
        upload_res = client.post(
            "/api/files/",
            files={"file": ("point.kml", f, "application/vnd.google-earth.kml+xml")}
        )

    file_id = upload_res.json()["id"]

    res = client.get(f"/api/files/{file_id}/measurements/")
    assert res.status_code == status.HTTP_200_OK
    data = res.json()
    assert data["total_features"] == 1
    m = data["measurements"][0]

    assert m["geometry_type"] == "Point"
    assert m["measurement_status"] == "NOT_REQUIRED"
    assert m["area"] is None
    assert m["length"] is None
    assert m["measurement_unit"] is None


def test_mixed_feature_collection(client, sample_dir):
    """
    Tests processing a file containing Polygon, LineString, and Point features.
    """
    kml_path = os.path.join(sample_dir, "mixed.kml")
    with open(kml_path, "rb") as f:
        upload_res = client.post(
            "/api/files/",
            files={"file": ("mixed.kml", f, "application/vnd.google-earth.kml+xml")}
        )

    file_id = upload_res.json()["id"]

    res = client.get(f"/api/files/{file_id}/measurements/")
    assert res.status_code == status.HTTP_200_OK
    data = res.json()
    assert data["total_features"] == 3

    statuses = [m["measurement_status"] for m in data["measurements"]]
    geom_types = [m["geometry_type"] for m in data["measurements"]]

    assert "Polygon" in geom_types
    assert "LineString" in geom_types
    assert "Point" in geom_types
    assert "COMPLETED" in statuses
    assert "NOT_REQUIRED" in statuses


def test_unsupported_geometry_handling():
    """
    Tests that unsupported geometry types (e.g. GeometryCollection) return status UNSUPPORTED gracefully.
    """
    from shapely.geometry import GeometryCollection, Point
    from app.services.measurement_service import MeasurementService
    from pyproj import CRS

    gc = GeometryCollection([Point(0, 0)])
    result = MeasurementService.process_feature(
        feature_index=0,
        raw_geom=gc,
        properties={"type": "collection"},
        source_crs=CRS.from_epsg(4326)
    )

    assert result.measurement_status == "UNSUPPORTED"
    assert result.area is None
    assert result.length is None
    assert "not supported" in result.error_message


def test_independent_feature_failure_resilience():
    """
    Tests that failure in one feature does not prevent remaining valid features from being processed.
    """
    from shapely.geometry import Polygon, LineString
    from app.services.measurement_service import MeasurementService
    from pyproj import CRS

    # Feature 0: Valid polygon
    res0 = MeasurementService.process_feature(
        feature_index=0,
        raw_geom=Polygon([(-122.48, 37.769), (-122.46, 37.769), (-122.46, 37.760), (-122.48, 37.760), (-122.48, 37.769)]),
        properties={"name": "Valid Polygon"},
        source_crs=CRS.from_epsg(4326)
    )
    assert res0.measurement_status == "COMPLETED"
    assert res0.area > 0

    # Feature 1: None / empty geometry that fails
    res1 = MeasurementService.process_feature(
        feature_index=1,
        raw_geom=None,
        properties={"name": "Corrupt Feature"},
        source_crs=CRS.from_epsg(4326)
    )
    assert res1.measurement_status == "FAILED"
    assert "empty or missing" in res1.error_message

    # Feature 2: Valid linestring after the failure
    res2 = MeasurementService.process_feature(
        feature_index=2,
        raw_geom=LineString([(-122.4, 37.7), (-122.41, 37.71)]),
        properties={"name": "Valid LineString"},
        source_crs=CRS.from_epsg(4326)
    )
    assert res2.measurement_status == "COMPLETED"
    assert res2.length > 0
