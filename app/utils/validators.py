import os
import zipfile
import re
from typing import List, Tuple
from fastapi import HTTPException, status
from app.config import settings


ALLOWED_EXTENSIONS = {".kml", ".zip"}


def validate_file_extension(filename: str) -> str:
    """
    Validates that the file has a supported extension (.kml or .zip).
    """
    if not filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename cannot be empty."
        )

    _, ext = os.path.splitext(filename.lower())
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file extension '{ext}'. Allowed extensions are: .kml, .zip"
        )
    return ext[1:]  # Return 'kml' or 'zip'


def validate_file_size(file_size_bytes: int) -> None:
    """
    Validates file size against configured limit.
    """
    if file_size_bytes == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty (0 bytes)."
        )

    max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    if file_size_bytes > max_bytes:
        status_code = getattr(status, "HTTP_413_CONTENT_TOO_LARGE", 413)
        raise HTTPException(
            status_code=status_code,
            detail=f"File size exceeds maximum allowed limit of {settings.MAX_FILE_SIZE_MB} MB."
        )


def sanitize_filename(filename: str) -> str:
    """
    Sanitizes user-provided filename to prevent filesystem injection.
    """
    filename = os.path.basename(filename)
    filename = re.sub(r'[^a-zA-Z0-9_\-\.]', '_', filename)
    return filename or "uploaded_file"


def safe_extract_zip(zip_file_path: str, extract_dir: str) -> List[str]:
    """
    Safely extracts a ZIP archive into extract_dir while mitigating Zip Slip (path traversal) attacks.
    """
    if not zipfile.is_zipfile(zip_file_path):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded ZIP file is corrupted or not a valid ZIP archive."
        )

    abs_extract_dir = os.path.abspath(extract_dir)
    extracted_files = []

    with zipfile.ZipFile(zip_file_path, 'r') as zip_ref:
        for member in zip_ref.infolist():
            # Prevent Zip Slip / Path Traversal vulnerability
            target_path = os.path.abspath(os.path.join(abs_extract_dir, member.filename))
            if not target_path.startswith(abs_extract_dir + os.sep) and target_path != abs_extract_dir:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Zip archive contains insecure path traversal member: '{member.filename}'"
                )

            zip_ref.extract(member, abs_extract_dir)
            extracted_files.append(target_path)

    return extracted_files


def find_and_validate_shapefile(extract_dir: str) -> Tuple[str, List[str]]:
    """
    Locates the main .shp file inside the extracted directory and verifies mandatory components (.shx, .dbf).
    Returns (path_to_shp, missing_components_list).
    """
    shp_files = []
    for root, _, files in os.walk(extract_dir):
        for file in files:
            if file.lower().endswith('.shp'):
                shp_files.append(os.path.join(root, file))

    if not shp_files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Shapefile ZIP archive: No .shp file found in ZIP."
        )

    if len(shp_files) > 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ambiguous ZIP content: Multiple Shapefiles found ({len(shp_files)} .shp files). Please upload a ZIP containing a single Shapefile dataset."
        )

    shp_path = shp_files[0]
    base_path, _ = os.path.splitext(shp_path)

    # Required Shapefile companion components
    missing = []
    for required_ext in ['.shx', '.dbf']:
        candidate = base_path + required_ext
        # Case-insensitive file check
        parent = os.path.dirname(candidate)
        base_name = os.path.basename(candidate).lower()
        if not any(f.lower() == base_name for f in os.listdir(parent)):
            missing.append(required_ext)

    if missing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Incomplete Shapefile dataset: Missing mandatory component file(s): {', '.join(missing)}"
        )

    return shp_path, missing
