import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Canvas } from 'fabric';
import {
  CampaignContent,
  CampaignAssets,
  PosterFormat,
  PosterTemplate,
  FormatAdjustment,
  ResolvedElement,
} from '../../types/poster';
import { LayoutEngine } from '../../utils/LayoutEngine';
import { FabricPosterRenderer } from '../../utils/FabricPosterRenderer';
import {
  X,
  Type,
  Palette,
  Download,
  ChevronDown,
  ChevronRight,
  Image as ImageIcon,
  Layers,
  Check,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  MousePointer2,
  Square,
  AlignLeft,
  Eye,
  EyeOff,
  ChevronLeft,
} from 'lucide-react';

interface PosterInlineEditorProps {
  isOpen: boolean;
  onClose: () => void;
  format: PosterFormat;
  content: CampaignContent;
  assets: CampaignAssets;
  template: PosterTemplate;
  onSaveChanges: (updatedContent: CampaignContent, updatedAssets: CampaignAssets) => void;
  onReExport: (dataUrl: string, filename: string) => void;
}

// ─── Shared style tokens ───
const C = {
  bg0:     '#0d0d14',
  bg1:     '#111118',
  bg2:     '#17171f',
  bg3:     '#1e1e2a',
  bg4:     '#252533',
  border:  '#252533',
  border2: '#303044',
  text0:   '#f0f0ff',
  text1:   '#c4c4e0',
  text2:   '#8888aa',
  text3:   '#555570',
  accent:  '#6366f1',
  accentL: 'rgba(99,102,241,0.15)',
  green:   '#4ade80',
};

const LAYER_ICONS: Record<string, React.ReactNode> = {
  background: <ImageIcon style={{ width: 11, height: 11 }} />,
  overlay:    <Square   style={{ width: 11, height: 11 }} />,
  logo:       <ImageIcon style={{ width: 11, height: 11 }} />,
  intro:      <Type     style={{ width: 11, height: 11 }} />,
  heading:    <Type     style={{ width: 11, height: 11 }} />,
  paragraph:  <Type     style={{ width: 11, height: 11 }} />,
  footer:     <Type     style={{ width: 11, height: 11 }} />,
  badge:      <Square   style={{ width: 11, height: 11 }} />,
};

const LAYER_LABELS: Record<string, string> = {
  background: 'Background',
  overlay:    'Overlay',
  logo:       'Logo',
  intro:      'Intro Label',
  heading:    'Main Heading',
  paragraph:  'Body Text',
  footer:     'Footer',
  badge:      'Badge',
};

// ─── Sub-components ───

const PropInput: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  maxLength?: number;
}> = ({ label, value, onChange, multiline = false, maxLength }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <label style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: C.text2 }}>
        {label}
      </label>
      {maxLength && (
        <span style={{ fontSize: 9, color: C.text3, fontFamily: 'monospace' }}>
          {value.length}/{maxLength}
        </span>
      )}
    </div>
    {multiline ? (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        rows={3}
        style={{
          width: '100%', background: C.bg0, border: `1px solid ${C.border2}`,
          borderRadius: 6, padding: '7px 10px', fontSize: 11, color: C.text0,
          fontFamily: 'monospace', resize: 'vertical', outline: 'none', boxSizing: 'border-box',
          lineHeight: 1.5,
        }}
        onFocus={e => (e.target.style.borderColor = C.accent)}
        onBlur={e => (e.target.style.borderColor = C.border2)}
      />
    ) : (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        style={{
          width: '100%', background: C.bg0, border: `1px solid ${C.border2}`,
          borderRadius: 6, padding: '7px 10px', fontSize: 11, color: C.text0,
          fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box',
        }}
        onFocus={e => (e.target.style.borderColor = C.accent)}
        onBlur={e => (e.target.style.borderColor = C.border2)}
      />
    )}
  </div>
);

const ColorProp: React.FC<{ label: string; value: string; onChange: (v: string) => void }> = ({
  label, value, onChange,
}) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
    <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: C.text2 }}>
      {label}
    </span>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 10, fontFamily: 'monospace', color: C.text3 }}>{value.toUpperCase()}</span>
      <div style={{ position: 'relative', width: 26, height: 26, flexShrink: 0 }}>
        <div style={{ width: 26, height: 26, borderRadius: 6, border: `1.5px solid ${C.border2}`, backgroundColor: value }} />
        <input
          type="color" value={value} onChange={(e) => onChange(e.target.value)}
          style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
        />
      </div>
    </div>
  </div>
);

const SliderProp: React.FC<{
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; displayValue?: string;
}> = ({ label, value, min, max, step, onChange, displayValue }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: C.text2 }}>
        {label}
      </span>
      <span style={{ fontSize: 10, fontFamily: 'monospace', color: C.text1 }}>{displayValue ?? value}</span>
    </div>
    <input
      type="range" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      style={{ width: '100%', accentColor: C.accent, cursor: 'pointer', height: 3 }}
    />
  </div>
);

const Section: React.FC<{ title: string; children: React.ReactNode; defaultOpen?: boolean }> = ({
  title, children, defaultOpen = true,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: `1px solid ${C.border}` }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer',
        }}
      >
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.text1 }}>
          {title}
        </span>
        {open
          ? <ChevronDown  style={{ width: 13, height: 13, color: C.text3 }} />
          : <ChevronRight style={{ width: 13, height: 13, color: C.text3 }} />
        }
      </button>
      {open && (
        <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {children}
        </div>
      )}
    </div>
  );
};

// ─── Main Component ───

export const PosterInlineEditor: React.FC<PosterInlineEditorProps> = ({
  isOpen,
  onClose,
  format,
  content: initialContent,
  assets: initialAssets,
  template,
  onSaveChanges,
  onReExport,
}) => {
  const [content, setContent] = useState<CampaignContent>(initialContent);
  const [assets, setAssets] = useState<CampaignAssets>(initialAssets);
  const [overlayOpacity, setOverlayOpacity] = useState(template.colorScheme.overlayOpacity);
  const [primaryColor, setPrimaryColor] = useState(template.colorScheme.primary);
  const [accentColor, setAccentColor] = useState(template.colorScheme.accent);
  const [textPrimary, setTextPrimary] = useState(template.colorScheme.textPrimary);
  const [textSecondary, setTextSecondary] = useState(template.colorScheme.textSecondary);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 600, height: 600 });
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [hiddenLayers, setHiddenLayers] = useState<Set<string>>(new Set());
  const [zoom, setZoom] = useState(100); // percent

  const canvasElRef   = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<Canvas | null>(null);
  const containerRef  = useRef<HTMLDivElement>(null);

  // Reset when poster changes
  useEffect(() => {
    if (isOpen) {
      setContent(initialContent);
      setAssets(initialAssets);
      setOverlayOpacity(template.colorScheme.overlayOpacity);
      setPrimaryColor(template.colorScheme.primary);
      setAccentColor(template.colorScheme.accent);
      setTextPrimary(template.colorScheme.textPrimary);
      setTextSecondary(template.colorScheme.textSecondary);
      setExportSuccess(false);
      setSelectedLayerId(null);
      setHiddenLayers(new Set());
    }
  }, [isOpen, initialContent, initialAssets, template]);

  // Build live template from color overrides
  const liveTemplate = useMemo(() => ({
    ...template,
    colorScheme: {
      ...template.colorScheme,
      primary: primaryColor,
      accent: accentColor,
      textPrimary,
      textSecondary,
      overlayOpacity,
    },
  }), [template, primaryColor, accentColor, textPrimary, textSecondary, overlayOpacity]);

  // Compute live layout
  const liveLayout = useMemo(() => {
    const adjustment: FormatAdjustment | undefined = assets.formatAdjustments[format.id];
    return LayoutEngine.computeLayout({ template: liveTemplate, content, assets, format, adjustment });
  }, [liveTemplate, content, assets, format]);

  // Layers derived from layout elements
  const layers = useMemo(() => [...liveLayout.elements].reverse(), [liveLayout.elements]);

  // Container resize
  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        const r = containerRef.current.getBoundingClientRect();
        setContainerSize({ width: Math.max(200, r.width - 64), height: Math.max(200, r.height - 64) });
      }
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [isOpen]);

  // Compute canvas preview scale from zoom
  const baseScale = useMemo(() => {
    const sx = containerSize.width  / liveLayout.canvasWidth;
    const sy = containerSize.height / liveLayout.canvasHeight;
    return Math.min(sx, sy, 0.55);
  }, [containerSize, liveLayout]);

  const previewScale = (baseScale * zoom) / 100;

  // Render to Fabric canvas
  useEffect(() => {
    if (!canvasElRef.current || !isOpen) return;
    if (!fabricCanvasRef.current) {
      fabricCanvasRef.current = new Canvas(canvasElRef.current, { selection: false, preserveObjectStacking: true });
    }
    FabricPosterRenderer.renderToCanvas(fabricCanvasRef.current, liveLayout, {
      isInteractive: false,
      previewScale,
    }).catch(console.error);
  }, [liveLayout, previewScale, isOpen]);

  useEffect(() => () => {
    fabricCanvasRef.current?.dispose();
    fabricCanvasRef.current = null;
  }, []);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const dataUrl = await FabricPosterRenderer.renderToDataURL(liveLayout);
      const name = (content.campaignName || 'poster').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
      const filename = `${name}_${format.id}_${format.width}x${format.height}_edited.png`;
      const a = document.createElement('a');
      a.href = dataUrl; a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      onReExport(dataUrl, filename);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (e) { console.error(e); }
    finally { setIsExporting(false); }
  };

  const handleApply = () => { onSaveChanges(content, assets); onClose(); };

  const toggleLayerVisibility = (id: string) => {
    setHiddenLayers(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (!isOpen) return null;

  // ── Selected layer content field (right panel "element" section) ──
  const selectedEl = selectedLayerId
    ? liveLayout.elements.find(e => e.id === selectedLayerId)
    : null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 70,
      display: 'flex', flexDirection: 'column',
      background: C.bg0, fontFamily: 'Inter, system-ui, sans-serif',
      animation: 'figIn 0.16s ease-out',
    }}>
      <style>{`
        @keyframes figIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes blink { 0%,100% { opacity:1; } 50% { opacity:0.35; } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #303044; border-radius: 4px; }
      `}</style>

      {/* ════════════════ TOP MENU BAR ════════════════ */}
      <div style={{
        height: 44, flexShrink: 0, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', borderBottom: `1px solid ${C.border}`,
        background: C.bg1, padding: '0 12px', gap: 8,
      }}>
        {/* Left: close + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <button onClick={onClose} style={{
            padding: 5, borderRadius: 6, background: 'none', border: 'none',
            cursor: 'pointer', color: C.text2, display: 'flex', alignItems: 'center',
            flexShrink: 0,
          }}>
            <ChevronLeft style={{ width: 16, height: 16 }} />
          </button>
          <div style={{ width: 1, height: 18, background: C.border2, flexShrink: 0 }} />
          <Layers style={{ width: 14, height: 14, color: C.accent, flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: C.text1, whiteSpace: 'nowrap' }}>Poster Editor</span>
          <span style={{ fontSize: 11, color: C.text3 }}>—</span>
          <span style={{ fontSize: 11, color: C.text2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {format.name}
          </span>
          <span style={{
            fontSize: 10, fontFamily: 'monospace', background: C.bg3, color: C.accent,
            padding: '2px 7px', borderRadius: 999, border: `1px solid ${C.border2}`, whiteSpace: 'nowrap', flexShrink: 0,
          }}>
            {format.width}×{format.height}
          </span>
        </div>

        {/* Center: tool strip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {[MousePointer2, ZoomIn, ZoomOut].map((Icon, i) => (
            <button key={i} style={{
              padding: 6, borderRadius: 6, background: 'none', border: 'none',
              cursor: 'pointer', color: C.text2, display: 'flex',
            }}
              onClick={() => {
                if (i === 1) setZoom(z => Math.min(200, z + 25));
                if (i === 2) setZoom(z => Math.max(25, z - 25));
              }}
            >
              <Icon style={{ width: 14, height: 14 }} />
            </button>
          ))}
          <span style={{
            fontSize: 10, fontFamily: 'monospace', color: C.text2,
            background: C.bg3, padding: '3px 8px', borderRadius: 5, border: `1px solid ${C.border2}`,
          }}>{zoom}%</span>
          <button onClick={() => setZoom(100)} style={{
            padding: '3px 8px', fontSize: 10, color: C.text2, background: 'none',
            border: `1px solid ${C.border2}`, borderRadius: 5, cursor: 'pointer',
          }}>Fit</button>
        </div>

        {/* Right: action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <button onClick={handleApply} style={{
            padding: '5px 14px', fontSize: 11, fontWeight: 600, color: C.text1,
            background: C.bg3, border: `1px solid ${C.border2}`, borderRadius: 7, cursor: 'pointer',
          }}>
            Apply & Close
          </button>
          <button onClick={handleExport} disabled={isExporting} style={{
            padding: '5px 16px', fontSize: 11, fontWeight: 700, color: '#fff',
            background: C.accent, border: 'none', borderRadius: 7, cursor: isExporting ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 6, opacity: isExporting ? 0.7 : 1,
            boxShadow: `0 2px 12px rgba(99,102,241,0.35)`,
          }}>
            {isExporting ? (
              <>
                <div style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                Exporting…
              </>
            ) : exportSuccess ? (
              <><Check style={{ width: 13, height: 13, color: '#6ee7b7' }} /><span style={{ color: '#6ee7b7' }}>Saved!</span></>
            ) : (
              <><Download style={{ width: 13, height: 13 }} />Export PNG</>
            )}
          </button>
        </div>
      </div>

      {/* ════════════════ MAIN 3-PANEL BODY ════════════════ */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>

        {/* ── PANEL 1: Layers (Left) ── */}
        <div style={{
          width: 210, flexShrink: 0, display: 'flex', flexDirection: 'column',
          background: C.bg1, borderRight: `1px solid ${C.border}`, overflow: 'hidden',
        }}>
          {/* Panel header */}
          <div style={{
            height: 36, display: 'flex', alignItems: 'center', padding: '0 14px',
            borderBottom: `1px solid ${C.border}`, flexShrink: 0,
          }}>
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.text2 }}>
              Layers
            </span>
          </div>

          {/* Format info row */}
          <div style={{
            padding: '8px 14px', borderBottom: `1px solid ${C.border}`,
            display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
          }}>
            <div style={{
              width: 22, height: 22, background: C.bg3, border: `1px solid ${C.border2}`,
              borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Square style={{ width: 10, height: 10, color: C.accent }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.text1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {format.name}
              </div>
              <div style={{ fontSize: 9, color: C.text3, fontFamily: 'monospace' }}>
                {format.width}×{format.height}
              </div>
            </div>
          </div>

          {/* Layer list */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {layers.map((el) => {
              const isSelected = selectedLayerId === el.id;
              const isHidden = hiddenLayers.has(el.id);
              return (
                <div
                  key={el.id}
                  onClick={() => setSelectedLayerId(isSelected ? null : el.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 14px', cursor: 'pointer',
                    background: isSelected ? C.accentL : 'transparent',
                    borderLeft: `2px solid ${isSelected ? C.accent : 'transparent'}`,
                    opacity: isHidden ? 0.4 : 1,
                    transition: 'background 0.1s',
                  }}
                >
                  <span style={{ color: isSelected ? C.accent : C.text3, flexShrink: 0 }}>
                    {LAYER_ICONS[el.type] ?? <Square style={{ width: 11, height: 11 }} />}
                  </span>
                  <span style={{
                    flex: 1, fontSize: 11, color: isSelected ? C.text0 : C.text1,
                    fontWeight: isSelected ? 600 : 400,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {LAYER_LABELS[el.type] ?? el.type}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleLayerVisibility(el.id); }}
                    style={{
                      padding: 2, background: 'none', border: 'none', cursor: 'pointer',
                      color: C.text3, display: 'flex', flexShrink: 0,
                      opacity: isHidden ? 1 : 0,
                    }}
                    className="layer-eye-btn"
                  >
                    {isHidden
                      ? <EyeOff style={{ width: 11, height: 11 }} />
                      : <Eye    style={{ width: 11, height: 11 }} />}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Format stats */}
          <div style={{
            borderTop: `1px solid ${C.border}`, padding: '10px 14px', flexShrink: 0,
            display: 'flex', flexDirection: 'column', gap: 5,
          }}>
            {[
              ['Aspect', format.aspectRatioLabel],
              ['Category', format.category],
              ['Elements', `${liveLayout.elements.length}`],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 10, color: C.text3 }}>{k}</span>
                <span style={{ fontSize: 10, color: C.text2, fontFamily: 'monospace', textTransform: 'capitalize' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── PANEL 2: Canvas (Center) ── */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          background: C.bg0, minWidth: 0,
        }}>
          {/* Canvas toolbar (ruler-like strip) */}
          <div style={{
            height: 36, flexShrink: 0, display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', padding: '0 16px',
            borderBottom: `1px solid ${C.border}`, background: C.bg1,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 10, color: C.text3 }}>Canvas</span>
              <span style={{ width: 1, height: 14, background: C.border2 }} />
              <span style={{ fontSize: 10, fontFamily: 'monospace', color: C.text2 }}>
                {liveLayout.canvasWidth} × {liveLayout.canvasHeight} px
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {/* live pulse */}
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.green, display: 'block', animation: 'blink 2s ease-in-out infinite' }} />
              <span style={{ fontSize: 10, color: C.text3 }}>Live</span>
            </div>
          </div>

          {/* Main canvas viewport */}
          <div
            ref={containerRef}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', position: 'relative', cursor: 'default',
              backgroundImage: `
                linear-gradient(rgba(99,102,241,0.035) 1px, transparent 1px),
                linear-gradient(90deg, rgba(99,102,241,0.035) 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px',
            }}
          >
            {/* Canvas shadow frame */}
            <div style={{
              boxShadow: '0 0 60px rgba(99,102,241,0.12), 0 24px 60px rgba(0,0,0,0.6)',
              borderRadius: 8,
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.05)',
              flexShrink: 0,
            }}>
              <canvas ref={canvasElRef} />
            </div>

            {/* Layer selection highlight label */}
            {selectedEl && (
              <div style={{
                position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)',
                background: C.accentL, border: `1px solid ${C.accent}`,
                borderRadius: 999, padding: '4px 14px',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{ fontSize: 10, color: C.accent, fontWeight: 600 }}>
                  Selected: {LAYER_LABELS[selectedEl.type] ?? selectedEl.type}
                </span>
                {selectedEl.text && (
                  <span style={{ fontSize: 10, color: C.text2, fontFamily: 'monospace' }}>
                    "{selectedEl.text.slice(0, 28)}{selectedEl.text.length > 28 ? '…' : ''}"
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── PANEL 3: Properties (Right) ── */}
        <div style={{
          width: 268, flexShrink: 0, display: 'flex', flexDirection: 'column',
          background: C.bg1, borderLeft: `1px solid ${C.border}`, overflow: 'hidden',
        }}>
          {/* Panel header */}
          <div style={{
            height: 36, display: 'flex', alignItems: 'center', padding: '0 14px',
            borderBottom: `1px solid ${C.border}`, flexShrink: 0,
          }}>
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.text2 }}>
              Design
            </span>
          </div>

          {/* Scrollable properties */}
          <div style={{ flex: 1, overflowY: 'auto' }}>

            {/* ── Text Content ── */}
            <Section title="Content">
              <PropInput
                label="Intro / Label"
                value={content.introText}
                onChange={(v) => setContent(p => ({ ...p, introText: v }))}
                maxLength={template.characterLimits.introText}
              />
              <PropInput
                label="Main Heading"
                value={content.mainHeading}
                onChange={(v) => setContent(p => ({ ...p, mainHeading: v }))}
                multiline
                maxLength={template.characterLimits.mainHeading}
              />
              <PropInput
                label="Body Text"
                value={content.supportingParagraph}
                onChange={(v) => setContent(p => ({ ...p, supportingParagraph: v }))}
                multiline
                maxLength={template.characterLimits.supportingParagraph}
              />
              <PropInput
                label="Date"
                value={content.dateText}
                onChange={(v) => setContent(p => ({ ...p, dateText: v }))}
                maxLength={template.characterLimits.dateText}
              />
              <PropInput
                label="Location"
                value={content.locationText}
                onChange={(v) => setContent(p => ({ ...p, locationText: v }))}
                maxLength={template.characterLimits.locationText}
              />
            </Section>

            {/* ── Fill / Colors ── */}
            <Section title="Fill">
              <ColorProp label="Primary"        value={primaryColor}  onChange={setPrimaryColor}  />
              <ColorProp label="Accent"         value={accentColor}   onChange={setAccentColor}   />
              <ColorProp label="Text — Primary" value={textPrimary}   onChange={setTextPrimary}   />
              <ColorProp label="Text — Subtle"  value={textSecondary} onChange={setTextSecondary} />
            </Section>

            {/* ── Overlay ── */}
            <Section title="Overlay" defaultOpen={false}>
              <SliderProp
                label="Opacity"
                value={overlayOpacity} min={0} max={1} step={0.01}
                onChange={setOverlayOpacity}
                displayValue={`${Math.round(overlayOpacity * 100)}%`}
              />
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: C.text2, marginBottom: 7 }}>
                  Background Fit
                </label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['cover', 'contain'] as const).map((fit) => (
                    <button
                      key={fit}
                      onClick={() => setAssets(p => ({ ...p, backgroundFit: fit }))}
                      style={{
                        flex: 1, padding: '6px 0', borderRadius: 6, fontSize: 10,
                        fontWeight: 600, textTransform: 'capitalize', cursor: 'pointer',
                        border: `1px solid ${assets.backgroundFit === fit ? C.accent : C.border2}`,
                        background: assets.backgroundFit === fit ? C.accentL : C.bg0,
                        color: assets.backgroundFit === fit ? C.accent : C.text2,
                      }}
                    >
                      {fit}
                    </button>
                  ))}
                </div>
              </div>
            </Section>

            {/* ── Selected Layer details ── */}
            {selectedEl && (
              <Section title="Selected Layer">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 10, color: C.text3 }}>Type</span>
                    <span style={{ fontSize: 10, color: C.text1, textTransform: 'capitalize', fontWeight: 600 }}>{LAYER_LABELS[selectedEl.type] ?? selectedEl.type}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 10, color: C.text3 }}>X / Y</span>
                    <span style={{ fontSize: 10, color: C.text2, fontFamily: 'monospace' }}>{Math.round(selectedEl.x)}, {Math.round(selectedEl.y)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 10, color: C.text3 }}>W / H</span>
                    <span style={{ fontSize: 10, color: C.text2, fontFamily: 'monospace' }}>{Math.round(selectedEl.width)}, {Math.round(selectedEl.height)}</span>
                  </div>
                  {selectedEl.fontSize && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 10, color: C.text3 }}>Font size</span>
                      <span style={{ fontSize: 10, color: C.text2, fontFamily: 'monospace' }}>{selectedEl.fontSize}px</span>
                    </div>
                  )}
                  {selectedEl.color && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 10, color: C.text3 }}>Color</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 10, color: C.text2, fontFamily: 'monospace' }}>{selectedEl.color}</span>
                        <div style={{ width: 14, height: 14, borderRadius: 3, background: selectedEl.color, border: `1px solid ${C.border2}` }} />
                      </div>
                    </div>
                  )}
                  {selectedEl.opacity !== undefined && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 10, color: C.text3 }}>Opacity</span>
                      <span style={{ fontSize: 10, color: C.text2, fontFamily: 'monospace' }}>{Math.round((selectedEl.opacity ?? 1) * 100)}%</span>
                    </div>
                  )}
                </div>
              </Section>
            )}

            {/* ── Template info ── */}
            <Section title="Template" defaultOpen={false}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {[
                  ['Name',    liveTemplate.name],
                  ['Style',   liveTemplate.category],
                  ['Heading', liveTemplate.typography.headingFontFamily],
                  ['Body',    liveTemplate.typography.bodyFontFamily],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 10, color: C.text3 }}>{k}</span>
                    <span style={{ fontSize: 10, color: C.text2, fontFamily: 'monospace', textAlign: 'right', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</span>
                  </div>
                ))}
              </div>
            </Section>

          </div>

          {/* Bottom action strip */}
          <div style={{
            borderTop: `1px solid ${C.border}`, padding: 12,
            display: 'flex', flexDirection: 'column', gap: 7, flexShrink: 0, background: C.bg0,
          }}>
            <button
              onClick={handleExport}
              disabled={isExporting}
              style={{
                width: '100%', padding: '9px 0', fontSize: 12, fontWeight: 700,
                color: '#fff', background: `linear-gradient(135deg, ${C.accent}, #8b5cf6)`,
                border: 'none', borderRadius: 10, cursor: isExporting ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                boxShadow: '0 3px 16px rgba(99,102,241,0.3)', opacity: isExporting ? 0.65 : 1,
              }}
            >
              {isExporting ? (
                <><div style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' }} />Exporting…</>
              ) : exportSuccess ? (
                <><Check style={{ width: 13, height: 13, color: '#6ee7b7' }} /><span style={{ color: '#6ee7b7' }}>Exported!</span></>
              ) : (
                <><Download style={{ width: 13, height: 13 }} />Export Edited PNG</>
              )}
            </button>
            <button onClick={handleApply} style={{
              width: '100%', padding: '7px 0', fontSize: 11, fontWeight: 600,
              color: C.text2, background: 'none', border: `1px solid ${C.border2}`,
              borderRadius: 8, cursor: 'pointer',
            }}>
              Apply & Go Back
            </button>
          </div>
        </div>
      </div>

      {/* Hover eye icon visibility fix */}
      <style>{`
        div:hover .layer-eye-btn { opacity: 1 !important; }
      `}</style>
    </div>
  );
};