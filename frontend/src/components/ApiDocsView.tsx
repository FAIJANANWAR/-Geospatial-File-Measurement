import { useState } from 'react';
import {
  ExternalLink,
  Copy,
  Check,
  Compass,
  Terminal
} from 'lucide-react';
import { API_BASE_URL } from '../api/client';

export const ApiDocsView: React.FC = () => {
  const [copiedCurl, setCopiedCurl] = useState<string | null>(null);

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCurl(id);
    setTimeout(() => setCopiedCurl(null), 2000);
  };

  const curlUploadKml = `curl -X POST "${API_BASE_URL}/api/files/" \\
  -F "file=@polygon.kml"`;

  const curlUploadShapefile = `curl -X POST "${API_BASE_URL}/api/files/" \\
  -F "file=@shapefile_sample.zip"`;

  const curlGetMeasurements = `curl -X GET "${API_BASE_URL}/api/files/<FILE_ID>/measurements/"`;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">API Documentation & Usage</h1>
          <p className="text-sm text-slate-500 mt-1">
            Reference guide for programmatically interacting with the Geospatial File Measurement API.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={`${API_BASE_URL}/docs`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <span>Interactive Swagger UI</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <a
            href={`${API_BASE_URL}/redoc`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <span>ReDoc Spec</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* CRS Math & Projection Strategy Card */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 text-slate-900 font-bold text-base">
          <Compass className="w-5 h-5 text-teal-600" />
          <h2>Why Degree-Based Spatial Calculations Are Prohibited</h2>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          Geographic coordinate systems such as <strong>WGS84 (EPSG:4326)</strong> express locations in angular degrees
          (latitude, longitude). On a spheroid, the linear ground distance of 1 degree longitude shrinks dramatically from
          equator (~111 km) towards the poles (0 km). Directly taking <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">geom.area</code> or <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">geom.length</code> in degrees produces mathematically invalid, unit-less numbers.
        </p>

        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs text-slate-700 space-y-2">
          <span className="font-semibold block text-slate-900">Application Resolution Strategy:</span>
          <ol className="list-decimal pl-5 space-y-1 text-slate-600">
            <li><strong>CRS Detection:</strong> Reads EPSG code from vector layer metadata or Shapefile <code className="text-slate-800">.prj</code>.</li>
            <li><strong>Missing CRS Validation:</strong> Validates coordinate bounds against [-180..180, -90..90] before inferring EPSG:4326; fails with explicit error if coordinates exceed geographic bounds.</li>
            <li><strong>Centroid Projection:</strong> Computes feature centroid longitude to select the optimal Universal Transverse Mercator (UTM) Zone formula: <code className="text-slate-800">Zone = Math.floor((lon + 180) / 6) + 1</code>.</li>
            <li><strong>PyProj Transformation:</strong> Projects geometries into local metric coordinates before invoking Shapely area (m²) or length (m or km).</li>
          </ol>
        </div>
      </div>

      {/* cURL Usage Samples */}
      <div className="space-y-6">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Terminal className="w-5 h-5 text-teal-600" />
          <span>cURL Examples</span>
        </h2>

        {/* Upload KML */}
        <div className="bg-navy-950 rounded-xl p-5 border border-navy-800 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span className="font-semibold text-teal-400">1. Upload KML File</span>
            <button
              onClick={() => copyCode(curlUploadKml, 'kml')}
              className="text-xs text-slate-400 hover:text-white inline-flex items-center gap-1.5"
            >
              {copiedCurl === 'kml' ? <Check className="w-3.5 h-3.5 text-teal-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCurl === 'kml' ? 'Copied' : 'Copy cURL'}</span>
            </button>
          </div>
          <pre className="text-xs font-mono text-slate-200 overflow-x-auto p-3 bg-navy-900 rounded-lg">
            {curlUploadKml}
          </pre>
        </div>

        {/* Upload Shapefile ZIP */}
        <div className="bg-navy-950 rounded-xl p-5 border border-navy-800 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span className="font-semibold text-teal-400">2. Upload Shapefile Archive (.zip)</span>
            <button
              onClick={() => copyCode(curlUploadShapefile, 'zip')}
              className="text-xs text-slate-400 hover:text-white inline-flex items-center gap-1.5"
            >
              {copiedCurl === 'zip' ? <Check className="w-3.5 h-3.5 text-teal-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCurl === 'zip' ? 'Copied' : 'Copy cURL'}</span>
            </button>
          </div>
          <pre className="text-xs font-mono text-slate-200 overflow-x-auto p-3 bg-navy-900 rounded-lg">
            {curlUploadShapefile}
          </pre>
        </div>

        {/* Get Measurements */}
        <div className="bg-navy-950 rounded-xl p-5 border border-navy-800 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span className="font-semibold text-teal-400">3. Retrieve Metric Measurements</span>
            <button
              onClick={() => copyCode(curlGetMeasurements, 'measure')}
              className="text-xs text-slate-400 hover:text-white inline-flex items-center gap-1.5"
            >
              {copiedCurl === 'measure' ? <Check className="w-3.5 h-3.5 text-teal-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCurl === 'measure' ? 'Copied' : 'Copy cURL'}</span>
            </button>
          </div>
          <pre className="text-xs font-mono text-slate-200 overflow-x-auto p-3 bg-navy-900 rounded-lg">
            {curlGetMeasurements}
          </pre>
        </div>
      </div>
    </div>
  );
};
