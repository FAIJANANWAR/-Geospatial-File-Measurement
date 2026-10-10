import React, { useState, useEffect } from 'react';
import {
  Layers,
  Copy,
  Check,
  Search,
  Loader2,
  AlertCircle,
  FileText,
  ChevronDown,
  ChevronUp,
  Code2,
  CheckCircle2,
  HelpCircle,
  XCircle
} from 'lucide-react';
import { getFileMeasurements, getFileInfo } from '../api/client';
import type {
  MeasurementListResponse,
  FileInfoResponse,
  MeasurementItem,
  ApiError
} from '../types/api';

interface MeasurementsViewProps {
  initialFileId?: string;
}

export const MeasurementsView: React.FC<MeasurementsViewProps> = ({ initialFileId }) => {
  const [fileIdInput, setFileIdInput] = useState<string>(initialFileId || '');
  const [fileInfo, setFileInfo] = useState<FileInfoResponse | null>(null);
  const [measurementsData, setMeasurementsData] = useState<MeasurementListResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<ApiError | null>(null);
  const [copiedId, setCopiedId] = useState<boolean>(false);
  const [copiedJson, setCopiedJson] = useState<boolean>(false);
  const [expandedProperties, setExpandedProperties] = useState<Record<number, boolean>>({});
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');
  const [showRawJson, setShowRawJson] = useState<boolean>(false);

  const fetchMeasurements = async (idToFetch: string) => {
    if (!idToFetch.trim()) return;

    setIsLoading(true);
    setFetchError(null);

    try {
      // Parallel fetch for metadata and measurements
      const [infoRes, measureRes] = await Promise.all([
        getFileInfo(idToFetch),
        getFileMeasurements(idToFetch)
      ]);
      setFileInfo(infoRes);
      setMeasurementsData(measureRes);
    } catch (err: any) {
      setFetchError(err);
      setFileInfo(null);
      setMeasurementsData(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialFileId) {
      setFileIdInput(initialFileId);
      fetchMeasurements(initialFileId);
    }
  }, [initialFileId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMeasurements(fileIdInput.trim());
  };

  const copyToClipboard = (text: string, isJson: boolean = false) => {
    navigator.clipboard.writeText(text);
    if (isJson) {
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    } else {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const togglePropertyExpand = (index: number) => {
    setExpandedProperties((prev) => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const formatNumber = (num: number | null | undefined): string => {
    if (num === null || num === undefined) return '—';
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 4,
      minimumFractionDigits: 2
    }).format(num);
  };

  const filteredMeasurements = measurementsData?.measurements.filter((m) => {
    if (selectedFilter === 'ALL') return true;
    if (selectedFilter === 'POLYGON') return m.geometry_type.toLowerCase().includes('polygon');
    if (selectedFilter === 'LINESTRING') return m.geometry_type.toLowerCase().includes('line');
    if (selectedFilter === 'POINT') return m.geometry_type.toLowerCase().includes('point');
    if (selectedFilter === 'OTHER') {
      const g = m.geometry_type.toLowerCase();
      return !g.includes('polygon') && !g.includes('line') && !g.includes('point');
    }
    return true;
  }) || [];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Search Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Measurement Results</h1>
          <p className="text-sm text-slate-500 mt-1">
            Explore per-feature metric measurements, geometry classifications, and CRS projections.
          </p>
        </div>

        {/* File ID Lookup Input */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 max-w-md w-full">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={fileIdInput}
              onChange={(e) => setFileIdInput(e.target.value)}
              placeholder="Enter File UUID to inspect..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-slate-800 font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !fileIdInput.trim()}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors shrink-0"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Load Results'}
          </button>
        </form>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="bg-white rounded-xl p-16 border border-slate-200 shadow-sm text-center space-y-3">
          <Loader2 className="w-8 h-8 text-teal-600 animate-spin mx-auto" />
          <h3 className="font-semibold text-slate-800 text-sm">Retrieving Measurements</h3>
          <p className="text-xs text-slate-500">Calling GET /api/files/{fileIdInput}/measurements/...</p>
        </div>
      )}

      {/* Error Alert */}
      {fetchError && !isLoading && (
        <div className="p-5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-2">
          <div className="flex items-center gap-2 font-semibold text-sm text-rose-900">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Error Retrieving Measurements (HTTP {fetchError.statusCode})</span>
          </div>
          <p className="pl-6 text-rose-700">{fetchError.message}</p>
          {fetchError.detail && (
            <p className="pl-6 font-mono text-[11px] text-rose-600 mt-1 break-all bg-rose-100/60 p-2 rounded">
              Detail: {fetchError.detail}
            </p>
          )}
        </div>
      )}

      {/* Empty State */}
      {!measurementsData && !isLoading && !fetchError && (
        <div className="bg-white rounded-xl p-16 border border-slate-200 shadow-sm text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="font-semibold text-slate-800 text-sm">No Measurements Loaded</h3>
            <p className="text-xs text-slate-500">
              Upload a geospatial file (.kml or .zip Shapefile) from the Upload tab or enter an existing File ID above.
            </p>
          </div>
        </div>
      )}

      {/* Populated Results View */}
      {measurementsData && !isLoading && (
        <div className="space-y-6">
          {/* File Summary Header Card */}
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-teal-600 shrink-0" />
                  <h2 className="text-lg font-bold text-slate-900 truncate" title={measurementsData.filename}>
                    {measurementsData.filename}
                  </h2>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                  <span>ID: {measurementsData.file_id}</span>
                  <button
                    onClick={() => copyToClipboard(measurementsData.file_id)}
                    className="text-slate-400 hover:text-teal-600 p-0.5"
                    title="Copy File ID"
                  >
                    {copiedId ? <Check className="w-3.5 h-3.5 text-teal-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowRawJson(!showRawJson)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 font-medium transition-colors"
                >
                  <Code2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>{showRawJson ? 'Hide Raw JSON' : 'Raw JSON'}</span>
                </button>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                  fileInfo?.status === 'COMPLETED'
                    ? 'bg-teal-50 text-teal-700 border border-teal-200'
                    : fileInfo?.status === 'PARTIALLY_COMPLETED'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}>
                  {fileInfo?.status || 'COMPLETED'}
                </span>
              </div>
            </div>

            {/* Metrics Counters Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-[11px] text-slate-500 block">Total Features</span>
                <span className="text-lg font-bold text-slate-800">{measurementsData.total_features}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-[11px] text-slate-500 block">Source CRS</span>
                <span className="text-sm font-semibold font-mono text-slate-800 truncate block" title={fileInfo?.source_crs || '—'}>
                  {fileInfo?.source_crs || '—'}
                </span>
              </div>
              <div className="p-3 bg-teal-50/50 rounded-lg border border-teal-100">
                <span className="text-[11px] text-teal-700 block">Successful</span>
                <span className="text-lg font-bold text-teal-800">
                  {fileInfo?.successful_measurements ?? measurementsData.measurements.filter(m => m.measurement_status === 'COMPLETED' || m.measurement_status === 'NOT_REQUIRED').length}
                </span>
              </div>
              <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-100">
                <span className="text-[11px] text-amber-700 block">Unsupported</span>
                <span className="text-lg font-bold text-amber-800">
                  {fileInfo?.unsupported_geometries ?? measurementsData.measurements.filter(m => m.measurement_status === 'UNSUPPORTED').length}
                </span>
              </div>
              <div className="p-3 bg-rose-50/50 rounded-lg border border-rose-100">
                <span className="text-[11px] text-rose-700 block">Failed</span>
                <span className="text-lg font-bold text-rose-800">
                  {fileInfo?.failed_measurements ?? measurementsData.measurements.filter(m => m.measurement_status === 'FAILED').length}
                </span>
              </div>
            </div>
          </div>

          {/* Raw JSON Viewer Panel (Expandable) */}
          {showRawJson && (
            <div className="bg-navy-950 text-slate-200 rounded-xl p-4 border border-navy-800 font-mono text-xs space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-navy-800">
                <span className="text-slate-400 text-[11px]">Backend JSON Response</span>
                <button
                  onClick={() => copyToClipboard(JSON.stringify(measurementsData, null, 2), true)}
                  className="text-xs text-teal-400 hover:text-teal-300 inline-flex items-center gap-1"
                >
                  {copiedJson ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedJson ? 'Copied!' : 'Copy JSON'}</span>
                </button>
              </div>
              <pre className="max-h-60 overflow-y-auto p-2 bg-navy-900 rounded text-[11px] text-teal-300">
                {JSON.stringify(measurementsData, null, 2)}
              </pre>
            </div>
          )}

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-2 pb-1">
            <span className="text-xs font-semibold text-slate-500 mr-2">Filter by Geometry:</span>
            {[
              { id: 'ALL', label: `All (${measurementsData.total_features})` },
              { id: 'POLYGON', label: 'Polygons' },
              { id: 'LINESTRING', label: 'LineStrings' },
              { id: 'POINT', label: 'Points' },
              { id: 'OTHER', label: 'Other/Unsupported' }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  selectedFilter === f.id
                    ? 'bg-navy-900 text-white font-semibold'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Feature Measurements Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3 w-16">Index</th>
                    <th className="px-5 py-3">Geometry</th>
                    <th className="px-5 py-3">Calculated Measurement</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Attributes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMeasurements.map((m: MeasurementItem) => {
                    const isPolygon = m.geometry_type.toLowerCase().includes('polygon');
                    const isLine = m.geometry_type.toLowerCase().includes('line');
                    const isPoint = m.geometry_type.toLowerCase().includes('point');
                    const hasError = !!m.error_message;
                    const isExpanded = !!expandedProperties[m.feature_index];

                    return (
                      <React.Fragment key={m.id || m.feature_index}>
                        <tr className="hover:bg-slate-50/70 transition-colors">
                          {/* Index */}
                          <td className="px-5 py-4 font-mono font-bold text-slate-500">
                            #{m.feature_index}
                          </td>

                          {/* Geometry Badge */}
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border ${
                              isPolygon
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : isLine
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : isPoint
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {m.geometry_type}
                            </span>
                          </td>

                          {/* Measurement Display */}
                          <td className="px-5 py-4">
                            {isPolygon && (
                              <div className="space-y-0.5">
                                <div className="font-semibold text-slate-900 text-sm">
                                  {formatNumber(m.area)}{' '}
                                  <span className="text-xs font-normal text-slate-600">{m.measurement_unit || m.unit || 'm²'}</span>
                                </div>
                                <span className="text-[10px] text-slate-500">Area (Projected UTM)</span>
                              </div>
                            )}

                            {isLine && (
                              <div className="space-y-0.5">
                                <div className="font-semibold text-slate-900 text-sm">
                                  {formatNumber(m.length)}{' '}
                                  <span className="text-xs font-normal text-slate-600">{m.measurement_unit || m.unit || 'm'}</span>
                                </div>
                                <span className="text-[10px] text-slate-500">Length (Projected UTM)</span>
                              </div>
                            )}

                            {isPoint && (
                              <div className="space-y-0.5">
                                <span className="text-slate-400 font-bold">—</span>
                                <span className="block text-[10px] text-emerald-600 font-medium">
                                  Measurement not required
                                </span>
                              </div>
                            )}

                            {!isPolygon && !isLine && !isPoint && (
                              <div className="space-y-0.5">
                                <span className="text-slate-400 font-bold">—</span>
                                <span className="block text-[10px] text-amber-600">
                                  {m.measurement_status}
                                </span>
                              </div>
                            )}

                            {hasError && (
                              <p className="text-[11px] text-rose-600 mt-1">
                                {m.error_message}
                              </p>
                            )}
                          </td>

                          {/* Status Badge */}
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${
                              m.measurement_status === 'COMPLETED'
                                ? 'bg-teal-50 text-teal-700 border-teal-200'
                                : m.measurement_status === 'NOT_REQUIRED'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : m.measurement_status === 'UNSUPPORTED'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}>
                              {m.measurement_status === 'COMPLETED' && <CheckCircle2 className="w-3 h-3 text-teal-600" />}
                              {m.measurement_status === 'NOT_REQUIRED' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                              {m.measurement_status === 'UNSUPPORTED' && <HelpCircle className="w-3 h-3 text-amber-600" />}
                              {m.measurement_status === 'FAILED' && <XCircle className="w-3 h-3 text-rose-600" />}
                              <span>{m.measurement_status}</span>
                            </span>
                          </td>

                          {/* Expand Attributes Button */}
                          <td className="px-5 py-4 text-right">
                            {m.properties && Object.keys(m.properties).length > 0 ? (
                              <button
                                onClick={() => togglePropertyExpand(m.feature_index)}
                                className="inline-flex items-center gap-1 text-slate-600 hover:text-teal-600 font-medium px-2 py-1 rounded hover:bg-slate-100 transition-colors"
                              >
                                <span>{Object.keys(m.properties).length} attrs</span>
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </button>
                            ) : (
                              <span className="text-slate-400 italic">None</span>
                            )}
                          </td>
                        </tr>

                        {/* Expanded Attributes Panel */}
                        {isExpanded && m.properties && (
                          <tr className="bg-slate-50/90">
                            <td colSpan={5} className="px-8 py-3 border-y border-slate-100">
                              <div className="space-y-1.5">
                                <span className="font-semibold text-[11px] text-slate-600 uppercase tracking-wider block">
                                  Feature #{m.feature_index} Properties
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 bg-white p-3 rounded-lg border border-slate-200">
                                  {Object.entries(m.properties).map(([key, val]) => (
                                    <div key={key} className="truncate">
                                      <span className="text-slate-500 text-[11px] font-mono mr-1.5">{key}:</span>
                                      <span className="font-semibold text-slate-800 text-xs">
                                        {val !== null && val !== undefined ? String(val) : '—'}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredMeasurements.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-500">
                No features match the selected filter ({selectedFilter}).
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
