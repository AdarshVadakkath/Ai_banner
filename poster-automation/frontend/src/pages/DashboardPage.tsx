import React, { useState, useEffect } from 'react';
import { CampaignProject, PosterTemplate } from '../types/poster';
import { ApiService } from '../services/apiService';
import { ProjectCard } from '../components/projects/ProjectCard';
import { ProjectRenameModal } from '../components/projects/ProjectRenameModal';
import {
  Plus,
  FolderKanban,
  Layers,
  Sparkles,
  Search,
  CheckCircle2,
  Calendar,
  Cpu,
  ArrowRight,
} from 'lucide-react';

interface DashboardPageProps {
  onOpenProject: (projectId: string) => void;
  onNewCampaign: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onOpenProject,
  onNewCampaign,
}) => {
  const [projects, setProjects] = useState<CampaignProject[]>([]);
  const [templates, setTemplates] = useState<PosterTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string } | null>(null);

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
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handlers
  const handleRename = (id: string, currentName: string) => {
    setRenameTarget({ id, name: currentName });
  };

  const handleSaveRename = async (newName: string) => {
    if (!renameTarget) return;
    try {
      await ApiService.updateProject(renameTarget.id, { name: newName });
      setProjects((prev) =>
        prev.map((p) => (p.id === renameTarget.id ? { ...p, name: newName } : p))
      );
    } catch (err) {
      console.error('Rename failed:', err);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const duplicated = await ApiService.duplicateProject(id);
      setProjects((prev) => [duplicated, ...prev]);
    } catch (err) {
      console.error('Duplicate failed:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await ApiService.deleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Hero Welcome / Platform Overview Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 sm:p-10 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center space-x-2 bg-sky-500/20 text-sky-300 px-3 py-1 rounded-full text-xs font-semibold border border-sky-400/30">
            <Cpu className="w-3.5 h-3.5" />
            <span>Rule-Based Deterministic Poster Engine</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight font-['Space_Grotesk'] leading-tight">
            Create every poster format with one click.
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Enter your copy once, upload your brand assets, and let deterministic layout rules generate square social posts, portrait stories, landscape banners, and widescreen presentations with perfect typographic hierarchy.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={onNewCampaign}
              className="px-5 py-3 bg-white text-slate-900 hover:bg-slate-100 rounded-xl text-sm font-bold shadow-md transition-all flex items-center space-x-2 active:scale-98"
            >
              <Plus className="w-4 h-4 text-slate-900" />
              <span>Create campaign</span>
            </button>
          </div>
        </div>

        {/* Ambient decorative backdrop */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-15 pointer-events-none hidden md:block">
          <div className="w-full h-full flex items-center justify-center">
            <Layers className="w-80 h-80 text-sky-400" />
          </div>
        </div>
      </div>

      {/* Metric Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <FolderKanban className="w-6 h-6" />
          </div>
          <div>
            <span className="text-2xl font-extrabold text-slate-900 font-['Space_Grotesk']">
              {projects.length}
            </span>
            <span className="text-xs text-slate-500 block">Saved Campaigns</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <span className="text-2xl font-extrabold text-slate-900 font-['Space_Grotesk']">5+</span>
            <span className="text-xs text-slate-500 block">Aspect Ratio Presets</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <span className="text-2xl font-extrabold text-slate-900 font-['Space_Grotesk']">
              {templates.length || 3}
            </span>
            <span className="text-xs text-slate-500 block">Design Templates</span>
          </div>
        </div>
      </div>

      {/* Campaigns Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Your Campaigns</h2>
          <p className="text-xs text-slate-500">
            Open an existing campaign or start a new automated production run
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search campaigns..."
              className="pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 w-56 sm:w-64"
            />
          </div>

          <button
            onClick={onNewCampaign}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs flex items-center space-x-1.5 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>New campaign</span>
          </button>
        </div>
      </div>

      {/* Project Cards Grid / Empty State */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <div className="w-8 h-8 border-3 border-slate-300 border-t-slate-800 rounded-full animate-spin mb-3" />
          <span className="text-xs font-medium">Loading campaigns...</span>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-lg mx-auto shadow-xs space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <FolderKanban className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">No campaigns found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? `No projects match "${searchQuery}". Try a different search.`
                : 'Start your first automated multi-format campaign. Enter your copy once and generate all posters instantly.'}
            </p>
          </div>
          <button
            onClick={onNewCampaign}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-sm inline-flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create your first campaign</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => {
            const template = templates.find((t) => t.id === project.templateId);
            return (
              <ProjectCard
                key={project.id}
                project={project}
                template={template}
                onOpen={onOpenProject}
                onRename={handleRename}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
              />
            );
          })}
        </div>
      )}

      {/* Rename Modal */}
      {renameTarget && (
        <ProjectRenameModal
          isOpen={true}
          currentName={renameTarget.name}
          onClose={() => setRenameTarget(null)}
          onSave={handleSaveRename}
        />
      )}
    </div>
  );
};
