import {
  History,
  FileText,
  ArrowRight,
  Info,
  Archive,
  UploadCloud
} from 'lucide-react';
import type { SessionFileItem } from '../types/api';

interface HistoryViewProps {
  sessionFiles: SessionFileItem[];
  onNavigateToUpload: () => void;
  onNavigateToMeasurements: (fileId: string) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  sessionFiles,
  onNavigateToUpload,
  onNavigateToMeasurements
}) => {
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Page Title */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Measurement History</h1>
          <span className="text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full">
            Session-Only State
          </span>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Review datasets ingested during your current browser session.
        </p>
      </div>

      {/* Persistence Notice Card */}
      <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200/70 text-blue-900 text-xs flex items-start gap-3">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-semibold block text-slate-800">Architectural Note on History</span>
          <p className="text-slate-600 leading-relaxed text-[11px]">
            The backend API deliberately does not provide an open all-files listing endpoint.
            This history reflects files uploaded within your active browser tab.
            To inspect any previous file at any time, you can also search directly by its unique UUID in the Measurement Results tab.
          </p>
        </div>
      </div>

      {/* History Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {sessionFiles.length === 0 ? (
          <div className="p-16 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
              <History className="w-6 h-6" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="font-semibold text-slate-800 text-sm">No Files Uploaded Yet</h3>
              <p className="text-xs text-slate-500">
                Uploaded files in this session will automatically appear here with full metadata summaries.
              </p>
            </div>
            <button
              onClick={onNavigateToUpload}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-medium text-xs shadow-xs transition-colors"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Go to Upload Zone</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">Dataset Name</th>
                  <th className="px-6 py-3.5">Format</th>
                  <th className="px-6 py-3.5">File Size</th>
                  <th className="px-6 py-3.5">Features</th>
                  <th className="px-6 py-3.5">Source CRS</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sessionFiles.map((file) => (
                  <tr key={file.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      <div className="flex items-center gap-2.5">
                        {file.file_type === 'zip' ? (
                          <Archive className="w-4 h-4 text-blue-600 shrink-0" />
                        ) : (
                          <FileText className="w-4 h-4 text-teal-600 shrink-0" />
                        )}
                        <span className="truncate max-w-[220px]" title={file.filename}>
                          {file.filename}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate max-w-[220px]">
                        ID: {file.id}
                      </div>
                    </td>
                    <td className="px-6 py-4 uppercase font-mono text-slate-600 font-semibold">
                      .{file.file_type}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {formatFileSize(file.file_size)}
                    </td>
                    <td className="px-6 py-4 text-slate-800 font-semibold">
                      {file.feature_count}
                    </td>
                    <td className="px-6 py-4 font-mono text-[11px] text-slate-600">
                      {file.source_crs || '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${
                        file.status === 'COMPLETED'
                          ? 'bg-teal-50 text-teal-700 border-teal-200'
                          : file.status === 'PARTIALLY_COMPLETED'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {file.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => onNavigateToMeasurements(file.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 font-semibold text-xs transition-colors"
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
