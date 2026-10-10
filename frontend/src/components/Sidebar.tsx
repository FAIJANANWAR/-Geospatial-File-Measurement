import React from 'react';
import {
  LayoutDashboard,
  UploadCloud,
  History,
  Activity,
  FileCode,
  ExternalLink,
  Layers,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { API_BASE_URL } from '../api/client';

export type NavigationTab = 'overview' | 'upload' | 'measurements' | 'history' | 'status' | 'docs';

interface SidebarProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  backendStatus: 'Checking' | 'Online' | 'Unavailable';
  backendLatency: number | null;
  onRecheckHealth: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  backendStatus,
  backendLatency,
  onRecheckHealth
}) => {
  const navItems = [
    { id: 'overview' as NavigationTab, label: 'Overview', icon: LayoutDashboard },
    { id: 'upload' as NavigationTab, label: 'Upload & Measure', icon: UploadCloud },
    { id: 'history' as NavigationTab, label: 'Measurement History', icon: History },
    { id: 'status' as NavigationTab, label: 'API Status', icon: Activity },
    { id: 'docs' as NavigationTab, label: 'API Documentation', icon: FileCode }
  ];

  return (
    <aside className="w-64 bg-navy-900 text-slate-300 flex flex-col shrink-0 border-r border-navy-800 select-none">
      {/* Brand Header */}
      <div className="h-16 px-6 flex items-center gap-3 border-b border-navy-800 bg-navy-950">
        <div className="w-9 h-9 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30">
          <Layers className="w-5 h-5 text-teal-400" />
        </div>
        <div>
          <span className="font-bold text-white text-lg tracking-tight">GeoMeasure</span>
          <span className="block text-[10px] text-teal-400 uppercase tracking-widest font-semibold">Geospatial API</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Menu
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-teal-600 text-white shadow-sm font-semibold'
                  : 'text-slate-300 hover:bg-navy-800 hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}

        <div className="pt-6 px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Resources
        </div>
        <a
          href={`${API_BASE_URL}/docs`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-navy-800 hover:text-white transition-colors group"
        >
          <span className="flex items-center gap-3">
            <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-teal-400" />
            <span>Interactive Swagger UI</span>
          </span>
          <span className="text-[10px] bg-navy-800 text-teal-400 px-1.5 py-0.5 rounded border border-navy-700">/docs</span>
        </a>
      </nav>

      {/* Backend Health Badge Footer */}
      <div className="p-4 border-t border-navy-800 bg-navy-950/60">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-slate-400 font-medium">Backend Server</span>
          <button
            onClick={onRecheckHealth}
            title="Refresh API Health"
            className="text-[11px] text-slate-400 hover:text-teal-300 underline underline-offset-2 transition-colors"
          >
            Refresh
          </button>
        </div>

        <div className="flex items-center gap-2 p-2 rounded-md bg-navy-900 border border-navy-800">
          {backendStatus === 'Checking' && (
            <>
              <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin shrink-0" />
              <span className="text-xs text-amber-300">Pinging server...</span>
            </>
          )}
          {backendStatus === 'Online' && (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
              <span className="text-xs text-teal-300 font-medium">Online</span>
              {backendLatency !== null && (
                <span className="ml-auto text-[10px] text-slate-400">{backendLatency}ms</span>
              )}
            </>
          )}
          {backendStatus === 'Unavailable' && (
            <>
              <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span className="text-xs text-rose-300 font-medium">Unavailable</span>
            </>
          )}
        </div>
      </div>
    </aside>
  );
};
