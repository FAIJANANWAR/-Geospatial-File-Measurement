import React from 'react';
import {
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  ExternalLink,
  Layers,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Compass
} from 'lucide-react';
import type { SessionFileItem } from '../types/api';
import { API_BASE_URL } from '../api/client';

interface OverviewViewProps {
  onNavigateToUpload: () => void;
  onNavigateToMeasurements: (fileId: string) => void;
  sessionFiles: SessionFileItem[];
  backendStatus: 'Checking' | 'Online' | 'Unavailable';
  backendLatency: number | null;
  onRecheckHealth: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  onNavigateToUpload,
  onNavigateToMeasurements,
  sessionFiles,
  backendStatus,
  backendLatency,
  onRecheckHealth
}) => {
  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Hero Welcome Card */}
      <div className="bg-gradient-to-r from-navy-900 to-navy-800 text-white rounded-xl p-8 shadow-sm border border-navy-800 relative overflow-hidden">
        <div className="max-w-2xl relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-medium border border-teal-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>FastAPI + GeoPandas + Shapely + PyProj Backend</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            GeoMeasure
          </h1>
          <p className="text-slate-300 text-base leading-relaxed">
            Professional geospatial analytics and measurement engine. Ingests KML and ESRI Shapefile archives,
            identifies coordinate reference systems, dynamically projects geographic coordinates to local UTM zones,
            and calculates accurate polygon areas and linestring lengths.
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-4">
            <button
              onClick={onNavigateToUpload}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-navy-950 font-semibold text-sm shadow-md transition-all active:scale-95"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload Geospatial File</span>
            </button>
            <a
              href={`${API_BASE_URL}/docs`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-navy-800/80 hover:bg-navy-700 text-slate-200 font-medium text-sm border border-navy-700 transition-colors"
            >
              <span>Explore Swagger API Docs</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </a>
          </div>
        </div>
      </div>

      {/* Status & Capabilities Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Backend Connection Card */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Backend Status
              </span>
              <button
                onClick={onRecheckHealth}
                className="text-xs text-teal-600 hover:text-teal-700 font-medium"
              >
                Re-check
              </button>
            </div>
            <div className="flex items-center gap-3">
              {backendStatus === 'Checking' && (
                <>
                  <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 border border-amber-200">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800">Checking Health...</div>
                    <div className="text-xs text-slate-500">Pinging {API_BASE_URL}</div>
                  </div>
                </>
              )}
              {backendStatus === 'Online' && (
                <>
                  <div className="w-9 h-9 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 border border-teal-200">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800 flex items-center gap-2">
                      <span>Live & Operational</span>
                      {backendLatency !== null && (
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-normal">
                          {backendLatency} ms
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 truncate max-w-[200px]" title={API_BASE_URL}>
                      {API_BASE_URL}
                    </div>
                  </div>
                </>
              )}
              {backendStatus === 'Unavailable' && (
                <>
                  <div className="w-9 h-9 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 border border-rose-200">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800">Server Unavailable</div>
                    <div className="text-xs text-rose-600">Failed to connect to backend</div>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="pt-4 border-t border-slate-100 text-xs text-slate-500">
            Endpoint: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">GET /health</code>
          </div>
        </div>

        {/* Ingestion Support Card */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-slate-700">
              <Layers className="w-5 h-5 text-teal-600" />
              <h3 className="font-semibold text-sm">Supported Formats</h3>
            </div>
            <ul className="text-xs text-slate-600 space-y-2">
              <li className="flex items-start gap-2">
                <span className="font-mono font-bold bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded border border-teal-200">.kml</span>
                <span>Google Earth XML with Placemarks, Polygons, Lines & Points.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-mono font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">.zip</span>
                <span>Shapefiles containing <code className="text-slate-800">.shp</code>, <code className="text-slate-800">.shx</code>, <code className="text-slate-800">.dbf</code> and <code className="text-slate-800">.prj</code>.</span>
              </li>
            </ul>
          </div>
          <div className="pt-4 border-t border-slate-100 text-xs text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
            <span>Zip-Slip path-traversal protected</span>
          </div>
        </div>

        {/* CRS Strategy Card */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-slate-700">
              <Compass className="w-5 h-5 text-teal-600" />
              <h3 className="font-semibold text-sm">CRS Dynamic Projection</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Angular degrees (WGS84 / EPSG:4326) are never directly measured. Centroid coordinates
              are mathematically resolved to optimal local UTM zones for metric accuracy.
            </p>
          </div>
          <div className="pt-4 border-t border-slate-100 text-xs text-slate-500 font-mono">
            Polygon Area (m²) | Line Length (m/km)
          </div>
        </div>
      </div>

      {/* Recent Session Uploads Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-slate-800">Current Session Uploads</h2>
            <span className="text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
              Session-only state
            </span>
          </div>
          {sessionFiles.length > 0 && (
            <button
              onClick={onNavigateToUpload}
              className="text-xs font-medium text-teal-600 hover:text-teal-700 flex items-center gap-1"
            >
              <span>Upload Another File</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {sessionFiles.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h4 className="text-sm font-semibold text-slate-800">No uploads in current session</h4>
              <p className="text-xs text-slate-500">
                The backend does not expose an all-files listing endpoint. Any file uploaded in this browser
                session will appear here for easy access.
              </p>
            </div>
            <button
              onClick={onNavigateToUpload}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-medium text-xs shadow-sm transition-colors"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload Your First Geospatial File</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">File Name</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Features</th>
                  <th className="px-6 py-3">Source CRS</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sessionFiles.map((file) => (
                  <tr key={file.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-3.5 font-medium text-slate-900">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[200px]" title={file.filename}>{file.filename}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 uppercase font-mono text-slate-500">{file.file_type}</td>
                    <td className="px-6 py-3.5 text-slate-600">{file.feature_count}</td>
                    <td className="px-6 py-3.5 text-slate-600 font-mono text-[11px]">{file.source_crs || '—'}</td>
                    <td className="px-6 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                        file.status === 'COMPLETED'
                          ? 'bg-teal-50 text-teal-700 border border-teal-200'
                          : file.status === 'PARTIALLY_COMPLETED'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {file.status}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <button
                        onClick={() => onNavigateToMeasurements(file.id)}
                        className="text-teal-600 hover:text-teal-700 font-medium inline-flex items-center gap-1"
                      >
                        <span>View Measurements</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
