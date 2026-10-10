export interface HealthResponse {
  status: string;
}

export interface FileUploadResponse {
  id: string;
  filename: string;
  stored_filename: string;
  file_type: string;
  file_size: number;
  feature_count: number;
  processed_features?: number;
  successful_measurements?: number;
  failed_measurements?: number;
  unsupported_geometries?: number;
  source_crs: string | null;
  crs?: string | null;
  status: 'PROCESSING' | 'COMPLETED' | 'PARTIALLY_COMPLETED' | 'FAILED' | string;
  error_message: string | null;
}

export interface FileInfoResponse {
  id: string;
  filename: string;
  stored_filename: string;
  file_type: string;
  file_size: number;
  feature_count: number;
  processed_features?: number;
  successful_measurements?: number;
  failed_measurements?: number;
  unsupported_geometries?: number;
  source_crs: string | null;
  crs?: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface MeasurementItem {
  id: string;
  feature_index: number;
  feature_id?: number;
  geometry_type: string;
  properties: Record<string, any> | null;
  area: number | null;
  length: number | null;
  measurement_unit: string | null;
  unit?: string | null;
  measurement_status: 'COMPLETED' | 'NOT_REQUIRED' | 'UNSUPPORTED' | 'FAILED' | string;
  status?: string;
  error_message: string | null;
  created_at: string;
}

export interface MeasurementListResponse {
  file_id: string;
  filename: string;
  total_features: number;
  measurements: MeasurementItem[];
}

export interface ApiError {
  statusCode: number;
  message: string;
  detail?: string;
}

export interface SessionFileItem {
  id: string;
  filename: string;
  file_size: number;
  file_type: string;
  status: string;
  feature_count: number;
  source_crs: string | null;
  uploaded_at: string;
}
