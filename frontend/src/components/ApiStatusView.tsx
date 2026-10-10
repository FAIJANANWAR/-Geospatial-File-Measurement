import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  ExternalLink,
  Server,
  Zap,
  Globe,
  Radio
} from 'lucide-react';
import { API_BASE_URL } from '../api/client';

interface ApiStatusViewProps {
  backendStatus: 'Checking' | 'Online' | 'Unavailable';
  backendLatency: number | null;
  onRecheckHealth: () => void;
}

export const ApiStatusView: React.FC<ApiStatusViewProps> = ({
  backendStatus,
  backendLatency,
  onRecheckHealth
}) => {
  const endpoints = [
    {
      method: 'GET',
      path: '/health',
      description: 'System healthcheck and operational readiness ping.',
      badge: 'Public'
    },
    {
      method: 'POST',
      path: '/api/files/',
      description: 'Ingest geospatial .kml or .zip Shapefile; calculate metric measurements.',
      badge: 'Multipart/form-data'
    },
    {
      method: 'GET',
      path: '/api/files/{id}/',
      description: 'Retrieve file summary metadata, status, and feature count.',
      badge: 'JSON'
    },
    {
      method: 'GET',
      path: '/api/files/{id}/measurements/',
      description: 'Retrieve per-feature geometric measurements (area, length, unit, status).',
      badge: 'JSON'
    }
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Backend API Status</h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time health monitoring and connectivity status for the Geospatial API backend.
          </p>
        </div>

        <button
          onClick={onRecheckHealth}
          disabled={backendStatus === 'Checking'}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-xs transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${backendStatus === 'Checking' ? 'animate-spin text-teal-600' : ''}`} />
          <span>Test Ping Live</span>
        </button>
      </div>

      {/* Main Status Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Operational State Card */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Health Status</span>
            <Radio className="w-4 h-4 text-teal-500" />
          </div>
          <div className="flex items-center gap-3">
            {backendStatus === 'Checking' && (
              <>
                <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Checking Server</h3>
                  <p className="text-xs text-slate-500">Pinging /health endpoint...</p>
                </div>
              </>
            )}
            {backendStatus === 'Online' && (
              <>
                <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-teal-700 text-base">Operational</h3>
                  <p className="text-xs text-slate-500">Backend responded with 200 OK</p>
                </div>
              </>
            )}
            {backendStatus === 'Unavailable' && (
              <>
                <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-rose-700 text-base">Unavailable</h3>
                  <p className="text-xs text-rose-600">Failed to reach backend service</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Latency Card */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Response Latency</span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <div className="text-3xl font-extrabold text-slate-900">
              {backendLatency !== null ? `${backendLatency} ms` : '—'}
            </div>
            <p className="text-xs text-slate-500 mt-1">Round-trip HTTP request ping duration</p>
          </div>
        </div>

        {/* Server Host Card */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Connected Endpoint</span>
            <Globe className="w-4 h-4 text-blue-500" />
          </div>
          <div className="space-y-1">
            <div className="text-xs font-mono font-bold text-slate-800 break-all bg-slate-50 p-2 rounded border border-slate-100">
              {API_BASE_URL}
            </div>
            <a
              href={`${API_BASE_URL}/docs`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-700 font-semibold pt-1"
            >
              <span>Open Swagger Documentation</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Endpoint Directory */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Server className="w-4 h-4 text-teal-600" />
            <span>Documented API Endpoints</span>
          </h2>
          <span className="text-xs text-slate-500">FastAPI OpenAPI Specification</span>
        </div>

        <div className="divide-y divide-slate-100">
          {endpoints.map((ep) => (
            <div key={ep.path} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
              <div className="space-y-1.5">
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-0.5 rounded font-mono font-bold text-xs ${
                    ep.method === 'GET'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {ep.method}
                  </span>
                  <code className="text-sm font-bold text-slate-900 font-mono">{ep.path}</code>
                </div>
                <p className="text-xs text-slate-600">{ep.description}</p>
              </div>

              <span className="text-[11px] font-mono px-2 py-1 rounded bg-slate-100 text-slate-600 border border-slate-200 shrink-0 self-start sm:self-center">
                {ep.badge}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
