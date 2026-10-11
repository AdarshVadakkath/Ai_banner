code = r"""
export const CampaignEditorPage: React.FC<CampaignEditorPageProps> = ({
  initialProjectId,
  onBackToDashboard,
}) => {
  const [showSetupModal, setShowSetupModal] = useState(!initialProjectId);
  const [projectId, setProjectId] = useState<string | null>(initialProjectId || null);
  const [projectName, setProjectName] = useState('New Campaign');
  const [selectedTemplateId, setSelectedTemplateId] = useState('modern-minimal');
  const [templates, setTemplates] = useState<PosterTemplate[]>(BUILTIN_TEMPLATES);
  const [activeFormat, setActiveFormat] = useState<PosterFormat>(DEFAULT_POSTER_FORMATS[0]);
  const [content, setContent] = useState<CampaignContent>({
    campaignName: 'New Campaign',
    introText: 'Special Announcement',
    mainHeading: 'Designing the Next Generation of Creative Workflows',
    supportingParagraph: 'Experience seamless multi-format production with automated layout rules and instant high-resolution exports.',
    dateText: 'November 18, 2026',
    locationText: 'Global Broadcast & In-Person',
  });
  const [assets, setAssets] = useState<CampaignAssets>({
    logoUrl: SAMPLE_LOGO_URL,
    backgroundImages: [{ id: 'bg-cyber-mesh', name: 'Cyber Mesh Ambient', url: SAMPLE_BACKGROUND_1, width: 1920, height: 1920, aspectRatio: 1.0 }],
    selectedBackgroundId: 'bg-cyber-mesh',
    backgroundFit: 'cover',
    formatAdjustments: {},
  });
  const [selectedPresetBg, setSelectedPresetBg] = useState<string | null>('cyber');
  const [selectedPresetLogo, setSelectedPresetLogo] = useState<string | null>('vertex');
  const [activeTool, setActiveTool] = useState<'select' | 'frame' | 'circle' | 'triangle' | 'text' | 'image'>('select');
  const [selectedLayerId, setSelectedLayerId] = useState<string>('element-heading');
  const [hiddenLayers, setHiddenLayers] = useState<Set<string>>(new Set());
  const [deletedLayerIds, setDeletedLayerIds] = useState<Set<string>>(new Set());
  const [elementStyleOverrides, setElementStyleOverrides] = useState<Record<string, CustomElementStyle>>({});
  const [campaignContentOpen, setCampaignContentOpen] = useState(true);
  const [logoSectionOpen, setLogoSectionOpen] = useState(true);
  const [bgUploadSectionOpen, setBgUploadSectionOpen] = useState(true);
  const [appearanceOpen, setAppearanceOpen] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showAddLayerMenu, setShowAddLayerMenu] = useState(false);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [generatedPosters, setGeneratedPosters] = useState<GeneratedPosterItem[]>([]);
  const [layerSearch, setLayerSearch] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const dragInfoRef = useRef<{ layerId: string; startMouseX: number; startMouseY: number; initialX: number; initialY: number; } | null>(null);
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<Canvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);

  const currentTemplate = useMemo(() => templates.find(t => t.id === selectedTemplateId) || BUILTIN_TEMPLATES[0], [templates, selectedTemplateId]);

  useEffect(() => {
    const loadInit = async () => {
      try {
        const fetchedTemplates = await ApiService.getTemplates();
        if (fetchedTemplates && fetchedTemplates.length > 0) setTemplates(fetchedTemplates);
        if (initialProjectId) {
          const proj = await ApiService.getProject(initialProjectId);
          if (proj) {
            setProjectId(proj.id);
            setProjectName(proj.name);
            setSelectedTemplateId(proj.templateId);
            setContent(proj.content);
            setAssets(proj.assets);
            if (proj.selectedFormats && proj.selectedFormats.length > 0) setActiveFormat(proj.selectedFormats[0]);
          }
        }
      } catch (e) { console.error('Error loading campaign data:', e); }
    };
    loadInit();
  }, [initialProjectId]);

  const showToast = (msg: string) => { setToastMessage(msg); setTimeout(() => setToastMessage(null), 3000); };

  const handleSetupConfirm = (data: { name: string; logoUrl?: string; backgroundUrl?: string; introText: string; mainHeading: string; supportingParagraph: string; dateText: string; locationText: string; }) => {
    setProjectName(data.name);
    setContent({ campaignName: data.name, introText: data.introText, mainHeading: data.mainHeading, supportingParagraph: data.supportingParagraph, dateText: data.dateText, locationText: data.locationText });
    if (data.logoUrl) setAssets(prev => ({ ...prev, logoUrl: data.logoUrl }));
    if (data.backgroundUrl) {
      const newBg = { id: g-custom-setup-, name: 'Setup Background', url: data.backgroundUrl, width: 1920, height: 1920 };
      setAssets(prev => ({ ...prev, backgroundImages: [newBg, ...prev.backgroundImages], selectedBackgroundId: newBg.id }));
      setSelectedPresetBg(null);
    }
    setShowSetupModal(false);
    showToast('Campaign created! All formats ready.');
  };

  const layout = useMemo(() => {
    const baseLayout = LayoutEngine.computeLayout({ template: currentTemplate, content, assets, format: activeFormat });
    const modifiedElements = baseLayout.elements.map((el: ResolvedElement) => {
      const overrides = elementStyleOverrides[el.id];
      if (!overrides) return el;
      const scale = overrides.scale ?? 1;
      return {
        ...el,
        fontFamily: overrides.fontFamily ?? el.fontFamily,
        fontWeight: overrides.fontWeight ?? el.fontWeight,
        fontSize: overrides.fontSize ?? el.fontSize,
        lineHeight: overrides.lineHeight ?? el.lineHeight,
        textAlign: overrides.textAlign ?? el.textAlign,
        color: overrides.color ?? el.color,
        letterSpacing: overrides.letterSpacing,
        x: overrides.x !== undefined ? overrides.x : el.x,
        y: overrides.y !== undefined ? overrides.y : el.y,
        width: el.width * scale,
        height: el.height * scale,
      };
    });
    return { ...baseLayout, elements: modifiedElements };
  }, [activeFormat, currentTemplate, content, assets, elementStyleOverrides]);

  const activeElements = useMemo(() => layout.elements.filter((el: ResolvedElement) => !deletedLayerIds.has(el.id) && !hiddenLayers.has(el.id)), [layout, deletedLayerIds, hiddenLayers]);
  const selectedElement = useMemo(() => {
    if (deletedLayerIds.has(selectedLayerId)) return null;
    return layout.elements.find((el: ResolvedElement) => el.id === selectedLayerId) || layout.elements.find((el: ResolvedElement) => !deletedLayerIds.has(el.id) && el.id === 'element-heading') || null;
  }, [layout, selectedLayerId, deletedLayerIds]);

  const previewScale = useMemo(() => 560 / activeFormat.width, [activeFormat]);
  const displayWidth = Math.round(activeFormat.width * previewScale);
  const displayHeight = Math.round(activeFormat.height * previewScale);

  useEffect(() => {
    if (!canvasElRef.current) return;
    if (!fabricCanvasRef.current) { fabricCanvasRef.current = new Canvas(canvasElRef.current, { selection: false, renderOnAddRemove: true }); }
    const canvas = fabricCanvasRef.current;
    FabricPosterRenderer.renderToCanvas(canvas, { ...layout, elements: activeElements }, { isInteractive: false, previewScale });
  }, [layout, activeElements, previewScale]);

  useEffect(() => { return () => { if (fabricCanvasRef.current) { fabricCanvasRef.current.dispose(); fabricCanvasRef.current = null; } }; }, []);

  const updateSelectedElementStyle = (patch: Partial<CustomElementStyle>) => {
    if (!selectedLayerId) return;
    setElementStyleOverrides(prev => ({ ...prev, [selectedLayerId]: { ...prev[selectedLayerId], ...patch } }));
  };

  const scaleSelectedLayer = (delta: number) => {
    if (!selectedLayerId) return;
    setElementStyleOverrides(prev => {
      const current = prev[selectedLayerId] || {};
      const currentScale = current.scale ?? 1;
      const newScale = Math.max(0.2, Math.min(3.0, currentScale + delta));
      return { ...prev, [selectedLayerId]: { ...current, scale: Math.round(newScale * 100) / 100 } };
    });
  };

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) return;
      if (!selectedLayerId) return;
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.05 : -0.05;
      setElementStyleOverrides(prev => {
        const current = prev[selectedLayerId] || {};
        const currentScale = current.scale ?? 1;
        const newScale = Math.max(0.2, Math.min(3.0, currentScale + delta));
        return { ...prev, [selectedLayerId]: { ...current, scale: Math.round(newScale * 100) / 100 } };
      });
    };
    const container = containerRef.current;
    if (container) container.addEventListener('wheel', handleWheel, { passive: false });
    return () => { if (container) container.removeEventListener('wheel', handleWheel); };
  }, [selectedLayerId]);

  const handleStartDrag = (layerId: string, e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault();
    setSelectedLayerId(layerId);
    const el = layout.elements.find((item: ResolvedElement) => item.id === layerId);
    if (!el) return;
    dragInfoRef.current = { layerId, startMouseX: e.clientX, startMouseY: e.clientY, initialX: el.x, initialY: el.y };
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragInfoRef.current) return;
      const { layerId, startMouseX, startMouseY, initialX, initialY } = dragInfoRef.current;
      const deltaX = (e.clientX - startMouseX) / previewScale;
      const deltaY = (e.clientY - startMouseY) / previewScale;
      setElementStyleOverrides(prev => ({ ...prev, [layerId]: { ...prev[layerId], x: Math.round(initialX + deltaX), y: Math.round(initialY + deltaY) } }));
    };
    const handleMouseUp = () => { if (dragInfoRef.current) { dragInfoRef.current = null; setIsDragging(false); } };
    if (isDragging) { window.addEventListener('mousemove', handleMouseMove); window.addEventListener('mouseup', handleMouseUp); }
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, [isDragging, previewScale]);

  const layerDefs = [
    { id: 'element-background', label: 'Background', type: 'background' },
    { id: 'element-logo', label: 'Brand logo', type: 'logo' },
    { id: 'element-intro', label: 'Special announcement', type: 'text' },
    { id: 'element-heading', label: 'Heading', type: 'text' },
    { id: 'element-paragraph', label: 'Supporting paragraph', type: 'text' },
    { id: 'element-footer', label: 'Event details', type: 'text' },
  ];

  const handleDeleteLayer = (layerId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDeletedLayerIds(prev => { const next = new Set(prev); next.add(layerId); return next; });
    if (selectedLayerId === layerId) {
      const remaining = layerDefs.find(l => l.id !== layerId && !deletedLayerIds.has(l.id));
      setSelectedLayerId(remaining ? remaining.id : '');
    }
    showToast('Layer deleted');
  };

  const handleRestoreLayer = (layerId: string) => {
    setDeletedLayerIds(prev => { const next = new Set(prev); next.delete(layerId); return next; });
    setSelectedLayerId(layerId); setShowAddLayerMenu(false); showToast('Layer restored');
  };

  const handleRestoreAllLayers = () => { setDeletedLayerIds(new Set()); setShowAddLayerMenu(false); showToast('All layers restored'); };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedLayerId) { e.preventDefault(); handleDeleteLayer(selectedLayerId); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedLayerId, deletedLayerIds]);

  const handleQuickExport = async () => {
    try {
      setIsExporting(true);
      const dataUrl = await FabricPosterRenderer.renderToDataURL({ ...layout, elements: activeElements });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = ${projectName.toLowerCase().replace(/\s+/g, '-')}-.png;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      showToast('Poster exported successfully!');
    } catch (err) { console.error('Export failed:', err); showToast('Export failed.'); }
    finally { setIsExporting(false); setShowExportMenu(false); }
  };

  const handleGenerateAll = async () => {
    try {
      setIsExporting(true);
      const results: GeneratedPosterItem[] = [];
      for (const fmt of DEFAULT_POSTER_FORMATS.slice(0, 4)) {
        const baseLayout = LayoutEngine.computeLayout({ template: currentTemplate, content, assets, format: fmt });
        const modifiedElements = baseLayout.elements
          .filter((el: ResolvedElement) => !deletedLayerIds.has(el.id) && !hiddenLayers.has(el.id))
          .map((el: ResolvedElement) => {
            const overrides = elementStyleOverrides[el.id];
            if (!overrides) return el;
            const scale = overrides.scale ?? 1;
            return { ...el, fontFamily: overrides.fontFamily ?? el.fontFamily, fontWeight: overrides.fontWeight ?? el.fontWeight, fontSize: overrides.fontSize ?? el.fontSize, lineHeight: overrides.lineHeight ?? el.lineHeight, textAlign: overrides.textAlign ?? el.textAlign, color: overrides.color ?? el.color, letterSpacing: overrides.letterSpacing, x: overrides.x !== undefined ? overrides.x : el.x, y: overrides.y !== undefined ? overrides.y : el.y, width: el.width * scale, height: el.height * scale };
          });
        const dataUrl = await FabricPosterRenderer.renderToDataURL({ ...baseLayout, elements: modifiedElements });
        results.push({ format: fmt, dataUrl, width: fmt.width, height: fmt.height, filename: ${projectName.toLowerCase().replace(/\s+/g, '-')}-.png });
      }
      setGeneratedPosters(results); setShowGalleryModal(true);
    } catch (err) { console.error('Generate all failed:', err); showToast('Failed to generate all formats.'); }
    finally { setIsExporting(false); setShowExportMenu(false); }
  };

  const handleShare = () => { if (navigator.clipboard) { navigator.clipboard.writeText(window.location.href); showToast('Share link copied!'); } };

  const handleSave = async () => {
    try {
      const thumb = await FabricPosterRenderer.renderToDataURL({ ...layout, elements: activeElements });
      const proj: Partial<CampaignProject> = { name: projectName, templateId: selectedTemplateId, content, assets, selectedFormats: DEFAULT_POSTER_FORMATS.slice(0, 4), updatedAt: new Date().toISOString(), thumbnailUrl: thumb };
      if (projectId) { await ApiService.updateProject(projectId, proj); }
      else { const created = await ApiService.createProject({ ...proj, createdAt: new Date().toISOString() }); setProjectId(created.id); }
      showToast('Campaign saved!');
    } catch (e) { console.error('Save failed:', e); showToast('Campaign saved locally.'); }
  };

  const toggleLayerVisibility = (layerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHiddenLayers(prev => { const next = new Set(prev); if (next.has(layerId)) next.delete(layerId); else next.add(layerId); return next; });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedPresetLogo(null);
      setAssets(prev => ({ ...prev, logoUrl: reader.result as string }));
      if (deletedLayerIds.has('element-logo')) setDeletedLayerIds(prev => { const next = new Set(prev); next.delete('element-logo'); return next; });
      showToast('Logo uploaded');
    };
    reader.readAsDataURL(file);
  };

  const handleSelectPresetLogo = (presetKey: string, logoUrl: string, name: string) => {
    if (selectedPresetLogo === presetKey) { handleUnselectPresetLogo(); return; }
    setSelectedPresetLogo(presetKey);
    setAssets(prev => ({ ...prev, logoUrl }));
    if (deletedLayerIds.has('element-logo')) setDeletedLayerIds(prev => { const next = new Set(prev); next.delete('element-logo'); return next; });
    showToast(Logo preset "" applied);
  };

  const handleUnselectPresetLogo = () => { setSelectedPresetLogo(null); setAssets(prev => ({ ...prev, logoUrl: undefined })); showToast('Logo unselected'); };

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedPresetBg(null);
      const newBg = { id: g-custom-, name: file.name, url: reader.result as string, width: 1920, height: 1920 };
      setAssets(prev => ({ ...prev, backgroundImages: [newBg, ...prev.backgroundImages], selectedBackgroundId: newBg.id }));
      if (deletedLayerIds.has('element-background')) setDeletedLayerIds(prev => { const next = new Set(prev); next.delete('element-background'); return next; });
      showToast('Background uploaded');
    };
    reader.readAsDataURL(file);
  };

  const handleSelectPresetBg = (presetKey: string, presetUrl: string, name: string) => {
    if (selectedPresetBg === presetKey) { handleUnselectPresetBg(); return; }
    setSelectedPresetBg(presetKey);
    const bgId = preset--;
    setAssets(prev => ({ ...prev, backgroundImages: [{ id: bgId, name, url: presetUrl, width: 1920, height: 1920 }, ...prev.backgroundImages], selectedBackgroundId: bgId }));
    if (deletedLayerIds.has('element-background')) setDeletedLayerIds(prev => { const next = new Set(prev); next.delete('element-background'); return next; });
    showToast(Preset "" applied);
  };

  const handleUnselectPresetBg = () => {
    setSelectedPresetBg(null);
    const customBg = assets.backgroundImages.find(b => !b.id.startsWith('preset-'));
    setAssets(prev => ({ ...prev, selectedBackgroundId: customBg?.id }));
    showToast('Preset unselected');
  };

  const activeLayers = layerDefs.filter(l => !deletedLayerIds.has(l.id));
  const filteredLayers = activeLayers.filter(l => l.label.toLowerCase().includes(layerSearch.toLowerCase()));
  const currentFontFamily = selectedElement?.fontFamily || currentTemplate.typography.headingFontFamily || 'Inter';
  const currentFontWeight = selectedElement?.fontWeight || 'Bold';
  const currentFontSize = selectedElement?.fontSize ? Math.round(selectedElement.fontSize) : 32;
  const currentLineHeight = selectedElement?.lineHeight || 1.2;
  const currentTextAlign = selectedElement?.textAlign || 'left';
  const currentColor = selectedElement?.color || '#FFFFFF';
  const currentScale = elementStyleOverrides[selectedLayerId]?.scale ?? 1;

  const formatLabels: Record<string, string> = {
    'square-1080': '1:1 Square',
    'portrait-1080': '4:5 Portrait',
    'story-1080': '9:16 Story',
    'landscape-1920': '16:9 Wide',
  };
"""

with open(r'write_editor_part2.py', 'w', encoding='utf-8') as f:
    f.write("code = " + repr(code) + "\n")
    f.write("path = r'poster-automation\\frontend\\src\\pages\\CampaignEditorPage.tsx'\n")
    f.write("with open(path, 'a', encoding='utf-8') as f:\n")
    f.write("    f.write(code)\n")
    f.write("print('Part 2 appended:', len(code))\n")

print("script 2 written")
