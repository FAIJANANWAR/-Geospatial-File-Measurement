import os
import logging
import xml.etree.ElementTree as ET
from typing import List, Tuple, Optional, Dict, Any
import geopandas as gpd
from shapely.geometry import Polygon, LineString, Point, shape
from shapely.geometry.base import BaseGeometry
from pyproj import CRS
import fiona

from app.services.crs_service import CRSService
from app.services.measurement_service import MeasurementService, FeatureMeasurementResult

# Enable KML driver support in Fiona if available
try:
    fiona.drvsupport.supported_drivers['KML'] = 'rw'
    fiona.drvsupport.supported_drivers['LIBKML'] = 'rw'
except Exception:
    pass

logger = logging.getLogger(__name__)


class ProcessedFileData:
    """
    Data transfer object containing parsed file metadata and per-feature measurement results.
    """
    def __init__(
        self,
        feature_count: int,
        source_crs_str: str,
        source_crs_obj: Optional[CRS],
        measurements: List[FeatureMeasurementResult],
        status: str = "COMPLETED",
        error_message: Optional[str] = None
    ):
        self.feature_count = feature_count
        self.source_crs_str = source_crs_str
        self.source_crs_obj = source_crs_obj
        self.measurements = measurements
        self.status = status
        self.error_message = error_message


class GeospatialService:
    """
    Service responsible for reading, parsing, and extracting features from KML and Shapefile files.
    """

    @classmethod
    def process_file(cls, file_path: str, file_type: str) -> ProcessedFileData:
        """
        Main entry point for processing a geospatial file (KML or Shapefile).
        """
        if file_type.lower() == 'kml':
            return cls._process_kml(file_path)
        elif file_type.lower() == 'zip':
            return cls._process_shapefile(file_path)
        else:
            return ProcessedFileData(
                feature_count=0,
                source_crs_str="UNKNOWN",
                source_crs_obj=None,
                measurements=[],
                status="FAILED",
                error_message=f"Unsupported file type '{file_type}'."
            )

    @classmethod
    def _process_shapefile(cls, shp_path: str) -> ProcessedFileData:
        """
        Processes a Shapefile dataset using GeoPandas.
        """
        try:
            gdf = gpd.read_file(shp_path)
        except Exception as e:
            logger.error(f"Failed to read Shapefile '{shp_path}': {str(e)}")
            return ProcessedFileData(
                feature_count=0,
                source_crs_str="UNKNOWN",
                source_crs_obj=None,
                measurements=[],
                status="FAILED",
                error_message=f"Failed to parse Shapefile: {str(e)}"
            )

        if gdf.empty:
            return ProcessedFileData(
                feature_count=0,
                source_crs_str="UNKNOWN",
                source_crs_obj=None,
                measurements=[],
                status="COMPLETED",
                error_message="Shapefile contains 0 features."
            )

        # Parse CRS
        crs_obj, crs_str, crs_err = CRSService.parse_crs(gdf.crs)

        # If CRS metadata is missing from .prj, check coordinate bounds across dataset geometries
        if crs_obj is None and not gdf.empty:
            union_geom = gdf.geometry.union_all() if hasattr(gdf.geometry, 'union_all') else gdf.geometry.unary_union
            inferred_crs, inferred_str, _ = CRSService.validate_and_infer_missing_crs(union_geom)
            if inferred_crs is not None:
                crs_obj = inferred_crs
                crs_str = inferred_str

        feature_measurements = []
        for idx, row in gdf.iterrows():
            geom = row.geometry
            # Extract attribute properties excluding the geometry column
            props = {k: v for k, v in row.items() if k != gdf._geometry_column_name and not (isinstance(v, float) and (v != v))}
            # Convert non-serializable property types to str
            props_cleaned = {}
            for k, v in props.items():
                try:
                    import json
                    json.dumps(v)
                    props_cleaned[k] = v
                except Exception:
                    props_cleaned[k] = str(v)

            m_result = MeasurementService.process_feature(
                feature_index=int(idx),
                raw_geom=geom,
                properties=props_cleaned,
                source_crs=crs_obj
            )
            feature_measurements.append(m_result)

        return ProcessedFileData(
            feature_count=len(feature_measurements),
            source_crs_str=crs_str or "UNKNOWN",
            source_crs_obj=crs_obj,
            measurements=feature_measurements,
            status="COMPLETED"
        )

    @classmethod
    def _process_kml(cls, kml_path: str) -> ProcessedFileData:
        """
        Processes a KML file, trying GeoPandas first and falling back to robust XML parsing if needed.
        """
        # Strategy 1: Try GeoPandas / Fiona KML reader
        try:
            gdf = gpd.read_file(kml_path)
            if not gdf.empty:
                crs_obj, crs_str, _ = CRSService.parse_crs(gdf.crs or "EPSG:4326")
                measurements = []
                for idx, row in gdf.iterrows():
                    geom = row.geometry
                    props = {k: str(v) for k, v in row.items() if k != gdf._geometry_column_name and str(v) != 'None'}
                    m_result = MeasurementService.process_feature(
                        feature_index=int(idx),
                        raw_geom=geom,
                        properties=props,
                        source_crs=crs_obj
                    )
                    measurements.append(m_result)

                return ProcessedFileData(
                    feature_count=len(measurements),
                    source_crs_str=crs_str or "EPSG:4326",
                    source_crs_obj=crs_obj or CRS.from_epsg(4326),
                    measurements=measurements,
                    status="COMPLETED"
                )
        except Exception as e:
            logger.info(f"GeoPandas KML reader failed or driver unavailable ({str(e)}). Using XML KML parser fallback.")

        # Strategy 2: Robust XML KML fallback parser
        return cls._parse_kml_xml_fallback(kml_path)

    @classmethod
    def _parse_kml_xml_fallback(cls, kml_path: str) -> ProcessedFileData:
        """
        Fallback KML parser using Python's standard xml.etree.ElementTree and Shapely geometry constructors.
        Standard KML uses WGS84 EPSG:4326 geographic coordinates.
        """
        try:
            tree = ET.parse(kml_path)
            root = tree.getroot()
        except Exception as e:
            logger.error(f"Failed to parse KML XML structure in '{kml_path}': {str(e)}")
            return ProcessedFileData(
                feature_count=0,
                source_crs_str="UNKNOWN",
                source_crs_obj=None,
                measurements=[],
                status="FAILED",
                error_message=f"Malformed KML file XML structure: {str(e)}"
            )

        # Helper to strip XML namespace prefix, e.g. {http://www.opengis.net/kml/2.2}Placemark
        def strip_ns(tag: str) -> str:
            return tag.split('}')[-1] if '}' in tag else tag

        placemarks = []
        for elem in root.iter():
            if strip_ns(elem.tag) == 'Placemark':
                placemarks.append(elem)

        measurements = []
        kml_crs = CRS.from_epsg(4326)

        for idx, pm in enumerate(placemarks):
            # Extract Placemark properties (name, description, ExtendedData)
            name_elem = pm.find('{*}name') or pm.find('name')
            desc_elem = pm.find('{*}description') or pm.find('description')
            name = name_elem.text if name_elem is not None else f"Feature_{idx}"
            desc = desc_elem.text if desc_elem is not None else ""

            props = {"name": name, "description": desc}

            # Extract geometry
            geom = cls._extract_kml_geometry(pm)

            m_result = MeasurementService.process_feature(
                feature_index=idx,
                raw_geom=geom,
                properties=props,
                source_crs=kml_crs
            )
            measurements.append(m_result)

        return ProcessedFileData(
            feature_count=len(measurements),
            source_crs_str="EPSG:4326",
            source_crs_obj=kml_crs,
            measurements=measurements,
            status="COMPLETED"
        )

    @classmethod
    def _extract_kml_geometry(cls, pm_elem: ET.Element) -> Optional[BaseGeometry]:
        """
        Extracts Shapely geometry from a KML Placemark XML element.
        """
        def strip_ns(tag: str) -> str:
            return tag.split('}')[-1] if '}' in tag else tag

        def parse_coords(coord_str: str) -> List[Tuple[float, float]]:
            coords = []
            if not coord_str:
                return coords
            # Split coordinates by whitespace
            raw_tuples = coord_str.strip().split()
            for item in raw_tuples:
                parts = item.split(',')
                if len(parts) >= 2:
                    try:
                        lon = float(parts[0])
                        lat = float(parts[1])
                        coords.append((lon, lat))
                    except ValueError:
                        continue
            return coords

        for elem in pm_elem.iter():
            tag = strip_ns(elem.tag)

            if tag == 'Polygon':
                coords_elem = elem.find('.//{*}coordinates') or elem.find('.//coordinates')
                if coords_elem is not None and coords_elem.text:
                    pts = parse_coords(coords_elem.text)
                    if len(pts) >= 3:
                        return Polygon(pts)

            elif tag == 'LineString':
                coords_elem = elem.find('.//{*}coordinates') or elem.find('.//coordinates')
                if coords_elem is not None and coords_elem.text:
                    pts = parse_coords(coords_elem.text)
                    if len(pts) >= 2:
                        return LineString(pts)

            elif tag == 'Point':
                coords_elem = elem.find('.//{*}coordinates') or elem.find('.//coordinates')
                if coords_elem is not None and coords_elem.text:
                    pts = parse_coords(coords_elem.text)
                    if len(pts) >= 1:
                        return Point(pts[0])

        return None
