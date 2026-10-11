import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { ApiService } from '../services/apiService';
import { ProjectCard } from '../components/projects/ProjectCard';
import { ProjectRenameModal } from '../components/projects/ProjectRenameModal';
import { Plus, FolderKanban, Layers, Sparkles, Search, CheckCircle2, Cpu, } from 'lucide-react';
export const DashboardPage = ({ onOpenProject, onNewCampaign, }) => {
    const [projects, setProjects] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [renameTarget, setRenameTarget] = useState(null);
    // Load projects and templates from API
    const loadData = async () => {
        try {
            setLoading(true);
            const [fetchedProjects, fetchedTemplates] = await Promise.all([
                ApiService.getProjects(),
                ApiService.getTemplates(),
            ]);
            setProjects(fetchedProjects);
            setTemplates(fetchedTemplates);
        }
        catch (err) {
            console.error('Failed to load dashboard data:', err);
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        loadData();
    }, []);
    // Handlers
    const handleRename = (id, currentName) => {
        setRenameTarget({ id, name: currentName });
    };
    const handleSaveRename = async (newName) => {
        if (!renameTarget)
            return;
        try {
            await ApiService.updateProject(renameTarget.id, { name: newName });
            setProjects((prev) => prev.map((p) => (p.id === renameTarget.id ? { ...p, name: newName } : p)));
        }
        catch (err) {
            console.error('Rename failed:', err);
        }
    };
    const handleDuplicate = async (id) => {
        try {
            const duplicated = await ApiService.duplicateProject(id);
            setProjects((prev) => [duplicated, ...prev]);
        }
        catch (err) {
            console.error('Duplicate failed:', err);
        }
    };
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [toastMessage, setToastMessage] = useState(null);
    const showToast = (msg) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3000);
    };
    const handleDelete = (id) => {
        const proj = projects.find((p) => p.id === id);
        setDeleteTarget({ id, name: proj?.name || 'this campaign' });
    };
    const handleConfirmDelete = async () => {
        if (!deleteTarget)
            return;
        const deletedName = deleteTarget.name;
        try {
            await ApiService.deleteProject(deleteTarget.id);
            setProjects((prev) => prev.filter((p) => p.id !== deleteTarget.id));
            showToast(`"${deletedName}" deleted successfully`);
        }
        catch (err) {
            console.error('Delete failed:', err);
        }
        finally {
            setDeleteTarget(null);
        }
    };
    const filteredProjects = projects.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return (_jsxs("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in", children: [_jsxs("div", { className: "bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 sm:p-10 text-white shadow-xl relative overflow-hidden", children: [_jsxs("div", { className: "relative z-10 max-w-2xl space-y-4", children: [_jsxs("div", { className: "inline-flex items-center space-x-2 bg-sky-500/20 text-sky-300 px-3 py-1 rounded-full text-xs font-semibold border border-sky-400/30", children: [_jsx(Cpu, { className: "w-3.5 h-3.5" }), _jsx("span", { children: "Rule-Based Deterministic Poster Engine" })] }), _jsx("h1", { className: "text-2xl sm:text-4xl font-extrabold tracking-tight font-['Space_Grotesk'] leading-tight", children: "Create every poster format with one click." }), _jsx("p", { className: "text-slate-300 text-sm sm:text-base leading-relaxed", children: "Enter your copy once, upload your brand assets, and let deterministic layout rules generate square social posts, portrait stories, landscape banners, and widescreen presentations with perfect typographic hierarchy." }), _jsx("div", { className: "pt-2 flex flex-wrap items-center gap-3", children: _jsxs("button", { onClick: onNewCampaign, className: "px-5 py-3 bg-white text-slate-900 hover:bg-slate-100 rounded-xl text-sm font-bold shadow-md transition-all flex items-center space-x-2 active:scale-98", children: [_jsx(Plus, { className: "w-4 h-4 text-slate-900" }), _jsx("span", { children: "Create campaign" })] }) })] }), _jsx("div", { className: "absolute right-0 top-0 bottom-0 w-1/3 opacity-15 pointer-events-none hidden md:block", children: _jsx("div", { className: "w-full h-full flex items-center justify-center", children: _jsx(Layers, { className: "w-80 h-80 text-sky-400" }) }) })] }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-4", children: [_jsxs("div", { className: "bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center space-x-4", children: [_jsx("div", { className: "w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center", children: _jsx(FolderKanban, { className: "w-6 h-6" }) }), _jsxs("div", { children: [_jsx("span", { className: "text-2xl font-extrabold text-slate-900 font-['Space_Grotesk']", children: projects.length }), _jsx("span", { className: "text-xs text-slate-500 block", children: "Saved Campaigns" })] })] }), _jsxs("div", { className: "bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center space-x-4", children: [_jsx("div", { className: "w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center", children: _jsx(Layers, { className: "w-6 h-6" }) }), _jsxs("div", { children: [_jsx("span", { className: "text-2xl font-extrabold text-slate-900 font-['Space_Grotesk']", children: "5+" }), _jsx("span", { className: "text-xs text-slate-500 block", children: "Aspect Ratio Presets" })] })] }), _jsxs("div", { className: "bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center space-x-4", children: [_jsx("div", { className: "w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center", children: _jsx(Sparkles, { className: "w-6 h-6" }) }), _jsxs("div", { children: [_jsx("span", { className: "text-2xl font-extrabold text-slate-900 font-['Space_Grotesk']", children: templates.length || 3 }), _jsx("span", { className: "text-xs text-slate-500 block", children: "Design Templates" })] })] })] }), _jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-xl font-bold text-slate-900", children: "Your Campaigns" }), _jsx("p", { className: "text-xs text-slate-500", children: "Open an existing campaign or start a new automated production run" })] }), _jsxs("div", { className: "flex items-center space-x-3", children: [_jsxs("div", { className: "relative", children: [_jsx(Search, { className: "w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" }), _jsx("input", { type: "text", value: searchQuery, onChange: (e) => setSearchQuery(e.target.value), placeholder: "Search campaigns...", className: "pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 w-56 sm:w-64" })] }), _jsxs("button", { onClick: onNewCampaign, className: "px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs flex items-center space-x-1.5 shrink-0", children: [_jsx(Plus, { className: "w-4 h-4" }), _jsx("span", { children: "New campaign" })] })] })] }), loading ? (_jsxs("div", { className: "py-20 flex flex-col items-center justify-center text-slate-400", children: [_jsx("div", { className: "w-8 h-8 border-3 border-slate-300 border-t-slate-800 rounded-full animate-spin mb-3" }), _jsx("span", { className: "text-xs font-medium", children: "Loading campaigns..." })] })) : filteredProjects.length === 0 ? (_jsxs("div", { className: "bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-lg mx-auto shadow-xs space-y-4", children: [_jsx("div", { className: "w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center", children: _jsx(FolderKanban, { className: "w-8 h-8" }) }), _jsxs("div", { children: [_jsx("h3", { className: "text-lg font-bold text-slate-900", children: "No campaigns found" }), _jsx("p", { className: "text-xs text-slate-500 mt-1 max-w-sm mx-auto", children: searchQuery
                                    ? `No projects match "${searchQuery}". Try a different search.`
                                    : 'Start your first automated multi-format campaign. Enter your copy once and generate all posters instantly.' })] }), _jsxs("button", { onClick: onNewCampaign, className: "px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-sm inline-flex items-center space-x-2", children: [_jsx(Plus, { className: "w-4 h-4" }), _jsx("span", { children: "Create your first campaign" })] })] })) : (_jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6", children: filteredProjects.map((project) => {
                    const template = templates.find((t) => t.id === project.templateId);
                    return (_jsx(ProjectCard, { project: project, template: template, onOpen: onOpenProject, onRename: handleRename, onDuplicate: handleDuplicate, onDelete: handleDelete }, project.id));
                }) })), renameTarget && (_jsx(ProjectRenameModal, { isOpen: true, currentName: renameTarget.name, onClose: () => setRenameTarget(null), onSave: handleSaveRename })), deleteTarget && (_jsx("div", { className: "fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in", children: _jsxs("div", { className: "bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4", children: [_jsx("div", { className: "w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center", children: _jsx("span", { className: "text-xl", children: "\u26A0\uFE0F" }) }), _jsxs("div", { children: [_jsx("h3", { className: "text-lg font-bold text-slate-900", children: "Delete Campaign?" }), _jsxs("p", { className: "text-xs text-slate-500 mt-1", children: ["Are you sure you want to delete ", _jsxs("span", { className: "font-semibold text-slate-800", children: ["\"", deleteTarget.name, "\""] }), "? This action cannot be undone."] })] }), _jsxs("div", { className: "flex items-center justify-end space-x-3 pt-2", children: [_jsx("button", { type: "button", onClick: () => setDeleteTarget(null), className: "px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer", children: "Cancel" }), _jsx("button", { type: "button", onClick: handleConfirmDelete, className: "px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-xs cursor-pointer", children: "Delete campaign" })] })] }) })), toastMessage && (_jsxs("div", { className: "fixed bottom-5 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-xl flex items-center space-x-2 animate-fade-in", children: [_jsx(CheckCircle2, { className: "w-4 h-4 text-emerald-400" }), _jsx("span", { children: toastMessage })] }))] }));
};
