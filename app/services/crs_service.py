import logging
from typing import Optional, Tuple
from pyproj import CRS, Transformer
from shapely.geometry import base
from shapely.ops import transform

logger = logging.getLogger(__name__)


class CRSService:
    """
    Service responsible for detecting CRS, evaluating geographic vs projected coordinate systems,
    inferring missing CRS based on coordinate bounds, and transforming geometries into appropriate
    projected Coordinate Reference Systems (e.g., UTM) prior to metric measurement calculation.
    """

    @staticmethod
    def parse_crs(crs_input: Optional[object]) -> Tuple[Optional[CRS], Optional[str], Optional[str]]:
        """
        Parses a PyProj CRS from various inputs (str, dict, fiona CRS, pyproj CRS, EPSG code).
        Returns (pyproj_crs, crs_string, error_message).
        """
        if crs_input is None:
            return None, None, "CRS metadata is missing."

        try:
            if isinstance(crs_input, CRS):
                crs = crs_input
            elif isinstance(crs_input, str):
                crs = CRS.from_user_input(crs_input)
            elif isinstance(crs_input, dict):
                crs = CRS.from_dict(crs_input)
            else:
                crs = CRS.from_user_input(str(crs_input))

            epsg_str = f"EPSG:{crs.to_epsg()}" if crs.to_epsg() else crs.name
            return crs, epsg_str, None
        except Exception as e:
            logger.warning(f"Failed to parse CRS input '{crs_input}': {str(e)}")
            return None, str(crs_input), f"Invalid or unrecognized CRS format: {str(e)}"

    @staticmethod
    def is_geographic(crs: CRS) -> bool:
        """
        Checks if a PyProj CRS represents a geographic coordinate system (e.g., degrees lat/lon).
        """
        return crs.is_geographic

    @staticmethod
    def validate_and_infer_missing_crs(geom: base.BaseGeometry) -> Tuple[Optional[CRS], Optional[str], Optional[str]]:
        """
        Infers CRS when CRS metadata is missing by inspecting geometry coordinate bounds.
        If all coordinates fall strictly within WGS84 limits [-180..180, -90..90],
        infers EPSG:4326 with a warning. Otherwise returns a clear error.
        """
        if geom is None or geom.is_empty:
            return None, None, "Cannot infer CRS for empty geometry."

        minx, miny, maxx, maxy = geom.bounds

        # Check if coordinates lie strictly within geographic lat/lon degree bounds
        if -180.0 <= minx <= 180.0 and -180.0 <= maxx <= 180.0 and -90.0 <= miny <= 90.0 and -90.0 <= maxy <= 90.0:
            inferred_crs = CRS.from_epsg(4326)
            warning_msg = (
                f"Missing CRS metadata: Inferred EPSG:4326 (WGS84) because coordinate bounds "
                f"[{minx:.4f}, {miny:.4f}, {maxx:.4f}, {maxy:.4f}] fall within geographic ranges [-180..180, -90..90]."
            )
            logger.info(warning_msg)
            return inferred_crs, "EPSG:4326 (Inferred)", warning_msg
        else:
            error_msg = (
                f"Missing CRS metadata and coordinate bounds [{minx:.4f}, {miny:.4f}, {maxx:.4f}, {maxy:.4f}] "
                f"exceed geographic limits [-180..180, -90..90]. Cannot infer CRS without explicit .prj/CRS definition."
            )
            logger.error(error_msg)
            return None, "UNKNOWN", error_msg

    @classmethod
    def get_utm_projected_crs(cls, lon: float, lat: float) -> Tuple[CRS, str]:
        """
        Determines the appropriate Universal Transverse Mercator (UTM) projected CRS for a geographic point.
        Zone formula: Zone = floor((lon + 180) / 6) + 1
        EPSG: 32600 + zone for Northern Hemisphere, 32700 + zone for Southern Hemisphere.
        """
        zone = int((lon + 180) / 6) + 1
        # Clamp zone between 1 and 60
        zone = max(1, min(60, zone))

        if lat >= 0:
            epsg_code = 32600 + zone
        else:
            epsg_code = 32700 + zone

        target_crs = CRS.from_epsg(epsg_code)
        return target_crs, f"EPSG:{epsg_code}"

    @classmethod
    def transform_geometry_to_projected(
        cls,
        geom: base.BaseGeometry,
        source_crs: Optional[CRS]
    ) -> Tuple[base.BaseGeometry, str, Optional[str]]:
        """
        Transforms a geometry into an appropriate projected CRS suitable for distance/area calculation.
        NEVER calculates metric measurements directly in geographic degrees.

        Returns (projected_geometry, target_crs_name, warning_or_error_message).
        """
        if geom is None or geom.is_empty:
            return geom, "UNKNOWN", "Geometry is empty or null."

        effective_crs = source_crs
        crs_warning = None

        # Step 1: Handle missing source CRS
        if effective_crs is None:
            inferred_crs, _, infer_msg = cls.validate_and_infer_missing_crs(geom)
            if inferred_crs is None:
                # Failed CRS inference
                return geom, "UNKNOWN", infer_msg
            effective_crs = inferred_crs
            crs_warning = infer_msg

        # Step 2: Check if CRS is geographic (e.g., EPSG:4326)
        if cls.is_geographic(effective_crs):
            # Calculate geometry centroid to determine UTM zone
            centroid = geom.centroid
            lon, lat = centroid.x, centroid.y

            target_projected_crs, target_crs_name = cls.get_utm_projected_crs(lon, lat)

            try:
                # Create coordinate transformer (always_xy=True ensures lon/lat -> x/y order)
                transformer = Transformer.from_crs(effective_crs, target_projected_crs, always_xy=True)

                import numpy as np
                import shapely

                def transform_coords(coords):
                    x, y = transformer.transform(coords[:, 0], coords[:, 1])
                    return np.column_stack((x, y))

                if hasattr(shapely, "transform"):
                    projected_geom = shapely.transform(geom, transform_coords)
                else:
                    projected_geom = transform(transformer.transform, geom)

                info_msg = crs_warning or f"Transformed geographic coordinates ({effective_crs.to_epsg() or 'WGS84'}) to projected {target_crs_name} based on centroid ({lon:.4f}, {lat:.4f})."
                return projected_geom, target_crs_name, info_msg
            except Exception as e:
                err_msg = f"Failed to transform geometry from {effective_crs.name} to {target_crs_name}: {str(e)}"
                logger.error(err_msg)
                return geom, "TRANSFORMATION_FAILED", err_msg

        else:
            # Source CRS is already a projected coordinate system
            source_epsg = f"EPSG:{effective_crs.to_epsg()}" if effective_crs.to_epsg() else effective_crs.name
            return geom, source_epsg, crs_warning
