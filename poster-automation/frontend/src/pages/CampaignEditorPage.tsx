import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Canvas } from 'fabric';
import {
  CampaignProject,
  PosterTemplate,
  PosterFormat,
  CampaignContent,
  CampaignAssets,
  ResolvedElement,
} from '../types/poster';
import { BUILTIN_TEMPLATES } from '../constants/templates';
import { DEFAULT_POSTER_FORMATS, HERO_FORMATS, ALL_GENERATE_FORMATS } from '../constants/formats';
import {
  SAMPLE_LOGO_URL,
  SAMPLE_BACKGROUND_1,
  SAMPLE_BACKGROUND_2,
  SAMPLE_BACKGROUND_3,
} from '../constants/sampleData';
import { LayoutEngine, calculateCtaDimensions } from '../utils/LayoutEngine';
import { FabricPosterRenderer } from '../utils/FabricPosterRenderer';
import { ApiService } from '../services/apiService';
import { PosterGalleryModal, GeneratedPosterItem } from '../components/poster/PosterGalleryModal';
import JSZip from 'jszip';
import {
  Layers, Link2, Download, MoreHorizontal, MousePointer2, Square, Circle, Triangle,
  Type, Image as ImageIcon, ChevronDown, ChevronRight, ChevronUp, ChevronLeft, Eye, EyeOff, Trash2, RotateCcw,
  Search, Plus, Minus, AlignLeft, AlignCenter, AlignRight, Check, CheckCircle2,
  Sparkles, Upload, X, ZoomIn, ZoomOut, LayoutGrid, FolderArchive, ArrowLeft, Pencil,
  ArrowUp, ArrowDown, Copy, Palette, Sliders, Move,
  Lock, Unlock, Undo2, Redo2, Cloud,
} from 'lucide-react';

const CHAR_LIMITS: Record<string, number> = {
  'element-intro': 60,
  'element-heading': 120,
  'element-paragraph': 280,
  'element-footer': 80,
  'element-cta': 50,
};

export interface GradientConfig {
  type: 'linear' | 'radial';
  stops: Array<{ offset: number; color: string }>;
  angle?: number;
}

export interface CustomElementStyle {
  fontFamily?: string;
  fontWeight?: string;
  fontSize?: number;
  lineHeight?: number;
  letterSpacing?: number;
  textAlign?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  color?: string;
  x?: number;
  y?: number;
  scale?: number;
  opacity?: number;
  fill?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  gradient?: GradientConfig;
}

export interface CustomLayerItem {
  id: string;
  /** The ratio this object belongs to, so it never appears in other canvases. */
  formatId: string;
  type: 'text' | 'shape' | 'cta-button';
  shapeType?: 'rect' | 'circle' | 'triangle';
  ctaType?: 'primary' | 'secondary' | 'tertiary';
  label: string;
  text?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  lineHeight?: number;
  letterSpacing?: number;
  color?: string;
  fill?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  opacity?: number;
  textAlign?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  scale?: number;
  gradient?: GradientConfig;
}

export interface CtaButtonConfig {
  id: string;
  ctaType: 'primary' | 'secondary' | 'tertiary';
  label: string;
  text: string;
  color: string;
  fill: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  opacity?: number;
  fontSize?: number;
  fontWeight?: string;
  fontFamily?: string;
  textAlign?: 'left' | 'center' | 'right';
  gradient?: GradientConfig;
}

interface CampaignEditorPageProps {
  initialProjectId?: string;
  onBackToDashboard: () => void;
}

// Campaign Setup Modal
interface SetupModalProps {
  onConfirm: (data: {
    name: string;
    logoUrl?: string;
    logoWidth?: number;
    logoHeight?: number;
    logoAspectRatio?: number;
    backgroundUrl?: string;
    introText: string;
    mainHeading: string;
    supportingParagraph: string;
    dateText: string;
    locationText: string;
    ctaText: string;
    headingColor: string;
    supportingColor: string;
    introColor: string;
    footerColor: string;
    ctaBackground: string;
    ctaTextColor: string;
  }) => void;
}

const GRADIENT_PRESETS: Array<{ name: string; type: 'linear' | 'radial'; stops: Array<{ offset: number; color: string }> }> = [
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

interface FullscreenPreviewProps {
  posters: GeneratedPosterItem[];
  activeIndex: number | null;
  onActiveIndexChange: (index: number) => void;
  onClose: () => void;
}

type EditorSnapshot = {
  content: CampaignContent;
  assets: CampaignAssets;
  customLayers: CustomLayerItem[];
  overrides: Record<string, Record<string, CustomElementStyle>>;
  hidden: string[];
  deleted: string[];
  locked: string[];
  layerOrder: string[];
  layerNames: Record<string, string>;
};

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const hexToRgb = (hex: string) => {
  const normalized = hex.replace('#', '');
  const value = normalized.length === 3 ? normalized.split('').map(c => c + c).join('') : normalized;
  const n = Number.parseInt(value, 16);
  return Number.isFinite(n) ? { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 } : { r: 255, g: 255, b: 255 };
};
const rgbToHex = (r: number, g: number, b: number) => `#${[r, g, b].map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('')}`;
const rgbToHsv = (r: number, g: number, b: number) => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  const h = d === 0 ? 0 : max === r ? ((g - b) / d + (g < b ? 6 : 0)) * 60 : max === g ? ((b - r) / d + 2) * 60 : ((r - g) / d + 4) * 60;
  return { h: Math.round(h), s: max === 0 ? 0 : Math.round(d / max * 100), v: Math.round(max * 100) };
};
const hsvToHex = (h: number, s: number, v: number) => {
  const c = (v / 100) * (s / 100), x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = v / 100 - c;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
};
const rgbToHsl = (r: number, g: number, b: number) => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), lightness = (max + min) / 2, d = max - min;
  const hue = d === 0 ? 0 : max === r ? ((g - b) / d + (g < b ? 6 : 0)) * 60 : max === g ? ((b - r) / d + 2) * 60 : ((r - g) / d + 4) * 60;
  return { h: Math.round(hue), s: Math.round((d === 0 ? 0 : d / (1 - Math.abs(2 * lightness - 1))) * 100), l: Math.round(lightness * 100) };
};
const hslToHex = (h: number, s: number, l: number) => {
  s /= 100; l /= 100; const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
};

const FigmaColorPicker: React.FC<{ color: string; opacity: number; onChange: (color: string, opacity: number) => void; onClose: () => void }> = ({ color, opacity, onChange, onClose }) => {
  const [hex, setHex] = useState(color);
  const rgb = hexToRgb(hex);
  const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const areaRef = useRef<HTMLDivElement>(null);
  const apply = (next: string, nextOpacity = opacity) => { setHex(next); onChange(next, nextOpacity); };
  const pickArea = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = areaRef.current?.getBoundingClientRect(); if (!rect) return;
    apply(hsvToHex(hsv.h, clamp((event.clientX - rect.left) / rect.width) * 100, (1 - clamp((event.clientY - rect.top) / rect.height)) * 100));
  };
  const eyeDropper = async () => {
    const EyeDropperApi = (window as any).EyeDropper;
    if (!EyeDropperApi) return;
    try { const result = await new EyeDropperApi().open(); apply(result.sRGBHex); } catch { /* picker cancelled */ }
  };
  return <div className="absolute top-8 right-0 z-50 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-2xl" onPointerDown={e => e.stopPropagation()}>
    <div className="mb-3 flex items-center justify-between"><span className="text-xs font-bold text-slate-800">Color</span><button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="w-3.5 h-3.5" /></button></div>
    <div ref={areaRef} onPointerDown={pickArea} onPointerMove={e => { if (e.buttons) pickArea(e); }} className="relative h-36 cursor-crosshair overflow-hidden rounded-lg" style={{ background: `hsl(${hsv.h}, 100%, 50%)` }}>
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, #fff, transparent)' }} /><div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #000, transparent)' }} />
      <span className="absolute h-3 w-3 rounded-full border-2 border-white shadow" style={{ left: `calc(${hsv.s}% - 6px)`, top: `calc(${100 - hsv.v}% - 6px)` }} />
    </div>
    <input aria-label="Hue" type="range" min="0" max="360" value={hsv.h} onChange={e => apply(hsvToHex(+e.target.value, hsv.s, hsv.v))} className="mt-3 h-2 w-full cursor-pointer" style={{ accentColor: `hsl(${hsv.h}, 100%, 50%)` }} />
    <input aria-label="Opacity" type="range" min="0" max="1" step="0.01" value={opacity} onChange={e => apply(hex, +e.target.value)} className="mt-2 h-2 w-full cursor-pointer" style={{ accentColor: hex }} />
    <div className="mt-3 grid grid-cols-4 gap-1.5 text-[10px] font-mono">
      <input value={hex.toUpperCase()} onChange={e => { if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) apply(e.target.value); else setHex(e.target.value); }} className="col-span-2 rounded border border-slate-200 px-2 py-1.5 uppercase" aria-label="Hex" />
      {[rgb.r, rgb.g, rgb.b].map((v, i) => <input key={i} value={v} onChange={e => { const values = [rgb.r, rgb.g, rgb.b]; values[i] = +e.target.value; apply(rgbToHex(values[0], values[1], values[2])); }} className="rounded border border-slate-200 px-1 py-1.5 text-center" aria-label={['Red', 'Green', 'Blue'][i]} />)}
      <input value={`H ${hsl.h}`} onChange={e => apply(hslToHex(+e.target.value.replace(/\D/g, ''), hsl.s, hsl.l))} className="rounded border border-slate-200 px-1 py-1.5" aria-label="Hue value" />
      <input value={`S ${hsl.s}`} onChange={e => apply(hslToHex(hsl.h, +e.target.value.replace(/\D/g, ''), hsl.l))} className="rounded border border-slate-200 px-1 py-1.5" aria-label="Saturation value" />
      <input value={`L ${hsl.l}`} onChange={e => apply(hslToHex(hsl.h, hsl.s, +e.target.value.replace(/\D/g, '')))} className="rounded border border-slate-200 px-1 py-1.5" aria-label="Lightness value" />
      <button onClick={eyeDropper} disabled={!(window as any).EyeDropper} className="rounded border border-slate-200 px-1 py-1.5 text-slate-600 disabled:opacity-40" title="Pick a color from the screen">Pick</button>
    </div>
    <div className="mt-3 grid grid-cols-7 gap-1.5">{PRESET_COLORS.map(swatch => <button key={swatch} onClick={() => apply(swatch)} className="h-6 rounded-md border border-slate-200 shadow-sm hover:scale-110" style={{ backgroundColor: swatch }} title={swatch} />)}</div>
  </div>;
};

const FullscreenPreview: React.FC<FullscreenPreviewProps> = ({ posters, activeIndex, onActiveIndexChange, onClose }) => {
  const isOpen = activeIndex !== null && posters.length > 0;
  const safeIndex = activeIndex === null ? 0 : Math.max(0, Math.min(activeIndex, posters.length - 1));
  const activePoster = posters[safeIndex];

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        onActiveIndexChange((safeIndex + 1) % posters.length);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        onActiveIndexChange((safeIndex - 1 + posters.length) % posters.length);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, safeIndex, posters.length, onActiveIndexChange, onClose]);

  if (!isOpen || !activePoster) return null;

  const goPrevious = () => onActiveIndexChange((safeIndex - 1 + posters.length) % posters.length);
  const goNext = () => onActiveIndexChange((safeIndex + 1) % posters.length);

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/95 backdrop-blur-sm flex flex-col animate-fade-in" role="dialog" aria-modal="true" aria-label="Banner preview">
      <header className="h-16 shrink-0 px-4 sm:px-6 border-b border-white/10 flex items-center justify-between text-white">
        <div>
          <h2 className="text-sm font-bold">{activePoster.format.name}</h2>
          <p className="text-xs text-slate-400">{activePoster.width} × {activePoster.height} px · {activePoster.format.aspectRatioLabel} · {safeIndex + 1} of {posters.length}</p>
        </div>
        <button onClick={onClose} className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold flex items-center gap-1.5 transition-colors" title="Exit preview (Esc)">
          <X className="w-4 h-4" /> Exit <span className="hidden sm:inline text-slate-400">Esc</span>
        </button>
      </header>

      <div className="relative flex-1 min-h-0 flex items-center justify-center p-6 sm:p-12">
        <img src={activePoster.dataUrl} alt={activePoster.format.name} className="max-w-full max-h-full object-contain rounded shadow-2xl" />
        <button onClick={goPrevious} className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/45 hover:bg-black/70 border border-white/15 text-white transition-colors" title="Previous banner (Left Arrow)">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button onClick={goNext} className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/45 hover:bg-black/70 border border-white/15 text-white transition-colors" title="Next banner (Right Arrow)">
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      <footer className="shrink-0 h-12 flex items-center justify-center text-xs text-slate-400 border-t border-white/10">
        Use <kbd className="mx-1 rounded bg-white/10 px-1.5 py-0.5 text-white">←</kbd><kbd className="mr-1 rounded bg-white/10 px-1.5 py-0.5 text-white">→</kbd> to browse · <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-white">Esc</kbd> to exit
      </footer>
    </div>
  );
};

const CampaignSetupModal: React.FC<SetupModalProps> = ({ onConfirm }) => {
  const [name, setName] = React.useState('New Campaign');
  const [introText, setIntroText] = React.useState('Special Announcement');
  const [mainHeading, setMainHeading] = React.useState('Delivering Relevance at Scale');
  const [supportingParagraph, setSupportingParagraph] = React.useState(
    'AI-driven solutions for smarter decisions and better outcomes.'
  );
  const [dateText, setDateText] = React.useState('November 18, 2026');
  const [locationText, setLocationText] = React.useState('Global Broadcast & In-Person');
  const [ctaText, setCtaText] = React.useState('Book your study →');
  const [headingColor, setHeadingColor] = React.useState('#FFFFFF');
  const [supportingColor, setSupportingColor] = React.useState('#E2E8F0');
  const [introColor, setIntroColor] = React.useState('#FFFFFF');
  const [footerColor, setFooterColor] = React.useState('#E2E8F0');
  const [ctaBackground, setCtaBackground] = React.useState('#3B82F6');
  const [ctaTextColor, setCtaTextColor] = React.useState('#FFFFFF');
  const [logoPreview, setLogoPreview] = React.useState<string | undefined>(SAMPLE_LOGO_URL);
  const [logoDim, setLogoDim] = React.useState<{ width?: number; height?: number; aspect?: number }>({ width: 280, height: 100, aspect: 2.8 });
  const [bgPreview, setBgPreview] = React.useState<string | undefined>(SAMPLE_BACKGROUND_1);
  const [selectedPresetBg, setSelectedPresetBg] = React.useState<string | null>('cyber');
  const [selectedPresetLogo, setSelectedPresetLogo] = React.useState<string | null>('vertex');
  const logoInputRef = React.useRef<HTMLInputElement>(null);
  const bgInputRef = React.useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
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

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setBgPreview(reader.result as string);
      setSelectedPresetBg(null);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
        <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400">Campaign Generator</span>
            <h2 className="text-xl font-extrabold text-white">Create Multi-Ratio Campaign</h2>
          </div>
          <Sparkles className="w-6 h-6 text-sky-400" />
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Campaign Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500" placeholder="e.g. Q4 Global Brand Launch" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">Brand Logo</label>
              <div className="h-28 rounded-lg border border-slate-200 bg-slate-900 flex items-center justify-center relative overflow-hidden group">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="max-h-20 max-w-[85%] object-contain" />
                ) : (
                  <span className="text-xs text-slate-500">No logo uploaded</span>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button onClick={() => logoInputRef.current?.click()} className="px-3 py-1 bg-white text-slate-900 rounded-md text-xs font-bold">Change</button>
                </div>
              </div>
              <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              <div className="flex gap-1.5">
                <button onClick={() => { setLogoPreview(SAMPLE_LOGO_URL); setSelectedPresetLogo('vertex'); setLogoDim({ width: 280, height: 100, aspect: 2.8 }); }}
                  className={`flex-1 py-1 text-[11px] rounded border ${selectedPresetLogo === 'vertex' ? 'bg-blue-50 border-blue-600 font-bold text-blue-700' : 'border-slate-200 text-slate-600'}`}>Vertex</button>
                <button onClick={() => logoInputRef.current?.click()}
                  className="flex-1 py-1 text-[11px] rounded border border-dashed border-blue-400 text-blue-600 hover:bg-blue-50 font-medium flex items-center justify-center space-x-1">
                  <Upload className="w-3 h-3" /><span>Upload</span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">Background Image</label>
              <div className="h-28 rounded-lg border border-slate-200 bg-slate-900 relative overflow-hidden group">
                {bgPreview && <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${bgPreview})` }} />}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button onClick={() => bgInputRef.current?.click()} className="px-3 py-1 bg-white text-slate-900 rounded-md text-xs font-bold">Change</button>
                </div>
              </div>
              <input ref={bgInputRef} type="file" accept="image/*" onChange={handleBgUpload} className="hidden" />
              <div className="grid grid-cols-3 gap-1">
                {[{ id: 'cyber', url: SAMPLE_BACKGROUND_1, name: 'Cyber' }, { id: 'amber', url: SAMPLE_BACKGROUND_2, name: 'Amber' }, { id: 'purple', url: SAMPLE_BACKGROUND_3, name: 'Purple' }].map(p => (
                  <button key={p.id} onClick={() => { setBgPreview(p.url); setSelectedPresetBg(p.id); }}
                    className={`py-1 text-[11px] rounded border truncate ${selectedPresetBg === p.id ? 'bg-blue-50 border-blue-600 font-bold text-blue-700' : 'border-slate-200 text-slate-600'}`}>
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-900 block">Campaign Copy</span>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-slate-500">Intro Badge</span>
                <span className="text-[10px] font-mono text-slate-400">{introText.length}/{CHAR_LIMITS['element-intro']}</span>
              </div>
              <input type="text" value={introText} onChange={e => setIntroText(e.target.value.slice(0, CHAR_LIMITS['element-intro']))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500" placeholder="Special Announcement" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-slate-500">Main Heading</span>
                <span className="text-[10px] font-mono text-slate-400">{mainHeading.length}/{CHAR_LIMITS['element-heading']}</span>
              </div>
              <input type="text" value={mainHeading} onChange={e => setMainHeading(e.target.value.slice(0, CHAR_LIMITS['element-heading']))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500" placeholder="Delivering Relevance at Scale" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-slate-500">Supporting Paragraph</span>
                <span className="text-[10px] font-mono text-slate-400">{supportingParagraph.length}/{CHAR_LIMITS['element-paragraph']}</span>
              </div>
              <textarea rows={2} value={supportingParagraph} onChange={e => setSupportingParagraph(e.target.value.slice(0, CHAR_LIMITS['element-paragraph']))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 resize-none" placeholder="AI-driven solutions..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] text-slate-500 block mb-1">Date / Event</span>
                <input type="text" value={dateText} onChange={e => setDateText(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500" placeholder="November 18, 2026" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-slate-500">Location / Footer</span>
                  <span className="text-[10px] font-mono text-slate-400">{locationText.length}/{CHAR_LIMITS['element-footer']}</span>
                </div>
                <input type="text" value={locationText} onChange={e => setLocationText(e.target.value.slice(0, CHAR_LIMITS['element-footer']))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500" placeholder="Global Broadcast" />
              </div>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 block mb-1">Primary CTA Button</span>
              <input type="text" value={ctaText} onChange={e => setCtaText(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500" placeholder="Book your study →" />
            </div>
            <div className="pt-3 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-900 block mb-2">Campaign colors</span>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Heading text', headingColor, setHeadingColor],
                  ['Supporting text', supportingColor, setSupportingColor],
                  ['Intro badge', introColor, setIntroColor],
                  ['Date & venue', footerColor, setFooterColor],
                  ['CTA background', ctaBackground, setCtaBackground],
                  ['CTA label', ctaTextColor, setCtaTextColor],
                ].map(([label, value, setValue]) => (
                  <label key={label as string} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-[11px] font-medium text-slate-600">
                    <span>{label as string}</span>
                    <input type="color" value={value as string} onChange={event => (setValue as React.Dispatch<React.SetStateAction<string>>)(event.target.value)} className="h-7 w-9 cursor-pointer rounded border border-slate-300 bg-white p-0.5" />
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end space-x-3">
          <p className="text-xs text-slate-400 flex-1">All 11 formats (Square, Story, Banner, etc.) auto-generated.</p>
          <button onClick={() => onConfirm({ name, logoUrl: logoPreview, logoWidth: logoDim.width, logoHeight: logoDim.height, logoAspectRatio: logoDim.aspect, backgroundUrl: bgPreview, introText, mainHeading, supportingParagraph, dateText, locationText, ctaText, headingColor, supportingColor, introColor, footerColor, ctaBackground, ctaTextColor })}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl flex items-center space-x-2 transition-colors shadow-md shadow-blue-200 cursor-pointer">
            <Sparkles className="w-4 h-4" /><span>Generate Campaign</span>
          </button>
        </div>
      </div>
    </div>
  );
};

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

  // Campaign Content
  const [content, setContent] = useState<CampaignContent>({
    campaignName: 'New Campaign',
    introText: '100% Automation',
    mainHeading: 'Delivering Relevance at Scale',
    supportingParagraph: 'AI-driven solutions for smarter decisions and better outcomes.',
    dateText: 'November 18, 2026',
    locationText: 'Global Broadcast & In-Person',
    ctaText: 'Book your study →',
  });

  // Assets
  const [assets, setAssets] = useState<CampaignAssets>({
    logoUrl: SAMPLE_LOGO_URL,
    backgroundImages: [{ id: 'bg-cyber-mesh', name: 'Cyber Mesh Ambient', url: SAMPLE_BACKGROUND_1, width: 1920, height: 1920, aspectRatio: 1.0 }],
    selectedBackgroundId: 'bg-cyber-mesh',
    backgroundFit: 'cover',
    formatAdjustments: {},
  });

  const [selectedPresetBg, setSelectedPresetBg] = useState<string | null>('cyber');
  const [selectedPresetLogo, setSelectedPresetLogo] = useState<string | null>('vertex');
  const [activeTool, setActiveTool] = useState<'select' | 'shape' | 'circle' | 'triangle' | 'text' | 'image'>('select');

  // Custom layers & CTA buttons
  const [customLayers, setCustomLayers] = useState<CustomLayerItem[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string>('element-heading');
  const [hiddenLayers, setHiddenLayers] = useState<Set<string>>(new Set());
  const [deletedLayerIds, setDeletedLayerIds] = useState<Set<string>>(new Set());
  // Layer metadata is deliberately separate from render data: locked layers still render,
  // but never participate in canvas selection or transforms.
  const [lockedLayerIds, setLockedLayerIds] = useState<Set<string>>(new Set());

  // Independent canvas aspect ratio management: format ID -> element ID -> CustomElementStyle
  const [perFormatOverrides, setPerFormatOverrides] = useState<Record<string, Record<string, CustomElementStyle>>>({});
  const overrideHistoryRef = useRef<EditorSnapshot[]>([]);
  const overrideRedoRef = useRef<EditorSnapshot[]>([]);
  const overridesRef = useRef(perFormatOverrides);
  const [historyVersion, setHistoryVersion] = useState(0);
  const [showColorPanel, setShowColorPanel] = useState(false);

  // Layer ordering state (from top to bottom in layers list: index 0 is topmost visual layer)
  const [layerOrder, setLayerOrder] = useState<string[]>([]);
  const [layerNames, setLayerNames] = useState<Record<string, string>>({});
  const [editingLayerNameId, setEditingLayerNameId] = useState<string | null>(null);

  // Section accordions
  const [campaignContentOpen, setCampaignContentOpen] = useState(true);
  const [ctaButtonsSectionOpen, setCtaButtonsSectionOpen] = useState(true);
  const [logoSectionOpen, setLogoSectionOpen] = useState(false);
  const [bgUploadSectionOpen, setBgUploadSectionOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(true);
  const [fillMode, setFillMode] = useState<'solid' | 'gradient'>('solid');

  // View & export state
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'all-formats' | 'single'>('all-formats');
  const [playgroundZoom, setPlaygroundZoom] = useState(1);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showAddLayerMenu, setShowAddLayerMenu] = useState(false);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [generatedPosters, setGeneratedPosters] = useState<GeneratedPosterItem[]>([]);
  const [previewPosterIndex, setPreviewPosterIndex] = useState<number | null>(null);
  const [layerSearch, setLayerSearch] = useState('');

  // Drag and drop in layers list
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);

  // Canvas interaction
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragInfoRef = useRef<{ layerId: string; startMouseX: number; startMouseY: number; initialX: number; initialY: number; } | null>(null);
  const resizeInfoRef = useRef<{
    layerId: string;
    corner: 'nw' | 'ne' | 'se' | 'sw';
    startMouseX: number;
    startMouseY: number;
    initialScale: number;
    initialX: number;
    initialY: number;
    baseWidth: number;
    baseHeight: number;
  } | null>(null);

  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<Canvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const gradientColor1Ref = useRef<HTMLInputElement>(null);
  const gradientColor2Ref = useRef<HTMLInputElement>(null);
  const renderRequestRef = useRef(0);

  const currentTemplate = useMemo(() => templates.find(t => t.id === selectedTemplateId) || BUILTIN_TEMPLATES[0], [templates, selectedTemplateId]);

  // Current active format style overrides
  const currentFormatOverrides = useMemo(() => perFormatOverrides[activeFormat.id] || {}, [perFormatOverrides, activeFormat.id]);

  useEffect(() => { overridesRef.current = perFormatOverrides; }, [perFormatOverrides]);

  const makeSnapshot = (): EditorSnapshot => JSON.parse(JSON.stringify({
    content, assets, customLayers, overrides: perFormatOverrides,
    hidden: [...hiddenLayers], deleted: [...deletedLayerIds], locked: [...lockedLayerIds], layerOrder, layerNames,
  }));
  const commitOverrideHistory = () => {
    overrideHistoryRef.current = [...overrideHistoryRef.current.slice(-49), makeSnapshot()];
    overrideRedoRef.current = [];
    setHistoryVersion(version => version + 1);
  };
  const restoreSnapshot = (snapshot: EditorSnapshot) => {
    setContent(snapshot.content); setAssets(snapshot.assets); setCustomLayers(snapshot.customLayers);
    setPerFormatOverrides(snapshot.overrides); setHiddenLayers(new Set(snapshot.hidden)); setDeletedLayerIds(new Set(snapshot.deleted));
    setLockedLayerIds(new Set(snapshot.locked)); setLayerOrder(snapshot.layerOrder); setLayerNames(snapshot.layerNames);
    setSelectedLayerId(''); fabricCanvasRef.current?.discardActiveObject(); fabricCanvasRef.current?.requestRenderAll();
  };
  const undoOverrides = () => {
    const previous = overrideHistoryRef.current.pop();
    if (!previous) return;
    overrideRedoRef.current.push(makeSnapshot());
    restoreSnapshot(previous);
    setHistoryVersion(version => version + 1);
    showToast('Undid last style change');
  };
  const redoOverrides = () => {
    const next = overrideRedoRef.current.pop();
    if (!next) return;
    overrideHistoryRef.current.push(makeSnapshot());
    restoreSnapshot(next);
    setHistoryVersion(version => version + 1);
    showToast('Redid style change');
  };

  // Load initial project if provided
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
      } catch (e) {
        console.error('Error loading campaign data:', e);
      }
    };
    loadInit();
  }, [initialProjectId]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Keep browser zoom untouched: Ctrl/Cmd + wheel only zooms the editor playground.
  // A native non-passive listener is required for preventDefault to reliably stop browser zoom.
  useEffect(() => {
    const playground = containerRef.current;
    if (!playground) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const direction = event.deltaY < 0 ? 1 : -1;
      setPlaygroundZoom(current => Math.min(2.5, Math.max(0.35, Math.round((current + direction * 0.1) * 100) / 100)));
    };
    playground.addEventListener('wheel', onWheel, { passive: false });
    return () => playground.removeEventListener('wheel', onWheel);
  }, []);

  // Helper to update styling for selected element on the current active format (independent canvas)
  const updateSelectedElementStyle = (patch: Partial<CustomElementStyle>) => {
    if (!selectedLayerId || lockedLayerIds.has(selectedLayerId)) return;
    commitOverrideHistory();
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
  const scaleSelectedLayer = (delta: number) => {
    if (!selectedLayerId || lockedLayerIds.has(selectedLayerId)) return;
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

    const customResolvedElements: ResolvedElement[] = customLayers
      .filter(cl => cl.formatId === activeFormat.id)
      .map(cl => {
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
        verticalAlign: overrides.verticalAlign ?? cl.verticalAlign ?? 'top',
        color: overrides.color ?? cl.color ?? (cl.type === 'text' ? '#FFFFFF' : (currentTemplate.colorScheme.accent || '#3B82F6')),
        fill: overrides.fill ?? cl.fill ?? (cl.type === 'cta-button' ? '#E5173F' : (currentTemplate.colorScheme.accent || '#3B82F6')),
        borderColor: overrides.borderColor ?? cl.borderColor,
        borderWidth: overrides.borderWidth ?? cl.borderWidth,
        borderRadius: overrides.borderRadius ?? cl.borderRadius,
        opacity: overrides.opacity !== undefined ? overrides.opacity : cl.opacity !== undefined ? cl.opacity : 1,
        gradient: overrides.gradient ?? cl.gradient,
      };
    });

    const modifiedElements = baseLayout.elements.map((el: ResolvedElement) => {
      const overrides = currentFormatOverrides[el.id];
      if (!overrides) return el;
      const scale = overrides.scale ?? 1;
      return {
        ...el,
        fontFamily: overrides.fontFamily ?? el.fontFamily,
        fontWeight: overrides.fontWeight ?? el.fontWeight,
        fontSize: overrides.fontSize ?? el.fontSize,
        lineHeight: overrides.lineHeight ?? el.lineHeight,
        textAlign: overrides.textAlign ?? el.textAlign,
        verticalAlign: overrides.verticalAlign ?? (el as any).verticalAlign ?? 'top',
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
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return -1;
        if (indexB === -1) return 1;
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
    return layout.elements.filter((el: ResolvedElement) => !deletedLayerIds.has(el.id) && !hiddenLayers.has(el.id));
  }, [layout, deletedLayerIds, hiddenLayers]);

  const selectedElement = useMemo(() => {
    if (!selectedLayerId) return null;
    if (deletedLayerIds.has(selectedLayerId)) return null;
    return layout.elements.find((el: ResolvedElement) => el.id === selectedLayerId) || null;
  }, [layout, selectedLayerId, deletedLayerIds]);

  const selectedElementStyle = currentFormatOverrides[selectedLayerId] || {};
  const isSelectedLayerLocked = selectedElement ? lockedLayerIds.has(selectedElement.id) : false;
  const currentScale = selectedElementStyle.scale ?? 1;
  const currentFontFamily = selectedElementStyle.fontFamily || (selectedElement ? selectedElement.fontFamily : 'Inter') || 'Inter';
  const currentFontWeight = selectedElementStyle.fontWeight || (selectedElement ? selectedElement.fontWeight : 'Bold') || 'Bold';
  const currentFontSize = selectedElementStyle.fontSize || (selectedElement ? selectedElement.fontSize : 32) || 32;
  const currentTextAlign = selectedElementStyle.textAlign || (selectedElement ? selectedElement.textAlign : 'left') || 'left';
  const currentColor = selectedElementStyle.color || (selectedElement ? (selectedElement.color || '#FFFFFF') : '#FFFFFF');
  const currentOpacity = selectedElementStyle.opacity !== undefined ? selectedElementStyle.opacity : (selectedElement?.opacity !== undefined ? selectedElement?.opacity : 1);
  const currentFill = selectedElementStyle.fill || (selectedElement ? (selectedElement.fill || '#3B82F6') : '#3B82F6');
  const currentGradient = selectedElementStyle.gradient || selectedElement?.gradient;

  const previewScale = useMemo(() => (560 / activeFormat.width) * playgroundZoom, [activeFormat, playgroundZoom]);
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
    if (!canvasElRef.current) return;
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
  const renderAllFormatsWithData = async (
    pName: string,
    cContent: CampaignContent,
    cAssets: CampaignAssets,
    cTemplate: PosterTemplate,
    openModal = false
  ): Promise<GeneratedPosterItem[]> => {
    const requestId = ++renderRequestRef.current;
    try {
      setIsGeneratingAll(true);
      const results: GeneratedPosterItem[] = [];

      for (const fmt of ALL_GENERATE_FORMATS) {
        const fmtOverrides = perFormatOverrides[fmt.id] || {};
        const baseLayout = LayoutEngine.computeLayout({
          template: cTemplate,
          content: cContent,
          assets: cAssets,
          format: fmt,
        });

        const modifiedElements = baseLayout.elements
          .filter((el: ResolvedElement) => !deletedLayerIds.has(el.id) && !hiddenLayers.has(el.id))
          .map((el: ResolvedElement) => {
            const overrides = fmtOverrides[el.id];
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

        const customResolvedElements: ResolvedElement[] = customLayers
          .filter(cl => cl.formatId === fmt.id && !deletedLayerIds.has(cl.id) && !hiddenLayers.has(cl.id))
          .map(cl => {
            const overrides = fmtOverrides[cl.id] || {};
            const scale = overrides.scale ?? cl.scale ?? 1;
            const posX = overrides.x !== undefined ? overrides.x : cl.x;
            const posY = overrides.y !== undefined ? overrides.y : cl.y;
            const width = Math.round((cl.width || 200) * scale);
            const height = Math.round((cl.height || 60) * scale);
            const fontSize = overrides.fontSize ?? cl.fontSize ?? 32;

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
            if (idxA === -1 && idxB === -1) return 0;
            if (idxA === -1) return -1;
            if (idxB === -1) return 1;
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

      if (renderRequestRef.current === requestId) {
        setGeneratedPosters(results);
      }
      if (openModal) {
        setShowGalleryModal(true);
      }
      return results;
    } catch (err) {
      console.error('Render all formats error:', err);
      showToast('Error rendering format previews');
      return [];
    } finally {
      setIsGeneratingAll(false);
    }
  };

  // Setup confirm
  const handleSetupConfirm = async (data: {
    name: string;
    logoUrl?: string;
    logoWidth?: number;
    logoHeight?: number;
    logoAspectRatio?: number;
    backgroundUrl?: string;
    introText: string;
    mainHeading: string;
    supportingParagraph: string;
    dateText: string;
    locationText: string;
    ctaText: string;
    headingColor: string;
    supportingColor: string;
    introColor: string;
    footerColor: string;
    ctaBackground: string;
    ctaTextColor: string;
  }) => {
    setProjectName(data.name);
    const newContent: CampaignContent = {
      campaignName: data.name,
      introText: data.introText,
      mainHeading: data.mainHeading,
      supportingParagraph: data.supportingParagraph,
      dateText: data.dateText,
      locationText: data.locationText,
      ctaText: data.ctaText,
    };
    setContent(newContent);
    const campaignTemplate: PosterTemplate = {
      ...currentTemplate,
      colorScheme: {
        ...currentTemplate.colorScheme,
        textPrimary: data.headingColor,
        textSecondary: data.supportingColor,
        introText: data.introColor,
        footerText: data.footerColor,
        ctaBackground: data.ctaBackground,
        ctaText: data.ctaTextColor,
      },
    };
    setTemplates((previous) => previous.map((template) => template.id === campaignTemplate.id ? campaignTemplate : template));
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
        void (async () => {
          try {
            const rendered = await renderAllFormatsWithData(data.name, newContent, newAssets, campaignTemplate, false);
            if (rendered && rendered.length > 0) {
              showToast(`Uploading all ${rendered.length} banner formats to Cloudinary & DB...`);
              const payload = rendered.map((item) => ({
                formatId: item.format.id,
                aspectRatio: item.format.aspectRatioLabel,
                width: item.width,
                height: item.height,
                dataUrl: item.dataUrl,
              }));
              await ApiService.uploadProjectImages(createdProj.id, payload);
              showToast(`All ${rendered.length} formats saved to Cloudinary & Neon DB!`);
            }
          } catch (uploadErr) {
            console.warn('Initial multi-ratio upload failed:', uploadErr);
          }
        })();
      }
    } catch (err) {
      console.warn('Auto-create project error:', err);
    }

  };
  const updateContent = (patch: Partial<CampaignContent>) => { commitOverrideHistory(); setContent(prev => ({ ...prev, ...patch })); };

  // Keep every ratio preview current. Changes are batched briefly so dragging or typing
  // does not start a render for every individual pointer/input event.
  useEffect(() => {
    if (showSetupModal) return;
    const timer = window.setTimeout(() => {
      void renderAllFormatsWithData(projectName, content, assets, currentTemplate, false);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [
    showSetupModal,
    projectName,
    content,
    assets,
    currentTemplate,
    perFormatOverrides,
    customLayers,
    deletedLayerIds,
    hiddenLayers,
    layerOrder,
  ]);

  // Dragging and resizing on canvas
  const handleStartDrag = (layerId: string, e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault();
    if (lockedLayerIds.has(layerId)) return;
    commitOverrideHistory();
    setSelectedLayerId(layerId);
    const el = layout.elements.find((item: ResolvedElement) => item.id === layerId);
    if (!el) return;
    dragInfoRef.current = { layerId, startMouseX: e.clientX, startMouseY: e.clientY, initialX: el.x, initialY: el.y };
    setIsDragging(true);
  };

  const handleStartResize = (layerId: string, corner: 'nw' | 'ne' | 'se' | 'sw', e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault();
    if (lockedLayerIds.has(layerId)) return;
    commitOverrideHistory();
    setSelectedLayerId(layerId);
    const el = layout.elements.find((item: ResolvedElement) => item.id === layerId);
    if (!el) return;
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
    const handleMouseMove = (e: MouseEvent) => {
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
      } else if (resizeInfoRef.current) {
        const { layerId, corner, startMouseX, startMouseY, initialScale, initialX, initialY, baseWidth, baseHeight } = resizeInfoRef.current;
        const deltaMouseX = (e.clientX - startMouseX) / previewScale;
        const deltaMouseY = (e.clientY - startMouseY) / previewScale;

        let deltaSize = 0;
        if (corner === 'se') deltaSize = (deltaMouseX + deltaMouseY) / 2;
        else if (corner === 'nw') deltaSize = (-deltaMouseX - deltaMouseY) / 2;
        else if (corner === 'ne') deltaSize = (deltaMouseX - deltaMouseY) / 2;
        else if (corner === 'sw') deltaSize = (-deltaMouseX + deltaMouseY) / 2;

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
        } else if (corner === 'ne') {
          newY = initialY - heightDiff;
        } else if (corner === 'sw') {
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
      if (dragInfoRef.current) { dragInfoRef.current = null; setIsDragging(false); }
      if (resizeInfoRef.current) { resizeInfoRef.current = null; setIsResizing(false); }
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
    const customs = customLayers.filter(cl => cl.formatId === activeFormat.id).map(cl => ({
      id: cl.id,
      label: layerNames[cl.id] || cl.label,
      type: cl.type,
      shapeType: cl.shapeType,
      ctaType: cl.ctaType,
    }));
    return [...base, ...customs];
  }, [customLayers, layerNames, activeFormat.id]);

  // Order allLayerDefs according to layerOrder
  const sortedLayers = useMemo(() => {
    const map = new Map(allLayerDefs.map(l => [l.id, l]));
    const result: typeof allLayerDefs = [];
    for (const id of layerOrder) {
      if (map.has(id)) {
        result.push(map.get(id)!);
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
      if (deletedLayerIds.has(l.id)) return false;
      if (!layerSearch.trim()) return true;
      return l.label.toLowerCase().includes(layerSearch.toLowerCase().trim());
    });
  }, [sortedLayers, deletedLayerIds, layerSearch]);

  // Add layer handlers
  const handleAddTextLayer = () => {
    commitOverrideHistory();
    const id = `custom-text-${Date.now()}`;
    const textNumber = customLayers.filter(l => l.type === 'text').length + 1;
    const canvasWidth = activeFormat.width || 1080;
    const canvasHeight = activeFormat.height || 1080;

    const newLayer: CustomLayerItem = {
      id,
      formatId: activeFormat.id,
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
    if (viewMode === 'all-formats') setViewMode('single');
    showToast(`Added Text Layer ${textNumber}`);
  };

  const handleAddShapeLayer = (shapeType: 'rect' | 'circle' = 'rect') => {
    commitOverrideHistory();
    const id = `custom-shape-${Date.now()}`;
    const shapeNumber = customLayers.filter(l => l.type === 'shape').length + 1;
    const canvasWidth = activeFormat.width || 1080;
    const canvasHeight = activeFormat.height || 1080;
    const size = Math.round(Math.min(canvasWidth, canvasHeight) * 0.22);

    const newLayer: CustomLayerItem = {
      id,
      formatId: activeFormat.id,
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
    if (viewMode === 'all-formats') setViewMode('single');
    showToast(`Added ${shapeType === 'circle' ? 'Circle' : 'Rectangle'} Shape`);
  };

  // Add CTA Button (Primary, Secondary, Tertiary)
  const handleAddCtaButton = (type: 'primary' | 'secondary' | 'tertiary') => {
    commitOverrideHistory();
    const id = `cta-${type}-${Date.now()}`;
    const canvasWidth = activeFormat.width || 1080;
    const canvasHeight = activeFormat.height || 1080;
    const isPrimary = type === 'primary';
    const isSecondary = type === 'secondary';
    const buttonText = isPrimary ? 'Get Started' : isSecondary ? 'Learn More' : 'Contact Sales';
    const dimensions = calculateCtaDimensions(buttonText, Math.round(canvasWidth * 0.72), Math.min(canvasWidth, canvasHeight), type, {
      fontFamily: currentTemplate.typography.headingFontFamily,
      fontWeight: '700',
      });
    const ctaIndex = customLayers.filter((layer) => layer.type === 'cta-button').length;
    const newLayer: CustomLayerItem = {
      id,
      formatId: activeFormat.id,
      type: 'cta-button',
      ctaType: type,
      label: `${type.charAt(0).toUpperCase() + type.slice(1)} CTA Button`,
      text: buttonText,
      x: Math.round(canvasWidth * 0.1),
      y: Math.max(Math.round(canvasHeight * 0.18), canvasHeight - Math.round(canvasHeight * 0.1) - dimensions.height - ctaIndex * (dimensions.height + 12)),
      width: dimensions.width,
      height: dimensions.height,
      fontSize: dimensions.fontSize,
      fontFamily: currentTemplate.typography.headingFontFamily || 'Plus Jakarta Sans',
      fontWeight: 'Bold',
      color: isPrimary ? (currentTemplate.colorScheme.ctaText || '#FFFFFF') : currentTemplate.colorScheme.accent,
      fill: isPrimary ? (currentTemplate.colorScheme.ctaBackground || currentTemplate.colorScheme.secondary) : 'transparent',
      borderColor: isSecondary ? currentTemplate.colorScheme.accent : 'transparent',
      borderWidth: isSecondary ? Math.max(1, Math.round(dimensions.height * 0.04)) : 0,
      borderRadius: type === 'tertiary' ? 0 : Math.round(dimensions.height * 0.35),
      opacity: 1,
      textAlign: 'center',
      scale: 1,
    };

    setCustomLayers(prev => [...prev, newLayer]);
    setLayerOrder(prev => [id, ...prev]);
    setSelectedLayerId(id);
    if (viewMode === 'all-formats') setViewMode('single');
    showToast(`Added ${type} CTA Button`);
  };

  const handleDuplicateLayer = (layerId: string) => {
    if (lockedLayerIds.has(layerId)) return;
    const cl = customLayers.find(l => l.id === layerId);
    if (!cl) {
      showToast('Cannot duplicate built-in layers');
      return;
    }
    const newId = `custom-${cl.type}-${Date.now()}`;
    commitOverrideHistory();
    const copy: CustomLayerItem = {
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
  const handleMoveLayer = (layerId: string, direction: 'up' | 'down') => {
    if (lockedLayerIds.has(layerId)) return;
    commitOverrideHistory();
    setLayerOrder(prev => {
      const idx = prev.indexOf(layerId);
      if (idx === -1) return prev;
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const updated = [...prev];
      const temp = updated[idx];
      updated[idx] = updated[targetIdx];
      updated[targetIdx] = temp;
      return updated;
    });
    showToast(`Moved layer ${direction === 'up' ? 'forward' : 'backward'}`);
  };

  // Drag and drop layer reordering
  const handleLayerDragStart = (e: React.DragEvent, id: string) => {
    if (lockedLayerIds.has(id)) {
      e.preventDefault();
      return;
    }
    setDraggedLayerId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleLayerDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleLayerDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedLayerId || draggedLayerId === targetId || lockedLayerIds.has(draggedLayerId)) return;
    commitOverrideHistory();
    setLayerOrder(prev => {
      const fromIdx = prev.indexOf(draggedLayerId);
      const toIdx = prev.indexOf(targetId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const copy = [...prev];
      copy.splice(fromIdx, 1);
      copy.splice(toIdx, 0, draggedLayerId);
      return copy;
    });
    setDraggedLayerId(null);
    showToast('Layer order updated');
  };

  const handleDeleteLayer = (layerId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (lockedLayerIds.has(layerId)) return;
    commitOverrideHistory();
    if (layerId.startsWith('custom-') || layerId.startsWith('cta-')) {
      setCustomLayers(prev => prev.filter(l => l.id !== layerId));
    } else {
      setDeletedLayerIds(prev => { const next = new Set(prev); next.add(layerId); return next; });
    }
    if (selectedLayerId === layerId) {
      const remaining = allLayerDefs.find(l => l.id !== layerId && !deletedLayerIds.has(l.id) && !l.id.startsWith('custom-'));
      setSelectedLayerId(remaining ? remaining.id : 'element-heading');
    }
    showToast('Layer deleted');
  };

  const handleRestoreLayer = (layerId: string) => {
    commitOverrideHistory();
    setDeletedLayerIds(prev => { const next = new Set(prev); next.delete(layerId); return next; });
    setSelectedLayerId(layerId);
    setShowAddLayerMenu(false);
    showToast('Layer restored');
  };

  const handleRestoreAllLayers = () => {
    commitOverrideHistory();
    setDeletedLayerIds(new Set());
    setShowAddLayerMenu(false);
    showToast('All layers restored');
  };

  const toggleLayerVisibility = (layerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    commitOverrideHistory();
    setHiddenLayers(prev => {
      const next = new Set(prev);
      if (next.has(layerId)) next.delete(layerId);
      else next.add(layerId);
      return next;
    });
  };

  const toggleLayerLock = (layerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    commitOverrideHistory();
    setLockedLayerIds(prev => {
      const next = new Set(prev);
      if (next.has(layerId)) next.delete(layerId);
      else next.add(layerId);
      return next;
    });
  };

  // Keyboard shortcut delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'z' || e.key.toLowerCase() === 'y')) {
        e.preventDefault();
        if (e.shiftKey || e.key.toLowerCase() === 'y') redoOverrides();
        else undoOverrides();
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedLayerId) {
        e.preventDefault();
        handleDeleteLayer(selectedLayerId);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedLayerId, deletedLayerIds, lockedLayerIds, perFormatOverrides]);

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
    } catch (err) {
      console.error('Export failed:', err);
      showToast('Export failed.');
    } finally {
      setIsExporting(false);
      setShowExportMenu(false);
    }
  };

  const handleDownloadSingle = (item: GeneratedPosterItem) => {
    const link = document.createElement('a');
    link.href = item.dataUrl;
    link.download = item.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Downloaded ${item.format.name} PNG`);
  };

  const handleDownloadAllZip = async () => {
    if (generatedPosters.length === 0) return;
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
    } catch (err: any) {
      console.error('ZIP generation failed:', err);
      showToast('Failed to create ZIP package');
    } finally {
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
      const proj: Partial<CampaignProject> = {
        name: projectName,
        templateId: selectedTemplateId,
        content,
        assets,
        selectedFormats: DEFAULT_POSTER_FORMATS.slice(0, 4),
        updatedAt: new Date().toISOString(),
        thumbnailUrl: thumb,
      };
      let activeId = projectId;
      if (activeId) {
        await ApiService.updateProject(activeId, proj);
      } else {
        const created = await ApiService.createProject({ ...proj, createdAt: new Date().toISOString() });
        activeId = created.id;
        setProjectId(created.id);
      }
      setIsSaving(true);
      showToast('Saving campaign...');
      let postersToUpload = generatedPosters;
      if (postersToUpload.length === 0) {
        showToast('Rendering all 11 format layouts...');
        postersToUpload = await renderAllFormatsWithData(projectName, content, assets, currentTemplate, false);
      }
      if (activeId && postersToUpload.length > 0) {
        const payload = postersToUpload.map((item) => ({
          formatId: item.format.id,
          aspectRatio: item.format.aspectRatioLabel,
          width: item.width,
          height: item.height,
          dataUrl: item.dataUrl,
        }));
        showToast(`Uploading all ${postersToUpload.length} banners to Cloudinary & DB...`);
        await ApiService.uploadProjectImages(activeId, payload);
        showToast(`Saved! All ${postersToUpload.length} banners uploaded to Cloudinary & Database.`);
      }

    } catch (e) {
      console.error('Save failed:', e);
      showToast('Saved locally.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReturnToDashboard = async () => {
    try {
      const thumb = generatedPosters[0]?.dataUrl;
      const proj: Partial<CampaignProject> = {
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
      } else {
        await ApiService.createProject(proj);
      }
    } catch (e) {
      console.warn('Auto-save on back error:', e);
    }
    onBackToDashboard();
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const asset = await ApiService.uploadAsset(file);
      setAssets(prev => ({ ...prev, logoUrl: asset.url, logoAspectRatio: asset.aspectRatio, logoPublicId: asset.publicId }));
      setSelectedPresetLogo(null);
      showToast('Logo uploaded');
    } catch (err) { console.error('Logo upload failed:', err); showToast('Logo upload failed. Please retry.'); }
  };

  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const newBg = await ApiService.uploadAsset(file);
      setAssets(prev => ({
        ...prev,
        backgroundImages: [newBg, ...prev.backgroundImages],
        selectedBackgroundId: newBg.id,
      }));
      setSelectedPresetBg(null);
      showToast('Background uploaded');
    } catch (err) { console.error('Background upload failed:', err); showToast('Background upload failed. Please retry.'); }
  };

  const handleSelectPresetLogo = (key: string, url: string, name: string) => {
    setSelectedPresetLogo(key);
    setAssets(prev => ({ ...prev, logoUrl: url }));
    showToast(`Selected logo: ${name}`);
  };

  const handleUnselectPresetLogo = () => {
    setSelectedPresetLogo(null);
    setAssets(prev => ({ ...prev, logoUrl: undefined }));
    showToast('Logo cleared');
  };

  const handleSelectPresetBg = (key: string, url: string, name: string) => {
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
  const getSelectedText = (): string => {
    if (!selectedElement) return '';
    if (selectedElement.id === 'element-intro') return content.introText;
    if (selectedElement.id === 'element-heading') return content.mainHeading;
    if (selectedElement.id === 'element-paragraph') return content.supportingParagraph;
    if (selectedElement.id === 'element-footer') return content.locationText;
    if (selectedElement.id === 'element-cta') return content.ctaText || '';
    const cl = customLayers.find(l => l.id === selectedElement.id);
    return cl?.text || selectedElement.text || '';
  };

  const handleSelectedTextChange = (newText: string) => {
    if (!selectedElement || lockedLayerIds.has(selectedElement.id)) return;
    if (selectedElement.id === 'element-intro') {
      updateContent({ introText: newText.slice(0, CHAR_LIMITS['element-intro']) });
    } else if (selectedElement.id === 'element-heading') {
      updateContent({ mainHeading: newText.slice(0, CHAR_LIMITS['element-heading']) });
    } else if (selectedElement.id === 'element-paragraph') {
      updateContent({ supportingParagraph: newText.slice(0, CHAR_LIMITS['element-paragraph']) });
    } else if (selectedElement.id === 'element-footer') {
      updateContent({ locationText: newText.slice(0, CHAR_LIMITS['element-footer']) });
    } else if (selectedElement.id === 'element-cta') {
      updateContent({ ctaText: newText.slice(0, CHAR_LIMITS['element-cta']) });
    } else {
      setCustomLayers(prev => prev.map(l => l.id === selectedElement.id ? { ...l, text: newText } : l));
    }
  };

  const isTextElement = selectedElement && (
    ['intro', 'heading', 'paragraph', 'footer', 'text'].includes(selectedElement.type) ||
    selectedElement.id.startsWith('custom-text') ||
    selectedElement.id.startsWith('element-') && selectedElement.id !== 'element-logo' && selectedElement.id !== 'element-background'
  );

  const isCtaElement = selectedElement && (
    selectedElement.type === 'cta-button' || selectedElement.id === 'element-cta' || selectedElement.id.startsWith('cta-')
  );

  return (
    <>
      {showSetupModal && <CampaignSetupModal onConfirm={handleSetupConfirm} />}

      <div className="h-screen w-screen flex flex-col bg-white text-slate-800 select-none overflow-hidden font-sans">
        {/* TOP MAIN HEADER */}
        <header className="h-12 border-b border-slate-200 bg-white px-4 flex items-center justify-between shrink-0 z-30">
          <div className="flex items-center space-x-3">
            <button
              onClick={handleReturnToDashboard}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors flex items-center space-x-1 text-xs font-semibold cursor-pointer"
              title="Return to Dashboard"
            >
              <ArrowLeft className="w-4 h-4 text-slate-500" />
              <span className="hidden sm:inline">Campaigns</span>
            </button>
            <div className="h-4 w-px bg-slate-200" />
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-900 tracking-tight">{projectName}</span>
              <span className="px-1.5 py-0.5 text-[10px] bg-slate-100 text-slate-600 rounded font-mono font-medium">
                {currentTemplate.name}
              </span>
            </div>
          </div>

          {/* Mode Switcher: All 11 Formats Playground vs Single Canvas */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/80">
            <button
              onClick={() => setViewMode('all-formats')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center space-x-1.5 cursor-pointer ${
                viewMode === 'all-formats'
                  ? 'bg-white text-blue-600 shadow-xs ring-1 ring-slate-200 font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>All 11 Formats ({generatedPosters.length || 11})</span>
            </button>
            <button
              onClick={() => setViewMode('single')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center space-x-1.5 cursor-pointer ${
                viewMode === 'single'
                  ? 'bg-white text-blue-600 shadow-xs ring-1 ring-slate-200 font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MousePointer2 className="w-3.5 h-3.5" />
              <span>Canvas ({activeFormat.aspectRatioLabel})</span>
            </button>
            <button
              onClick={() => {
                const activeIndex = Math.max(0, generatedPosters.findIndex(item => item.format.id === activeFormat.id));
                setPreviewPosterIndex(activeIndex);
              }}
              disabled={generatedPosters.length === 0}
              className="px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center space-x-1.5 cursor-pointer text-slate-600 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
              title="Open full-screen banner preview"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview</span>
            </button>
          </div>

          <div className="flex items-center space-x-2 relative">
            <button
              onClick={() => setShowSetupModal(true)}
              className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
            <button
              onClick={handleShare}
              className="px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Link2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Share</span>
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
              title="Save campaign & upload all 11 banners to Cloudinary and Database"
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Cloud className="w-3.5 h-3.5" />
                  <span>Save to Cloud</span>
                </>
              )}
            </button>
            <button
              onClick={handleQuickExport}
              disabled={isExporting}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? 'Exporting...' : 'Export'}</span>
            </button>
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 cursor-pointer"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
              {showExportMenu && (
                <div className="absolute right-0 mt-1 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs animate-fade-in">
                  <button onClick={handleQuickExport} className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center space-x-2 text-slate-700">
                    <Download className="w-3.5 h-3.5 text-blue-600" /><span>Download Active (PNG)</span>
                  </button>
                  <button onClick={handleDownloadAllZip} className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center space-x-2 text-slate-700">
                    <FolderArchive className="w-3.5 h-3.5 text-emerald-600" /><span>Download ZIP (All Formats)</span>
                  </button>
                  <div className="h-px bg-slate-100 my-1" />
                  <button onClick={handleSave} className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center space-x-2 text-slate-700">
                    <Check className="w-3.5 h-3.5 text-emerald-600" /><span>Save Campaign</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* SUB-HEADER TYPOGRAPHY & QUICK TOOLBAR */}
        <div className="h-10 border-b border-slate-200 bg-white px-3 flex items-center justify-between shrink-0 text-xs z-20 overflow-x-auto">
          <div className="flex items-center space-x-1 shrink-0">
            <button onClick={undoOverrides} disabled={overrideHistoryRef.current.length === 0} className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-35 text-slate-600 transition-colors cursor-pointer" title="Undo (Ctrl/Cmd + Z)">
              <Undo2 className="w-4 h-4" />
            </button>
            <button onClick={redoOverrides} disabled={overrideRedoRef.current.length === 0} className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-35 text-slate-600 transition-colors cursor-pointer" title="Redo (Ctrl/Cmd + Shift + Z)">
              <Redo2 className="w-4 h-4" />
            </button>
            <div className="h-4 w-px bg-slate-200 mx-0.5" />
            <button
              onClick={() => { setActiveTool('select'); showToast('Select tool active — click any section to select'); }}
              className={`p-1.5 rounded transition-colors cursor-pointer ${activeTool === 'select' ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-200' : 'hover:bg-slate-100 text-slate-600'}`}
              title="Select Tool — click any section"
            >
              <MousePointer2 className="w-4 h-4" />
            </button>
            <button onClick={() => handleAddShapeLayer('rect')} className="p-1.5 rounded hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer" title="Add Rectangle Shape">
              <Square className="w-4 h-4" />
            </button>
            <button onClick={() => handleAddShapeLayer('circle')} className="p-1.5 rounded hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer" title="Add Circle Shape">
              <Circle className="w-4 h-4" />
            </button>
            <button onClick={handleAddTextLayer} className="p-1.5 rounded hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer" title="Add Text Layer">
              <Type className="w-4 h-4" />
            </button>
            <button onClick={() => handleAddCtaButton('secondary')} className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition-colors cursor-pointer" title="Add Secondary CTA Button">
              + CTA
            </button>
            <button onClick={() => bgInputRef.current?.click()} className="p-1.5 rounded hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer" title="Upload Background Image">
              <ImageIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center space-x-1.5 shrink-0">
            {/* Font Family */}
            <div className="relative">
              <select
                value={currentFontFamily}
                onChange={e => updateSelectedElementStyle({ fontFamily: e.target.value })}
                className="appearance-none bg-slate-50 border border-slate-200 rounded px-2.5 py-1 pr-6 text-xs font-medium text-slate-800 cursor-pointer focus:outline-none focus:border-blue-500"
              >
                {['Inter', 'Plus Jakarta Sans', 'Space Grotesk', 'Outfit', 'Playfair Display'].map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2" />
            </div>

            {/* Font Weight */}
            <div className="relative">
              <select
                value={currentFontWeight}
                onChange={e => updateSelectedElementStyle({ fontWeight: e.target.value })}
                className="appearance-none bg-slate-50 border border-slate-200 rounded px-2.5 py-1 pr-6 text-xs font-medium text-slate-800 cursor-pointer focus:outline-none focus:border-blue-500"
              >
                {['Regular', 'Medium', 'SemiBold', 'Bold', 'ExtraBold'].map(w => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2" />
            </div>

            {/* Font Size */}
            <div className="relative">
              <select
                value={currentFontSize}
                onChange={e => updateSelectedElementStyle({ fontSize: parseInt(e.target.value, 10) })}
                className="appearance-none bg-slate-50 border border-slate-200 rounded px-2 py-1 pr-5 text-xs font-mono font-medium text-slate-800 cursor-pointer focus:outline-none focus:border-blue-500 w-16"
              >
                {[14, 16, 18, 20, 24, 28, 32, 40, 48, 56, 64, 72, 80].map(s => (
                  <option key={s} value={s}>{s}px</option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 pointer-events-none absolute right-1 top-1/2 -translate-y-1/2" />
            </div>

            <div className="h-4 w-px bg-slate-200" />

            {/* Text Alignment */}
            <div className="flex items-center space-x-0.5">
              <button
                onClick={() => updateSelectedElementStyle({ textAlign: 'left' })}
                className={`p-1 rounded transition-colors ${currentTextAlign === 'left' ? 'bg-blue-50 text-blue-600' : 'hover:bg-slate-100 text-slate-500'}`}
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => updateSelectedElementStyle({ textAlign: 'center' })}
                className={`p-1 rounded transition-colors ${currentTextAlign === 'center' ? 'bg-blue-50 text-blue-600' : 'hover:bg-slate-100 text-slate-500'}`}
              >
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => updateSelectedElementStyle({ textAlign: 'right' })}
                className={`p-1 rounded transition-colors ${currentTextAlign === 'right' ? 'bg-blue-50 text-blue-600' : 'hover:bg-slate-100 text-slate-500'}`}
              >
                <AlignRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center space-x-0.5" title="Vertical text alignment">
              {(['top', 'middle', 'bottom'] as const).map(value => (
                <button key={value} onClick={() => updateSelectedElementStyle({ verticalAlign: value })}
                  className={`px-1.5 py-1 text-[10px] font-bold rounded ${selectedElementStyle.verticalAlign === value || (!selectedElementStyle.verticalAlign && value === 'top') ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-100'}`}>
                  {value === 'top' ? '↑' : value === 'middle' ? '↕' : '↓'}
                </button>
              ))}
            </div>

            <div className="h-4 w-px bg-slate-200" />

            {/* Scale Controls */}
            <div className="flex items-center space-x-1 bg-slate-50 border border-slate-200 rounded px-1 py-0.5">
              <button onClick={() => scaleSelectedLayer(-0.1)} className="p-0.5 rounded hover:bg-slate-200 text-slate-500" title="Scale Down">
                <ZoomOut className="w-3 h-3" />
              </button>
              <span className="text-[11px] font-mono text-slate-700 w-9 text-center">{Math.round(currentScale * 100)}%</span>
              <button onClick={() => scaleSelectedLayer(0.1)} className="p-0.5 rounded hover:bg-slate-200 text-slate-500" title="Scale Up">
                <ZoomIn className="w-3 h-3" />
              </button>
            </div>

            <div className="h-4 w-px bg-slate-200" />

            {/* Opacity Control */}
            <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded px-2 py-0.5" title="Element Opacity">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Op</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={currentOpacity}
                onChange={e => updateSelectedElementStyle({ opacity: parseFloat(e.target.value) })}
                className="w-12 h-1 accent-blue-600 cursor-pointer"
              />
              <span className="text-[11px] font-mono text-slate-700 w-8">{Math.round(currentOpacity * 100)}%</span>
            </div>

            <div className="h-4 w-px bg-slate-200" />

            {/* Color Swatch */}
            <div className="flex items-center space-x-1.5 relative">
              <div
                onClick={() => setShowColorPanel(open => !open)}
                className="w-5 h-5 rounded border border-slate-300 cursor-pointer hover:scale-105 transition-transform"
                style={{ backgroundColor: currentColor }}
              >
                <input
                  ref={colorInputRef}
                  type="color"
                  value={currentColor.startsWith('#') ? currentColor : '#FFFFFF'}
                  onChange={e => updateSelectedElementStyle({ color: e.target.value })}
                  className="opacity-0 w-0 h-0 absolute pointer-events-none"
                />
              </div>
              <span className="text-[11px] font-mono text-slate-600 uppercase">{currentColor}</span>
              {showColorPanel && <FigmaColorPicker color={currentColor.startsWith('#') ? currentColor : '#FFFFFF'} opacity={currentOpacity} onChange={(color, opacity) => updateSelectedElementStyle({ color, opacity })} onClose={() => setShowColorPanel(false)} />}
            </div>

            {selectedElement && (
              <button
                onClick={() => handleDeleteLayer(selectedElement.id)}
                className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors ml-1 cursor-pointer"
                title="Delete selected element"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* MAIN BODY */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Tool Rail */}
          <aside className="w-16 border-r border-slate-200 bg-white flex flex-col items-center py-2 shrink-0 z-10">
            <div className="flex flex-col items-center space-y-1.5 w-full px-1.5">
              <button
                onClick={() => { setActiveTool('select'); showToast('Select tool active — click any section to select'); }}
                className={`w-full py-2 flex flex-col items-center justify-center rounded-lg transition-colors cursor-pointer ${
                  activeTool === 'select' ? 'bg-blue-50 text-blue-600 font-semibold ring-1 ring-blue-200 shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
                }`}
                title="Select Tool — click any section on canvas"
              >
                <MousePointer2 className="w-4 h-4 mb-1" />
                <span className="text-[10px]">Select</span>
              </button>

              <div className="w-full relative group">
                <button
                  onClick={() => handleAddShapeLayer('rect')}
                  className="w-full py-2 flex flex-col items-center justify-center rounded-lg transition-colors text-slate-600 hover:bg-slate-100 cursor-pointer"
                  title="Add Shapes (Rectangle / Circle)"
                >
                  <Square className="w-4 h-4 mb-1" />
                  <span className="text-[10px]">Shapes</span>
                </button>
                <div className="hidden group-hover:flex absolute left-full top-0 ml-1 bg-white rounded-lg shadow-xl border border-slate-200 p-1 flex-col space-y-0.5 z-50 whitespace-nowrap text-xs">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleAddShapeLayer('rect'); }}
                    className="flex items-center space-x-1.5 px-2.5 py-1.5 hover:bg-slate-50 text-slate-700 rounded text-left cursor-pointer"
                  >
                    <Square className="w-3.5 h-3.5 text-blue-600" />
                    <span>Rectangle</span>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleAddShapeLayer('circle'); }}
                    className="flex items-center space-x-1.5 px-2.5 py-1.5 hover:bg-slate-50 text-slate-700 rounded text-left cursor-pointer"
                  >
                    <Circle className="w-3.5 h-3.5 text-blue-600" />
                    <span>Circle</span>
                  </button>
                </div>
              </div>

              <button
                onClick={handleAddTextLayer}
                className="w-full py-2 flex flex-col items-center justify-center rounded-lg transition-colors text-slate-600 hover:bg-slate-100 cursor-pointer"
                title="Add Text Layer"
              >
                <Type className="w-4 h-4 mb-1" />
                <span className="text-[10px]">Text</span>
              </button>

              {/* Enhanced CTA Button menu */}
              <div className="w-full relative group">
                <button
                  onClick={() => handleAddCtaButton('secondary')}
                  className="w-full py-2 flex flex-col items-center justify-center rounded-lg transition-colors text-slate-600 hover:bg-slate-100 cursor-pointer"
                  title="Call to Action Buttons"
                >
                  <Plus className="w-4 h-4 mb-1 text-emerald-600" />
                  <span className="text-[10px]">CTA Btn</span>
                </button>
                <div className="hidden group-hover:flex absolute left-full top-0 ml-1 bg-white rounded-lg shadow-xl border border-slate-200 p-1 flex-col space-y-0.5 z-50 whitespace-nowrap text-xs">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleAddCtaButton('secondary'); }}
                    className="flex items-center space-x-1.5 px-2.5 py-1.5 hover:bg-slate-50 text-slate-700 rounded text-left cursor-pointer"
                  >
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                    <span>+ Secondary Button</span>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleAddCtaButton('tertiary'); }}
                    className="flex items-center space-x-1.5 px-2.5 py-1.5 hover:bg-slate-50 text-slate-700 rounded text-left cursor-pointer"
                  >
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    <span>+ Tertiary Button</span>
                  </button>
                </div>
              </div>

              <button
                onClick={() => bgInputRef.current?.click()}
                className="w-full py-2 flex flex-col items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Upload Background Image"
              >
                <ImageIcon className="w-4 h-4 mb-1" />
                <span className="text-[10px]">Image</span>
              </button>

              <button
                onClick={() => {
                  const first = allLayerDefs.find(l => !deletedLayerIds.has(l.id));
                  if (first) setSelectedLayerId(first.id);
                }}
                className="w-full py-2 flex flex-col items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Layers Panel"
              >
                <Layers className="w-4 h-4 mb-1" />
                <span className="text-[10px]">Layers</span>
              </button>
            </div>
          </aside>

          {/* Canvas Playground / Main Stage */}
          <main
            ref={containerRef}
            className="flex-1 relative flex flex-col bg-slate-50 overflow-auto"
            style={{
              backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
              backgroundSize: '24px 24px',
              backgroundColor: '#f8fafc',
            }}
          >
            {viewMode === 'all-formats' ? (
              <div className="flex-1 flex flex-col overflow-y-auto">
                {/* Playground Action Header */}
                <div className="h-11 border-b border-slate-200/90 bg-white/95 backdrop-blur-sm px-6 flex items-center justify-between sticky top-0 z-20 shrink-0">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <LayoutGrid className="w-4 h-4 text-blue-600" />
                      <h2 className="text-sm font-bold text-slate-900 tracking-tight">Campaign Playground</h2>
                    </div>
                    <span className="px-2.5 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200 flex items-center space-x-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      <span>{generatedPosters.length || 11} Formats Active</span>
                    </span>
                    <span className="text-xs text-slate-400 hidden sm:inline">• Click any banner card to edit in canvas</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleSave}
                      disabled={isSaving || isGeneratingAll}
                      className="px-3.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                      title="Upload and save all 11 banner formats to Cloudinary & Neon DB"
                    >
                      {isSaving ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin" />
                          <span>Saving to Cloud...</span>
                        </>
                      ) : (
                        <>
                          <Cloud className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Save All to Cloud</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleDownloadAllZip}
                      disabled={downloadingZip || generatedPosters.length === 0}
                      className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
                    >
                      {downloadingZip ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Packaging ZIP...</span>
                        </>
                      ) : (
                        <>
                          <FolderArchive className="w-3.5 h-3.5 text-sky-400" />
                          <span>Download All (ZIP)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Grid matching user template ratios */}
                <div className="p-6 flex-1">
                  {isGeneratingAll && generatedPosters.length === 0 ? (
                    <div className="h-96 flex flex-col items-center justify-center space-y-3">
                      <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs text-slate-500 font-medium">Generating deterministic layouts for all 11 formats...</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" style={{ zoom: playgroundZoom }}>
                      {generatedPosters.map((item) => (
                        <div
                          key={item.format.id}
                          className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col overflow-hidden group"
                        >
                          {/* Banner Preview Area */}
                          <div
                            onClick={() => {
                              setActiveFormat(item.format);
                              setViewMode('single');
                              showToast(`Switched to ${item.format.name} (${item.format.aspectRatioLabel})`);
                            }}
                            className="bg-slate-900/95 relative flex items-center justify-center p-4 cursor-pointer overflow-hidden"
                            style={{ minHeight: '220px', maxHeight: '320px' }}
                          >
                            <img
                              src={item.dataUrl}
                              alt={item.format.name}
                              className="max-h-64 max-w-full object-contain rounded shadow-md group-hover:scale-[1.02] transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-slate-900/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                              <span className="px-3 py-1.5 bg-white text-slate-900 font-bold text-xs rounded-lg shadow-md flex items-center space-x-1.5">
                                <MousePointer2 className="w-3.5 h-3.5 text-blue-600" />
                                <span>Edit Format</span>
                              </span>
                            </div>
                            <span className="absolute top-2.5 left-2.5 bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded border border-white/10 uppercase">
                              {item.format.aspectRatioLabel}
                            </span>
                          </div>

                          {/* Card Footer Info */}
                          <div className="p-3 border-t border-slate-100 flex items-center justify-between bg-white">
                            <div>
                              <h4 className="text-xs font-bold text-slate-900">{item.format.name}</h4>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {item.width} × {item.height} px
                              </span>
                            </div>
                            <button
                              onClick={() => handleDownloadSingle(item)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="Download PNG"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Single Canvas View */
              <>
                {/* Independent Canvas Indicator & Format Selector Pills */}
                <div className="h-10 border-b border-slate-200/90 bg-white/95 px-4 flex items-center justify-between sticky top-0 z-20 shrink-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-800">Aspect Ratio:</span>
                    <div className="flex items-center space-x-1 overflow-x-auto">
                      {ALL_GENERATE_FORMATS.map(fmt => (
                        <button
                          key={fmt.id}
                          onClick={() => setActiveFormat(fmt)}
                          className={`px-2 py-0.5 text-[11px] font-semibold rounded transition-colors cursor-pointer ${
                            activeFormat.id === fmt.id
                              ? 'bg-blue-600 text-white font-bold'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {fmt.aspectRatioLabel}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 text-[11px] text-slate-500">
                    <div className="flex items-center rounded border border-slate-200 bg-white">
                      <button
                        onClick={() => setPlaygroundZoom(current => Math.max(0.35, Math.round((current - 0.1) * 100) / 100))}
                        className="p-1 text-slate-500 hover:bg-slate-100"
                        title="Zoom out playground"
                      >
                        <ZoomOut className="w-3 h-3" />
                      </button>
                      <span className="w-10 text-center font-mono text-slate-600">{Math.round(playgroundZoom * 100)}%</span>
                      <button
                        onClick={() => setPlaygroundZoom(current => Math.min(2.5, Math.round((current + 0.1) * 100) / 100))}
                        className="p-1 text-slate-500 hover:bg-slate-100"
                        title="Zoom in playground"
                      >
                        <ZoomIn className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-700 font-mono border border-sky-200 font-bold">
                      {activeFormat.width} × {activeFormat.height} px
                    </span>
                    <span className="text-slate-400 hidden sm:inline">• Independent Canvas Mode</span>
                  </div>
                </div>

                <div className="flex-1 flex items-center justify-center p-8 overflow-auto" onMouseDown={event => {
                  if (event.target !== event.currentTarget) return;
                  setSelectedLayerId('');
                  setShowColorPanel(false);
                  fabricCanvasRef.current?.discardActiveObject();
                  fabricCanvasRef.current?.requestRenderAll();
                }}>
                  <div
                    className="relative bg-slate-900 shadow-2xl rounded-sm transition-all"
                    style={{ width: `${displayWidth}px`, height: `${displayHeight}px` }}
                  >
                    <canvas
                      ref={canvasElRef}
                      width={displayWidth}
                      height={displayHeight}
                      className="block pointer-events-none rounded-sm"
                    />

                    {/* Interactive drag & corner scaling overlay */}
                    {selectedElement && !isSelectedLayerLocked && (
                      <div
                        className="absolute pointer-events-auto border-2 border-sky-400 bg-sky-400/10 cursor-move group transition-all"
                        style={{
                          left: `${Math.round(selectedElement.x * previewScale)}px`,
                          top: `${Math.round(selectedElement.y * previewScale)}px`,
                          width: `${Math.round(selectedElement.width * previewScale)}px`,
                          height: `${Math.round(selectedElement.height * previewScale)}px`,
                          borderRadius: selectedElement.shapeType === 'circle' ? '50%' : selectedElement.type === 'cta-button' ? '9999px' : '2px',
                        }}
                        onMouseDown={e => handleStartDrag(selectedElement.id, e)}
                        title="Drag to reposition | Drag corners to resize"
                      >
                        <div onMouseDown={e => handleStartResize(selectedElement.id, 'nw', e)}
                          className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-sky-500 rounded-full cursor-nwse-resize shadow-md hover:scale-125 transition-transform"
                          title="Drag to scale (Top-Left)" />
                        <div onMouseDown={e => handleStartResize(selectedElement.id, 'ne', e)}
                          className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-sky-500 rounded-full cursor-nesw-resize shadow-md hover:scale-125 transition-transform"
                          title="Drag to scale (Top-Right)" />
                        <div onMouseDown={e => handleStartResize(selectedElement.id, 'se', e)}
                          className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-sky-500 rounded-full cursor-nwse-resize shadow-md hover:scale-125 transition-transform"
                          title="Drag to scale (Bottom-Right)" />
                        <div onMouseDown={e => handleStartResize(selectedElement.id, 'sw', e)}
                          className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-sky-500 rounded-full cursor-nesw-resize shadow-md hover:scale-125 transition-transform"
                          title="Drag to scale (Bottom-Left)" />
                        <div className="absolute -top-6 right-0 bg-slate-900 text-white text-[10px] font-mono px-1.5 py-0.5 rounded shadow pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          {Math.round(selectedElement.width)} × {Math.round(selectedElement.height)} ({Math.round(currentScale * 100)}%)
                        </div>
                      </div>
                    )}

                    {/* Elements are painted bottom-to-top; the same DOM order makes the
                        topmost hotspot receive pointer events first. Locked layers retain
                        their pixels but have no hit target, so clicks pass through. */}
                    {activeElements.map(el => {
                      if (el.id === selectedElement?.id) return null;
                      const isLocked = lockedLayerIds.has(el.id);
                      return (
                        <div
                          key={el.id}
                          onClick={() => { if (!isLocked) setSelectedLayerId(el.id); }}
                          onMouseDown={e => handleStartDrag(el.id, e)}
                          className={`absolute ${isLocked ? 'pointer-events-none' : 'pointer-events-auto hover:border hover:border-sky-300 hover:bg-sky-400/5 cursor-pointer'} transition-colors`}
                          style={{
                            left: `${Math.round(el.x * previewScale)}px`,
                            top: `${Math.round(el.y * previewScale)}px`,
                            width: `${Math.round(el.width * previewScale)}px`,
                            height: `${Math.round(el.height * previewScale)}px`,
                            borderRadius: el.shapeType === 'circle' ? '50%' : el.type === 'cta-button' ? '9999px' : '2px',
                          }}
                          title={`Click to select ${layerNames[el.id] || el.id}`}
                        />
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </main>

          {/* RIGHT DUAL PANELS */}
          <div className="flex border-l border-slate-200 bg-white shrink-0 z-20">
            {/* Dedicated Layers Panel with Drag-and-Drop & Move Up/Down */}
            <section className="w-60 border-r border-slate-200 flex flex-col bg-white">
              <div className="h-9 border-b border-slate-200 flex items-center px-3 justify-between text-xs">
                <span className="tracking-tight uppercase text-[11px] text-slate-500 font-semibold">Stacking Order</span>
                {deletedLayerIds.size > 0 && (
                  <button onClick={handleRestoreAllLayers} className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold flex items-center space-x-1 cursor-pointer">
                    <RotateCcw className="w-3 h-3" /><span>Restore ({deletedLayerIds.size})</span>
                  </button>
                )}
              </div>

              <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between relative">
                <span className="text-xs font-bold text-slate-900 tracking-tight">Layers</span>
                <div className="flex items-center space-x-1 text-slate-400">
                  <button onClick={() => setLayerSearch(layerSearch ? '' : ' ')} className="p-1 hover:text-slate-700 rounded cursor-pointer" title="Search layers">
                    <Search className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setShowAddLayerMenu(!showAddLayerMenu)} className="p-1 hover:text-slate-700 rounded cursor-pointer" title="Add Layer">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  {showAddLayerMenu && (
                    <div className="absolute right-3 top-9 w-52 bg-white rounded-lg shadow-xl border border-slate-200 py-1.5 z-50 text-xs animate-fade-in">
                      <div className="border-b border-slate-100 pb-1 mb-1 px-1 space-y-0.5">
                        <button onClick={() => { handleAddTextLayer(); setShowAddLayerMenu(false); }} className="w-full text-left px-2.5 py-1.5 hover:bg-blue-50 text-blue-700 font-medium rounded flex items-center space-x-2">
                          <Type className="w-3.5 h-3.5" /><span>+ Add Text Layer</span>
                        </button>
                        <button onClick={() => { handleAddShapeLayer('rect'); setShowAddLayerMenu(false); }} className="w-full text-left px-2.5 py-1.5 hover:bg-blue-50 text-blue-700 font-medium rounded flex items-center space-x-2">
                          <Square className="w-3.5 h-3.5" /><span>+ Add Rectangle</span>
                        </button>
                        <button onClick={() => { handleAddShapeLayer('circle'); setShowAddLayerMenu(false); }} className="w-full text-left px-2.5 py-1.5 hover:bg-blue-50 text-blue-700 font-medium rounded flex items-center space-x-2">
                          <Circle className="w-3.5 h-3.5" /><span>+ Add Circle</span>
                        </button>
                        <button onClick={() => { handleAddCtaButton('primary'); setShowAddLayerMenu(false); }} className="w-full text-left px-2.5 py-1.5 hover:bg-blue-50 text-blue-700 font-medium rounded flex items-center space-x-2">
                          <Plus className="w-3.5 h-3.5" /><span>+ Primary CTA Button</span>
                        </button>
                        <button onClick={() => { handleAddCtaButton('secondary'); setShowAddLayerMenu(false); }} className="w-full text-left px-2.5 py-1.5 hover:bg-blue-50 text-blue-700 font-medium rounded flex items-center space-x-2">
                          <Plus className="w-3.5 h-3.5" /><span>+ Secondary CTA Button</span>
                        </button>
                        <button onClick={() => { handleAddCtaButton('tertiary'); setShowAddLayerMenu(false); }} className="w-full text-left px-2.5 py-1.5 hover:bg-blue-50 text-blue-700 font-medium rounded flex items-center space-x-2">
                          <Plus className="w-3.5 h-3.5" /><span>+ Tertiary CTA Button</span>
                        </button>
                      </div>
                      <span className="px-3 py-1 text-[10px] font-bold text-slate-400 block uppercase">Existing Layers</span>
                      {allLayerDefs.map(l => (
                        <button key={l.id} onClick={() => handleRestoreLayer(l.id)} className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center justify-between text-slate-700">
                          <span className="truncate">{l.label}</span>
                          {deletedLayerIds.has(l.id) ? <span className="text-[10px] text-emerald-600 font-semibold shrink-0 ml-1">+ Restore</span> : <Check className="w-3 h-3 text-slate-400 shrink-0 ml-1" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Layers List with Drag-and-Drop and Reordering */}
              <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5 text-xs text-slate-700">
                {filteredLayers.map((layer, idx) => {
                  const isSelected = selectedLayerId === layer.id;
                  const isHidden = hiddenLayers.has(layer.id);
                  const isLocked = lockedLayerIds.has(layer.id);
                  const isEditingName = editingLayerNameId === layer.id;

                  return (
                    <div
                      key={layer.id}
                      draggable={!isLocked}
                      onDragStart={e => handleLayerDragStart(e, layer.id)}
                      onDragOver={handleLayerDragOver}
                      onDrop={e => handleLayerDrop(e, layer.id)}
                      onClick={() => { if (!isLocked) setSelectedLayerId(layer.id); }}
                      className={`group flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
                        isLocked ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : isSelected ? 'bg-blue-50 text-blue-700 font-semibold ring-1 ring-blue-200' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center space-x-1.5 truncate flex-1 min-w-0 mr-1">
                        <Move className={`w-3 h-3 shrink-0 ${isLocked ? 'text-slate-200' : 'text-slate-300 opacity-0 group-hover:opacity-100 cursor-grab'}`} />
                        {layer.type === 'background' ? (
                          <Square className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                        ) : layer.type === 'logo' ? (
                          <ImageIcon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                        ) : layer.type === 'cta-button' ? (
                          <span className="w-3 h-3 rounded-full bg-rose-500 shrink-0" />
                        ) : layer.type === 'shape' ? (
                          (layer as any).shapeType === 'circle' ? (
                            <Circle className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                          ) : (
                            <Square className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                          )
                        ) : (
                          <Type className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                        )}

                        {/* Inline Layer Renaming */}
                        {isEditingName ? (
                          <input
                            type="text"
                            autoFocus
                            defaultValue={layer.label}
                            onBlur={e => {
                              if (e.target.value.trim()) {
                                setLayerNames(prev => ({ ...prev, [layer.id]: e.target.value.trim() }));
                              }
                              setEditingLayerNameId(null);
                            }}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                if ((e.target as HTMLInputElement).value.trim()) {
                                  setLayerNames(prev => ({ ...prev, [layer.id]: (e.target as HTMLInputElement).value.trim() }));
                                }
                                setEditingLayerNameId(null);
                              } else if (e.key === 'Escape') {
                                setEditingLayerNameId(null);
                              }
                            }}
                            className="bg-white border border-blue-400 rounded px-1 text-xs w-full text-slate-900 focus:outline-none"
                            onClick={e => e.stopPropagation()}
                          />
                        ) : (
                          <span
                            className="truncate"
                            onDoubleClick={e => { e.stopPropagation(); setEditingLayerNameId(layer.id); }}
                            title="Double-click to rename"
                          >
                            {layer.label}
                          </span>
                        )}
                      </div>

                      {/* Layer Actions: Reorder, Rename, Hide, Delete */}
                      <div className="flex items-center space-x-0.5 shrink-0">
                        {/* Move Up / Down Buttons */}
                        <button
                          onClick={e => { e.stopPropagation(); handleMoveLayer(layer.id, 'up'); }}
                          className="p-0.5 text-slate-400 hover:text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity rounded"
                          title="Bring Forward (Up)"
                          disabled={idx === 0 || isLocked}
                        >
                          <ChevronUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); handleMoveLayer(layer.id, 'down'); }}
                          className="p-0.5 text-slate-400 hover:text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity rounded"
                          title="Send Backward (Down)"
                          disabled={idx === filteredLayers.length - 1 || isLocked}
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); setEditingLayerNameId(layer.id); }}
                          className="p-0.5 text-slate-400 hover:text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity rounded"
                          title="Rename layer"
                          disabled={isLocked}
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={e => toggleLayerLock(layer.id, e)}
                          className={`p-0.5 rounded transition-opacity ${isLocked ? 'text-amber-600 opacity-100' : 'text-slate-400 opacity-0 group-hover:opacity-100 hover:text-slate-700'}`}
                          title={isLocked ? 'Unlock layer' : 'Lock layer'}
                        >
                          {isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                        </button>
                        <button
                          onClick={e => toggleLayerVisibility(layer.id, e)}
                          className={`p-0.5 rounded transition-opacity ${isHidden ? 'text-slate-400 opacity-100' : 'text-slate-400 opacity-0 group-hover:opacity-100 hover:text-slate-700'}`}
                          title={isHidden ? 'Show layer' : 'Hide layer'}
                        >
                          {isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                        <button
                          onClick={e => handleDeleteLayer(layer.id, e)}
                          className="p-0.5 rounded text-slate-400 opacity-0 group-hover:opacity-100 hover:text-red-600 transition-opacity"
                          title="Delete layer"
                          disabled={isLocked}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Properties Panel with Real-Time Editing, Opacity, Gradients, and CTA Controls */}
            <section className="w-80 flex flex-col bg-white overflow-y-auto text-xs text-slate-700 divide-y divide-slate-100">
              {/* Active Selection Banner */}
              <div className="p-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center space-x-1.5 min-w-0">
                  <MousePointer2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="text-[10px] uppercase font-bold text-slate-400">Selected:</span>
                  <span className="text-xs font-bold text-slate-800 truncate">
                    {layerNames[selectedLayerId] || allLayerDefs.find(l => l.id === selectedLayerId)?.label || (selectedElement ? selectedElement.type : 'None')}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  {selectedElement && selectedElement.id.startsWith('custom-') && !isSelectedLayerLocked && (
                    <button
                      onClick={() => handleDuplicateLayer(selectedElement.id)}
                      className="text-slate-400 hover:text-blue-600 p-1 rounded hover:bg-blue-50 transition-colors"
                      title="Duplicate layer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {selectedElement && !isSelectedLayerLocked && (
                    <button
                      onClick={() => handleDeleteLayer(selectedElement.id)}
                      className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
                      title="Delete selected layer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {isSelectedLayerLocked && (
                <div className="px-3 py-2 bg-amber-50 border-b border-amber-100 text-[11px] text-amber-800 flex items-center space-x-1.5">
                  <Lock className="w-3.5 h-3.5 shrink-0" />
                  <span>This layer is locked. Unlock it in the Layers panel to edit or transform it.</span>
                </div>
              )}

              {/* REAL-TIME LIVE TEXT EDITOR (Syncs directly with canvas on typing) */}
              {(isTextElement || isCtaElement) && (
                <div className="p-3 bg-blue-50/40 border-b border-blue-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-blue-900 flex items-center space-x-1.5">
                      <Type className="w-3.5 h-3.5 text-blue-600" />
                      <span>Live Text Content (Real-Time)</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {getSelectedText().length} {CHAR_LIMITS[selectedLayerId] ? `/${CHAR_LIMITS[selectedLayerId]}` : ''}
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    value={getSelectedText()}
                    onChange={e => handleSelectedTextChange(e.target.value)}
                    disabled={isSelectedLayerLocked}
                    className="w-full bg-white border border-blue-200 rounded px-2.5 py-1.5 text-slate-800 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors resize-none leading-relaxed disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                    placeholder="Type to update canvas in real time..."
                  />
                  <span className="text-[10px] text-slate-400 block italic">Updates canvas instantly as you type</span>
                </div>
              )}

              {/* ENHANCED CTA BUTTON MANAGEMENT */}
              {isCtaElement && (
                <div className="p-3 bg-rose-50/30 border-b border-rose-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-rose-900 flex items-center space-x-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-600" />
                      <span>CTA Button Configuration</span>
                    </span>
                    <span className="text-[10px] font-semibold text-rose-700 uppercase bg-rose-100 px-1.5 py-0.5 rounded">
                      {selectedElement?.ctaType || 'Primary'}
                    </span>
                  </div>

                  {/* Border Width & Radius */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-500 block mb-1">Border Width</span>
                      <select
                        value={selectedElementStyle.borderWidth ?? (selectedElement?.borderWidth || 0)}
                        onChange={e => updateSelectedElementStyle({ borderWidth: parseInt(e.target.value, 10) })}
                        className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs"
                      >
                        <option value={0}>None (0px)</option>
                        <option value={1}>1px</option>
                        <option value={2}>2px</option>
                        <option value={3}>3px</option>
                        <option value={4}>4px</option>
                      </select>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block mb-1">Corner Style</span>
                      <select
                        value={selectedElementStyle.borderRadius !== undefined ? selectedElementStyle.borderRadius : (selectedElement?.borderRadius || 24)}
                        onChange={e => updateSelectedElementStyle({ borderRadius: parseInt(e.target.value, 10) })}
                        className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs"
                      >
                        <option value={24}>Pill (Rounded)</option>
                        <option value={8}>Soft (8px)</option>
                        <option value={4}>Subtle (4px)</option>
                        <option value={0}>Sharp (0px)</option>
                      </select>
                    </div>
                  </div>

                  {/* Quick Border Color Picker */}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-600">Border Color</span>
                    <div className="flex items-center space-x-1.5">
                      <input
                        type="color"
                        value={selectedElementStyle.borderColor || selectedElement?.borderColor || '#FFFFFF'}
                        onChange={e => updateSelectedElementStyle({ borderColor: e.target.value })}
                        className="w-5 h-5 rounded border border-slate-300 cursor-pointer"
                      />
                      <span className="text-[11px] font-mono text-slate-600">
                        {selectedElementStyle.borderColor || selectedElement?.borderColor || '#FFFFFF'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-600">Button Label Color</span>
                    <div className="flex items-center space-x-1.5">
                      <input
                        type="color"
                        value={currentColor.startsWith('#') ? currentColor : '#FFFFFF'}
                        onChange={e => updateSelectedElementStyle({ color: e.target.value })}
                        className="w-5 h-5 rounded border border-slate-300 cursor-pointer"
                      />
                      <span className="text-[11px] font-mono text-slate-600">{currentColor}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* OPACITY & COLOR / GRADIENT FILL SECTION */}
              <div className="p-3 space-y-3">
                <span className="text-[11px] font-bold text-slate-800 flex items-center space-x-1.5">
                  <Palette className="w-3.5 h-3.5 text-blue-600" />
                  <span>Opacity & Fill Controls</span>
                </span>

                {/* Opacity Slider */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-slate-500">Element Opacity</span>
                    <span className="text-[11px] font-mono font-bold text-slate-700">{Math.round(currentOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={currentOpacity}
                    onChange={e => updateSelectedElementStyle({ opacity: parseFloat(e.target.value) })}
                    className="w-full h-1.5 accent-blue-600 cursor-pointer"
                  />
                </div>

                {/* Fill Mode Switch: Solid vs Gradient */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] text-slate-500">Fill Mode</span>
                    <div className="flex items-center bg-slate-100 p-0.5 rounded border border-slate-200">
                      <button
                        onClick={() => { setFillMode('solid'); updateSelectedElementStyle({ gradient: undefined }); }}
                        className={`px-2 py-0.5 text-[10px] font-bold rounded ${fillMode === 'solid' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500'}`}
                      >
                        Solid
                      </button>
                      <button
                        onClick={() => {
                          setFillMode('gradient');
                          updateSelectedElementStyle({
                            gradient: currentGradient || GRADIENT_PRESETS[0],
                          });
                        }}
                        className={`px-2 py-0.5 text-[10px] font-bold rounded ${fillMode === 'gradient' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500'}`}
                      >
                        Gradient
                      </button>
                    </div>
                  </div>

                  {fillMode === 'solid' ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-600">Color</span>
                        <div className="flex items-center space-x-1.5">
                          <input
                            type="color"
                            value={currentFill.startsWith('#') ? currentFill : '#3B82F6'}
                            onChange={e => updateSelectedElementStyle({ fill: e.target.value })}
                            className="w-5 h-5 rounded border border-slate-300 cursor-pointer"
                          />
                          <span className="text-[11px] font-mono text-slate-700">{currentFill}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-7 gap-1 pt-1">
                        {PRESET_COLORS.map(c => (
                          <div
                            key={c}
                            onClick={() => updateSelectedElementStyle({ fill: c })}
                            className="w-6 h-6 rounded border border-slate-200 cursor-pointer hover:scale-110 transition-transform shadow-2xs"
                            style={{ backgroundColor: c }}
                            title={c}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* Gradient Controls */
                    <div className="space-y-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Gradient Type</span>
                        <select
                          value={currentGradient?.type || 'linear'}
                          onChange={e => updateSelectedElementStyle({
                            gradient: {
                              type: e.target.value as 'linear' | 'radial',
                              stops: currentGradient?.stops || GRADIENT_PRESETS[0].stops,
                            }
                          })}
                          className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[11px]"
                        >
                          <option value="linear">Linear</option>
                          <option value="radial">Radial</option>
                        </select>
                      </div>

                      {/* Color Stops */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center space-x-1.5">
                          <input
                            ref={gradientColor1Ref}
                            type="color"
                            value={currentGradient?.stops?.[0]?.color || '#FF512F'}
                            onChange={e => {
                              const newColor = e.target.value;
                              const stops = currentGradient?.stops ? [...currentGradient.stops] : [{ offset: 0, color: '#FF512F' }, { offset: 1, color: '#DD2476' }];
                              stops[0] = { ...stops[0], color: newColor };
                              updateSelectedElementStyle({ gradient: { type: currentGradient?.type || 'linear', stops } });
                            }}
                            className="w-5 h-5 rounded border border-slate-300 cursor-pointer"
                          />
                          <span className="text-[10px] font-mono text-slate-600">Start</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <input
                            ref={gradientColor2Ref}
                            type="color"
                            value={currentGradient?.stops?.[1]?.color || '#DD2476'}
                            onChange={e => {
                              const newColor = e.target.value;
                              const stops = currentGradient?.stops ? [...currentGradient.stops] : [{ offset: 0, color: '#FF512F' }, { offset: 1, color: '#DD2476' }];
                              stops[1] = { ...stops[1], color: newColor };
                              updateSelectedElementStyle({ gradient: { type: currentGradient?.type || 'linear', stops } });
                            }}
                            className="w-5 h-5 rounded border border-slate-300 cursor-pointer"
                          />
                          <span className="text-[10px] font-mono text-slate-600">End</span>
                        </div>
                      </div>

                      {/* Presets */}
                      <div className="pt-1">
                        <span className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">Presets</span>
                        <div className="grid grid-cols-3 gap-1">
                          {GRADIENT_PRESETS.map(p => (
                            <button
                              key={p.name}
                              onClick={() => updateSelectedElementStyle({ gradient: p })}
                              className="h-6 rounded border border-slate-200 text-[9px] text-white font-semibold truncate px-1 shadow-2xs hover:scale-102 transition-transform"
                              style={{ background: `linear-gradient(90deg, ${p.stops[0].color}, ${p.stops[1].color})` }}
                              title={p.name}
                            >
                              {p.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Campaign Content Section */}
              <div>
                <button
                  onClick={() => setCampaignContentOpen(!campaignContentOpen)}
                  className="w-full p-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center space-x-1.5">
                    <Check className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-[11px] font-bold text-slate-800">Campaign Content</span>
                  </div>
                  {campaignContentOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                </button>
                {campaignContentOpen && (
                  <div className="px-3 pb-3 space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-semibold text-slate-500">Small intro text</label>
                        <span className="text-[10px] font-mono text-slate-400">{content.introText.length}/{CHAR_LIMITS['element-intro']}</span>
                      </div>
                      <input
                        type="text"
                        value={content.introText}
                        onChange={e => updateContent({ introText: e.target.value.slice(0, CHAR_LIMITS['element-intro']) })}
                        className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-semibold text-slate-500">Main heading</label>
                        <span className="text-[10px] font-mono text-slate-400">{content.mainHeading.length}/{CHAR_LIMITS['element-heading']}</span>
                      </div>
                      <input
                        type="text"
                        value={content.mainHeading}
                        onChange={e => updateContent({ mainHeading: e.target.value.slice(0, CHAR_LIMITS['element-heading']) })}
                        className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none transition-colors font-medium"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-semibold text-slate-500">Supporting paragraph</label>
                        <span className="text-[10px] font-mono text-slate-400">{content.supportingParagraph.length}/{CHAR_LIMITS['element-paragraph']}</span>
                      </div>
                      <textarea
                        rows={3}
                        value={content.supportingParagraph}
                        onChange={e => updateContent({ supportingParagraph: e.target.value.slice(0, CHAR_LIMITS['element-paragraph']) })}
                        className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none transition-colors resize-none leading-relaxed"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-semibold text-slate-500 block mb-1">Date</label>
                        <input
                          type="text"
                          value={content.dateText}
                          onChange={e => updateContent({ dateText: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-slate-500 block mb-1">Location</label>
                        <input
                          type="text"
                          value={content.locationText}
                          onChange={e => updateContent({ locationText: e.target.value.slice(0, CHAR_LIMITS['element-footer']) })}
                          className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none text-xs"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 block mb-1">Primary CTA Button</label>
                      <input
                        type="text"
                        value={content.ctaText}
                        onChange={e => updateContent({ ctaText: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Brand Logo Section */}
              <div>
                <button
                  onClick={() => setLogoSectionOpen(!logoSectionOpen)}
                  className="w-full p-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center space-x-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-[11px] font-bold text-slate-800">Brand Logo</span>
                  </div>
                  {logoSectionOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                </button>
                {logoSectionOpen && (
                  <div className="px-3 pb-3 space-y-3">
                    <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-900 group flex items-center justify-center p-3" style={{ minHeight: '80px' }}>
                      {assets.logoUrl ? (
                        <img src={assets.logoUrl} alt="Logo" className="max-h-20 max-w-full object-contain" />
                      ) : (
                        <span className="text-slate-500 text-xs">No Logo Active</span>
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                        <button onClick={() => logoInputRef.current?.click()} className="px-2.5 py-1 text-xs font-semibold bg-white text-slate-800 rounded-md cursor-pointer">Change Logo</button>
                        {assets.logoUrl && <button onClick={handleUnselectPresetLogo} className="p-1 bg-red-600 text-white rounded-md cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>}
                      </div>
                    </div>
                    <button
                      onClick={() => logoInputRef.current?.click()}
                      className="w-full py-2 px-3 border border-dashed border-blue-400 bg-blue-50/50 hover:bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 transition-colors cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-blue-600" />
                      <span>Upload New Logo</span>
                    </button>
                    <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Preset Logos</span>
                        {selectedPresetLogo && <button onClick={handleUnselectPresetLogo} className="text-[10px] text-red-600 hover:text-red-700 font-semibold flex items-center space-x-1 cursor-pointer"><X className="w-3 h-3" /><span>Unselect</span></button>}
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button onClick={() => handleSelectPresetLogo('vertex', SAMPLE_LOGO_URL, 'Vertex Vector')} className={`h-9 rounded border px-2 py-1 text-left transition-all flex items-center justify-between ${selectedPresetLogo === 'vertex' ? 'border-blue-600 bg-blue-50/80 font-bold text-blue-800 ring-1 ring-blue-500' : 'border-slate-200 text-slate-700 bg-slate-50'}`}>
                          <span className="text-[11px] truncate">Vertex Vector</span>{selectedPresetLogo === 'vertex' && <Check className="w-3 h-3 text-blue-600" />}
                        </button>
                        <button onClick={() => handleSelectPresetLogo('formatly', `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 50" width="200" height="50"><rect width="200" height="50" rx="8" fill="%230F172A"/><text x="40" y="32" font-family="system-ui" font-weight="800" font-size="20" fill="%23FFFFFF">FORMATLY</text></svg>`, 'Formatly Badge')} className={`h-9 rounded border px-2 py-1 text-left transition-all flex items-center justify-between ${selectedPresetLogo === 'formatly' ? 'border-blue-600 bg-blue-50/80 font-bold text-blue-800 ring-1 ring-blue-500' : 'border-slate-200 text-slate-700 bg-slate-50'}`}>
                          <span className="text-[11px] truncate">Formatly Badge</span>{selectedPresetLogo === 'formatly' && <Check className="w-3 h-3 text-blue-600" />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Background Image Section */}
              <div>
                <button
                  onClick={() => setBgUploadSectionOpen(!bgUploadSectionOpen)}
                  className="w-full p-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center space-x-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-[11px] font-bold text-slate-800">Background Image</span>
                  </div>
                  {bgUploadSectionOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                </button>
                {bgUploadSectionOpen && (
                  <div className="px-3 pb-3 space-y-3">
                    <div className="relative rounded-lg overflow-hidden border border-slate-200 h-28 bg-slate-900 group">
                      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${assets.backgroundImages[0]?.url || SAMPLE_BACKGROUND_1})` }} />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                        <button onClick={() => bgInputRef.current?.click()} className="px-2.5 py-1 text-xs font-semibold bg-white text-slate-800 rounded-md cursor-pointer">Change</button>
                        <button onClick={() => handleDeleteLayer('element-background')} className="p-1 bg-red-600 text-white rounded-md cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                    <button
                      onClick={() => bgInputRef.current?.click()}
                      className="w-full py-2 px-3 border border-dashed border-blue-400 bg-blue-50/50 hover:bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 transition-colors cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-blue-600" />
                      <span>Upload New Background</span>
                    </button>
                    <input ref={bgInputRef} type="file" accept="image/*" onChange={handleBgUpload} className="hidden" />
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Preset Backgrounds</span>
                        {selectedPresetBg && <button onClick={handleUnselectPresetBg} className="text-[10px] text-red-600 hover:text-red-700 font-semibold flex items-center space-x-1 cursor-pointer"><X className="w-3 h-3" /><span>Unselect</span></button>}
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { key: 'cyber', url: SAMPLE_BACKGROUND_1, label: 'Cyber' },
                          { key: 'amber', url: SAMPLE_BACKGROUND_2, label: 'Amber' },
                          { key: 'purple', url: SAMPLE_BACKGROUND_3, label: 'Purple' }
                        ].map(p => (
                          <button
                            key={p.key}
                            onClick={() => handleSelectPresetBg(p.key, p.url, p.label + ' Mesh')}
                            className={`h-11 rounded border transition-all bg-slate-900 relative overflow-hidden text-[9px] text-white flex items-end p-1.5 font-medium ${selectedPresetBg === p.key ? 'ring-2 ring-blue-500 border-white' : 'border-slate-200 hover:border-blue-400'}`}
                          >
                            <div className="absolute inset-0 bg-cover bg-center opacity-80" style={{ backgroundImage: `url(${p.url})` }} />
                            <span className="relative z-10 text-[9px] font-semibold flex items-center justify-between w-full">
                              <span>{p.label}</span>
                              {selectedPresetBg === p.key && <Check className="w-2.5 h-2.5 text-sky-400" />}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>

        {/* Global Toast Message */}
        {toastMessage && (
          <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-xl flex items-center space-x-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        <PosterGalleryModal
          isOpen={showGalleryModal}
          onClose={() => setShowGalleryModal(false)}
          campaignName={projectName}
          posters={generatedPosters}
          content={content}
          assets={assets}
          template={currentTemplate}
          onSaveChanges={(newContent, newAssets) => {
            setContent(newContent);
            setAssets(newAssets);
            showToast('Updated across all formats');
          }}
        />

        <FullscreenPreview
          posters={generatedPosters}
          activeIndex={previewPosterIndex}
          onActiveIndexChange={setPreviewPosterIndex}
          onClose={() => setPreviewPosterIndex(null)}
        />
      </div>
    </>
  );
};
