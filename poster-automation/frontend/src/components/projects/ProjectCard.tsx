import React, { useState } from 'react';
import { CampaignProject, PosterTemplate } from '../../types/poster';
import {
  MoreVertical,
  FolderOpen,
  Edit2,
  Copy,
  Trash2,
  Clock,
  Layers,
  Sparkles,
} from 'lucide-react';

interface ProjectCardProps {
  project: CampaignProject;
  template?: PosterTemplate;
  onOpen: (id: string) => void;
  onRename: (id: string, currentName: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  template,
  onOpen,
  onRename,
  onDuplicate,
  onDelete,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  const formattedDate = new Date(project.updatedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all flex flex-col overflow-hidden group">
      {/* Thumbnail / Visual Header */}
      <div
        onClick={() => onOpen(project.id)}
        className="h-44 bg-slate-900/95 cursor-pointer relative flex items-center justify-center p-4 overflow-hidden border-b border-slate-100"
      >
        {/* Subtle background representation */}
        {project.thumbnailUrl ? (
          <img
            src={project.thumbnailUrl}
            alt={project.name}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : project.assets?.backgroundImages?.[0]?.url ? (
          <img
            src={project.assets.backgroundImages[0].url}
            alt={project.name}
            className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-16 h-16 rounded-2xl bg-slate-800 text-sky-400 flex items-center justify-center shadow-inner">
            <Layers className="w-8 h-8" />
          </div>
        )}

        {/* Content text badge preview */}
        <div className="relative z-10 text-center max-w-xs px-4">
          <span className="text-[10px] font-bold uppercase tracking-widest text-sky-400 block mb-1">
            {project.content.introText || 'POSTER CAMPAIGN'}
          </span>
          <h4 className="text-sm font-bold text-white line-clamp-2 leading-snug drop-shadow-md">
            {project.content.mainHeading || project.name}
          </h4>
        </div>

        {/* Formats count badge & Quick delete */}
        <div className="absolute bottom-2.5 right-2.5 bg-slate-950/80 backdrop-blur-xs text-white text-[11px] font-medium px-2 py-0.5 rounded-md border border-white/10">
          {project.selectedFormats?.length || 0} formats
        </div>

        {/* Quick Delete button on thumbnail */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(project.id);
          }}
          className="absolute top-2.5 left-2.5 bg-slate-950/80 hover:bg-rose-600 text-white p-1.5 rounded-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-all cursor-pointer z-10 shadow-sm"
          title="Delete campaign"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Card Info & Menu */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between relative">
            <h3
              onClick={() => onOpen(project.id)}
              className="font-bold text-slate-900 text-base hover:text-sky-600 cursor-pointer line-clamp-1 transition-colors"
            >
              {project.name}
            </h3>

            {/* Actions Menu Trigger */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {/* Dropdown Menu */}
              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 top-7 w-40 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-30 animate-fade-in text-xs font-medium">
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false);
                        onOpen(project.id);
                      }}
                      className="w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center space-x-2 cursor-pointer"
                    >
                      <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
                      <span>Open editor</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false);
                        onRename(project.id, project.name);
                      }}
                      className="w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center space-x-2 cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>Rename</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false);
                        onDuplicate(project.id);
                      }}
                      className="w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center space-x-2 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Duplicate</span>
                    </button>
                    <div className="h-px bg-slate-100 my-1" />
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false);
                        onDelete(project.id);
                      }}
                      className="w-full px-3 py-2 text-left text-rose-600 hover:bg-rose-50 flex items-center space-x-2 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                      <span>Delete</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2 mt-1.5 text-xs text-slate-500">
            <span className="font-medium text-slate-700">
              {template?.name || 'Modern Minimal'}
            </span>
            <span>•</span>
            <span className="flex items-center space-x-1">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>{formattedDate}</span>
            </span>
          </div>
        </div>

        {/* Quick Open Action Button & Quick Delete Button */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onOpen(project.id)}
            className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <FolderOpen className="w-3.5 h-3.5 text-slate-600" />
            <span>Open campaign</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(project.id);
            }}
            className="px-2.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors flex items-center justify-center cursor-pointer border border-rose-100"
            title="Delete campaign"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
          </button>
        </div>
      </div>
    </div>
  );
};
