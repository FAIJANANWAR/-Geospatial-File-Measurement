import logging
from typing import Tuple, Optional
from shapely.geometry import base, shape
from shapely.validation import make_valid

logger = logging.getLogger(__name__)


def validate_and_repair_geometry(geom: base.BaseGeometry) -> Tuple[base.BaseGeometry, bool, Optional[str]]:
    """
    Validates a Shapely geometry and attempts safe repair if invalid.
    Returns (repaired_geometry, was_repaired, repair_message).
    """
    if geom is None or geom.is_empty:
        return geom, False, "Geometry is empty or null."

    if geom.is_valid:
        return geom, False, None

    # Attempt safe repair for invalid geometry (e.g. self-intersecting polygon)
    try:
        repaired_geom = make_valid(geom)
        repair_msg = "Geometry was invalid (e.g. self-intersection) and was safely repaired using shapely.make_valid."
        logger.warning(f"Repaired invalid geometry: {geom.geom_type}")
        return repaired_geom, True, repair_msg
    except Exception as e:
        logger.error(f"Failed to repair geometry: {str(e)}")
        return geom, False, f"Geometry invalid and repair failed: {str(e)}"


def get_normalized_geometry_type(geom: base.BaseGeometry) -> str:
    """
    Returns the normalized geometry type string (e.g. 'Polygon', 'LineString', 'Point').
    """
    if geom is None or geom.is_empty:
        return "Unknown"
    return geom.geom_type
