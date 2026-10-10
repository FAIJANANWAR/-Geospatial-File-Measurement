import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileCheck2,
  AlertCircle,
  Loader2,
  FileText,
  Copy,
  Check,
  ArrowRight,
  RefreshCw,
  Info,
  Archive
} from 'lucide-react';
import { uploadGeospatialFile } from '../api/client';
import type { FileUploadResponse, ApiError } from '../types/api';

interface UploadViewProps {
  onUploadSuccess: (fileRecord: FileUploadResponse) => void;
  onNavigateToMeasurements: (fileId: string) => void;
}

export const UploadView: React.FC<UploadViewProps> = ({
  onUploadSuccess,
  onNavigateToMeasurements
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<ApiError | null>(null);
  const [uploadResult, setUploadResult] = useState<FileUploadResponse | null>(null);
  const [copiedId, setCopiedId] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const handleFileSelection = (file: File) => {
    setUploadError(null);
    setUploadResult(null);

    // Client-side advisory validation (backend remains authoritative)
    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith('.kml') && !lowerName.endsWith('.zip')) {
      setUploadError({
        statusCode: 400,
        message: 'Invalid extension: Only .kml files or .zip Shapefile archives are supported.'
      });
      return;
    }

    if (file.size === 0) {
      setUploadError({
        statusCode: 400,
        message: 'Empty file: Uploaded file contains 0 bytes.'
      });
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setUploadError({
        statusCode: 413,
        message: 'File size exceeds maximum allowed limit of 25 MB.'
      });
      return;
    }

    setSelectedFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile || isUploading) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadResult(null);

    try {
      const result = await uploadGeospatialFile(selectedFile);
      setUploadResult(result);
      onUploadSuccess(result);
    } catch (err: any) {
      setUploadError(err);
    } finally {
      setIsUploading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setUploadError(null);
    setUploadResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Upload & Measure</h1>
        <p className="text-sm text-slate-500 mt-1">
          Upload real <code className="bg-slate-100 text-teal-700 font-semibold px-1 py-0.5 rounded">.kml</code> or{' '}
          <code className="bg-slate-100 text-blue-700 font-semibold px-1 py-0.5 rounded">.zip</code> Shapefile datasets
          for metric measurement and CRS evaluation.
        </p>
      </div>

      {/* Main Upload Area */}
      <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm space-y-6">
        <input
          ref={fileInputRef}
          type="file"
          accept=".kml,.zip"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleFileSelection(e.target.files[0]);
            }
          }}
        />

        {/* Drag & Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-teal-500 bg-teal-50/50 scale-[0.99]'
              : 'border-slate-300 hover:border-teal-500 hover:bg-slate-50/60 bg-slate-50/30'
          }`}
        >
          <div className="w-14 h-14 rounded-full bg-teal-50 text-teal-600 border border-teal-200/60 mx-auto flex items-center justify-center mb-4 shadow-sm">
            <UploadCloud className="w-7 h-7" />
          </div>
          <h3 className="font-semibold text-slate-800 text-base">
            Drag and drop your geospatial file here
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Select a <strong className="text-slate-700">.kml</strong> file or a <strong className="text-slate-700">.zip</strong> archive
            containing a complete Shapefile dataset (<code className="text-[11px]">.shp</code>, <code className="text-[11px]">.shx</code>, <code className="text-[11px]">.dbf</code>).
          </p>
          <div className="mt-4">
            <button
              type="button"
              disabled={isUploading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition-colors"
            >
              Browse Local Files
            </button>
          </div>
          <div className="mt-3 text-[11px] text-slate-400">
            Maximum file size: 25 MB
          </div>
        </div>

        {/* Selected File Card */}
        {selectedFile && (
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
                {selectedFile.name.endsWith('.zip') ? (
                  <Archive className="w-5 h-5 text-blue-600" />
                ) : (
                  <FileText className="w-5 h-5 text-teal-600" />
                )}
              </div>
              <div className="truncate">
                <div className="font-semibold text-sm text-slate-800 truncate" title={selectedFile.name}>
                  {selectedFile.name}
                </div>
                <div className="text-xs text-slate-500">
                  {formatFileSize(selectedFile.size)} • {selectedFile.name.split('.').pop()?.toUpperCase()} format
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={handleReset}
                disabled={isUploading}
                className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1 rounded"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleUploadSubmit}
                disabled={isUploading}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing & Measuring...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    <span>Upload & Process</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Error Alert Display */}
        {uploadError && (
          <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-1">
            <div className="flex items-center gap-2 font-semibold text-sm text-rose-900">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                Upload Error {uploadError.statusCode > 0 && `(HTTP ${uploadError.statusCode})`}
              </span>
            </div>
            <p className="pl-6 text-rose-700">{uploadError.message}</p>
            {uploadError.detail && uploadError.detail !== uploadError.message && (
              <p className="pl-6 font-mono text-[11px] text-rose-600 mt-1 break-all bg-rose-100/60 p-2 rounded">
                Detail: {uploadError.detail}
              </p>
            )}
          </div>
        )}

        {/* Successful Upload Result Banner */}
        {uploadResult && (
          <div className="p-6 rounded-xl bg-teal-50/70 border border-teal-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center shrink-0">
                  <FileCheck2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">File Successfully Processed</h4>
                  <span className="text-xs text-teal-700">All features parsed and measured</span>
                </div>
              </div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                uploadResult.status === 'COMPLETED'
                  ? 'bg-teal-100 text-teal-800 border border-teal-300'
                  : uploadResult.status === 'PARTIALLY_COMPLETED'
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : 'bg-rose-100 text-rose-800 border border-rose-300'
              }`}>
                {uploadResult.status}
              </span>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 rounded-lg border border-teal-100 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Filename</span>
                <span className="font-semibold text-slate-800 truncate block" title={uploadResult.filename}>
                  {uploadResult.filename}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Feature Count</span>
                <span className="font-semibold text-slate-800">{uploadResult.feature_count} features</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Source CRS</span>
                <span className="font-mono text-slate-800 text-[11px]">{uploadResult.source_crs || '—'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">File ID</span>
                <div className="flex items-center gap-1">
                  <span className="font-mono text-slate-700 truncate max-w-[80px]" title={uploadResult.id}>
                    {uploadResult.id}
                  </span>
                  <button
                    onClick={() => copyToClipboard(uploadResult.id)}
                    className="text-slate-400 hover:text-teal-600 p-0.5"
                    title="Copy File ID"
                  >
                    {copiedId ? <Check className="w-3.5 h-3.5 text-teal-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* CTA to View Measurements */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={handleReset}
                className="text-xs text-slate-600 hover:text-slate-800 font-medium inline-flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Upload Another File</span>
              </button>
              <button
                onClick={() => onNavigateToMeasurements(uploadResult.id)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs shadow-sm transition-all"
              >
                <span>View Measurements</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Helpful Geospatial Format Tips Card */}
      <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 text-xs text-slate-600 space-y-3">
        <div className="flex items-center gap-2 font-semibold text-slate-800">
          <Info className="w-4 h-4 text-teal-600" />
          <span>Geospatial Ingestion Guidelines</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 bg-white rounded-lg border border-slate-200/80 space-y-1">
            <h5 className="font-semibold text-slate-800">KML Files (.kml)</h5>
            <p className="text-[11px] text-slate-500">
              Standard OGC KML 2.2 XML containing Placemarks with Polygon, LineString, or Point geometries.
              Always interpreted as WGS84 coordinates.
            </p>
          </div>
          <div className="p-3 bg-white rounded-lg border border-slate-200/80 space-y-1">
            <h5 className="font-semibold text-slate-800">Shapefile Archives (.zip)</h5>
            <p className="text-[11px] text-slate-500">
              Must include at least <code className="text-slate-700">.shp</code> (geometry), <code className="text-slate-700">.shx</code> (index),
              and <code className="text-slate-700">.dbf</code> (attributes). Include <code className="text-slate-700">.prj</code> for explicit projection definition.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
