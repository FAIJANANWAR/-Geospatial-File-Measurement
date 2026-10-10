import os
from pyproj import CRS
from shapely.geometry import Polygon
from app.services.crs_service import CRSService


def test_geographic_crs_utm_selection():
    """
    Tests UTM zone selection strategy for geographic coordinates.
    San Francisco (lon=-122.4, lat=37.7) -> UTM Zone 10N (EPSG:32610).
    """
    target_crs, epsg_str = CRSService.get_utm_projected_crs(-122.4, 37.7)
    assert epsg_str == "EPSG:32610"
    assert target_crs.to_epsg() == 32610


def test_missing_crs_bounds_inference_valid():
    """
    Tests missing CRS is inferred as EPSG:4326 with warning when coordinates are within [-180..180, -90..90].
    """
    geom = Polygon([(-122.4, 37.7), (-122.3, 37.7), (-122.3, 37.6), (-122.4, 37.6), (-122.4, 37.7)])
    inferred_crs, crs_str, warning_msg = CRSService.validate_and_infer_missing_crs(geom)

    assert inferred_crs is not None
    assert inferred_crs.to_epsg() == 4326
    assert "EPSG:4326" in crs_str
    assert "Inferred EPSG:4326" in warning_msg


def test_missing_crs_bounds_inference_invalid():
    """
    Tests missing CRS fails with error when coordinates exceed [-180..180, -90..90] bounds.
    """
    # Coordinates in projected meters (e.g. 500000m, 4100000m)
    geom = Polygon([(500000, 4100000), (510000, 4100000), (510000, 4090000), (500000, 4090000), (500000, 4100000)])
    inferred_crs, crs_str, error_msg = CRSService.validate_and_infer_missing_crs(geom)

    assert inferred_crs is None
    assert crs_str == "UNKNOWN"
    assert "exceed geographic limits" in error_msg


def test_missing_prj_shapefile_upload(client, sample_dir):
    """
    Tests POST /api/files/ with Shapefile lacking .prj file but possessing valid lat/lon bounds.
    """
    no_prj_path = os.path.join(sample_dir, "no_prj_shapefile.zip")
    with open(no_prj_path, "rb") as f:
        res = client.post(
            "/api/files/",
            files={"file": ("no_prj_shapefile.zip", f, "application/zip")}
        )

    assert res.status_code == 201
    data = res.json()
    assert data["status"] == "COMPLETED"
    assert "EPSG:4326" in data["source_crs"]


def test_already_projected_crs():
    """
    Tests that a geometry already in a projected CRS (e.g. EPSG:32610) is preserved
    and not needlessly re-projected to another UTM zone.
    """
    projected_crs = CRS.from_epsg(32610)
    assert not CRSService.is_geographic(projected_crs)

    # Polygon in UTM Zone 10N coordinates (meters)
    geom = Polygon([(550000, 4180000), (551000, 4180000), (551000, 4179000), (550000, 4179000), (550000, 4180000)])
    proj_geom, crs_name, msg = CRSService.transform_geometry_to_projected(geom, projected_crs)

    assert crs_name == "EPSG:32610"
    assert proj_geom.equals(geom)
    assert proj_geom.area == 1000.0 * 1000.0  # Exactly 1,000,000 m²

