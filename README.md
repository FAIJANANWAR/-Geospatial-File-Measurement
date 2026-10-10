# Geospatial File Measurement API

A production-grade Python backend API built with **FastAPI**, **GeoPandas**, **Shapely**, **PyProj**, **Fiona**, and **SQLAlchemy**. The application ingests uploaded geospatial files (`.kml` and `.zip` Shapefiles), validates dataset structures and geometry integrity, performs accurate metric geometric calculations (Polygon area in $m^2$, LineString length in $m$ / $km$), dynamically transforms geographic coordinate reference systems (CRS) to local projected systems (e.g., Universal Transverse Mercator / UTM), persists file metadata and measurement results in SQLite, and exposes documented REST APIs.

---

## 🚀 Features

- **Multi-Format Ingestion**: Supports `.kml` XML files and `.zip` archives containing ESRI Shapefile datasets (`.shp`, `.shx`, `.dbf`, `.prj`).
- **Dynamic Projected CRS Transformation**: Detects source CRS, identifies geographic coordinate systems (e.g. `EPSG:4326`), and projects geometries into optimal local UTM zones based on geometry centroids before performing spatial math.
- **Strict Metric Precision**: Never calculates area or distance directly in geographic angular degrees ($^\circ$).
- **Smart Missing CRS Inference**: Validates coordinate bounds against geographic limits ($[-180..180, -90..90]$) when `.prj` is missing before inferring `EPSG:4326`, returning explicit errors if coordinates exceed geographic bounds.
- **Resilient Per-Feature Processing**: Feature failures or unsupported geometry types (e.g. `Point` -> `NOT_REQUIRED`, `GeometryCollection` -> `UNSUPPORTED`) are handled gracefully without aborting remaining valid features.
- **Security Protections**: Mitigates Zip-Slip path-traversal vulnerabilities, enforces file size limits ($25\text{ MB}$), sanitizes filenames, and uses UUID-based storage.
- **Automated Test Suite**: 100% passing test coverage using `pytest` and `httpx`.

---

## 🛠 Tech Stack

| Technology | Role |
| :--- | :--- |
| **Python 3.11+** | Primary programming language |
| **FastAPI** | High-performance async REST Web framework |
| **Uvicorn** | ASGI web server |
| **GeoPandas & Fiona** | Vector geospatial file IO and DataFrame handling |
| **Shapely** | Spatial data manipulation and geometric measurements |
| **PyProj** | Cartographic projection and coordinate transformation engine |
| **SQLAlchemy** | SQL ORM for database persistence |
| **SQLite** | Local relational database storage |
| **Pydantic v2 & Pydantic Settings** | Data validation, environment settings, and OpenAPI schema generation |
| **Pytest & HTTPX** | Automated testing and API client integration |

---

## 📐 Architecture & Processing Flow

```
Client (curl / Postman / Swagger UI)
  │
  ▼
[GET /health]  OR  [POST /api/files/]
  │
  ├──► 1. File Validation (`app/utils/validators.py`)
  │      └── Extension check (.kml, .zip), file size limit, ZIP-Slip protection, Shapefile components (.shp, .shx, .dbf)
  │
  ├──► 2. Storage & Extraction (`app/services/file_service.py`)
  │      └── UUID storage filename, temporary ZIP extraction directory, initial DB status 'PROCESSING'
  │
  ├──► 3. Geospatial Feature Parsing (`app/services/geospatial_service.py`)
  │      └── GeoPandas / Fiona reader with fallback XML parser for KML Placemarks
  │
  ├──► 4. CRS Resolution & Transformation (`app/services/crs_service.py`)
  │      └── Source CRS detection -> Missing CRS bounds check [-180..180, -90..90] -> Centroid UTM projection (EPSG:326xx/327xx)
  │
  ├──► 5. Metric Measurement (`app/services/measurement_service.py`)
  │      └── Polygon -> Area (m²) | LineString -> Length (m/km) | Point -> NOT_REQUIRED | Unsupported -> UNSUPPORTED
  │
  └──► 6. Persistence & Response (`app/database.py`, `app/models.py`)
         └── Save File record + Measurement records to SQLite, set status 'COMPLETED', return JSON response
```

---

## 📁 Project Structure

```
geospatial-measurement-api/
├── app/
│   ├── __init__.py
│   ├── main.py                   # FastAPI app entry point & exception handlers
│   ├── config.py                 # Pydantic environment configuration settings
│   ├── database.py               # SQLAlchemy engine & DB session setup
│   ├── models.py                 # SQLAlchemy DB models (FileModel, MeasurementModel)
│   ├── schemas.py                # Pydantic API response and request schemas
│   ├── routes/
│   │   ├── __init__.py
│   │   └── files.py              # REST API route handlers
│   ├── services/
│   │   ├── __init__.py
│   │   ├── file_service.py       # File upload, storage & database orchestration
│   │   ├── geospatial_service.py # Ingestion & parsing for KML & Shapefiles
│   │   ├── measurement_service.py# Geometric measurement processing
│   │   └── crs_service.py        # CRS detection, bounds validation & UTM projection
│   └── utils/
│       ├── __init__.py
│       ├── validators.py         # File size, extension, Zip-Slip & shapefile validators
│       └── geometry.py           # Geometry validation and safe repair helpers
├── tests/
│   ├── __init__.py
│   ├── conftest.py               # Pytest fixtures & isolated test DB setup
│   ├── test_health.py            # Healthcheck API tests
│   ├── test_upload.py            # File upload endpoint tests
│   ├── test_validation.py        # Edge case & security validation tests
│   ├── test_measurements.py     # Polygon area, LineString length & Point tests
│   ├── test_crs.py               # CRS transformation & missing CRS inference tests
│   └── test_file_information.py # File metadata and measurement GET endpoint tests
├── sample_data/
│   ├── polygon.kml               # Sample valid Polygon KML
│   ├── linestring.kml            # Sample valid LineString KML
│   ├── point.kml                 # Sample valid Point KML
│   ├── mixed.kml                 # Multi-feature collection sample KML
│   ├── shapefile_sample.zip      # Zipped valid Shapefile dataset (.shp, .shx, .dbf, .prj)
│   ├── no_prj_shapefile.zip      # Zipped Shapefile lacking .prj file
│   └── README.md                 # Sample dataset documentation
├── uploads/                      # Local uploaded raw file storage
├── processed/                    # Temporary ZIP extraction directory
├── .env.example                  # Environment configuration template
├── .gitignore                    # Git ignore file
├── requirements.txt              # Pinned Python package dependencies
├── README.md                     # Technical project documentation
├── Dockerfile                    # Docker build configuration
├── docker-compose.yml            # Docker Compose orchestration
└── pyproject.toml                # Project metadata & pytest configuration
```

---

## ⚡ Setup & Installation

### Prerequisites
- **Python 3.11+** installed.
- (Optional) Docker & Docker Compose.

### Local Installation Steps

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/geospatial-measurement-api.git
   cd geospatial-measurement-api
   ```

2. **Create and activate virtual environment**:
   - **Windows (PowerShell)**:
     ```powershell
     py -3.11 -m venv venv
     .\venv\Scripts\activate
     ```
   - **Linux / macOS**:
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Setup Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

---

## 🏃 Running the Application

### Option 1: Local Uvicorn Server

Start the development server with auto-reload:
```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
Access the application at: `http://127.0.0.1:8000`

### Option 2: Docker Compose

Build and run using Docker Compose:
```bash
docker-compose up --build
```

---

## 🌐 API Documentation & Interactive UI

FastAPI generates interactive OpenAPI documentation automatically:

- **Swagger UI**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

## 📡 API Endpoints Overview & Examples

### 1. Service Health Check
- **Endpoint**: `GET /health`
- **Description**: Returns server operational status.
- **Example Request**:
  ```bash
  curl -X GET "http://127.0.0.1:8000/health"
  ```
- **Response** (`200 OK`):
  ```json
  {
    "status": "ok"
  }
  ```

### 2. Upload Geospatial File
- **Endpoint**: `POST /api/files/`
- **Description**: Ingests `.kml` or `.zip` Shapefile, extracts features, calculates metric measurements, and returns file summary.
- **Example Request (KML)**:
  ```bash
  curl -X POST "http://127.0.0.1:8000/api/files/" \
    -F "file=@sample_data/polygon.kml"
  ```
- **Example Request (Shapefile ZIP)**:
  ```bash
  curl -X POST "http://127.0.0.1:8000/api/files/" \
    -F "file=@sample_data/shapefile_sample.zip"
  ```
- **Response** (`201 Created`):
  ```json
  {
    "id": "e4b1a8c2-3d7f-4f9e-8b1a-2c5d6e7f8a9b",
    "filename": "polygon.kml",
    "stored_filename": "e4b1a8c2-3d7f-4f9e-8b1a-2c5d6e7f8a9b.kml",
    "file_type": "kml",
    "file_size": 752,
    "feature_count": 1,
    "source_crs": "EPSG:4326",
    "status": "COMPLETED",
    "error_message": null
  }
  ```

### 3. Get File Metadata
- **Endpoint**: `GET /api/files/{id}/`
- **Description**: Retrieve processing status and summary metadata for an uploaded file.
- **Example Request**:
  ```bash
  curl -X GET "http://127.0.0.1:8000/api/files/e4b1a8c2-3d7f-4f9e-8b1a-2c5d6e7f8a9b/"
  ```
- **Response** (`200 OK`):
  ```json
  {
    "id": "e4b1a8c2-3d7f-4f9e-8b1a-2c5d6e7f8a9b",
    "filename": "polygon.kml",
    "stored_filename": "e4b1a8c2-3d7f-4f9e-8b1a-2c5d6e7f8a9b.kml",
    "file_type": "kml",
    "file_size": 752,
    "feature_count": 1,
    "processed_features": 1,
    "successful_measurements": 1,
    "failed_measurements": 0,
    "unsupported_geometries": 0,
    "source_crs": "EPSG:4326",
    "crs": "EPSG:4326",
    "status": "COMPLETED",
    "error_message": null,
    "created_at": "2026-10-09T09:00:00",
    "updated_at": "2026-10-09T09:00:00"
  }
  ```

### 4. Get Feature Measurements
- **Endpoint**: `GET /api/files/{id}/measurements/`
- **Description**: Retrieve geometric measurement results for every feature in the file.
- **Example Request**:
  ```bash
  curl -X GET "http://127.0.0.1:8000/api/files/e4b1a8c2-3d7f-4f9e-8b1a-2c5d6e7f8a9b/measurements/"
  ```
- **Response** (`200 OK`):
  ```json
  {
    "file_id": "e4b1a8c2-3d7f-4f9e-8b1a-2c5d6e7f8a9b",
    "filename": "polygon.kml",
    "total_features": 1,
    "measurements": [
      {
        "id": "7f9a8b1c-2d3e-4f5a-6b7c-8d9e0f1a2b3c",
        "feature_index": 0,
        "geometry_type": "Polygon",
        "properties": {
          "name": "SF Golden Gate Park Sector",
          "description": "Sample rectangular polygon in San Francisco"
        },
        "area": 1785234.12,
        "length": null,
        "measurement_unit": "m²",
        "measurement_status": "COMPLETED",
        "error_message": null,
        "created_at": "2026-10-09T09:00:00"
      }
    ]
  }
  ```

---

## 🌍 Mandatory CRS Handling Strategy

### Why Geographic Coordinates Cannot Be Used Directly
Geographic Coordinate Reference Systems such as **`EPSG:4326` (WGS84)** express coordinates as angular degrees ($\text{longitude}^\circ, \text{latitude}^\circ$). 
- On a spherical / ellipsoidal globe, **$1^\circ$ of longitude varies in distance** depending on latitude (at the equator $1^\circ \approx 111\text{ km}$, while at $60^\circ\text{ N/S}$ latitude $1^\circ \approx 55.5\text{ km}$).
- Calculating polygon area directly in square degrees ($\text{deg}^2$) or linestring length in spherical degrees ($\text{deg}$) yields mathematically meaningless metric values.

### Application Projected CRS Strategy
1. **Source CRS Detection**: The API inspects metadata from Fiona / GeoPandas or Shapefile `.prj` files.
2. **Missing CRS Validation & Bounds Rule**:
   - When CRS metadata is missing (e.g. Shapefile ZIP lacking `.prj`), the API inspects dataset geometry coordinate bounds.
   - If all coordinates lie strictly within geographic limits ($\text{longitude} \in [-180, 180]$, $\text{latitude} \in [-90, 90]$), the system infers **`EPSG:4326`** with a logged warning.
   - If coordinates exceed geographic limits, the system marks the feature/file measurement with a clear error: `"Missing CRS and coordinate bounds exceed geographic range [-180..180, -90..90]. Cannot infer CRS."`
3. **UTM Projection Selection**:
   - For geographic CRS (`EPSG:4326` or inferred), the API computes the geometry centroid $(\text{lon}, \text{lat})$.
   - The optimal Universal Transverse Mercator (UTM) Zone is computed using:
     $$\text{Zone} = \lfloor \frac{\text{lon} + 180}{6} \rfloor + 1$$
   - Target EPSG Code:
     - **Northern Hemisphere** ($\text{lat} \ge 0$): `EPSG:32600 + Zone`
     - **Southern Hemisphere** ($\text{lat} < 0$): `EPSG:32700 + Zone`
4. **Coordinate Transformation**: Geometries are transformed using PyProj `Transformer.from_crs(source_crs, utm_crs, always_xy=True)` into metric projected space before calling Shapely geometry measurement methods (`area` in $m^2$, `length` in $m$ or $km$).

---

## 🧪 Running Automated Tests

Run the complete test suite with `pytest`:
```bash
.\venv\Scripts\pytest -v
```

Output:
```
======================= 25 passed in 1.13s =======================
```

---

## 🪪 License & Repository Readiness

This project is prepared for public GitHub repository hosting. Contains clean architecture, zero hardcoded secrets, `.gitignore`, `.env.example`, Docker setup, and comprehensive documentation.
