import React, { useState, useEffect, useMemo } from 'react';
import {
  CampaignProject,
  PosterTemplate,
  PosterFormat,
  CampaignContent,
  CampaignAssets,
  FormatAdjustment,
} from '../types/poster';
import { BUILTIN_TEMPLATES } from '../constants/templates';
import { DEFAULT_POSTER_FORMATS } from '../constants/formats';
import { LayoutEngine } from '../utils/LayoutEngine';
import { FabricPosterRenderer } from '../utils/FabricPosterRenderer';
import { ApiService } from '../services/apiService';
import { CampaignInfoSection } from '../components/forms/CampaignInfoSection';
import { BrandAssetsSection } from '../components/forms/BrandAssetsSection';
import { FormatSelectorSection } from '../components/forms/FormatSelectorSection';
import { GenerateSection } from '../components/forms/GenerateSection';
import { PosterCanvasPreview } from '../components/poster/PosterCanvasPreview';
import { PosterGalleryModal, GeneratedPosterItem } from '../components/poster/PosterGalleryModal';
import {
  ArrowLeft,
  Save,
  CheckCircle2,
  Sparkles,
  SlidersHorizontal,
  ChevronDown,
  Layers,
} from 'lucide-react';

interface CampaignEditorPageProps {
  initialProjectId?: string;
  onBackToDashboard: () => void;
}

export const CampaignEditorPage: React.FC<CampaignEditorPageProps> = ({
  initialProjectId,
  onBackToDashboard,
}) => {
  const [projectId, setProjectId] = useState<string | null>(initialProjectId || null);
  const [projectName, setProjectName] = useState('New Campaign');
  const [selectedTemplateId, setSelectedTemplateId] = useState('modern-minimal');
  const [templates, setTemplates] = useState<PosterTemplate[]>(BUILTIN_TEMPLATES);

  // Form State
  const [content, setContent] = useState<CampaignContent>({
    campaignName: 'New Campaign',
    introText: 'SPECIAL ANNOUNCEMENT',
    mainHeading: 'Designing the Next Generation of Creative Workflows',
    supportingParagraph: 'Experience seamless multi-format production with automated layout rules and instant high-resolution exports.',
    dateText: 'November 18, 2026',
    locationText: 'Global Broadcast & In-Person',
  });

  const [assets, setAssets] = useState<CampaignAssets>({
    logoUrl: undefined,
    backgroundImages: [],
    selectedBackgroundId: undefined,
    backgroundFit: 'cover',
    formatAdjustments: {},
  });

  const [selectedFormats, setSelectedFormats] = useState<PosterFormat[]>([
    DEFAULT_POSTER_FORMATS[0], // Square 1080x1080
    DEFAULT_POSTER_FORMATS[1], // Portrait 1080x1350
    DEFAULT_POSTER_FORMATS[2], // Story 1080x1920
    DEFAULT_POSTER_FORMATS[3], // Landscape 1200x628
  ]);

  const [activeFormatId, setActiveFormatId] = useState<string>(DEFAULT_POSTER_FORMATS[0].id);

  // Status State
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPosters, setGeneratedPosters] = useState<GeneratedPosterItem[]>([]);
  const [showGalleryModal, setShowGalleryModal] = useState(false);

  // Fetch initial project data or templates
  useEffect(() => {
    const init = async () => {
      try {
        const fetchedTemplates = await ApiService.getTemplates();
        if (fetchedTemplates && fetchedTemplates.length > 0) {
          setTemplates(fetchedTemplates);
        }

        if (initialProjectId) {
          const project = await ApiService.getProject(initialProjectId);
          if (project) {
            setProjectId(project.id);
            setProjectName(project.name);
            setSelectedTemplateId(project.templateId);
            setContent(project.content);
            setAssets(project.assets);
            if (project.selectedFormats && project.selectedFormats.length > 0) {
              setSelectedFormats(project.selectedFormats);
              setActiveFormatId(project.selectedFormats[0].id);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load project details:', err);
      }
    };

    init();
  }, [initialProjectId]);

  // Current active template
  const currentTemplate = useMemo(() => {
    return templates.find((t) => t.id === selectedTemplateId) || templates[0];
  }, [templates, selectedTemplateId]);

  // Current active preview format
  const currentFormat = useMemo(() => {
    return (
      selectedFormats.find((f) => f.id === activeFormatId) ||
      selectedFormats[0] ||
      DEFAULT_POSTER_FORMATS[0]
    );
  }, [selectedFormats, activeFormatId]);

  // Format adjustment for active format
  const currentAdjustment: FormatAdjustment | undefined = useMemo(() => {
    return assets.formatAdjustments[currentFormat.id];
  }, [assets.formatAdjustments, currentFormat.id]);

  // Compute resolved layout for live preview deterministically
  const resolvedLayout = useMemo(() => {
    return LayoutEngine.computeLayout({
      template: currentTemplate,
      content,
      assets,
      format: currentFormat,
      adjustment: currentAdjustment,
    });
  }, [currentTemplate, content, assets, currentFormat, currentAdjustment]);

  // Content change handler
  const handleContentChange = (updated: Partial<CampaignContent>) => {
    setContent((prev) => {
      const next = { ...prev, ...updated };
      if (updated.campaignName && updated.campaignName !== projectName) {
        setProjectName(updated.campaignName);
      }
      return next;
    });
  };

  // Assets change handler
  const handleAssetsChange = (updated: Partial<CampaignAssets>) => {
    setAssets((prev) => ({ ...prev, ...updated }));
  };

  // Manual Drag Reposition listener for preview
  const handleElementModified = (elementId: string, x: number, y: number) => {
    setAssets((prev) => {
      const currentAdj = prev.formatAdjustments[currentFormat.id] || {};
      const currentOverrides = currentAdj.elementOverrides || {};

      return {
        ...prev,
        formatAdjustments: {
          ...prev.formatAdjustments,
          [currentFormat.id]: {
            ...currentAdj,
            elementOverrides: {
              ...currentOverrides,
              [elementId]: { x, y },
            },
          },
        },
      };
    });
  };

  // Reset to template: clears manual offsets for current format
  const handleResetToTemplate = () => {
    setAssets((prev) => {
      const updatedAdjustments = { ...prev.formatAdjustments };
      delete updatedAdjustments[currentFormat.id];
      return {
        ...prev,
        formatAdjustments: updatedAdjustments,
      };
    });
  };

  // Save Project to backend
  const handleSaveProject = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const payload: Partial<CampaignProject> = {
        name: projectName || content.campaignName || 'Untitled Campaign',
        templateId: selectedTemplateId,
        content,
        assets,
        selectedFormats,
      };

      if (projectId) {
        await ApiService.updateProject(projectId, payload);
      } else {
        const created = await ApiService.createProject(payload);
        setProjectId(created.id);
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save project:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Generate All Posters Action
  const handleGenerateAll = async () => {
    if (!resolvedLayout.isValid || selectedFormats.length === 0) return;

    setIsGenerating(true);
    try {
      const results: GeneratedPosterItem[] = [];

      for (const format of selectedFormats) {
        const formatAdjustment = assets.formatAdjustments[format.id];
        const layout = LayoutEngine.computeLayout({
          template: currentTemplate,
          content,
          assets,
          format,
          adjustment: formatAdjustment,
        });

        // Render at full output dimensions
        const dataUrl = await FabricPosterRenderer.renderToDataURL(layout);
        const safeName = (projectName || 'poster')
          .toLowerCase()
          .replace(/[^a-z0-9_-]/g, '_');
        const filename = `${safeName}_${format.id}_${format.width}x${format.height}.png`;

        results.push({
          format,
          dataUrl,
          width: format.width,
          height: format.height,
          filename,
        });
      }

      setGeneratedPosters(results);
      setShowGalleryModal(true);

      // Also trigger a background save with thumbnail if first time
      if (results[0]?.dataUrl) {
        handleSaveProject().catch(() => {});
      }
    } catch (err) {
      console.error('Failed to generate posters:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Editor Toolbar */}
      <div className="bg-white border-b border-slate-200 sticky top-16 z-30 px-4 sm:px-6 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <button
              onClick={onBackToDashboard}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors flex items-center space-x-1"
              title="Return to projects"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-xs font-semibold hidden sm:inline">Projects</span>
            </button>

            <div className="h-4 w-px bg-slate-200 hidden sm:block" />

            {/* Editable Campaign Name */}
            <input
              type="text"
              value={projectName}
              onChange={(e) => {
                setProjectName(e.target.value);
                setContent((prev) => ({ ...prev, campaignName: e.target.value }));
              }}
              placeholder="Campaign Name"
              className="font-bold text-slate-900 text-sm sm:text-base border border-transparent hover:border-slate-300 focus:border-slate-800 focus:bg-white rounded px-2 py-1 transition-colors"
            />
          </div>

          <div className="flex items-center space-x-3">
            {/* Template Selector Dropdown */}
            <div className="flex items-center space-x-1.5 text-xs">
              <span className="text-slate-500 hidden md:inline">Template:</span>
              <div className="relative">
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="bg-slate-100 hover:bg-slate-200/70 text-slate-800 font-semibold px-3 py-1.5 pr-8 rounded-lg appearance-none cursor-pointer border border-slate-200 focus:outline-none text-xs"
                >
                  {templates.map((tmpl) => (
                    <option key={tmpl.id} value={tmpl.id}>
                      {tmpl.name} ({tmpl.category})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Save Campaign Button */}
            <button
              onClick={handleSaveProject}
              disabled={isSaving}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5 shadow-xs"
            >
              {isSaving ? (
                <span>Saving...</span>
              ) : saveSuccess ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Saved</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 text-slate-600" />
                  <span>Save</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Split Layout: Form on Left, Live Preview on Right */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: The 4 Form Sections */}
          <div className="lg:col-span-6 space-y-5">
            <CampaignInfoSection
              content={content}
              template={currentTemplate}
              onChange={handleContentChange}
            />

            <BrandAssetsSection
              assets={assets}
              onChange={handleAssetsChange}
              onResetPosition={handleResetToTemplate}
            />

            <FormatSelectorSection
              selectedFormats={selectedFormats}
              onChange={setSelectedFormats}
              activePreviewFormatId={activeFormatId}
              onSelectPreviewFormat={setActiveFormatId}
            />

            <GenerateSection
              onGenerateAll={handleGenerateAll}
              isValid={resolvedLayout.isValid}
              warnings={resolvedLayout.warnings}
              formatsCount={selectedFormats.length}
              isGenerating={isGenerating}
            />
          </div>

          {/* Right Column: Interactive Live Preview with Sticky Positioning */}
          <div className="lg:col-span-6 lg:sticky lg:top-36 space-y-3">
            <PosterCanvasPreview
              layout={resolvedLayout}
              selectedFormats={selectedFormats}
              activeFormatId={activeFormatId}
              onSelectFormat={setActiveFormatId}
              onElementModified={handleElementModified}
              onResetToTemplate={handleResetToTemplate}
            />
          </div>
        </div>
      </main>

      {/* Generated Posters Gallery Modal */}
      <PosterGalleryModal
        isOpen={showGalleryModal}
        onClose={() => setShowGalleryModal(false)}
        campaignName={projectName || content.campaignName || 'Campaign Posters'}
        posters={generatedPosters}
      />
    </div>
  );
};
