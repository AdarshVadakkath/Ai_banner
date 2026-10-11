import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Header } from './components/common/Header';
import { HelpModal } from './components/common/HelpModal';
import { DashboardPage } from './pages/DashboardPage';
import { CampaignEditorPage } from './pages/CampaignEditorPage';
export default function App() {
    const [currentView, setCurrentView] = useState('dashboard');
    const [activeProjectId, setActiveProjectId] = useState(undefined);
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const handleOpenProject = (id) => {
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
    return (_jsxs("div", { className: "h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 font-['Plus_Jakarta_Sans',sans-serif] flex flex-col", children: [currentView === 'dashboard' && (_jsx(Header, { currentView: currentView, onNavigateDashboard: handleBackToDashboard, onNewCampaign: handleNewCampaign, onOpenHelp: () => setIsHelpOpen(true) })), _jsx("div", { className: "flex-1 overflow-hidden", children: currentView === 'dashboard' ? (_jsx("div", { className: "h-full overflow-y-auto", children: _jsx(DashboardPage, { onOpenProject: handleOpenProject, onNewCampaign: handleNewCampaign }) })) : (_jsx(CampaignEditorPage, { initialProjectId: activeProjectId, onBackToDashboard: handleBackToDashboard })) }), _jsx(HelpModal, { isOpen: isHelpOpen, onClose: () => setIsHelpOpen(false) })] }));
}
