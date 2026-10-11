import React, { useState } from 'react';
import { Header } from './components/common/Header';
import { HelpModal } from './components/common/HelpModal';
import { DashboardPage } from './pages/DashboardPage';
import { CampaignEditorPage } from './pages/CampaignEditorPage';

export default function App() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'editor'>('dashboard');
  const [activeProjectId, setActiveProjectId] = useState<string | undefined>(undefined);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const handleOpenProject = (id: string) => {
    setActiveProjectId(id);
    setCurrentView('editor');
  };

  const handleNewCampaign = () => {
    setActiveProjectId(undefined);
    setCurrentView('editor');
  };

  const handleBackToDashboard = () => {
    setActiveProjectId(undefined);
    setCurrentView('dashboard');
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 font-['Plus_Jakarta_Sans',sans-serif] flex flex-col">
      {currentView === 'dashboard' && (
        <Header
          currentView={currentView}
          onNavigateDashboard={handleBackToDashboard}
          onNewCampaign={handleNewCampaign}
          onOpenHelp={() => setIsHelpOpen(true)}
        />
      )}

      <div className="flex-1 overflow-hidden">
        {currentView === 'dashboard' ? (
          <div className="h-full overflow-y-auto">
            <DashboardPage
              onOpenProject={handleOpenProject}
              onNewCampaign={handleNewCampaign}
            />
          </div>
        ) : (
          <CampaignEditorPage
            initialProjectId={activeProjectId}
            onBackToDashboard={handleBackToDashboard}
          />
        )}
      </div>

      <HelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />
    </div>
  );
}
