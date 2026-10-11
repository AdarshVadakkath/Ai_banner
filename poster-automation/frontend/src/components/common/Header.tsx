import React from 'react';
import { Layers, Plus, FolderKanban, HelpCircle, CheckCircle2 } from 'lucide-react';

interface HeaderProps {
  currentView: 'dashboard' | 'editor';
  onNavigateDashboard: () => void;
  onNewCampaign: () => void;
  onOpenHelp: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigateDashboard,
  onNewCampaign,
  onOpenHelp,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo & Name */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={onNavigateDashboard}>
          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-sm">
            <Layers className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-xl tracking-tight text-slate-900 font-['Space_Grotesk']">
                Formatly
              </span>
              <span className="px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-600 rounded-md border border-slate-200">
                Rule-Based
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              Multi-Format Poster Automation Platform
            </p>
          </div>
        </div>

        {/* Navigation Actions */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onNavigateDashboard}
            className={`px-3.5 py-2 text-sm font-medium rounded-lg transition-colors flex items-center space-x-2 ${
              currentView === 'dashboard'
                ? 'bg-slate-100 text-slate-900 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <FolderKanban className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">Projects</span>
          </button>

          <button
            onClick={onOpenHelp}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            title="System Specifications & Rules"
          >
            <HelpCircle className="w-5 h-5" />
          </button>

          <button
            onClick={onNewCampaign}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg shadow-sm transition-all flex items-center space-x-2 active:scale-98"
          >
            <Plus className="w-4 h-4" />
            <span>Create campaign</span>
          </button>
        </div>
      </div>
    </header>
  );
};
