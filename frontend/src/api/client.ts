import type {
  HealthResponse,
  FileUploadResponse,
  FileInfoResponse,
  MeasurementListResponse,
  ApiError
} from '../types/api';

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined' && window.localStorage) {
    const saved = window.localStorage.getItem('GEOMEASURE_API_URL');
    if (saved) return saved.replace(/\/+$/, '');
  }

  // If running locally in dev, default to local backend to avoid CORS delay before Render deploy
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');
  }

  const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://geospatial-measurement-api-hxpu.onrender.com';
  return rawBaseUrl.replace(/\/+$/, '');
}

export function setApiBaseUrl(url: string): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem('GEOMEASURE_API_URL', url.replace(/\/+$/, ''));
  }
}

// Retain exported constant for backward compatibility
export const API_BASE_URL = getApiBaseUrl();

/**
 * Standardized error parser converting HTTP/network errors into structured ApiError objects.
 */
async function handleResponseError(response: Response): Promise<never> {
  const statusCode = response.status;
  let detailMessage = '';

  try {
    const errorJson = await response.json();
    if (errorJson && typeof errorJson === 'object') {
      if (typeof errorJson.detail === 'string') {
        detailMessage = errorJson.detail;
      } else if (Array.isArray(errorJson.detail)) {
        // FastAPI validation errors (422)
        detailMessage = errorJson.detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ');
      } else if (errorJson.message) {
        detailMessage = errorJson.message;
      }
    }
  } catch {
    // Non-JSON response (e.g. plain text or HTML gateway error)
    detailMessage = await response.text().catch(() => '');
  }

  let friendlyMessage = detailMessage || `Request failed with HTTP status ${statusCode}`;

  if (statusCode === 400) {
    friendlyMessage = detailMessage || 'Bad Request: The uploaded file or parameters are invalid.';
  } else if (statusCode === 404) {
    friendlyMessage = detailMessage || 'Resource Not Found: The requested file ID does not exist.';
  } else if (statusCode === 413) {
    friendlyMessage = detailMessage || 'File Too Large: Uploaded file exceeds the server maximum allowed limit (25 MB).';
  } else if (statusCode === 422) {
    friendlyMessage = `Validation Error: ${detailMessage || 'Invalid request format.'}`;
  } else if (statusCode >= 500) {
    friendlyMessage = detailMessage || 'Server Error: The backend encountered an unexpected error processing your file.';
  }

  const error: ApiError = {
    statusCode,
    message: friendlyMessage,
    detail: detailMessage
  };

  throw error;
}

/**
 * Checks backend health and measures round-trip latency.
 */
export async function checkBackendHealth(targetUrl?: string): Promise<{ status: 'Online' | 'Unavailable'; latencyMs: number; raw?: HealthResponse }> {
  const baseUrl = targetUrl ? targetUrl.replace(/\/+$/, '') : getApiBaseUrl();
  const startTime = performance.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

    const res = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const latencyMs = Math.round(performance.now() - startTime);

    if (res.ok) {
      const data: HealthResponse = await res.json();
      if (data.status === 'ok') {
        return { status: 'Online', latencyMs, raw: data };
      }
    }
    return { status: 'Unavailable', latencyMs };
  } catch {
    const latencyMs = Math.round(performance.now() - startTime);
    return { status: 'Unavailable', latencyMs };
  }
}

/**
 * Uploads a geospatial file (.kml or .zip Shapefile) using multipart/form-data.
 */
export async function uploadGeospatialFile(file: File): Promise<FileUploadResponse> {
  const formData = new FormData();
  // Field name must match backend requirement "file"
  formData.append('file', file);

  try {
    const baseUrl = getApiBaseUrl();
    // IMPORTANT: Do NOT manually set Content-Type header. Let browser set multipart boundary.
    const response = await fetch(`${baseUrl}/api/files/`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json'
      },
      body: formData
    });

    if (!response.ok) {
      await handleResponseError(response);
    }

    const data: FileUploadResponse = await response.json();
    return data;
  } catch (err: any) {
    if (err && typeof err.statusCode === 'number') {
      throw err;
    }
    // Network or offline error
    throw {
      statusCode: 0,
      message: 'Network / CORS Error: Unable to communicate with the backend server. If using the cloud backend, ensure CORS is enabled or switch to the Local Backend.',
      detail: err?.message || String(err)
    } as ApiError;
  }
}

/**
 * Retrieves file metadata by file ID.
 */
export async function getFileInfo(fileId: string): Promise<FileInfoResponse> {
  try {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/files/${encodeURIComponent(fileId)}/`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      await handleResponseError(response);
    }

    const data: FileInfoResponse = await response.json();
    return data;
  } catch (err: any) {
    if (err && typeof err.statusCode === 'number') {
      throw err;
    }
    throw {
      statusCode: 0,
      message: 'Network Error: Failed to retrieve file information from backend.',
      detail: err?.message || String(err)
    } as ApiError;
  }
}

/**
 * Retrieves measurement results by file ID.
 */
export async function getFileMeasurements(fileId: string): Promise<MeasurementListResponse> {
  try {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/files/${encodeURIComponent(fileId)}/measurements/`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      await handleResponseError(response);
    }

    const data: MeasurementListResponse = await response.json();
    return data;
  } catch (err: any) {
    if (err && typeof err.statusCode === 'number') {
      throw err;
    }
    throw {
      statusCode: 0,
      message: 'Network Error: Failed to retrieve feature measurements from backend.',
      detail: err?.message || String(err)
    } as ApiError;
  }
}
