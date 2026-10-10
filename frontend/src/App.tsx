import { useState, useEffect } from 'react';
import {
  Sidebar,
  type NavigationTab
} from './components/Sidebar';
import { OverviewView } from './components/OverviewView';
import { UploadView } from './components/UploadView';
import { MeasurementsView } from './components/MeasurementsView';
import { HistoryView } from './components/HistoryView';
import { ApiStatusView } from './components/ApiStatusView';
import { ApiDocsView } from './components/ApiDocsView';
import { checkBackendHealth, getApiBaseUrl, setApiBaseUrl } from './api/client';
import type { SessionFileItem, FileUploadResponse } from './types/api';
import {
  Menu,
  X,
  ExternalLink,
  Loader2,
  Server
} from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<NavigationTab>('overview');
  const [selectedFileId, setSelectedFileId] = useState<string>('');
  const [sessionFiles, setSessionFiles] = useState<SessionFileItem[]>([]);
  const [backendStatus, setBackendStatus] = useState<'Checking' | 'Online' | 'Unavailable'>('Checking');
  const [backendLatency, setBackendLatency] = useState<number | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [currentApiUrl, setCurrentApiUrl] = useState<string>(getApiBaseUrl());

  // Initial and on-demand backend healthcheck
  const refreshHealth = async (targetUrl?: string) => {
    setBackendStatus('Checking');
    const res = await checkBackendHealth(targetUrl);
    setBackendStatus(res.status);
    setBackendLatency(res.latencyMs);
  };

  const handleBackendChange = (newUrl: string) => {
    setApiBaseUrl(newUrl);
    setCurrentApiUrl(newUrl);
    refreshHealth(newUrl);
  };

  useEffect(() => {
    refreshHealth();
  }, []);

  // When a file is uploaded successfully
  const handleUploadSuccess = (uploaded: FileUploadResponse) => {
    const newItem: SessionFileItem = {
      id: uploaded.id,
      filename: uploaded.filename,
      file_size: uploaded.file_size,
      file_type: uploaded.file_type,
      status: uploaded.status,
      feature_count: uploaded.feature_count,
      source_crs: uploaded.source_crs,
      uploaded_at: new Date().toISOString()
    };

    setSessionFiles((prev) => [newItem, ...prev]);
    setSelectedFileId(uploaded.id);
  };

  const handleNavigateToMeasurements = (fileId: string) => {
    setSelectedFileId(fileId);
    setActiveTab('measurements');
    setIsMobileMenuOpen(false);
  };

  const handleTabSelect = (tab: NavigationTab) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 overflow-hidden font-sans">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex shrink-0">
        <Sidebar
          activeTab={activeTab}
          onTabChange={handleTabSelect}
          backendStatus={backendStatus}
          backendLatency={backendLatency}
          onRecheckHealth={() => refreshHealth(currentApiUrl)}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-navy-950/70 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative z-10 w-64 flex">
            <Sidebar
              activeTab={activeTab}
              onTabChange={handleTabSelect}
              backendStatus={backendStatus}
              backendLatency={backendLatency}
              onRecheckHealth={() => refreshHealth(currentApiUrl)}
            />
          </div>
        </div>
      )}

      {/* Main Workspace Column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-sm tracking-tight lg:hidden">GeoMeasure</span>
              <span className="hidden sm:inline text-xs text-slate-400">/</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-teal-700 bg-teal-50 px-2.5 py-1 rounded-md border border-teal-200">
                {activeTab.replace('-', ' ')}
              </span>
            </div>
          </div>

          {/* Quick Info & Backend Switcher */}
          <div className="flex items-center gap-3">
            {/* Backend URL Switcher */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-xs">
              <Server className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-[11px] text-slate-500 font-medium">Backend:</span>
              <select
                value={currentApiUrl}
                onChange={(e) => handleBackendChange(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="http://127.0.0.1:8000">Local (127.0.0.1:8000)</option>
                <option value="https://geospatial-measurement-api-hxpu.onrender.com">Render Cloud</option>
              </select>
            </div>

            {/* Live status badge */}
            <div className="flex items-center gap-2 text-xs font-medium px-2.5 py-1 rounded-full border bg-slate-50 border-slate-200">
              {backendStatus === 'Online' && (
                <>
                  <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                  <span className="text-slate-700 font-semibold text-[11px]">Online</span>
                  {backendLatency !== null && <span className="text-slate-400 text-[10px]">({backendLatency}ms)</span>}
                </>
              )}
              {backendStatus === 'Checking' && (
                <>
                  <Loader2 className="w-3 h-3 text-amber-500 animate-spin" />
                  <span className="text-slate-600 text-[11px]">Connecting...</span>
                </>
              )}
              {backendStatus === 'Unavailable' && (
                <>
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span className="text-rose-700 font-semibold text-[11px]">Offline</span>
                </>
              )}
            </div>

            <a
              href={`${currentApiUrl}/docs`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors shadow-2xs"
            >
              <span>Swagger</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
          </div>
        </header>

        {/* Dynamic Main Body Scroll Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50/60">
          {activeTab === 'overview' && (
            <OverviewView
              onNavigateToUpload={() => setActiveTab('upload')}
              onNavigateToMeasurements={handleNavigateToMeasurements}
              sessionFiles={sessionFiles}
              backendStatus={backendStatus}
              backendLatency={backendLatency}
              onRecheckHealth={refreshHealth}
            />
          )}

          {activeTab === 'upload' && (
            <UploadView
              onUploadSuccess={handleUploadSuccess}
              onNavigateToMeasurements={handleNavigateToMeasurements}
            />
          )}

          {activeTab === 'measurements' && (
            <MeasurementsView initialFileId={selectedFileId} />
          )}

          {activeTab === 'history' && (
            <HistoryView
              sessionFiles={sessionFiles}
              onNavigateToUpload={() => setActiveTab('upload')}
              onNavigateToMeasurements={handleNavigateToMeasurements}
            />
          )}

          {activeTab === 'status' && (
            <ApiStatusView
              backendStatus={backendStatus}
              backendLatency={backendLatency}
              onRecheckHealth={refreshHealth}
            />
          )}

          {activeTab === 'docs' && <ApiDocsView />}
        </main>
      </div>
    </div>
  );
}

export default App;
