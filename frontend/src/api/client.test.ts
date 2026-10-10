import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  API_BASE_URL,
  checkBackendHealth,
  uploadGeospatialFile,
  getFileInfo,
  getFileMeasurements
} from './client';
import type { MeasurementItem } from '../types/api';

describe('GeoMeasure API Client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('API_BASE_URL should not end with trailing slash', () => {
    expect(API_BASE_URL.endsWith('/')).toBe(false);
  });

  it('checkBackendHealth returns Online when server returns 200 with status ok', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ok' })
    } as Response);

    const result = await checkBackendHealth();
    expect(result.status).toBe('Online');
    expect(typeof result.latencyMs).toBe('number');
  });

  it('checkBackendHealth returns Unavailable when server fails or throws network error', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

    const result = await checkBackendHealth();
    expect(result.status).toBe('Unavailable');
    expect(typeof result.latencyMs).toBe('number');
  });

  it('uploadGeospatialFile handles 400 Bad Request error correctly', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ detail: 'Unsupported file extension .txt' })
    } as Response);

    const file = new File(['dummy'], 'test.txt', { type: 'text/plain' });

    await expect(uploadGeospatialFile(file)).rejects.toMatchObject({
      statusCode: 400,
      message: 'Unsupported file extension .txt'
    });
  });

  it('uploadGeospatialFile handles 413 Content Too Large error correctly', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 413,
      json: async () => ({ detail: 'File size exceeds maximum allowed limit of 25 MB.' })
    } as Response);

    const file = new File(['dummy'], 'large.kml', { type: 'application/vnd.google-earth.kml+xml' });

    await expect(uploadGeospatialFile(file)).rejects.toMatchObject({
      statusCode: 413,
      message: 'File size exceeds maximum allowed limit of 25 MB.'
    });
  });

  it('uploadGeospatialFile returns file record on 201 Created', async () => {
    const mockResponse = {
      id: 'uuid-123',
      filename: 'polygon.kml',
      stored_filename: 'uuid-123.kml',
      file_type: 'kml',
      file_size: 1024,
      feature_count: 1,
      source_crs: 'EPSG:4326',
      status: 'COMPLETED',
      error_message: null
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    } as Response);

    const file = new File(['<kml></kml>'], 'polygon.kml', { type: 'application/vnd.google-earth.kml+xml' });
    const result = await uploadGeospatialFile(file);

    expect(result.id).toBe('uuid-123');
    expect(result.status).toBe('COMPLETED');
    expect(result.feature_count).toBe(1);
  });

  it('getFileInfo returns metadata for existing file', async () => {
    const mockInfo = {
      id: 'uuid-123',
      filename: 'polygon.kml',
      stored_filename: 'uuid-123.kml',
      file_type: 'kml',
      file_size: 1024,
      feature_count: 1,
      source_crs: 'EPSG:4326',
      status: 'COMPLETED',
      error_message: null,
      created_at: '2026-10-10T00:00:00',
      updated_at: '2026-10-10T00:00:00'
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockInfo
    } as Response);

    const result = await getFileInfo('uuid-123');
    expect(result.id).toBe('uuid-123');
    expect(result.filename).toBe('polygon.kml');
  });

  it('getFileMeasurements handles nullable values and geometry differentiation', async () => {
    const mockMeasurements: { file_id: string; filename: string; total_features: number; measurements: MeasurementItem[] } = {
      file_id: 'uuid-123',
      filename: 'mixed.kml',
      total_features: 3,
      measurements: [
        {
          id: 'm-1',
          feature_index: 0,
          geometry_type: 'Polygon',
          properties: { name: 'Zone A' },
          area: 125000.5,
          length: null,
          measurement_unit: 'm²',
          measurement_status: 'COMPLETED',
          error_message: null,
          created_at: '2026-10-10T00:00:00'
        },
        {
          id: 'm-2',
          feature_index: 1,
          geometry_type: 'LineString',
          properties: { name: 'Path B' },
          area: null,
          length: 4.82,
          measurement_unit: 'km',
          measurement_status: 'COMPLETED',
          error_message: null,
          created_at: '2026-10-10T00:00:00'
        },
        {
          id: 'm-3',
          feature_index: 2,
          geometry_type: 'Point',
          properties: { name: 'Tower C' },
          area: null,
          length: null,
          measurement_unit: null,
          measurement_status: 'NOT_REQUIRED',
          error_message: null,
          created_at: '2026-10-10T00:00:00'
        }
      ]
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockMeasurements
    } as Response);

    const res = await getFileMeasurements('uuid-123');
    expect(res.total_features).toBe(3);

    const poly = res.measurements[0];
    expect(poly.geometry_type).toBe('Polygon');
    expect(poly.area).toBe(125000.5);
    expect(poly.measurement_unit).toBe('m²');
    expect(poly.length).toBeNull();

    const line = res.measurements[1];
    expect(line.geometry_type).toBe('LineString');
    expect(line.length).toBe(4.82);
    expect(line.measurement_unit).toBe('km');
    expect(line.area).toBeNull();

    const pt = res.measurements[2];
    expect(pt.geometry_type).toBe('Point');
    expect(pt.measurement_status).toBe('NOT_REQUIRED');
    expect(pt.area).toBeNull();
    expect(pt.length).toBeNull();
  });
});
