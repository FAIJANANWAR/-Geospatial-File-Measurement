# Sample Geospatial Datasets

This directory contains deterministic sample geospatial files for testing and exploring the **Geospatial File Measurement API**.

## Files Overview

| File | Type | Description | Included Features & CRS |
| :--- | :--- | :--- | :--- |
| `polygon.kml` | `.kml` | San Francisco Golden Gate Park area polygon | 1 Polygon (`EPSG:4326` WGS84) |
| `linestring.kml` | `.kml` | San Francisco Embarcadero linear promenade path | 1 LineString (`EPSG:4326` WGS84) |
| `point.kml` | `.kml` | Coit Tower landmark point feature | 1 Point (`EPSG:4326` WGS84) |
| `mixed.kml` | `.kml` | Multi-feature collection containing Polygon, LineString, and Point | 1 Polygon, 1 LineString, 1 Point (`EPSG:4326`) |
| `shapefile_sample.zip` | `.zip` | Zipped Shapefile dataset containing `.shp`, `.shx`, `.dbf`, `.prj` | 2 Polygons (`EPSG:4326` WGS84) |
| `no_prj_shapefile.zip` | `.zip` | Zipped Shapefile dataset lacking `.prj` file (missing CRS) | 1 Polygon (Missing CRS, bounds in `[-180..180, -90..90]`) |

## Expected Measurement Results

- **`polygon.kml`**: Area calculated in $m^2$ after transforming coordinates to local UTM Zone 10N (`EPSG:32610`).
- **`linestring.kml`**: Length calculated in meters ($m$) or kilometers ($km$) after transforming coordinates to local UTM Zone 10N (`EPSG:32610`).
- **`point.kml`**: Returns `measurement_status = "NOT_REQUIRED"`, `area = null`, `length = null`.
- **`shapefile_sample.zip`**: Processes 2 polygon features independently in UTM Zone 10N (`EPSG:32610`).
- **`no_prj_shapefile.zip`**: Missing CRS is validated against coordinate bounds `[-180..180, -90..90]`, inferring `EPSG:4326` with a stored warning message and calculating measurements in UTM Zone 10N (`EPSG:32610`).
