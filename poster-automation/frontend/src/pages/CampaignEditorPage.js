import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Canvas } from 'fabric';
import { BUILTIN_TEMPLATES } from '../constants/templates';
import { DEFAULT_POSTER_FORMATS, ALL_GENERATE_FORMATS } from '../constants/formats';
import { SAMPLE_LOGO_URL, SAMPLE_BACKGROUND_1, SAMPLE_BACKGROUND_2, SAMPLE_BACKGROUND_3, } from '../constants/sampleData';
import { LayoutEngine } from '../utils/LayoutEngine';
import { FabricPosterRenderer } from '../utils/FabricPosterRenderer';
import { ApiService } from '../services/apiService';
import { PosterGalleryModal } from '../components/poster/PosterGalleryModal';
import JSZip from 'jszip';
import { Layers, Link2, Download, MoreHorizontal, MousePointer2, Square, Circle, Type, Image as ImageIcon, ChevronDown, ChevronRight, ChevronUp, Eye, EyeOff, Trash2, RotateCcw, Search, Plus, AlignLeft, AlignCenter, AlignRight, Check, CheckCircle2, Sparkles, Upload, X, ZoomIn, ZoomOut, LayoutGrid, FolderArchive, ArrowLeft, RefreshCw, Pencil, Copy, Palette, Move, } from 'lucide-react';
const CHAR_LIMITS = {
    'element-intro': 60,
    'element-heading': 120,
    'element-paragraph': 280,
    'element-footer': 80,
    'element-cta': 50,
};
const GRADIENT_PRESETS = [
    { name: 'Sunset Fire', type: 'linear', stops: [{ offset: 0, color: '#FF512F' }, { offset: 1, color: '#DD2476' }] },
    { name: 'Ocean Cyan', type: 'linear', stops: [{ offset: 0, color: '#00c6ff' }, { offset: 1, color: '#0072ff' }] },
    { name: 'Cosmic Violet', type: 'linear', stops: [{ offset: 0, color: '#8A2387' }, { offset: 1, color: '#E94057' }] },
    { name: 'Emerald Glow', type: 'linear', stops: [{ offset: 0, color: '#11998e' }, { offset: 1, color: '#38ef7d' }] },
    { name: 'Midnight Blue', type: 'linear', stops: [{ offset: 0, color: '#0f2027' }, { offset: 1, color: '#2c5364' }] },
    { name: 'Electric Gold', type: 'linear', stops: [{ offset: 0, color: '#F7971E' }, { offset: 1, color: '#FFD200' }] },
];
const PRESET_COLORS = [
    '#FFFFFF', '#000000', '#F8FAFC', '#94A3B8', '#38BDF8',
    '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#E11D48',
    '#F59E0B', '#10B981', '#14B8A6'
];
const CampaignSetupModal = ({ onConfirm }) => {
    const [name, setName] = React.useState('New Campaign');
    const [introText, setIntroText] = React.useState('Special Announcement');
    const [mainHeading, setMainHeading] = React.useState('Delivering Relevance at Scale');
    const [supportingParagraph, setSupportingParagraph] = React.useState('AI-driven solutions for smarter decisions and better outcomes.');
    const [dateText, setDateText] = React.useState('November 18, 2026');
    const [locationText, setLocationText] = React.useState('Global Broadcast & In-Person');
    const [ctaText, setCtaText] = React.useState('Book your study →');
    const [logoPreview, setLogoPreview] = React.useState(SAMPLE_LOGO_URL);
    const [logoDim, setLogoDim] = React.useState({ width: 280, height: 100, aspect: 2.8 });
    const [bgPreview, setBgPreview] = React.useState(SAMPLE_BACKGROUND_1);
    const [selectedPresetBg, setSelectedPresetBg] = React.useState('cyber');
    const [selectedPresetLogo, setSelectedPresetLogo] = React.useState('vertex');
    const logoInputRef = React.useRef(null);
    const bgInputRef = React.useRef(null);
    const handleLogoUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result;
            const img = new Image();
            img.onload = () => {
                const aspect = img.naturalWidth / img.naturalHeight;
                setLogoDim({ width: Math.min(320, img.naturalWidth), height: Math.round(Math.min(320, img.naturalWidth) / aspect), aspect });
                setLogoPreview(dataUrl);
                setSelectedPresetLogo(null);
            };
            img.src = dataUrl;
        };
        reader.readAsDataURL(file);
    };
    const handleBgUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        const reader = new FileReader();
        reader.onload = () => {
            setBgPreview(reader.result);
            setSelectedPresetBg(null);
        };
        reader.readAsDataURL(file);
    };
    return (_jsx("div", { className: "fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in", children: _jsxs("div", { className: "bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6", children: [_jsxs("div", { className: "px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("span", { className: "text-[10px] font-bold uppercase tracking-wider text-sky-400", children: "Campaign Generator" }), _jsx("h2", { className: "text-xl font-extrabold text-white", children: "Create Multi-Ratio Campaign" })] }), _jsx(Sparkles, { className: "w-6 h-6 text-sky-400" })] }), _jsxs("div", { className: "p-6 space-y-5 max-h-[75vh] overflow-y-auto", children: [_jsxs("div", { children: [_jsx("label", { className: "text-xs font-bold text-slate-700 block mb-1", children: "Campaign Name" }), _jsx("input", { type: "text", value: name, onChange: e => setName(e.target.value), className: "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500", placeholder: "e.g. Q4 Global Brand Launch" })] }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx("label", { className: "text-xs font-bold text-slate-700 block", children: "Brand Logo" }), _jsxs("div", { className: "h-28 rounded-lg border border-slate-200 bg-slate-900 flex items-center justify-center relative overflow-hidden group", children: [logoPreview ? (_jsx("img", { src: logoPreview, alt: "Logo", className: "max-h-20 max-w-[85%] object-contain" })) : (_jsx("span", { className: "text-xs text-slate-500", children: "No logo uploaded" })), _jsx("div", { className: "absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center", children: _jsx("button", { onClick: () => logoInputRef.current?.click(), className: "px-3 py-1 bg-white text-slate-900 rounded-md text-xs font-bold", children: "Change" }) })] }), _jsx("input", { ref: logoInputRef, type: "file", accept: "image/*", onChange: handleLogoUpload, className: "hidden" }), _jsxs("div", { className: "flex gap-1.5", children: [_jsx("button", { onClick: () => { setLogoPreview(SAMPLE_LOGO_URL); setSelectedPresetLogo('vertex'); setLogoDim({ width: 280, height: 100, aspect: 2.8 }); }, className: `flex-1 py-1 text-[11px] rounded border ${selectedPresetLogo === 'vertex' ? 'bg-blue-50 border-blue-600 font-bold text-blue-700' : 'border-slate-200 text-slate-600'}`, children: "Vertex" }), _jsxs("button", { onClick: () => logoInputRef.current?.click(), className: "flex-1 py-1 text-[11px] rounded border border-dashed border-blue-400 text-blue-600 hover:bg-blue-50 font-medium flex items-center justify-center space-x-1", children: [_jsx(Upload, { className: "w-3 h-3" }), _jsx("span", { children: "Upload" })] })] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx("label", { className: "text-xs font-bold text-slate-700 block", children: "Background Image" }), _jsxs("div", { className: "h-28 rounded-lg border border-slate-200 bg-slate-900 relative overflow-hidden group", children: [bgPreview && _jsx("div", { className: "absolute inset-0 bg-cover bg-center", style: { backgroundImage: `url(${bgPreview})` } }), _jsx("div", { className: "absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center", children: _jsx("button", { onClick: () => bgInputRef.current?.click(), className: "px-3 py-1 bg-white text-slate-900 rounded-md text-xs font-bold", children: "Change" }) })] }), _jsx("input", { ref: bgInputRef, type: "file", accept: "image/*", onChange: handleBgUpload, className: "hidden" }), _jsx("div", { className: "grid grid-cols-3 gap-1", children: [{ id: 'cyber', url: SAMPLE_BACKGROUND_1, name: 'Cyber' }, { id: 'amber', url: SAMPLE_BACKGROUND_2, name: 'Amber' }, { id: 'purple', url: SAMPLE_BACKGROUND_3, name: 'Purple' }].map(p => (_jsx("button", { onClick: () => { setBgPreview(p.url); setSelectedPresetBg(p.id); }, className: `py-1 text-[11px] rounded border truncate ${selectedPresetBg === p.id ? 'bg-blue-50 border-blue-600 font-bold text-blue-700' : 'border-slate-200 text-slate-600'}`, children: p.name }, p.id))) })] })] }), _jsxs("div", { className: "space-y-3 pt-2 border-t border-slate-100", children: [_jsx("span", { className: "text-xs font-bold text-slate-900 block", children: "Campaign Copy" }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center justify-between mb-1", children: [_jsx("span", { className: "text-[11px] text-slate-500", children: "Intro Badge" }), _jsxs("span", { className: "text-[10px] font-mono text-slate-400", children: [introText.length, "/", CHAR_LIMITS['element-intro']] })] }), _jsx("input", { type: "text", value: introText, onChange: e => setIntroText(e.target.value.slice(0, CHAR_LIMITS['element-intro'])), className: "w-full border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500", placeholder: "Special Announcement" })] }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center justify-between mb-1", children: [_jsx("span", { className: "text-[11px] text-slate-500", children: "Main Heading" }), _jsxs("span", { className: "text-[10px] font-mono text-slate-400", children: [mainHeading.length, "/", CHAR_LIMITS['element-heading']] })] }), _jsx("input", { type: "text", value: mainHeading, onChange: e => setMainHeading(e.target.value.slice(0, CHAR_LIMITS['element-heading'])), className: "w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500", placeholder: "Delivering Relevance at Scale" })] }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center justify-between mb-1", children: [_jsx("span", { className: "text-[11px] text-slate-500", children: "Supporting Paragraph" }), _jsxs("span", { className: "text-[10px] font-mono text-slate-400", children: [supportingParagraph.length, "/", CHAR_LIMITS['element-paragraph']] })] }), _jsx("textarea", { rows: 2, value: supportingParagraph, onChange: e => setSupportingParagraph(e.target.value.slice(0, CHAR_LIMITS['element-paragraph'])), className: "w-full border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 resize-none", placeholder: "AI-driven solutions..." })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx("span", { className: "text-[11px] text-slate-500 block mb-1", children: "Date / Event" }), _jsx("input", { type: "text", value: dateText, onChange: e => setDateText(e.target.value), className: "w-full border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500", placeholder: "November 18, 2026" })] }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center justify-between mb-1", children: [_jsx("span", { className: "text-[11px] text-slate-500", children: "Location / Footer" }), _jsxs("span", { className: "text-[10px] font-mono text-slate-400", children: [locationText.length, "/", CHAR_LIMITS['element-footer']] })] }), _jsx("input", { type: "text", value: locationText, onChange: e => setLocationText(e.target.value.slice(0, CHAR_LIMITS['element-footer'])), className: "w-full border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500", placeholder: "Global Broadcast" })] })] }), _jsxs("div", { children: [_jsx("span", { className: "text-[11px] text-slate-500 block mb-1", children: "Primary CTA Button" }), _jsx("input", { type: "text", value: ctaText, onChange: e => setCtaText(e.target.value), className: "w-full border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500", placeholder: "Book your study \u2192" })] })] })] }), _jsxs("div", { className: "px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end space-x-3", children: [_jsx("p", { className: "text-xs text-slate-400 flex-1", children: "All 11 formats (Square, Story, Banner, etc.) auto-generated." }), _jsxs("button", { onClick: () => onConfirm({ name, logoUrl: logoPreview, logoWidth: logoDim.width, logoHeight: logoDim.height, logoAspectRatio: logoDim.aspect, backgroundUrl: bgPreview, introText, mainHeading, supportingParagraph, dateText, locationText, ctaText }), className: "px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl flex items-center space-x-2 transition-colors shadow-md shadow-blue-200 cursor-pointer", children: [_jsx(Sparkles, { className: "w-4 h-4" }), _jsx("span", { children: "Generate Campaign" })] })] })] }) }));
};
export const CampaignEditorPage = ({ initialProjectId, onBackToDashboard, }) => {
    const [showSetupModal, setShowSetupModal] = useState(!initialProjectId);
    const [projectId, setProjectId] = useState(initialProjectId || null);
    const [projectName, setProjectName] = useState('New Campaign');
    const [selectedTemplateId, setSelectedTemplateId] = useState('modern-minimal');
    const [templates, setTemplates] = useState(BUILTIN_TEMPLATES);
    const [activeFormat, setActiveFormat] = useState(DEFAULT_POSTER_FORMATS[0]);
    // Campaign Content
    const [content, setContent] = useState({
        campaignName: 'New Campaign',
        introText: '100% Automation',
        mainHeading: 'Delivering Relevance at Scale',
        supportingParagraph: 'AI-driven solutions for smarter decisions and better outcomes.',
        dateText: 'November 18, 2026',
        locationText: 'Global Broadcast & In-Person',
        ctaText: 'Book your study →',
    });
    // Assets
    const [assets, setAssets] = useState({
        logoUrl: SAMPLE_LOGO_URL,
        backgroundImages: [{ id: 'bg-cyber-mesh', name: 'Cyber Mesh Ambient', url: SAMPLE_BACKGROUND_1, width: 1920, height: 1920, aspectRatio: 1.0 }],
        selectedBackgroundId: 'bg-cyber-mesh',
        backgroundFit: 'cover',
        formatAdjustments: {},
    });
    const [selectedPresetBg, setSelectedPresetBg] = useState('cyber');
    const [selectedPresetLogo, setSelectedPresetLogo] = useState('vertex');
    const [activeTool, setActiveTool] = useState('select');
    // Custom layers & CTA buttons
    const [customLayers, setCustomLayers] = useState([]);
    const [selectedLayerId, setSelectedLayerId] = useState('element-heading');
    const [hiddenLayers, setHiddenLayers] = useState(new Set());
    const [deletedLayerIds, setDeletedLayerIds] = useState(new Set());
    // Independent canvas aspect ratio management: format ID -> element ID -> CustomElementStyle
    const [perFormatOverrides, setPerFormatOverrides] = useState({});
    // Layer ordering state (from top to bottom in layers list: index 0 is topmost visual layer)
    const [layerOrder, setLayerOrder] = useState([]);
    const [layerNames, setLayerNames] = useState({});
    const [editingLayerNameId, setEditingLayerNameId] = useState(null);
    // Section accordions
    const [campaignContentOpen, setCampaignContentOpen] = useState(true);
    const [ctaButtonsSectionOpen, setCtaButtonsSectionOpen] = useState(true);
    const [logoSectionOpen, setLogoSectionOpen] = useState(false);
    const [bgUploadSectionOpen, setBgUploadSectionOpen] = useState(false);
    const [appearanceOpen, setAppearanceOpen] = useState(true);
    const [fillMode, setFillMode] = useState('solid');
    // View & export state
    const [isExporting, setIsExporting] = useState(false);
    const [viewMode, setViewMode] = useState('all-formats');
    const [isGeneratingAll, setIsGeneratingAll] = useState(false);
    const [downloadingZip, setDownloadingZip] = useState(false);
    const [toastMessage, setToastMessage] = useState(null);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [showAddLayerMenu, setShowAddLayerMenu] = useState(false);
    const [showGalleryModal, setShowGalleryModal] = useState(false);
    const [generatedPosters, setGeneratedPosters] = useState([]);
    const [layerSearch, setLayerSearch] = useState('');
    // Drag and drop in layers list
    const [draggedLayerId, setDraggedLayerId] = useState(null);
    // Canvas interaction
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const dragInfoRef = useRef(null);
    const resizeInfoRef = useRef(null);
    const canvasElRef = useRef(null);
    const fabricCanvasRef = useRef(null);
    const containerRef = useRef(null);
    const logoInputRef = useRef(null);
    const bgInputRef = useRef(null);
    const colorInputRef = useRef(null);
    const gradientColor1Ref = useRef(null);
    const gradientColor2Ref = useRef(null);
    const currentTemplate = useMemo(() => templates.find(t => t.id === selectedTemplateId) || BUILTIN_TEMPLATES[0], [templates, selectedTemplateId]);
    // Current active format style overrides
    const currentFormatOverrides = useMemo(() => perFormatOverrides[activeFormat.id] || {}, [perFormatOverrides, activeFormat.id]);
    // Load initial project if provided
    useEffect(() => {
        const loadInit = async () => {
            try {
                const fetchedTemplates = await ApiService.getTemplates();
                if (fetchedTemplates && fetchedTemplates.length > 0)
                    setTemplates(fetchedTemplates);
                if (initialProjectId) {
                    const proj = await ApiService.getProject(initialProjectId);
                    if (proj) {
                        setProjectId(proj.id);
                        setProjectName(proj.name);
                        setSelectedTemplateId(proj.templateId);
                        setContent(proj.content);
                        setAssets(proj.assets);
                        if (proj.selectedFormats && proj.selectedFormats.length > 0)
                            setActiveFormat(proj.selectedFormats[0]);
                    }
                }
            }
            catch (e) {
                console.error('Error loading campaign data:', e);
            }
        };
        loadInit();
    }, [initialProjectId]);
    const showToast = (msg) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3000);
    };
    // Helper to update styling for selected element on the current active format (independent canvas)
    const updateSelectedElementStyle = (patch) => {
        if (!selectedLayerId)
            return;
        setPerFormatOverrides(prev => {
            const fmtMap = prev[activeFormat.id] || {};
            const existing = fmtMap[selectedLayerId] || {};
            return {
                ...prev,
                [activeFormat.id]: {
                    ...fmtMap,
                    [selectedLayerId]: { ...existing, ...patch },
                },
            };
        });
    };
    // Scaling helper
    const scaleSelectedLayer = (delta) => {
        if (!selectedLayerId)
            return;
        const current = currentFormatOverrides[selectedLayerId] || {};
        const currentScale = current.scale ?? 1;
        const newScale = Math.max(0.2, Math.min(3.0, currentScale + delta));
        updateSelectedElementStyle({ scale: Math.round(newScale * 100) / 100 });
    };
    // Base layout computation for the current active format
    const layout = useMemo(() => {
        const baseLayout = LayoutEngine.computeLayout({
            template: currentTemplate,
            content,
            assets,
            format: activeFormat,
        });
        const customResolvedElements = customLayers.map(cl => {
            const overrides = currentFormatOverrides[cl.id] || {};
            const scale = overrides.scale ?? cl.scale ?? 1;
            return {
                id: cl.id,
                type: cl.type,
                shapeType: cl.shapeType,
                ctaType: cl.ctaType,
                x: overrides.x !== undefined ? overrides.x : cl.x,
                y: overrides.y !== undefined ? overrides.y : cl.y,
                width: Math.round((cl.width || 200) * scale),
                height: Math.round((cl.height || (cl.type === 'text' ? 50 : 200)) * scale),
                text: overrides.color ? cl.text : cl.text,
                fontSize: overrides.fontSize ?? cl.fontSize ?? (cl.type === 'text' ? 32 : undefined),
                fontFamily: overrides.fontFamily ?? cl.fontFamily ?? currentTemplate.typography.headingFontFamily ?? 'Inter',
                fontWeight: overrides.fontWeight ?? cl.fontWeight ?? 'Bold',
                lineHeight: overrides.lineHeight ?? cl.lineHeight ?? 1.2,
                letterSpacing: overrides.letterSpacing ?? cl.letterSpacing,
                textAlign: overrides.textAlign ?? cl.textAlign ?? 'left',
                color: overrides.color ?? cl.color ?? (cl.type === 'text' ? '#FFFFFF' : (currentTemplate.colorScheme.accent || '#3B82F6')),
                fill: overrides.fill ?? cl.fill ?? (cl.type === 'cta-button' ? '#E5173F' : (currentTemplate.colorScheme.accent || '#3B82F6')),
                borderColor: overrides.borderColor ?? cl.borderColor,
                borderWidth: overrides.borderWidth ?? cl.borderWidth,
                borderRadius: overrides.borderRadius ?? cl.borderRadius,
                opacity: overrides.opacity !== undefined ? overrides.opacity : cl.opacity !== undefined ? cl.opacity : 1,
                gradient: overrides.gradient ?? cl.gradient,
            };
        });
        const modifiedElements = baseLayout.elements.map((el) => {
            const overrides = currentFormatOverrides[el.id];
            if (!overrides)
                return el;
            const scale = overrides.scale ?? 1;
            return {
                ...el,
                fontFamily: overrides.fontFamily ?? el.fontFamily,
                fontWeight: overrides.fontWeight ?? el.fontWeight,
                fontSize: overrides.fontSize ?? el.fontSize,
                lineHeight: overrides.lineHeight ?? el.lineHeight,
                textAlign: overrides.textAlign ?? el.textAlign,
                color: overrides.color ?? el.color,
                letterSpacing: overrides.letterSpacing ?? el.letterSpacing,
                fill: overrides.fill ?? el.fill,
                borderColor: overrides.borderColor ?? el.borderColor,
                borderWidth: overrides.borderWidth ?? el.borderWidth,
                borderRadius: overrides.borderRadius ?? el.borderRadius,
                opacity: overrides.opacity !== undefined ? overrides.opacity : el.opacity !== undefined ? el.opacity : 1,
                gradient: overrides.gradient ?? el.gradient,
                x: overrides.x !== undefined ? overrides.x : el.x,
                y: overrides.y !== undefined ? overrides.y : el.y,
                width: Math.round(el.width * scale),
                height: Math.round(el.height * scale),
            };
        });
        const allCombined = [...modifiedElements, ...customResolvedElements];
        // Stacking order: if layerOrder has entries, sort according to layerOrder
        // Note: in layerOrder, index 0 is TOP of stack. Fabric draws lower index first, so we draw from bottom to top:
        if (layerOrder.length > 0) {
            allCombined.sort((a, b) => {
                const indexA = layerOrder.indexOf(a.id);
                const indexB = layerOrder.indexOf(b.id);
                if (indexA === -1 && indexB === -1)
                    return 0;
                if (indexA === -1)
                    return -1;
                if (indexB === -1)
                    return 1;
                // Higher index in layerOrder means LOWER in stack (drawn earlier)
                return indexB - indexA;
            });
        }
        return { ...baseLayout, elements: allCombined };
    }, [activeFormat, currentTemplate, content, assets, currentFormatOverrides, customLayers, layerOrder]);
    // Keep layerOrder in sync with all current elements
    useEffect(() => {
        const currentIds = layout.elements.map(el => el.id);
        setLayerOrder(prev => {
            const existing = prev.filter(id => currentIds.includes(id));
            const newlyAdded = currentIds.filter(id => !existing.includes(id));
            // Put newly added layers at the top of the stack (index 0)
            return [...newlyAdded, ...existing];
        });
    }, [layout.elements.length]);
    const activeElements = useMemo(() => {
        return layout.elements.filter((el) => !deletedLayerIds.has(el.id) && !hiddenLayers.has(el.id));
    }, [layout, deletedLayerIds, hiddenLayers]);
    const selectedElement = useMemo(() => {
        if (deletedLayerIds.has(selectedLayerId))
            return null;
        return layout.elements.find((el) => el.id === selectedLayerId) || layout.elements.find((el) => !deletedLayerIds.has(el.id) && el.id === 'element-heading') || null;
    }, [layout, selectedLayerId, deletedLayerIds]);
    const selectedElementStyle = currentFormatOverrides[selectedLayerId] || {};
    const currentScale = selectedElementStyle.scale ?? 1;
    const currentFontFamily = selectedElementStyle.fontFamily || (selectedElement ? selectedElement.fontFamily : 'Inter') || 'Inter';
    const currentFontWeight = selectedElementStyle.fontWeight || (selectedElement ? selectedElement.fontWeight : 'Bold') || 'Bold';
    const currentFontSize = selectedElementStyle.fontSize || (selectedElement ? selectedElement.fontSize : 32) || 32;
    const currentTextAlign = selectedElementStyle.textAlign || (selectedElement ? selectedElement.textAlign : 'left') || 'left';
    const currentColor = selectedElementStyle.color || (selectedElement ? (selectedElement.color || '#FFFFFF') : '#FFFFFF');
    const currentOpacity = selectedElementStyle.opacity !== undefined ? selectedElementStyle.opacity : (selectedElement?.opacity !== undefined ? selectedElement?.opacity : 1);
    const currentFill = selectedElementStyle.fill || (selectedElement ? (selectedElement.fill || '#3B82F6') : '#3B82F6');
    const currentGradient = selectedElementStyle.gradient || selectedElement?.gradient;
    const previewScale = useMemo(() => 560 / activeFormat.width, [activeFormat]);
    const displayWidth = Math.round(activeFormat.width * previewScale);
    const displayHeight = Math.round(activeFormat.height * previewScale);
    // Render to canvas
    useEffect(() => {
        if (viewMode !== 'single') {
            if (fabricCanvasRef.current) {
                fabricCanvasRef.current.dispose();
                fabricCanvasRef.current = null;
            }
            return;
        }
        if (!canvasElRef.current)
            return;
        if (!fabricCanvasRef.current) {
            fabricCanvasRef.current = new Canvas(canvasElRef.current, { selection: false, renderOnAddRemove: true });
        }
        const canvas = fabricCanvasRef.current;
        FabricPosterRenderer.renderToCanvas(canvas, { ...layout, elements: activeElements }, { isInteractive: false, previewScale });
    }, [layout, activeElements, previewScale, viewMode]);
    useEffect(() => {
        return () => {
            if (fabricCanvasRef.current) {
                fabricCanvasRef.current.dispose();
                fabricCanvasRef.current = null;
            }
        };
    }, []);
    // Multi-ratio generator: renders all 11 formats respecting each format's independent overrides
    const renderAllFormatsWithData = async (pName, cContent, cAssets, cTemplate, openModal = false) => {
        try {
            setIsGeneratingAll(true);
            const results = [];
            for (const fmt of ALL_GENERATE_FORMATS) {
                const fmtOverrides = perFormatOverrides[fmt.id] || {};
                const baseLayout = LayoutEngine.computeLayout({
                    template: cTemplate,
                    content: cContent,
                    assets: cAssets,
                    format: fmt,
                });
                const modifiedElements = baseLayout.elements
                    .filter((el) => !deletedLayerIds.has(el.id) && !hiddenLayers.has(el.id))
                    .map((el) => {
                    const overrides = fmtOverrides[el.id];
                    if (!overrides)
                        return el;
                    const scale = overrides.scale ?? 1;
                    return {
                        ...el,
                        fontFamily: overrides.fontFamily ?? el.fontFamily,
                        fontWeight: overrides.fontWeight ?? el.fontWeight,
                        fontSize: overrides.fontSize ?? el.fontSize,
                        lineHeight: overrides.lineHeight ?? el.lineHeight,
                        textAlign: overrides.textAlign ?? el.textAlign,
                        color: overrides.color ?? el.color,
                        letterSpacing: overrides.letterSpacing ?? el.letterSpacing,
                        fill: overrides.fill ?? el.fill,
                        borderColor: overrides.borderColor ?? el.borderColor,
                        borderWidth: overrides.borderWidth ?? el.borderWidth,
                        borderRadius: overrides.borderRadius ?? el.borderRadius,
                        opacity: overrides.opacity !== undefined ? overrides.opacity : el.opacity !== undefined ? el.opacity : 1,
                        gradient: overrides.gradient ?? el.gradient,
                        x: overrides.x !== undefined ? overrides.x : el.x,
                        y: overrides.y !== undefined ? overrides.y : el.y,
                        width: Math.round(el.width * scale),
                        height: Math.round(el.height * scale),
                    };
                });
                const customResolvedElements = customLayers
                    .filter(cl => !deletedLayerIds.has(cl.id) && !hiddenLayers.has(cl.id))
                    .map(cl => {
                    const overrides = fmtOverrides[cl.id] || {};
                    const scale = overrides.scale ?? cl.scale ?? 1;
                    const scaleX = fmt.width / (activeFormat?.width || 1080);
                    const scaleY = fmt.height / (activeFormat?.height || 1080);
                    const posX = overrides.x !== undefined ? Math.round(overrides.x * scaleX) : Math.round(cl.x * scaleX);
                    const posY = overrides.y !== undefined ? Math.round(overrides.y * scaleY) : Math.round(cl.y * scaleY);
                    const width = Math.round((cl.width || 200) * scale * scaleX);
                    const height = Math.round((cl.height || 60) * scale * scaleY);
                    const fontSize = Math.round((overrides.fontSize ?? cl.fontSize ?? 32) * Math.min(scaleX, scaleY));
                    return {
                        id: cl.id,
                        type: cl.type,
                        shapeType: cl.shapeType,
                        ctaType: cl.ctaType,
                        x: posX,
                        y: posY,
                        width,
                        height,
                        text: cl.text,
                        fontSize,
                        fontFamily: overrides.fontFamily ?? cl.fontFamily ?? cTemplate.typography.headingFontFamily ?? 'Inter',
                        fontWeight: overrides.fontWeight ?? cl.fontWeight ?? 'Bold',
                        lineHeight: overrides.lineHeight ?? cl.lineHeight ?? 1.2,
                        textAlign: overrides.textAlign ?? cl.textAlign ?? 'left',
                        color: overrides.color ?? cl.color ?? '#FFFFFF',
                        fill: overrides.fill ?? cl.fill ?? (cl.type === 'cta-button' ? '#E5173F' : (cTemplate.colorScheme.accent || '#3B82F6')),
                        borderColor: overrides.borderColor ?? cl.borderColor,
                        borderWidth: overrides.borderWidth ?? cl.borderWidth,
                        borderRadius: overrides.borderRadius ?? cl.borderRadius,
                        opacity: overrides.opacity !== undefined ? overrides.opacity : cl.opacity !== undefined ? cl.opacity : 1,
                        gradient: overrides.gradient ?? cl.gradient,
                    };
                });
                const allFmtElements = [...modifiedElements, ...customResolvedElements];
                if (layerOrder.length > 0) {
                    allFmtElements.sort((a, b) => {
                        const idxA = layerOrder.indexOf(a.id);
                        const idxB = layerOrder.indexOf(b.id);
                        if (idxA === -1 && idxB === -1)
                            return 0;
                        if (idxA === -1)
                            return -1;
                        if (idxB === -1)
                            return 1;
                        return idxB - idxA;
                    });
                }
                const dataUrl = await FabricPosterRenderer.renderToDataURL({
                    ...baseLayout,
                    elements: allFmtElements,
                });
                results.push({
                    format: fmt,
                    dataUrl,
                    width: fmt.width,
                    height: fmt.height,
                    filename: `${pName.toLowerCase().replace(/\s+/g, '-')}-${fmt.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.png`,
                });
            }
            setGeneratedPosters(results);
            if (openModal) {
                setShowGalleryModal(true);
            }
            else {
                setViewMode('all-formats');
            }
        }
        catch (err) {
            console.error('Render all formats error:', err);
            showToast('Error rendering format previews');
        }
        finally {
            setIsGeneratingAll(false);
        }
    };
    // Setup confirm
    const handleSetupConfirm = async (data) => {
        setProjectName(data.name);
        const newContent = {
            campaignName: data.name,
            introText: data.introText,
            mainHeading: data.mainHeading,
            supportingParagraph: data.supportingParagraph,
            dateText: data.dateText,
            locationText: data.locationText,
            ctaText: data.ctaText,
        };
        setContent(newContent);
        let newAssets = { ...assets };
        if (data.logoUrl) {
            newAssets.logoUrl = data.logoUrl;
            newAssets.logoWidth = data.logoWidth;
            newAssets.logoHeight = data.logoHeight;
            newAssets.logoAspectRatio = data.logoAspectRatio;
        }
        if (data.backgroundUrl) {
            const newBg = {
                id: `bg-custom-setup-${Date.now()}`,
                aspectRatio: 1.0,
                name: 'Setup Background',
                url: data.backgroundUrl,
                width: 1920,
                height: 1920,
            };
            newAssets.backgroundImages = [newBg, ...newAssets.backgroundImages];
            newAssets.selectedBackgroundId = newBg.id;
            setSelectedPresetBg(null);
        }
        setAssets(newAssets);
        setShowSetupModal(false);
        setViewMode('all-formats');
        showToast('Campaign generated! Rendering all 11 banner ratios...');
        // Automatically create and persist campaign so it appears in "Your Campaigns" on dashboard
        try {
            const createdProj = await ApiService.createProject({
                name: data.name,
                templateId: selectedTemplateId,
                content: newContent,
                assets: newAssets,
                selectedFormats: DEFAULT_POSTER_FORMATS.slice(0, 4),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });
            if (createdProj?.id) {
                setProjectId(createdProj.id);
            }
        }
        catch (err) {
            console.warn('Auto-create project error:', err);
        }
        setTimeout(() => {
            renderAllFormatsWithData(data.name, newContent, newAssets, currentTemplate, false);
        }, 50);
    };
    useEffect(() => {
        if (!showSetupModal && generatedPosters.length === 0) {
            renderAllFormatsWithData(projectName, content, assets, currentTemplate, false);
        }
    }, [showSetupModal]);
    // Dragging and resizing on canvas
    const handleStartDrag = (layerId, e) => {
        e.stopPropagation();
        e.preventDefault();
        setSelectedLayerId(layerId);
        const el = layout.elements.find((item) => item.id === layerId);
        if (!el)
            return;
        dragInfoRef.current = { layerId, startMouseX: e.clientX, startMouseY: e.clientY, initialX: el.x, initialY: el.y };
        setIsDragging(true);
    };
    const handleStartResize = (layerId, corner, e) => {
        e.stopPropagation();
        e.preventDefault();
        setSelectedLayerId(layerId);
        const el = layout.elements.find((item) => item.id === layerId);
        if (!el)
            return;
        const currentScale = currentFormatOverrides[layerId]?.scale ?? 1;
        const baseWidth = el.width / currentScale;
        const baseHeight = el.height / currentScale;
        resizeInfoRef.current = {
            layerId,
            corner,
            startMouseX: e.clientX,
            startMouseY: e.clientY,
            initialScale: currentScale,
            initialX: el.x,
            initialY: el.y,
            baseWidth,
            baseHeight,
        };
        setIsResizing(true);
    };
    useEffect(() => {
        const handleMouseMove = (e) => {
            if (dragInfoRef.current) {
                const { layerId, startMouseX, startMouseY, initialX, initialY } = dragInfoRef.current;
                const deltaX = (e.clientX - startMouseX) / previewScale;
                const deltaY = (e.clientY - startMouseY) / previewScale;
                setPerFormatOverrides(prev => {
                    const fmtMap = prev[activeFormat.id] || {};
                    const current = fmtMap[layerId] || {};
                    return {
                        ...prev,
                        [activeFormat.id]: {
                            ...fmtMap,
                            [layerId]: {
                                ...current,
                                x: Math.round(initialX + deltaX),
                                y: Math.round(initialY + deltaY),
                            },
                        },
                    };
                });
            }
            else if (resizeInfoRef.current) {
                const { layerId, corner, startMouseX, startMouseY, initialScale, initialX, initialY, baseWidth, baseHeight } = resizeInfoRef.current;
                const deltaMouseX = (e.clientX - startMouseX) / previewScale;
                const deltaMouseY = (e.clientY - startMouseY) / previewScale;
                let deltaSize = 0;
                if (corner === 'se')
                    deltaSize = (deltaMouseX + deltaMouseY) / 2;
                else if (corner === 'nw')
                    deltaSize = (-deltaMouseX - deltaMouseY) / 2;
                else if (corner === 'ne')
                    deltaSize = (deltaMouseX - deltaMouseY) / 2;
                else if (corner === 'sw')
                    deltaSize = (-deltaMouseX + deltaMouseY) / 2;
                const initialDim = Math.max(baseWidth * initialScale, baseHeight * initialScale, 60);
                const scaleFactor = 1 + (deltaSize / initialDim);
                const newScale = Math.max(0.15, Math.min(4.0, Math.round(initialScale * scaleFactor * 100) / 100));
                let newX = initialX;
                let newY = initialY;
                const widthDiff = baseWidth * (newScale - initialScale);
                const heightDiff = baseHeight * (newScale - initialScale);
                if (corner === 'nw') {
                    newX = initialX - widthDiff;
                    newY = initialY - heightDiff;
                }
                else if (corner === 'ne') {
                    newY = initialY - heightDiff;
                }
                else if (corner === 'sw') {
                    newX = initialX - widthDiff;
                }
                setPerFormatOverrides(prev => {
                    const fmtMap = prev[activeFormat.id] || {};
                    const current = fmtMap[layerId] || {};
                    return {
                        ...prev,
                        [activeFormat.id]: {
                            ...fmtMap,
                            [layerId]: {
                                ...current,
                                scale: newScale,
                                x: Math.round(newX),
                                y: Math.round(newY),
                            },
                        },
                    };
                });
            }
        };
        const handleMouseUp = () => {
            if (dragInfoRef.current) {
                dragInfoRef.current = null;
                setIsDragging(false);
            }
            if (resizeInfoRef.current) {
                resizeInfoRef.current = null;
                setIsResizing(false);
            }
        };
        if (isDragging || isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, isResizing, previewScale, activeFormat.id]);
    // Layer list items definitions
    const allLayerDefs = useMemo(() => {
        const base = [
            { id: 'element-intro', label: layerNames['element-intro'] || 'Small intro text', type: 'text' },
            { id: 'element-heading', label: layerNames['element-heading'] || 'Main heading', type: 'text' },
            { id: 'element-paragraph', label: layerNames['element-paragraph'] || 'Supporting paragraph', type: 'text' },
            { id: 'element-cta', label: layerNames['element-cta'] || 'CTA Button (Primary)', type: 'cta-button', ctaType: 'primary' },
            { id: 'element-footer', label: layerNames['element-footer'] || 'Location / date info', type: 'text' },
            { id: 'element-logo', label: layerNames['element-logo'] || 'Brand Logo', type: 'logo' },
            { id: 'element-background', label: layerNames['element-background'] || 'Background Image', type: 'background' },
        ];
        const customs = customLayers.map(cl => ({
            id: cl.id,
            label: layerNames[cl.id] || cl.label,
            type: cl.type,
            shapeType: cl.shapeType,
            ctaType: cl.ctaType,
        }));
        return [...base, ...customs];
    }, [customLayers, layerNames]);
    // Order allLayerDefs according to layerOrder
    const sortedLayers = useMemo(() => {
        const map = new Map(allLayerDefs.map(l => [l.id, l]));
        const result = [];
        for (const id of layerOrder) {
            if (map.has(id)) {
                result.push(map.get(id));
                map.delete(id);
            }
        }
        // Append any that weren't in layerOrder yet
        for (const remaining of map.values()) {
            result.push(remaining);
        }
        return result;
    }, [allLayerDefs, layerOrder]);
    const filteredLayers = useMemo(() => {
        return sortedLayers.filter(l => {
            if (deletedLayerIds.has(l.id))
                return false;
            if (!layerSearch.trim())
                return true;
            return l.label.toLowerCase().includes(layerSearch.toLowerCase().trim());
        });
    }, [sortedLayers, deletedLayerIds, layerSearch]);
    // Add layer handlers
    const handleAddTextLayer = () => {
        const id = `custom-text-${Date.now()}`;
        const textNumber = customLayers.filter(l => l.type === 'text').length + 1;
        const canvasWidth = activeFormat.width || 1080;
        const canvasHeight = activeFormat.height || 1080;
        const newLayer = {
            id,
            type: 'text',
            label: `Text ${textNumber}`,
            text: 'Add your text here',
            x: Math.round(canvasWidth * 0.1),
            y: Math.round(canvasHeight * 0.4 + ((textNumber - 1) % 5) * 60),
            width: Math.round(canvasWidth * 0.8),
            height: 60,
            fontSize: Math.round(canvasWidth * 0.035),
            fontFamily: currentTemplate.typography.headingFontFamily || 'Inter',
            fontWeight: 'Bold',
            color: '#FFFFFF',
            textAlign: 'left',
            scale: 1,
            opacity: 1,
        };
        setCustomLayers(prev => [...prev, newLayer]);
        setLayerOrder(prev => [id, ...prev]);
        setSelectedLayerId(id);
        setActiveTool('select');
        if (viewMode === 'all-formats')
            setViewMode('single');
        showToast(`Added Text Layer ${textNumber}`);
    };
    const handleAddShapeLayer = (shapeType = 'rect') => {
        const id = `custom-shape-${Date.now()}`;
        const shapeNumber = customLayers.filter(l => l.type === 'shape').length + 1;
        const canvasWidth = activeFormat.width || 1080;
        const canvasHeight = activeFormat.height || 1080;
        const size = Math.round(Math.min(canvasWidth, canvasHeight) * 0.22);
        const newLayer = {
            id,
            type: 'shape',
            shapeType,
            label: shapeType === 'circle' ? `Circle ${shapeNumber}` : `Rectangle ${shapeNumber}`,
            x: Math.round(canvasWidth * 0.15 + ((shapeNumber - 1) % 4) * 45),
            y: Math.round(canvasHeight * 0.25 + ((shapeNumber - 1) % 4) * 45),
            width: size,
            height: size,
            color: currentTemplate.colorScheme.accent || '#3B82F6',
            fill: currentTemplate.colorScheme.accent || '#3B82F6',
            scale: 1,
            opacity: 1,
            borderRadius: shapeType === 'circle' ? 9999 : 8,
        };
        setCustomLayers(prev => [...prev, newLayer]);
        setLayerOrder(prev => [id, ...prev]);
        setSelectedLayerId(id);
        setActiveTool('select');
        if (viewMode === 'all-formats')
            setViewMode('single');
        showToast(`Added ${shapeType === 'circle' ? 'Circle' : 'Rectangle'} Shape`);
    };
    // Add CTA Button (Primary, Secondary, Tertiary)
    const handleAddCtaButton = (type) => {
        const id = `cta-${type}-${Date.now()}`;
        const canvasWidth = activeFormat.width || 1080;
        const canvasHeight = activeFormat.height || 1080;
        const btnWidth = Math.round(canvasWidth * 0.3);
        const btnHeight = 56;
        const isSecondary = type === 'secondary';
        const newLayer = {
            id,
            type: 'cta-button',
            ctaType: type,
            label: isSecondary ? 'Secondary CTA Button' : 'Tertiary CTA Button',
            text: isSecondary ? 'Learn More' : 'Contact Sales →',
            x: Math.round(canvasWidth * 0.1),
            y: Math.round(canvasHeight * 0.85 + (isSecondary ? 0 : 70)),
            width: btnWidth,
            height: btnHeight,
            fontSize: 18,
            fontFamily: currentTemplate.typography.headingFontFamily || 'Plus Jakarta Sans',
            fontWeight: 'Bold',
            color: '#FFFFFF',
            fill: isSecondary ? 'transparent' : 'rgba(255,255,255,0.08)',
            borderColor: isSecondary ? '#FFFFFF' : 'transparent',
            borderWidth: isSecondary ? 2 : 0,
            borderRadius: Math.round(btnHeight * 0.35),
            opacity: 1,
            textAlign: 'center',
            scale: 1,
        };
        setCustomLayers(prev => [...prev, newLayer]);
        setLayerOrder(prev => [id, ...prev]);
        setSelectedLayerId(id);
        if (viewMode === 'all-formats')
            setViewMode('single');
        showToast(`Added ${isSecondary ? 'Secondary' : 'Tertiary'} CTA Button`);
    };
    const handleDuplicateLayer = (layerId) => {
        const cl = customLayers.find(l => l.id === layerId);
        if (!cl) {
            showToast('Cannot duplicate built-in layers');
            return;
        }
        const newId = `custom-${cl.type}-${Date.now()}`;
        const copy = {
            ...cl,
            id: newId,
            label: `${cl.label} (Copy)`,
            x: cl.x + 30,
            y: cl.y + 30,
        };
        setCustomLayers(prev => [...prev, copy]);
        setLayerOrder(prev => [newId, ...prev]);
        setSelectedLayerId(newId);
        showToast(`Duplicated layer`);
    };
    // Move layer up / down in stack
    const handleMoveLayer = (layerId, direction) => {
        setLayerOrder(prev => {
            const idx = prev.indexOf(layerId);
            if (idx === -1)
                return prev;
            const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
            if (targetIdx < 0 || targetIdx >= prev.length)
                return prev;
            const updated = [...prev];
            const temp = updated[idx];
            updated[idx] = updated[targetIdx];
            updated[targetIdx] = temp;
            return updated;
        });
        showToast(`Moved layer ${direction === 'up' ? 'forward' : 'backward'}`);
    };
    // Drag and drop layer reordering
    const handleLayerDragStart = (e, id) => {
        setDraggedLayerId(id);
        e.dataTransfer.effectAllowed = 'move';
    };
    const handleLayerDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };
    const handleLayerDrop = (e, targetId) => {
        e.preventDefault();
        if (!draggedLayerId || draggedLayerId === targetId)
            return;
        setLayerOrder(prev => {
            const fromIdx = prev.indexOf(draggedLayerId);
            const toIdx = prev.indexOf(targetId);
            if (fromIdx === -1 || toIdx === -1)
                return prev;
            const copy = [...prev];
            copy.splice(fromIdx, 1);
            copy.splice(toIdx, 0, draggedLayerId);
            return copy;
        });
        setDraggedLayerId(null);
        showToast('Layer order updated');
    };
    const handleDeleteLayer = (layerId, e) => {
        if (e)
            e.stopPropagation();
        if (layerId.startsWith('custom-') || layerId.startsWith('cta-')) {
            setCustomLayers(prev => prev.filter(l => l.id !== layerId));
        }
        else {
            setDeletedLayerIds(prev => { const next = new Set(prev); next.add(layerId); return next; });
        }
        if (selectedLayerId === layerId) {
            const remaining = allLayerDefs.find(l => l.id !== layerId && !deletedLayerIds.has(l.id) && !l.id.startsWith('custom-'));
            setSelectedLayerId(remaining ? remaining.id : 'element-heading');
        }
        showToast('Layer deleted');
    };
    const handleRestoreLayer = (layerId) => {
        setDeletedLayerIds(prev => { const next = new Set(prev); next.delete(layerId); return next; });
        setSelectedLayerId(layerId);
        setShowAddLayerMenu(false);
        showToast('Layer restored');
    };
    const handleRestoreAllLayers = () => {
        setDeletedLayerIds(new Set());
        setShowAddLayerMenu(false);
        showToast('All layers restored');
    };
    const toggleLayerVisibility = (layerId, e) => {
        e.stopPropagation();
        setHiddenLayers(prev => {
            const next = new Set(prev);
            if (next.has(layerId))
                next.delete(layerId);
            else
                next.add(layerId);
            return next;
        });
    };
    // Keyboard shortcut delete
    useEffect(() => {
        const handleKeyDown = (e) => {
            const target = e.target;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable))
                return;
            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedLayerId) {
                e.preventDefault();
                handleDeleteLayer(selectedLayerId);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedLayerId, deletedLayerIds]);
    // Exports
    const handleQuickExport = async () => {
        try {
            setIsExporting(true);
            const dataUrl = await FabricPosterRenderer.renderToDataURL({ ...layout, elements: activeElements });
            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = `${projectName.toLowerCase().replace(/\s+/g, '-')}-${activeFormat.name}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            showToast('Poster exported successfully!');
        }
        catch (err) {
            console.error('Export failed:', err);
            showToast('Export failed.');
        }
        finally {
            setIsExporting(false);
            setShowExportMenu(false);
        }
    };
    const handleGenerateAll = async () => {
        try {
            setIsExporting(true);
            await renderAllFormatsWithData(projectName, content, assets, currentTemplate, false);
            showToast('All 11 formats updated in playground!');
        }
        catch (err) {
            console.error('Generate all failed:', err);
            showToast('Failed to generate all formats.');
        }
        finally {
            setIsExporting(false);
            setShowExportMenu(false);
        }
    };
    const handleDownloadSingle = (item) => {
        const link = document.createElement('a');
        link.href = item.dataUrl;
        link.download = item.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast(`Downloaded ${item.format.name} PNG`);
    };
    const handleDownloadAllZip = async () => {
        if (generatedPosters.length === 0)
            return;
        setDownloadingZip(true);
        try {
            const zip = new JSZip();
            const folderName = `${projectName.replace(/[^a-zA-Z0-9_-]/g, '_')}_all_formats`;
            const folder = zip.folder(folderName) || zip;
            for (const item of generatedPosters) {
                const base64Data = item.dataUrl.split(',')[1];
                if (base64Data) {
                    folder.file(item.filename, base64Data, { base64: true });
                }
            }
            const zipBlob = await zip.generateAsync({
                type: 'blob',
                compression: 'DEFLATE',
                compressionOptions: { level: 6 },
            });
            const zipUrl = URL.createObjectURL(zipBlob);
            const link = document.createElement('a');
            link.href = zipUrl;
            link.download = `${folderName}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(zipUrl);
            showToast('All 11 formats downloaded in ZIP!');
        }
        catch (err) {
            console.error('ZIP generation failed:', err);
            showToast('Failed to create ZIP package');
        }
        finally {
            setDownloadingZip(false);
        }
    };
    const handleShare = () => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(window.location.href);
            showToast('Share link copied!');
        }
    };
    const handleSave = async () => {
        try {
            const thumb = await FabricPosterRenderer.renderToDataURL({ ...layout, elements: activeElements });
            const proj = {
                name: projectName,
                templateId: selectedTemplateId,
                content,
                assets,
                selectedFormats: DEFAULT_POSTER_FORMATS.slice(0, 4),
                updatedAt: new Date().toISOString(),
                thumbnailUrl: thumb,
            };
            if (projectId) {
                await ApiService.updateProject(projectId, proj);
            }
            else {
                const created = await ApiService.createProject({ ...proj, createdAt: new Date().toISOString() });
                setProjectId(created.id);
            }
            showToast('Campaign saved successfully!');
        }
        catch (e) {
            console.error('Save failed:', e);
            showToast('Saved locally.');
        }
    };
    const handleReturnToDashboard = async () => {
        try {
            const thumb = generatedPosters[0]?.dataUrl;
            const proj = {
                name: projectName,
                templateId: selectedTemplateId,
                content,
                assets,
                selectedFormats: DEFAULT_POSTER_FORMATS.slice(0, 4),
                updatedAt: new Date().toISOString(),
                ...(thumb ? { thumbnailUrl: thumb } : {}),
            };
            if (projectId) {
                await ApiService.updateProject(projectId, proj);
            }
            else {
                await ApiService.createProject(proj);
            }
        }
        catch (e) {
            console.warn('Auto-save on back error:', e);
        }
        onBackToDashboard();
    };
    const handleLogoUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result;
            const img = new Image();
            img.onload = () => {
                const aspect = img.naturalWidth / img.naturalHeight;
                setAssets(prev => ({
                    ...prev,
                    logoUrl: dataUrl,
                    logoWidth: Math.min(320, img.naturalWidth),
                    logoHeight: Math.round(Math.min(320, img.naturalWidth) / aspect),
                    logoAspectRatio: aspect,
                }));
                setSelectedPresetLogo(null);
                showToast('Logo updated');
            };
            img.src = dataUrl;
        };
        reader.readAsDataURL(file);
    };
    const handleBgUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result;
            const newBg = {
                id: `bg-upload-${Date.now()}`,
                name: file.name,
                url: dataUrl,
                width: 1920,
                height: 1920,
                aspectRatio: 1.0,
            };
            setAssets(prev => ({
                ...prev,
                backgroundImages: [newBg, ...prev.backgroundImages],
                selectedBackgroundId: newBg.id,
            }));
            setSelectedPresetBg(null);
            showToast('Background uploaded');
        };
        reader.readAsDataURL(file);
    };
    const handleSelectPresetLogo = (key, url, name) => {
        setSelectedPresetLogo(key);
        setAssets(prev => ({ ...prev, logoUrl: url }));
        showToast(`Selected logo: ${name}`);
    };
    const handleUnselectPresetLogo = () => {
        setSelectedPresetLogo(null);
        setAssets(prev => ({ ...prev, logoUrl: undefined }));
        showToast('Logo cleared');
    };
    const handleSelectPresetBg = (key, url, name) => {
        setSelectedPresetBg(key);
        const bgItem = { id: `preset-bg-${key}`, name, url, width: 1920, height: 1920, aspectRatio: 1.0 };
        setAssets(prev => ({
            ...prev,
            backgroundImages: [bgItem, ...prev.backgroundImages.filter(b => b.id !== bgItem.id)],
            selectedBackgroundId: bgItem.id,
        }));
        showToast(`Applied ${name}`);
    };
    const handleUnselectPresetBg = () => {
        setSelectedPresetBg(null);
        setAssets(prev => ({
            ...prev,
            backgroundImages: [],
            selectedBackgroundId: undefined,
        }));
        showToast('Background cleared');
    };
    // Real-time text synchronizer for selected element
    const getSelectedText = () => {
        if (!selectedElement)
            return '';
        if (selectedElement.id === 'element-intro')
            return content.introText;
        if (selectedElement.id === 'element-heading')
            return content.mainHeading;
        if (selectedElement.id === 'element-paragraph')
            return content.supportingParagraph;
        if (selectedElement.id === 'element-footer')
            return content.locationText;
        if (selectedElement.id === 'element-cta')
            return content.ctaText;
        const cl = customLayers.find(l => l.id === selectedElement.id);
        return cl?.text || selectedElement.text || '';
    };
    const handleSelectedTextChange = (newText) => {
        if (!selectedElement)
            return;
        if (selectedElement.id === 'element-intro') {
            setContent(prev => ({ ...prev, introText: newText.slice(0, CHAR_LIMITS['element-intro']) }));
        }
        else if (selectedElement.id === 'element-heading') {
            setContent(prev => ({ ...prev, mainHeading: newText.slice(0, CHAR_LIMITS['element-heading']) }));
        }
        else if (selectedElement.id === 'element-paragraph') {
            setContent(prev => ({ ...prev, supportingParagraph: newText.slice(0, CHAR_LIMITS['element-paragraph']) }));
        }
        else if (selectedElement.id === 'element-footer') {
            setContent(prev => ({ ...prev, locationText: newText.slice(0, CHAR_LIMITS['element-footer']) }));
        }
        else if (selectedElement.id === 'element-cta') {
            setContent(prev => ({ ...prev, ctaText: newText.slice(0, CHAR_LIMITS['element-cta']) }));
        }
        else {
            setCustomLayers(prev => prev.map(l => l.id === selectedElement.id ? { ...l, text: newText } : l));
        }
    };
    const isTextElement = selectedElement && (['intro', 'heading', 'paragraph', 'footer', 'text'].includes(selectedElement.type) ||
        selectedElement.id.startsWith('custom-text') ||
        selectedElement.id.startsWith('element-') && selectedElement.id !== 'element-logo' && selectedElement.id !== 'element-background');
    const isCtaElement = selectedElement && (selectedElement.type === 'cta-button' || selectedElement.id === 'element-cta' || selectedElement.id.startsWith('cta-'));
    return (_jsxs(_Fragment, { children: [showSetupModal && _jsx(CampaignSetupModal, { onConfirm: handleSetupConfirm }), _jsxs("div", { className: "h-screen w-screen flex flex-col bg-white text-slate-800 select-none overflow-hidden font-sans", children: [_jsxs("header", { className: "h-12 border-b border-slate-200 bg-white px-4 flex items-center justify-between shrink-0 z-30", children: [_jsxs("div", { className: "flex items-center space-x-3", children: [_jsxs("button", { onClick: handleReturnToDashboard, className: "p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors flex items-center space-x-1 text-xs font-semibold cursor-pointer", title: "Return to Dashboard", children: [_jsx(ArrowLeft, { className: "w-4 h-4 text-slate-500" }), _jsx("span", { className: "hidden sm:inline", children: "Campaigns" })] }), _jsx("div", { className: "h-4 w-px bg-slate-200" }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx("span", { className: "text-xs font-bold text-slate-900 tracking-tight", children: projectName }), _jsx("span", { className: "px-1.5 py-0.5 text-[10px] bg-slate-100 text-slate-600 rounded font-mono font-medium", children: currentTemplate.name })] })] }), _jsxs("div", { className: "flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/80", children: [_jsxs("button", { onClick: () => setViewMode('all-formats'), className: `px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center space-x-1.5 cursor-pointer ${viewMode === 'all-formats'
                                            ? 'bg-white text-blue-600 shadow-xs ring-1 ring-slate-200 font-bold'
                                            : 'text-slate-600 hover:text-slate-900'}`, children: [_jsx(LayoutGrid, { className: "w-3.5 h-3.5" }), _jsxs("span", { children: ["All 11 Formats (", generatedPosters.length || 11, ")"] })] }), _jsxs("button", { onClick: () => setViewMode('single'), className: `px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center space-x-1.5 cursor-pointer ${viewMode === 'single'
                                            ? 'bg-white text-blue-600 shadow-xs ring-1 ring-slate-200 font-bold'
                                            : 'text-slate-600 hover:text-slate-900'}`, children: [_jsx(MousePointer2, { className: "w-3.5 h-3.5" }), _jsxs("span", { children: ["Canvas (", activeFormat.aspectRatioLabel, ")"] })] })] }), _jsxs("div", { className: "flex items-center space-x-2 relative", children: [_jsxs("button", { onClick: () => setShowSetupModal(true), className: "px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 flex items-center space-x-1.5 transition-colors cursor-pointer", children: [_jsx(Plus, { className: "w-3.5 h-3.5" }), _jsx("span", { children: "New" })] }), _jsxs("button", { onClick: handleShare, className: "px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 flex items-center space-x-1.5 transition-colors cursor-pointer", children: [_jsx(Link2, { className: "w-3.5 h-3.5 text-slate-500" }), _jsx("span", { children: "Share" })] }), _jsxs("button", { onClick: handleQuickExport, disabled: isExporting, className: "px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer", children: [_jsx(Download, { className: "w-3.5 h-3.5" }), _jsx("span", { children: isExporting ? 'Exporting...' : 'Export' })] }), _jsxs("div", { className: "relative", children: [_jsx("button", { onClick: () => setShowExportMenu(!showExportMenu), className: "p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 cursor-pointer", children: _jsx(MoreHorizontal, { className: "w-4 h-4" }) }), showExportMenu && (_jsxs("div", { className: "absolute right-0 mt-1 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs animate-fade-in", children: [_jsxs("button", { onClick: handleQuickExport, className: "w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center space-x-2 text-slate-700", children: [_jsx(Download, { className: "w-3.5 h-3.5 text-blue-600" }), _jsx("span", { children: "Download Active (PNG)" })] }), _jsxs("button", { onClick: handleGenerateAll, className: "w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center space-x-2 text-slate-700", children: [_jsx(Sparkles, { className: "w-3.5 h-3.5 text-indigo-600" }), _jsx("span", { children: "Regenerate All Formats" })] }), _jsxs("button", { onClick: handleDownloadAllZip, className: "w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center space-x-2 text-slate-700", children: [_jsx(FolderArchive, { className: "w-3.5 h-3.5 text-emerald-600" }), _jsx("span", { children: "Download ZIP (All Formats)" })] }), _jsx("div", { className: "h-px bg-slate-100 my-1" }), _jsxs("button", { onClick: handleSave, className: "w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center space-x-2 text-slate-700", children: [_jsx(Check, { className: "w-3.5 h-3.5 text-emerald-600" }), _jsx("span", { children: "Save Campaign" })] })] }))] })] })] }), _jsxs("div", { className: "h-10 border-b border-slate-200 bg-white px-3 flex items-center justify-between shrink-0 text-xs z-20 overflow-x-auto", children: [_jsxs("div", { className: "flex items-center space-x-1 shrink-0", children: [_jsx("button", { onClick: () => { setActiveTool('select'); showToast('Select tool active — click any section to select'); }, className: `p-1.5 rounded transition-colors cursor-pointer ${activeTool === 'select' ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-200' : 'hover:bg-slate-100 text-slate-600'}`, title: "Select Tool \u2014 click any section", children: _jsx(MousePointer2, { className: "w-4 h-4" }) }), _jsx("button", { onClick: () => handleAddShapeLayer('rect'), className: "p-1.5 rounded hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer", title: "Add Rectangle Shape", children: _jsx(Square, { className: "w-4 h-4" }) }), _jsx("button", { onClick: () => handleAddShapeLayer('circle'), className: "p-1.5 rounded hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer", title: "Add Circle Shape", children: _jsx(Circle, { className: "w-4 h-4" }) }), _jsx("button", { onClick: handleAddTextLayer, className: "p-1.5 rounded hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer", title: "Add Text Layer", children: _jsx(Type, { className: "w-4 h-4" }) }), _jsx("button", { onClick: () => handleAddCtaButton('secondary'), className: "px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition-colors cursor-pointer", title: "Add Secondary CTA Button", children: "+ CTA" }), _jsx("button", { onClick: () => bgInputRef.current?.click(), className: "p-1.5 rounded hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer", title: "Upload Background Image", children: _jsx(ImageIcon, { className: "w-4 h-4" }) })] }), _jsxs("div", { className: "flex items-center space-x-1.5 shrink-0", children: [_jsxs("div", { className: "relative", children: [_jsx("select", { value: currentFontFamily, onChange: e => updateSelectedElementStyle({ fontFamily: e.target.value }), className: "appearance-none bg-slate-50 border border-slate-200 rounded px-2.5 py-1 pr-6 text-xs font-medium text-slate-800 cursor-pointer focus:outline-none focus:border-blue-500", children: ['Inter', 'Plus Jakarta Sans', 'Space Grotesk', 'Outfit', 'Playfair Display'].map(f => (_jsx("option", { value: f, children: f }, f))) }), _jsx(ChevronDown, { className: "w-3 h-3 text-slate-400 pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2" })] }), _jsxs("div", { className: "relative", children: [_jsx("select", { value: currentFontWeight, onChange: e => updateSelectedElementStyle({ fontWeight: e.target.value }), className: "appearance-none bg-slate-50 border border-slate-200 rounded px-2.5 py-1 pr-6 text-xs font-medium text-slate-800 cursor-pointer focus:outline-none focus:border-blue-500", children: ['Regular', 'Medium', 'SemiBold', 'Bold', 'ExtraBold'].map(w => (_jsx("option", { value: w, children: w }, w))) }), _jsx(ChevronDown, { className: "w-3 h-3 text-slate-400 pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2" })] }), _jsxs("div", { className: "relative", children: [_jsx("select", { value: currentFontSize, onChange: e => updateSelectedElementStyle({ fontSize: parseInt(e.target.value, 10) }), className: "appearance-none bg-slate-50 border border-slate-200 rounded px-2 py-1 pr-5 text-xs font-mono font-medium text-slate-800 cursor-pointer focus:outline-none focus:border-blue-500 w-16", children: [14, 16, 18, 20, 24, 28, 32, 40, 48, 56, 64, 72, 80].map(s => (_jsxs("option", { value: s, children: [s, "px"] }, s))) }), _jsx(ChevronDown, { className: "w-3 h-3 text-slate-400 pointer-events-none absolute right-1 top-1/2 -translate-y-1/2" })] }), _jsx("div", { className: "h-4 w-px bg-slate-200" }), _jsxs("div", { className: "flex items-center space-x-0.5", children: [_jsx("button", { onClick: () => updateSelectedElementStyle({ textAlign: 'left' }), className: `p-1 rounded transition-colors ${currentTextAlign === 'left' ? 'bg-blue-50 text-blue-600' : 'hover:bg-slate-100 text-slate-500'}`, children: _jsx(AlignLeft, { className: "w-3.5 h-3.5" }) }), _jsx("button", { onClick: () => updateSelectedElementStyle({ textAlign: 'center' }), className: `p-1 rounded transition-colors ${currentTextAlign === 'center' ? 'bg-blue-50 text-blue-600' : 'hover:bg-slate-100 text-slate-500'}`, children: _jsx(AlignCenter, { className: "w-3.5 h-3.5" }) }), _jsx("button", { onClick: () => updateSelectedElementStyle({ textAlign: 'right' }), className: `p-1 rounded transition-colors ${currentTextAlign === 'right' ? 'bg-blue-50 text-blue-600' : 'hover:bg-slate-100 text-slate-500'}`, children: _jsx(AlignRight, { className: "w-3.5 h-3.5" }) })] }), _jsx("div", { className: "h-4 w-px bg-slate-200" }), _jsxs("div", { className: "flex items-center space-x-1 bg-slate-50 border border-slate-200 rounded px-1 py-0.5", children: [_jsx("button", { onClick: () => scaleSelectedLayer(-0.1), className: "p-0.5 rounded hover:bg-slate-200 text-slate-500", title: "Scale Down", children: _jsx(ZoomOut, { className: "w-3 h-3" }) }), _jsxs("span", { className: "text-[11px] font-mono text-slate-700 w-9 text-center", children: [Math.round(currentScale * 100), "%"] }), _jsx("button", { onClick: () => scaleSelectedLayer(0.1), className: "p-0.5 rounded hover:bg-slate-200 text-slate-500", title: "Scale Up", children: _jsx(ZoomIn, { className: "w-3 h-3" }) })] }), _jsx("div", { className: "h-4 w-px bg-slate-200" }), _jsxs("div", { className: "flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded px-2 py-0.5", title: "Element Opacity", children: [_jsx("span", { className: "text-[10px] text-slate-400 font-bold uppercase", children: "Op" }), _jsx("input", { type: "range", min: "0", max: "1", step: "0.05", value: currentOpacity, onChange: e => updateSelectedElementStyle({ opacity: parseFloat(e.target.value) }), className: "w-12 h-1 accent-blue-600 cursor-pointer" }), _jsxs("span", { className: "text-[11px] font-mono text-slate-700 w-8", children: [Math.round(currentOpacity * 100), "%"] })] }), _jsx("div", { className: "h-4 w-px bg-slate-200" }), _jsxs("div", { className: "flex items-center space-x-1.5 relative", children: [_jsx("div", { onClick: () => colorInputRef.current?.click(), className: "w-5 h-5 rounded border border-slate-300 cursor-pointer hover:scale-105 transition-transform", style: { backgroundColor: currentColor }, children: _jsx("input", { ref: colorInputRef, type: "color", value: currentColor.startsWith('#') ? currentColor : '#FFFFFF', onChange: e => updateSelectedElementStyle({ color: e.target.value }), className: "opacity-0 w-0 h-0 absolute pointer-events-none" }) }), _jsx("span", { className: "text-[11px] font-mono text-slate-600 uppercase", children: currentColor })] }), selectedElement && (_jsx("button", { onClick: () => handleDeleteLayer(selectedElement.id), className: "p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors ml-1 cursor-pointer", title: "Delete selected element", children: _jsx(Trash2, { className: "w-3.5 h-3.5" }) }))] })] }), _jsxs("div", { className: "flex-1 flex overflow-hidden", children: [_jsx("aside", { className: "w-16 border-r border-slate-200 bg-white flex flex-col items-center py-2 shrink-0 z-10", children: _jsxs("div", { className: "flex flex-col items-center space-y-1.5 w-full px-1.5", children: [_jsxs("button", { onClick: () => { setActiveTool('select'); showToast('Select tool active — click any section to select'); }, className: `w-full py-2 flex flex-col items-center justify-center rounded-lg transition-colors cursor-pointer ${activeTool === 'select' ? 'bg-blue-50 text-blue-600 font-semibold ring-1 ring-blue-200 shadow-2xs' : 'text-slate-600 hover:bg-slate-100'}`, title: "Select Tool \u2014 click any section on canvas", children: [_jsx(MousePointer2, { className: "w-4 h-4 mb-1" }), _jsx("span", { className: "text-[10px]", children: "Select" })] }), _jsxs("div", { className: "w-full relative group", children: [_jsxs("button", { onClick: () => handleAddShapeLayer('rect'), className: "w-full py-2 flex flex-col items-center justify-center rounded-lg transition-colors text-slate-600 hover:bg-slate-100 cursor-pointer", title: "Add Shapes (Rectangle / Circle)", children: [_jsx(Square, { className: "w-4 h-4 mb-1" }), _jsx("span", { className: "text-[10px]", children: "Shapes" })] }), _jsxs("div", { className: "hidden group-hover:flex absolute left-full top-0 ml-1 bg-white rounded-lg shadow-xl border border-slate-200 p-1 flex-col space-y-0.5 z-50 whitespace-nowrap text-xs", children: [_jsxs("button", { onClick: (e) => { e.stopPropagation(); handleAddShapeLayer('rect'); }, className: "flex items-center space-x-1.5 px-2.5 py-1.5 hover:bg-slate-50 text-slate-700 rounded text-left cursor-pointer", children: [_jsx(Square, { className: "w-3.5 h-3.5 text-blue-600" }), _jsx("span", { children: "Rectangle" })] }), _jsxs("button", { onClick: (e) => { e.stopPropagation(); handleAddShapeLayer('circle'); }, className: "flex items-center space-x-1.5 px-2.5 py-1.5 hover:bg-slate-50 text-slate-700 rounded text-left cursor-pointer", children: [_jsx(Circle, { className: "w-3.5 h-3.5 text-blue-600" }), _jsx("span", { children: "Circle" })] })] })] }), _jsxs("button", { onClick: handleAddTextLayer, className: "w-full py-2 flex flex-col items-center justify-center rounded-lg transition-colors text-slate-600 hover:bg-slate-100 cursor-pointer", title: "Add Text Layer", children: [_jsx(Type, { className: "w-4 h-4 mb-1" }), _jsx("span", { className: "text-[10px]", children: "Text" })] }), _jsxs("div", { className: "w-full relative group", children: [_jsxs("button", { onClick: () => handleAddCtaButton('secondary'), className: "w-full py-2 flex flex-col items-center justify-center rounded-lg transition-colors text-slate-600 hover:bg-slate-100 cursor-pointer", title: "Call to Action Buttons", children: [_jsx(Plus, { className: "w-4 h-4 mb-1 text-emerald-600" }), _jsx("span", { className: "text-[10px]", children: "CTA Btn" })] }), _jsxs("div", { className: "hidden group-hover:flex absolute left-full top-0 ml-1 bg-white rounded-lg shadow-xl border border-slate-200 p-1 flex-col space-y-0.5 z-50 whitespace-nowrap text-xs", children: [_jsxs("button", { onClick: (e) => { e.stopPropagation(); handleAddCtaButton('secondary'); }, className: "flex items-center space-x-1.5 px-2.5 py-1.5 hover:bg-slate-50 text-slate-700 rounded text-left cursor-pointer", children: [_jsx("span", { className: "w-2 h-2 rounded-full bg-blue-600" }), _jsx("span", { children: "+ Secondary Button" })] }), _jsxs("button", { onClick: (e) => { e.stopPropagation(); handleAddCtaButton('tertiary'); }, className: "flex items-center space-x-1.5 px-2.5 py-1.5 hover:bg-slate-50 text-slate-700 rounded text-left cursor-pointer", children: [_jsx("span", { className: "w-2 h-2 rounded-full bg-slate-400" }), _jsx("span", { children: "+ Tertiary Button" })] })] })] }), _jsxs("button", { onClick: () => bgInputRef.current?.click(), className: "w-full py-2 flex flex-col items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer", title: "Upload Background Image", children: [_jsx(ImageIcon, { className: "w-4 h-4 mb-1" }), _jsx("span", { className: "text-[10px]", children: "Image" })] }), _jsxs("button", { onClick: () => {
                                                const first = allLayerDefs.find(l => !deletedLayerIds.has(l.id));
                                                if (first)
                                                    setSelectedLayerId(first.id);
                                            }, className: "w-full py-2 flex flex-col items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer", title: "Layers Panel", children: [_jsx(Layers, { className: "w-4 h-4 mb-1" }), _jsx("span", { className: "text-[10px]", children: "Layers" })] })] }) }), _jsx("main", { ref: containerRef, className: "flex-1 relative flex flex-col bg-slate-50 overflow-auto", style: {
                                    backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
                                    backgroundSize: '24px 24px',
                                    backgroundColor: '#f8fafc',
                                }, children: viewMode === 'all-formats' ? (_jsxs("div", { className: "flex-1 flex flex-col overflow-y-auto", children: [_jsxs("div", { className: "h-11 border-b border-slate-200/90 bg-white/95 backdrop-blur-sm px-6 flex items-center justify-between sticky top-0 z-20 shrink-0", children: [_jsxs("div", { className: "flex items-center space-x-3", children: [_jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(LayoutGrid, { className: "w-4 h-4 text-blue-600" }), _jsx("h2", { className: "text-sm font-bold text-slate-900 tracking-tight", children: "Campaign Playground" })] }), _jsxs("span", { className: "px-2.5 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200 flex items-center space-x-1", children: [_jsx(CheckCircle2, { className: "w-3 h-3 text-emerald-500" }), _jsxs("span", { children: [generatedPosters.length || 11, " Formats Active"] })] }), _jsx("span", { className: "text-xs text-slate-400 hidden sm:inline", children: "\u2022 Click any banner card to edit in canvas" })] }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsxs("button", { onClick: () => handleGenerateAll(), disabled: isGeneratingAll, className: "px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg flex items-center space-x-1.5 transition-colors shadow-2xs cursor-pointer", title: "Update all banner formats with current settings", children: [_jsx(RefreshCw, { className: `w-3.5 h-3.5 ${isGeneratingAll ? 'animate-spin text-blue-600' : 'text-slate-500'}` }), _jsx("span", { children: isGeneratingAll ? 'Rendering...' : 'Update Previews' })] }), _jsx("button", { onClick: handleDownloadAllZip, disabled: downloadingZip || generatedPosters.length === 0, className: "px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer", children: downloadingZip ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" }), _jsx("span", { children: "Packaging ZIP..." })] })) : (_jsxs(_Fragment, { children: [_jsx(FolderArchive, { className: "w-3.5 h-3.5 text-sky-400" }), _jsx("span", { children: "Download All (ZIP)" })] })) })] })] }), _jsx("div", { className: "p-6 flex-1", children: isGeneratingAll && generatedPosters.length === 0 ? (_jsxs("div", { className: "h-96 flex flex-col items-center justify-center space-y-3", children: [_jsx("div", { className: "w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" }), _jsx("span", { className: "text-xs text-slate-500 font-medium", children: "Generating deterministic layouts for all 11 formats..." })] })) : (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6", children: generatedPosters.map((item) => (_jsxs("div", { className: "bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col overflow-hidden group", children: [_jsxs("div", { onClick: () => {
                                                                setActiveFormat(item.format);
                                                                setViewMode('single');
                                                                showToast(`Switched to ${item.format.name} (${item.format.aspectRatioLabel})`);
                                                            }, className: "bg-slate-900/95 relative flex items-center justify-center p-4 cursor-pointer overflow-hidden", style: { minHeight: '220px', maxHeight: '320px' }, children: [_jsx("img", { src: item.dataUrl, alt: item.format.name, className: "max-h-64 max-w-full object-contain rounded shadow-md group-hover:scale-[1.02] transition-transform duration-300" }), _jsx("div", { className: "absolute inset-0 bg-slate-900/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2", children: _jsxs("span", { className: "px-3 py-1.5 bg-white text-slate-900 font-bold text-xs rounded-lg shadow-md flex items-center space-x-1.5", children: [_jsx(MousePointer2, { className: "w-3.5 h-3.5 text-blue-600" }), _jsx("span", { children: "Edit Format" })] }) }), _jsx("span", { className: "absolute top-2.5 left-2.5 bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded border border-white/10 uppercase", children: item.format.aspectRatioLabel })] }), _jsxs("div", { className: "p-3 border-t border-slate-100 flex items-center justify-between bg-white", children: [_jsxs("div", { children: [_jsx("h4", { className: "text-xs font-bold text-slate-900", children: item.format.name }), _jsxs("span", { className: "text-[10px] text-slate-400 font-mono", children: [item.width, " \u00D7 ", item.height, " px"] })] }), _jsx("button", { onClick: () => handleDownloadSingle(item), className: "p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer", title: "Download PNG", children: _jsx(Download, { className: "w-4 h-4" }) })] })] }, item.format.id))) })) })] })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "h-10 border-b border-slate-200/90 bg-white/95 px-4 flex items-center justify-between sticky top-0 z-20 shrink-0", children: [_jsxs("div", { className: "flex items-center space-x-2", children: [_jsx("span", { className: "text-xs font-bold text-slate-800", children: "Aspect Ratio:" }), _jsx("div", { className: "flex items-center space-x-1 overflow-x-auto", children: ALL_GENERATE_FORMATS.map(fmt => (_jsx("button", { onClick: () => setActiveFormat(fmt), className: `px-2 py-0.5 text-[11px] font-semibold rounded transition-colors cursor-pointer ${activeFormat.id === fmt.id
                                                                    ? 'bg-blue-600 text-white font-bold'
                                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`, children: fmt.aspectRatioLabel }, fmt.id))) })] }), _jsxs("div", { className: "flex items-center space-x-2 text-[11px] text-slate-500", children: [_jsxs("span", { className: "px-2 py-0.5 rounded bg-sky-50 text-sky-700 font-mono border border-sky-200 font-bold", children: [activeFormat.width, " \u00D7 ", activeFormat.height, " px"] }), _jsx("span", { className: "text-slate-400 hidden sm:inline", children: "\u2022 Independent Canvas Mode" })] })] }), _jsx("div", { className: "flex-1 flex items-center justify-center p-8 overflow-auto", children: _jsxs("div", { className: "relative bg-slate-900 shadow-2xl rounded-sm transition-all", style: { width: `${displayWidth}px`, height: `${displayHeight}px` }, children: [_jsx("canvas", { ref: canvasElRef, width: displayWidth, height: displayHeight, className: "block pointer-events-none rounded-sm" }), selectedElement && (_jsxs("div", { className: "absolute pointer-events-auto border-2 border-sky-400 bg-sky-400/10 cursor-move group transition-all", style: {
                                                            left: `${Math.round(selectedElement.x * previewScale)}px`,
                                                            top: `${Math.round(selectedElement.y * previewScale)}px`,
                                                            width: `${Math.round(selectedElement.width * previewScale)}px`,
                                                            height: `${Math.round(selectedElement.height * previewScale)}px`,
                                                            borderRadius: selectedElement.shapeType === 'circle' ? '50%' : selectedElement.type === 'cta-button' ? '9999px' : '2px',
                                                        }, onMouseDown: e => handleStartDrag(selectedElement.id, e), title: "Drag to reposition | Drag corners to resize", children: [_jsx("div", { onMouseDown: e => handleStartResize(selectedElement.id, 'nw', e), className: "absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-sky-500 rounded-full cursor-nwse-resize shadow-md hover:scale-125 transition-transform", title: "Drag to scale (Top-Left)" }), _jsx("div", { onMouseDown: e => handleStartResize(selectedElement.id, 'ne', e), className: "absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-sky-500 rounded-full cursor-nesw-resize shadow-md hover:scale-125 transition-transform", title: "Drag to scale (Top-Right)" }), _jsx("div", { onMouseDown: e => handleStartResize(selectedElement.id, 'se', e), className: "absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-sky-500 rounded-full cursor-nwse-resize shadow-md hover:scale-125 transition-transform", title: "Drag to scale (Bottom-Right)" }), _jsx("div", { onMouseDown: e => handleStartResize(selectedElement.id, 'sw', e), className: "absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-sky-500 rounded-full cursor-nesw-resize shadow-md hover:scale-125 transition-transform", title: "Drag to scale (Bottom-Left)" }), _jsxs("div", { className: "absolute -top-6 right-0 bg-slate-900 text-white text-[10px] font-mono px-1.5 py-0.5 rounded shadow pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap", children: [Math.round(selectedElement.width), " \u00D7 ", Math.round(selectedElement.height), " (", Math.round(currentScale * 100), "%)"] })] })), activeElements.map(el => {
                                                        if (el.id === selectedElement?.id)
                                                            return null;
                                                        return (_jsx("div", { onClick: () => setSelectedLayerId(el.id), onMouseDown: e => handleStartDrag(el.id, e), className: "absolute pointer-events-auto hover:border hover:border-sky-300 hover:bg-sky-400/5 cursor-pointer transition-colors", style: {
                                                                left: `${Math.round(el.x * previewScale)}px`,
                                                                top: `${Math.round(el.y * previewScale)}px`,
                                                                width: `${Math.round(el.width * previewScale)}px`,
                                                                height: `${Math.round(el.height * previewScale)}px`,
                                                                borderRadius: el.shapeType === 'circle' ? '50%' : el.type === 'cta-button' ? '9999px' : '2px',
                                                            }, title: `Click to select ${layerNames[el.id] || el.id}` }, el.id));
                                                    })] }) })] })) }), _jsxs("div", { className: "flex border-l border-slate-200 bg-white shrink-0 z-20", children: [_jsxs("section", { className: "w-60 border-r border-slate-200 flex flex-col bg-white", children: [_jsxs("div", { className: "h-9 border-b border-slate-200 flex items-center px-3 justify-between text-xs", children: [_jsx("span", { className: "tracking-tight uppercase text-[11px] text-slate-500 font-semibold", children: "Stacking Order" }), deletedLayerIds.size > 0 && (_jsxs("button", { onClick: handleRestoreAllLayers, className: "text-[10px] text-blue-600 hover:text-blue-800 font-semibold flex items-center space-x-1 cursor-pointer", children: [_jsx(RotateCcw, { className: "w-3 h-3" }), _jsxs("span", { children: ["Restore (", deletedLayerIds.size, ")"] })] }))] }), _jsxs("div", { className: "px-3 py-2 border-b border-slate-100 flex items-center justify-between relative", children: [_jsx("span", { className: "text-xs font-bold text-slate-900 tracking-tight", children: "Layers" }), _jsxs("div", { className: "flex items-center space-x-1 text-slate-400", children: [_jsx("button", { onClick: () => setLayerSearch(layerSearch ? '' : ' '), className: "p-1 hover:text-slate-700 rounded cursor-pointer", title: "Search layers", children: _jsx(Search, { className: "w-3.5 h-3.5" }) }), _jsx("button", { onClick: () => setShowAddLayerMenu(!showAddLayerMenu), className: "p-1 hover:text-slate-700 rounded cursor-pointer", title: "Add Layer", children: _jsx(Plus, { className: "w-3.5 h-3.5" }) }), showAddLayerMenu && (_jsxs("div", { className: "absolute right-3 top-9 w-52 bg-white rounded-lg shadow-xl border border-slate-200 py-1.5 z-50 text-xs animate-fade-in", children: [_jsxs("div", { className: "border-b border-slate-100 pb-1 mb-1 px-1 space-y-0.5", children: [_jsxs("button", { onClick: () => { handleAddTextLayer(); setShowAddLayerMenu(false); }, className: "w-full text-left px-2.5 py-1.5 hover:bg-blue-50 text-blue-700 font-medium rounded flex items-center space-x-2", children: [_jsx(Type, { className: "w-3.5 h-3.5" }), _jsx("span", { children: "+ Add Text Layer" })] }), _jsxs("button", { onClick: () => { handleAddShapeLayer('rect'); setShowAddLayerMenu(false); }, className: "w-full text-left px-2.5 py-1.5 hover:bg-blue-50 text-blue-700 font-medium rounded flex items-center space-x-2", children: [_jsx(Square, { className: "w-3.5 h-3.5" }), _jsx("span", { children: "+ Add Rectangle" })] }), _jsxs("button", { onClick: () => { handleAddShapeLayer('circle'); setShowAddLayerMenu(false); }, className: "w-full text-left px-2.5 py-1.5 hover:bg-blue-50 text-blue-700 font-medium rounded flex items-center space-x-2", children: [_jsx(Circle, { className: "w-3.5 h-3.5" }), _jsx("span", { children: "+ Add Circle" })] }), _jsxs("button", { onClick: () => { handleAddCtaButton('secondary'); setShowAddLayerMenu(false); }, className: "w-full text-left px-2.5 py-1.5 hover:bg-blue-50 text-blue-700 font-medium rounded flex items-center space-x-2", children: [_jsx(Plus, { className: "w-3.5 h-3.5" }), _jsx("span", { children: "+ Secondary CTA Button" })] }), _jsxs("button", { onClick: () => { handleAddCtaButton('tertiary'); setShowAddLayerMenu(false); }, className: "w-full text-left px-2.5 py-1.5 hover:bg-blue-50 text-blue-700 font-medium rounded flex items-center space-x-2", children: [_jsx(Plus, { className: "w-3.5 h-3.5" }), _jsx("span", { children: "+ Tertiary CTA Button" })] })] }), _jsx("span", { className: "px-3 py-1 text-[10px] font-bold text-slate-400 block uppercase", children: "Existing Layers" }), allLayerDefs.map(l => (_jsxs("button", { onClick: () => handleRestoreLayer(l.id), className: "w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center justify-between text-slate-700", children: [_jsx("span", { className: "truncate", children: l.label }), deletedLayerIds.has(l.id) ? _jsx("span", { className: "text-[10px] text-emerald-600 font-semibold shrink-0 ml-1", children: "+ Restore" }) : _jsx(Check, { className: "w-3 h-3 text-slate-400 shrink-0 ml-1" })] }, l.id)))] }))] })] }), _jsx("div", { className: "flex-1 overflow-y-auto p-1.5 space-y-0.5 text-xs text-slate-700", children: filteredLayers.map((layer, idx) => {
                                                    const isSelected = selectedLayerId === layer.id;
                                                    const isHidden = hiddenLayers.has(layer.id);
                                                    const isEditingName = editingLayerNameId === layer.id;
                                                    return (_jsxs("div", { draggable: true, onDragStart: e => handleLayerDragStart(e, layer.id), onDragOver: handleLayerDragOver, onDrop: e => handleLayerDrop(e, layer.id), onClick: () => setSelectedLayerId(layer.id), className: `group flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 text-blue-700 font-semibold ring-1 ring-blue-200' : 'hover:bg-slate-50 text-slate-700'}`, children: [_jsxs("div", { className: "flex items-center space-x-1.5 truncate flex-1 min-w-0 mr-1", children: [_jsx(Move, { className: "w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 cursor-grab shrink-0" }), layer.type === 'background' ? (_jsx(Square, { className: `w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-blue-600' : 'text-slate-400'}` })) : layer.type === 'logo' ? (_jsx(ImageIcon, { className: `w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-blue-600' : 'text-slate-400'}` })) : layer.type === 'cta-button' ? (_jsx("span", { className: "w-3 h-3 rounded-full bg-rose-500 shrink-0" })) : layer.type === 'shape' ? (layer.shapeType === 'circle' ? (_jsx(Circle, { className: `w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-blue-600' : 'text-slate-400'}` })) : (_jsx(Square, { className: `w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-blue-600' : 'text-slate-400'}` }))) : (_jsx(Type, { className: `w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-blue-600' : 'text-slate-400'}` })), isEditingName ? (_jsx("input", { type: "text", autoFocus: true, defaultValue: layer.label, onBlur: e => {
                                                                            if (e.target.value.trim()) {
                                                                                setLayerNames(prev => ({ ...prev, [layer.id]: e.target.value.trim() }));
                                                                            }
                                                                            setEditingLayerNameId(null);
                                                                        }, onKeyDown: e => {
                                                                            if (e.key === 'Enter') {
                                                                                if (e.target.value.trim()) {
                                                                                    setLayerNames(prev => ({ ...prev, [layer.id]: e.target.value.trim() }));
                                                                                }
                                                                                setEditingLayerNameId(null);
                                                                            }
                                                                            else if (e.key === 'Escape') {
                                                                                setEditingLayerNameId(null);
                                                                            }
                                                                        }, className: "bg-white border border-blue-400 rounded px-1 text-xs w-full text-slate-900 focus:outline-none", onClick: e => e.stopPropagation() })) : (_jsx("span", { className: "truncate", onDoubleClick: e => { e.stopPropagation(); setEditingLayerNameId(layer.id); }, title: "Double-click to rename", children: layer.label }))] }), _jsxs("div", { className: "flex items-center space-x-0.5 shrink-0", children: [_jsx("button", { onClick: e => { e.stopPropagation(); handleMoveLayer(layer.id, 'up'); }, className: "p-0.5 text-slate-400 hover:text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity rounded", title: "Bring Forward (Up)", disabled: idx === 0, children: _jsx(ChevronUp, { className: "w-3 h-3" }) }), _jsx("button", { onClick: e => { e.stopPropagation(); handleMoveLayer(layer.id, 'down'); }, className: "p-0.5 text-slate-400 hover:text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity rounded", title: "Send Backward (Down)", disabled: idx === filteredLayers.length - 1, children: _jsx(ChevronDown, { className: "w-3 h-3" }) }), _jsx("button", { onClick: e => { e.stopPropagation(); setEditingLayerNameId(layer.id); }, className: "p-0.5 text-slate-400 hover:text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity rounded", title: "Rename layer", children: _jsx(Pencil, { className: "w-3 h-3" }) }), _jsx("button", { onClick: e => toggleLayerVisibility(layer.id, e), className: `p-0.5 rounded transition-opacity ${isHidden ? 'text-slate-400 opacity-100' : 'text-slate-400 opacity-0 group-hover:opacity-100 hover:text-slate-700'}`, title: isHidden ? 'Show layer' : 'Hide layer', children: isHidden ? _jsx(EyeOff, { className: "w-3 h-3" }) : _jsx(Eye, { className: "w-3 h-3" }) }), _jsx("button", { onClick: e => handleDeleteLayer(layer.id, e), className: "p-0.5 rounded text-slate-400 opacity-0 group-hover:opacity-100 hover:text-red-600 transition-opacity", title: "Delete layer", children: _jsx(Trash2, { className: "w-3 h-3" }) })] })] }, layer.id));
                                                }) })] }), _jsxs("section", { className: "w-80 flex flex-col bg-white overflow-y-auto text-xs text-slate-700 divide-y divide-slate-100", children: [_jsxs("div", { className: "p-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center space-x-1.5 min-w-0", children: [_jsx(MousePointer2, { className: "w-3.5 h-3.5 text-blue-600 shrink-0" }), _jsx("span", { className: "text-[10px] uppercase font-bold text-slate-400", children: "Selected:" }), _jsx("span", { className: "text-xs font-bold text-slate-800 truncate", children: layerNames[selectedLayerId] || allLayerDefs.find(l => l.id === selectedLayerId)?.label || (selectedElement ? selectedElement.type : 'None') })] }), _jsxs("div", { className: "flex items-center space-x-1", children: [selectedElement && selectedElement.id.startsWith('custom-') && (_jsx("button", { onClick: () => handleDuplicateLayer(selectedElement.id), className: "text-slate-400 hover:text-blue-600 p-1 rounded hover:bg-blue-50 transition-colors", title: "Duplicate layer", children: _jsx(Copy, { className: "w-3.5 h-3.5" }) })), selectedElement && (_jsx("button", { onClick: () => handleDeleteLayer(selectedElement.id), className: "text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors", title: "Delete selected layer", children: _jsx(Trash2, { className: "w-3.5 h-3.5" }) }))] })] }), (isTextElement || isCtaElement) && (_jsxs("div", { className: "p-3 bg-blue-50/40 border-b border-blue-100 space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("span", { className: "text-[11px] font-bold text-blue-900 flex items-center space-x-1.5", children: [_jsx(Type, { className: "w-3.5 h-3.5 text-blue-600" }), _jsx("span", { children: "Live Text Content (Real-Time)" })] }), _jsxs("span", { className: "text-[10px] text-slate-400 font-mono", children: [getSelectedText().length, " ", CHAR_LIMITS[selectedLayerId] ? `/${CHAR_LIMITS[selectedLayerId]}` : ''] })] }), _jsx("textarea", { rows: 3, value: getSelectedText(), onChange: e => handleSelectedTextChange(e.target.value), className: "w-full bg-white border border-blue-200 rounded px-2.5 py-1.5 text-slate-800 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors resize-none leading-relaxed", placeholder: "Type to update canvas in real time..." }), _jsx("span", { className: "text-[10px] text-slate-400 block italic", children: "Updates canvas instantly as you type" })] })), isCtaElement && (_jsxs("div", { className: "p-3 bg-rose-50/30 border-b border-rose-100 space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("span", { className: "text-[11px] font-bold text-rose-900 flex items-center space-x-1.5", children: [_jsx("span", { className: "w-2 h-2 rounded-full bg-rose-600" }), _jsx("span", { children: "CTA Button Configuration" })] }), _jsx("span", { className: "text-[10px] font-semibold text-rose-700 uppercase bg-rose-100 px-1.5 py-0.5 rounded", children: selectedElement?.ctaType || 'Primary' })] }), _jsxs("div", { className: "grid grid-cols-2 gap-2", children: [_jsxs("div", { children: [_jsx("span", { className: "text-[10px] text-slate-500 block mb-1", children: "Border Width" }), _jsxs("select", { value: selectedElementStyle.borderWidth ?? (selectedElement?.borderWidth || 0), onChange: e => updateSelectedElementStyle({ borderWidth: parseInt(e.target.value, 10) }), className: "w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs", children: [_jsx("option", { value: 0, children: "None (0px)" }), _jsx("option", { value: 1, children: "1px" }), _jsx("option", { value: 2, children: "2px" }), _jsx("option", { value: 3, children: "3px" }), _jsx("option", { value: 4, children: "4px" })] })] }), _jsxs("div", { children: [_jsx("span", { className: "text-[10px] text-slate-500 block mb-1", children: "Corner Style" }), _jsxs("select", { value: selectedElementStyle.borderRadius !== undefined ? selectedElementStyle.borderRadius : (selectedElement?.borderRadius || 24), onChange: e => updateSelectedElementStyle({ borderRadius: parseInt(e.target.value, 10) }), className: "w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs", children: [_jsx("option", { value: 24, children: "Pill (Rounded)" }), _jsx("option", { value: 8, children: "Soft (8px)" }), _jsx("option", { value: 4, children: "Subtle (4px)" }), _jsx("option", { value: 0, children: "Sharp (0px)" })] })] })] }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-[11px] text-slate-600", children: "Border Color" }), _jsxs("div", { className: "flex items-center space-x-1.5", children: [_jsx("input", { type: "color", value: selectedElementStyle.borderColor || selectedElement?.borderColor || '#FFFFFF', onChange: e => updateSelectedElementStyle({ borderColor: e.target.value }), className: "w-5 h-5 rounded border border-slate-300 cursor-pointer" }), _jsx("span", { className: "text-[11px] font-mono text-slate-600", children: selectedElementStyle.borderColor || selectedElement?.borderColor || '#FFFFFF' })] })] })] })), _jsxs("div", { className: "p-3 space-y-3", children: [_jsxs("span", { className: "text-[11px] font-bold text-slate-800 flex items-center space-x-1.5", children: [_jsx(Palette, { className: "w-3.5 h-3.5 text-blue-600" }), _jsx("span", { children: "Opacity & Fill Controls" })] }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center justify-between mb-1", children: [_jsx("span", { className: "text-[11px] text-slate-500", children: "Element Opacity" }), _jsxs("span", { className: "text-[11px] font-mono font-bold text-slate-700", children: [Math.round(currentOpacity * 100), "%"] })] }), _jsx("input", { type: "range", min: "0", max: "1", step: "0.01", value: currentOpacity, onChange: e => updateSelectedElementStyle({ opacity: parseFloat(e.target.value) }), className: "w-full h-1.5 accent-blue-600 cursor-pointer" })] }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsx("span", { className: "text-[11px] text-slate-500", children: "Fill Mode" }), _jsxs("div", { className: "flex items-center bg-slate-100 p-0.5 rounded border border-slate-200", children: [_jsx("button", { onClick: () => { setFillMode('solid'); updateSelectedElementStyle({ gradient: undefined }); }, className: `px-2 py-0.5 text-[10px] font-bold rounded ${fillMode === 'solid' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500'}`, children: "Solid" }), _jsx("button", { onClick: () => {
                                                                                    setFillMode('gradient');
                                                                                    updateSelectedElementStyle({
                                                                                        gradient: currentGradient || GRADIENT_PRESETS[0],
                                                                                    });
                                                                                }, className: `px-2 py-0.5 text-[10px] font-bold rounded ${fillMode === 'gradient' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500'}`, children: "Gradient" })] })] }), fillMode === 'solid' ? (_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-[11px] text-slate-600", children: "Color" }), _jsxs("div", { className: "flex items-center space-x-1.5", children: [_jsx("input", { type: "color", value: currentFill.startsWith('#') ? currentFill : '#3B82F6', onChange: e => updateSelectedElementStyle({ fill: e.target.value, color: e.target.value }), className: "w-5 h-5 rounded border border-slate-300 cursor-pointer" }), _jsx("span", { className: "text-[11px] font-mono text-slate-700", children: currentFill })] })] }), _jsx("div", { className: "grid grid-cols-7 gap-1 pt-1", children: PRESET_COLORS.map(c => (_jsx("div", { onClick: () => updateSelectedElementStyle({ fill: c, color: c }), className: "w-6 h-6 rounded border border-slate-200 cursor-pointer hover:scale-110 transition-transform shadow-2xs", style: { backgroundColor: c }, title: c }, c))) })] })) : (_jsxs("div", { className: "space-y-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-[10px] font-bold text-slate-500 uppercase", children: "Gradient Type" }), _jsxs("select", { value: currentGradient?.type || 'linear', onChange: e => updateSelectedElementStyle({
                                                                                    gradient: {
                                                                                        type: e.target.value,
                                                                                        stops: currentGradient?.stops || GRADIENT_PRESETS[0].stops,
                                                                                    }
                                                                                }), className: "bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[11px]", children: [_jsx("option", { value: "linear", children: "Linear" }), _jsx("option", { value: "radial", children: "Radial" })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-2", children: [_jsxs("div", { className: "flex items-center space-x-1.5", children: [_jsx("input", { ref: gradientColor1Ref, type: "color", value: currentGradient?.stops?.[0]?.color || '#FF512F', onChange: e => {
                                                                                            const newColor = e.target.value;
                                                                                            const stops = currentGradient?.stops ? [...currentGradient.stops] : [{ offset: 0, color: '#FF512F' }, { offset: 1, color: '#DD2476' }];
                                                                                            stops[0] = { ...stops[0], color: newColor };
                                                                                            updateSelectedElementStyle({ gradient: { type: currentGradient?.type || 'linear', stops } });
                                                                                        }, className: "w-5 h-5 rounded border border-slate-300 cursor-pointer" }), _jsx("span", { className: "text-[10px] font-mono text-slate-600", children: "Start" })] }), _jsxs("div", { className: "flex items-center space-x-1.5", children: [_jsx("input", { ref: gradientColor2Ref, type: "color", value: currentGradient?.stops?.[1]?.color || '#DD2476', onChange: e => {
                                                                                            const newColor = e.target.value;
                                                                                            const stops = currentGradient?.stops ? [...currentGradient.stops] : [{ offset: 0, color: '#FF512F' }, { offset: 1, color: '#DD2476' }];
                                                                                            stops[1] = { ...stops[1], color: newColor };
                                                                                            updateSelectedElementStyle({ gradient: { type: currentGradient?.type || 'linear', stops } });
                                                                                        }, className: "w-5 h-5 rounded border border-slate-300 cursor-pointer" }), _jsx("span", { className: "text-[10px] font-mono text-slate-600", children: "End" })] })] }), _jsxs("div", { className: "pt-1", children: [_jsx("span", { className: "text-[10px] font-bold text-slate-400 block mb-1 uppercase", children: "Presets" }), _jsx("div", { className: "grid grid-cols-3 gap-1", children: GRADIENT_PRESETS.map(p => (_jsx("button", { onClick: () => updateSelectedElementStyle({ gradient: p }), className: "h-6 rounded border border-slate-200 text-[9px] text-white font-semibold truncate px-1 shadow-2xs hover:scale-102 transition-transform", style: { background: `linear-gradient(90deg, ${p.stops[0].color}, ${p.stops[1].color})` }, title: p.name, children: p.name }, p.name))) })] })] }))] })] }), _jsxs("div", { children: [_jsxs("button", { onClick: () => setCampaignContentOpen(!campaignContentOpen), className: "w-full p-3 flex items-center justify-between hover:bg-slate-50 transition-colors", children: [_jsxs("div", { className: "flex items-center space-x-1.5", children: [_jsx(Check, { className: "w-3.5 h-3.5 text-blue-600" }), _jsx("span", { className: "text-[11px] font-bold text-slate-800", children: "Campaign Content" })] }), campaignContentOpen ? _jsx(ChevronDown, { className: "w-3.5 h-3.5 text-slate-400" }) : _jsx(ChevronRight, { className: "w-3.5 h-3.5 text-slate-400" })] }), campaignContentOpen && (_jsxs("div", { className: "px-3 pb-3 space-y-3", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-center justify-between mb-1", children: [_jsx("label", { className: "text-[10px] font-semibold text-slate-500", children: "Small intro text" }), _jsxs("span", { className: "text-[10px] font-mono text-slate-400", children: [content.introText.length, "/", CHAR_LIMITS['element-intro']] })] }), _jsx("input", { type: "text", value: content.introText, onChange: e => setContent(prev => ({ ...prev, introText: e.target.value.slice(0, CHAR_LIMITS['element-intro']) })), className: "w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none transition-colors" })] }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center justify-between mb-1", children: [_jsx("label", { className: "text-[10px] font-semibold text-slate-500", children: "Main heading" }), _jsxs("span", { className: "text-[10px] font-mono text-slate-400", children: [content.mainHeading.length, "/", CHAR_LIMITS['element-heading']] })] }), _jsx("input", { type: "text", value: content.mainHeading, onChange: e => setContent(prev => ({ ...prev, mainHeading: e.target.value.slice(0, CHAR_LIMITS['element-heading']) })), className: "w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none transition-colors font-medium" })] }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center justify-between mb-1", children: [_jsx("label", { className: "text-[10px] font-semibold text-slate-500", children: "Supporting paragraph" }), _jsxs("span", { className: "text-[10px] font-mono text-slate-400", children: [content.supportingParagraph.length, "/", CHAR_LIMITS['element-paragraph']] })] }), _jsx("textarea", { rows: 3, value: content.supportingParagraph, onChange: e => setContent(prev => ({ ...prev, supportingParagraph: e.target.value.slice(0, CHAR_LIMITS['element-paragraph']) })), className: "w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none transition-colors resize-none leading-relaxed" })] }), _jsxs("div", { className: "grid grid-cols-2 gap-2", children: [_jsxs("div", { children: [_jsx("label", { className: "text-[10px] font-semibold text-slate-500 block mb-1", children: "Date" }), _jsx("input", { type: "text", value: content.dateText, onChange: e => setContent(prev => ({ ...prev, dateText: e.target.value })), className: "w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none text-xs" })] }), _jsxs("div", { children: [_jsx("label", { className: "text-[10px] font-semibold text-slate-500 block mb-1", children: "Location" }), _jsx("input", { type: "text", value: content.locationText, onChange: e => setContent(prev => ({ ...prev, locationText: e.target.value.slice(0, CHAR_LIMITS['element-footer']) })), className: "w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none text-xs" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "text-[10px] font-semibold text-slate-500 block mb-1", children: "Primary CTA Button" }), _jsx("input", { type: "text", value: content.ctaText, onChange: e => setContent(prev => ({ ...prev, ctaText: e.target.value })), className: "w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none" })] })] }))] }), _jsxs("div", { children: [_jsxs("button", { onClick: () => setLogoSectionOpen(!logoSectionOpen), className: "w-full p-3 flex items-center justify-between hover:bg-slate-50 transition-colors", children: [_jsxs("div", { className: "flex items-center space-x-1.5", children: [_jsx(ImageIcon, { className: "w-3.5 h-3.5 text-blue-600" }), _jsx("span", { className: "text-[11px] font-bold text-slate-800", children: "Brand Logo" })] }), logoSectionOpen ? _jsx(ChevronDown, { className: "w-3.5 h-3.5 text-slate-400" }) : _jsx(ChevronRight, { className: "w-3.5 h-3.5 text-slate-400" })] }), logoSectionOpen && (_jsxs("div", { className: "px-3 pb-3 space-y-3", children: [_jsxs("div", { className: "relative rounded-lg overflow-hidden border border-slate-200 bg-slate-900 group flex items-center justify-center p-3", style: { minHeight: '80px' }, children: [assets.logoUrl ? (_jsx("img", { src: assets.logoUrl, alt: "Logo", className: "max-h-20 max-w-full object-contain" })) : (_jsx("span", { className: "text-slate-500 text-xs", children: "No Logo Active" })), _jsxs("div", { className: "absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2", children: [_jsx("button", { onClick: () => logoInputRef.current?.click(), className: "px-2.5 py-1 text-xs font-semibold bg-white text-slate-800 rounded-md cursor-pointer", children: "Change Logo" }), assets.logoUrl && _jsx("button", { onClick: handleUnselectPresetLogo, className: "p-1 bg-red-600 text-white rounded-md cursor-pointer", children: _jsx(Trash2, { className: "w-3.5 h-3.5" }) })] })] }), _jsxs("button", { onClick: () => logoInputRef.current?.click(), className: "w-full py-2 px-3 border border-dashed border-blue-400 bg-blue-50/50 hover:bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 transition-colors cursor-pointer", children: [_jsx(Upload, { className: "w-3.5 h-3.5 text-blue-600" }), _jsx("span", { children: "Upload New Logo" })] }), _jsx("input", { ref: logoInputRef, type: "file", accept: "image/*", onChange: handleLogoUpload, className: "hidden" }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center justify-between mb-1.5", children: [_jsx("span", { className: "text-[10px] font-bold text-slate-400 uppercase", children: "Preset Logos" }), selectedPresetLogo && _jsxs("button", { onClick: handleUnselectPresetLogo, className: "text-[10px] text-red-600 hover:text-red-700 font-semibold flex items-center space-x-1 cursor-pointer", children: [_jsx(X, { className: "w-3 h-3" }), _jsx("span", { children: "Unselect" })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-1.5", children: [_jsxs("button", { onClick: () => handleSelectPresetLogo('vertex', SAMPLE_LOGO_URL, 'Vertex Vector'), className: `h-9 rounded border px-2 py-1 text-left transition-all flex items-center justify-between ${selectedPresetLogo === 'vertex' ? 'border-blue-600 bg-blue-50/80 font-bold text-blue-800 ring-1 ring-blue-500' : 'border-slate-200 text-slate-700 bg-slate-50'}`, children: [_jsx("span", { className: "text-[11px] truncate", children: "Vertex Vector" }), selectedPresetLogo === 'vertex' && _jsx(Check, { className: "w-3 h-3 text-blue-600" })] }), _jsxs("button", { onClick: () => handleSelectPresetLogo('formatly', `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 50" width="200" height="50"><rect width="200" height="50" rx="8" fill="%230F172A"/><text x="40" y="32" font-family="system-ui" font-weight="800" font-size="20" fill="%23FFFFFF">FORMATLY</text></svg>`, 'Formatly Badge'), className: `h-9 rounded border px-2 py-1 text-left transition-all flex items-center justify-between ${selectedPresetLogo === 'formatly' ? 'border-blue-600 bg-blue-50/80 font-bold text-blue-800 ring-1 ring-blue-500' : 'border-slate-200 text-slate-700 bg-slate-50'}`, children: [_jsx("span", { className: "text-[11px] truncate", children: "Formatly Badge" }), selectedPresetLogo === 'formatly' && _jsx(Check, { className: "w-3 h-3 text-blue-600" })] })] })] })] }))] }), _jsxs("div", { children: [_jsxs("button", { onClick: () => setBgUploadSectionOpen(!bgUploadSectionOpen), className: "w-full p-3 flex items-center justify-between hover:bg-slate-50 transition-colors", children: [_jsxs("div", { className: "flex items-center space-x-1.5", children: [_jsx(ImageIcon, { className: "w-3.5 h-3.5 text-blue-600" }), _jsx("span", { className: "text-[11px] font-bold text-slate-800", children: "Background Image" })] }), bgUploadSectionOpen ? _jsx(ChevronDown, { className: "w-3.5 h-3.5 text-slate-400" }) : _jsx(ChevronRight, { className: "w-3.5 h-3.5 text-slate-400" })] }), bgUploadSectionOpen && (_jsxs("div", { className: "px-3 pb-3 space-y-3", children: [_jsxs("div", { className: "relative rounded-lg overflow-hidden border border-slate-200 h-28 bg-slate-900 group", children: [_jsx("div", { className: "absolute inset-0 bg-cover bg-center", style: { backgroundImage: `url(${assets.backgroundImages[0]?.url || SAMPLE_BACKGROUND_1})` } }), _jsxs("div", { className: "absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2", children: [_jsx("button", { onClick: () => bgInputRef.current?.click(), className: "px-2.5 py-1 text-xs font-semibold bg-white text-slate-800 rounded-md cursor-pointer", children: "Change" }), _jsx("button", { onClick: () => handleDeleteLayer('element-background'), className: "p-1 bg-red-600 text-white rounded-md cursor-pointer", children: _jsx(Trash2, { className: "w-3.5 h-3.5" }) })] })] }), _jsxs("button", { onClick: () => bgInputRef.current?.click(), className: "w-full py-2 px-3 border border-dashed border-blue-400 bg-blue-50/50 hover:bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 transition-colors cursor-pointer", children: [_jsx(Upload, { className: "w-3.5 h-3.5 text-blue-600" }), _jsx("span", { children: "Upload New Background" })] }), _jsx("input", { ref: bgInputRef, type: "file", accept: "image/*", onChange: handleBgUpload, className: "hidden" }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center justify-between mb-1.5", children: [_jsx("span", { className: "text-[10px] font-bold text-slate-400 uppercase", children: "Preset Backgrounds" }), selectedPresetBg && _jsxs("button", { onClick: handleUnselectPresetBg, className: "text-[10px] text-red-600 hover:text-red-700 font-semibold flex items-center space-x-1 cursor-pointer", children: [_jsx(X, { className: "w-3 h-3" }), _jsx("span", { children: "Unselect" })] })] }), _jsx("div", { className: "grid grid-cols-3 gap-1.5", children: [
                                                                            { key: 'cyber', url: SAMPLE_BACKGROUND_1, label: 'Cyber' },
                                                                            { key: 'amber', url: SAMPLE_BACKGROUND_2, label: 'Amber' },
                                                                            { key: 'purple', url: SAMPLE_BACKGROUND_3, label: 'Purple' }
                                                                        ].map(p => (_jsxs("button", { onClick: () => handleSelectPresetBg(p.key, p.url, p.label + ' Mesh'), className: `h-11 rounded border transition-all bg-slate-900 relative overflow-hidden text-[9px] text-white flex items-end p-1.5 font-medium ${selectedPresetBg === p.key ? 'ring-2 ring-blue-500 border-white' : 'border-slate-200 hover:border-blue-400'}`, children: [_jsx("div", { className: "absolute inset-0 bg-cover bg-center opacity-80", style: { backgroundImage: `url(${p.url})` } }), _jsxs("span", { className: "relative z-10 text-[9px] font-semibold flex items-center justify-between w-full", children: [_jsx("span", { children: p.label }), selectedPresetBg === p.key && _jsx(Check, { className: "w-2.5 h-2.5 text-sky-400" })] })] }, p.key))) })] })] }))] })] })] })] }), toastMessage && (_jsxs("div", { className: "fixed bottom-5 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-xl flex items-center space-x-2 animate-fade-in", children: [_jsx(CheckCircle2, { className: "w-4 h-4 text-emerald-400" }), _jsx("span", { children: toastMessage })] })), _jsx(PosterGalleryModal, { isOpen: showGalleryModal, onClose: () => setShowGalleryModal(false), campaignName: projectName, posters: generatedPosters, content: content, assets: assets, template: currentTemplate, onSaveChanges: (newContent, newAssets) => {
                            setContent(newContent);
                            setAssets(newAssets);
                            showToast('Updated across all formats');
                        } })] })] }));
};
