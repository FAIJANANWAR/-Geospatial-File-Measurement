import logging
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import settings
from app.database import engine, Base
from app.schemas import HealthResponse
from app.routes.files import router as files_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("geospatial_api")

# Create database tables automatically at startup
Base.metadata.create_all(bind=engine)

# Initialize FastAPI Application
app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description=(
        "Production-grade FastAPI backend service for processing KML and Shapefile geospatial files, "
        "detecting/inferring CRS metadata, performing projected CRS transformations, and computing metric measurements."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# Configure CORS Middleware
# Explicitly allows configured local and production origins, plus Render static site domains (*.onrender.com)
allowed_origins_list = [orig.strip() for orig in settings.ALLOWED_ORIGINS.split(",") if orig.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins_list,
    allow_origin_regex=r"^https://.*\.onrender\.com$",
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS", "HEAD"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(files_router)


@app.get(
    "/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    tags=["System Health"],
    summary="Service Health Check",
    description="Check application readiness and service operational status."
)
def health_check():
    """
    Health check endpoint returning 200 OK with status='ok'.
    """
    return {"status": "ok"}


# Centralized Exception Handlers
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """
    Custom handler for HTTP exceptions returning standardized JSON error responses.
    """
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Custom handler for request parameters and schema validation errors.
    """
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": str(exc.errors())}
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    """
    Global catch-all exception handler preventing raw stack trace exposure to API consumers.
    """
    logger.error(f"Unhandled server exception on {request.url.path}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred while processing your request."}
    )


if __name__ == "__main__":
    import os
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=False)
