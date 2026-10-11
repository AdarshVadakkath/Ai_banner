# This script writes CampaignEditorPage.tsx
code = r"""import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import { DEFAULT_POSTER_FORMATS } from '../constants/formats';
import {
  SAMPLE_LOGO_URL,
  SAMPLE_BACKGROUND_1,
  SAMPLE_BACKGROUND_2,
  SAMPLE_BACKGROUND_3,
} from '../constants/sampleData';
import { LayoutEngine } from '../utils/LayoutEngine';
import { FabricPosterRenderer } from '../utils/FabricPosterRenderer';
import { ApiService } from '../services/apiService';
import { PosterGalleryModal, GeneratedPosterItem } from '../components/poster/PosterGalleryModal';
import {
  Layers, Link2, Download, MoreHorizontal, MousePointer2, Square, Circle, Triangle,
  Type, Image as ImageIcon, ChevronDown, ChevronRight, Eye, EyeOff, Trash2, RotateCcw,
  Search, Plus, Minus, AlignLeft, AlignCenter, AlignRight, Check, CheckCircle2,
  Sparkles, Upload, X, ZoomIn, ZoomOut,
} from 'lucide-react';

const CHAR_LIMITS: Record<string, number> = {
  'element-intro': 60,
  'element-heading': 120,
  'element-paragraph': 280,
  'element-footer': 80,
};

interface CampaignEditorPageProps {
  initialProjectId?: string;
  onBackToDashboard: () => void;
}

interface CustomElementStyle {
  fontFamily?: string;
  fontWeight?: string;
  fontSize?: number;
  lineHeight?: number;
  letterSpacing?: number;
  textAlign?: 'left' | 'center' | 'right';
  color?: string;
  x?: number;
  y?: number;
  scale?: number;
}

// Campaign Setup Modal
interface SetupModalProps {
  onConfirm: (data: {
    name: string;
    logoUrl?: string;
    backgroundUrl?: string;
    introText: string;
    mainHeading: string;
    supportingParagraph: string;
    dateText: string;
    locationText: string;
  }) => void;
}

const FORMATLY_LOGO_SVG = data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 50" width="200" height="50"><rect width="200" height="50" rx="8" fill="%230F172A"/><text x="40" y="32" font-family="system-ui" font-weight="800" font-size="20" fill="%23FFFFFF">FORMATLY</text></svg>;

const CampaignSetupModal: React.FC<SetupModalProps> = ({ onConfirm }) => {
  const [name, setName] = React.useState('New Campaign');
  const [introText, setIntroText] = React.useState('Special Announcement');
  const [mainHeading, setMainHeading] = React.useState('Designing the Next Generation of Creative Workflows');
  const [supportingParagraph, setSupportingParagraph] = React.useState(
    'Experience seamless multi-format production with automated layout rules and instant high-resolution exports.'
  );
  const [dateText, setDateText] = React.useState('November 18, 2026');
  const [locationText, setLocationText] = React.useState('Global Broadcast & In-Person');
  const [logoPreview, setLogoPreview] = React.useState<string | undefined>(SAMPLE_LOGO_URL);
  const [bgPreview, setBgPreview] = React.useState<string | undefined>(SAMPLE_BACKGROUND_1);
  const [selectedPresetBg, setSelectedPresetBg] = React.useState<string | null>('cyber');
  const [selectedPresetLogo, setSelectedPresetLogo] = React.useState<string | null>('vertex');
  const logoInputRef = React.useRef<HTMLInputElement>(null);
  const bgInputRef = React.useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setLogoPreview(reader.result as string); setSelectedPresetLogo(null); };
    reader.readAsDataURL(file);
  };

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setBgPreview(reader.result as string); setSelectedPresetBg(null); };
    reader.readAsDataURL(file);
  };

  const presets = [
    { key: 'cyber', url: SAMPLE_BACKGROUND_1, label: 'Cyber' },
    { key: 'amber', url: SAMPLE_BACKGROUND_2, label: 'Amber' },
    { key: 'purple', url: SAMPLE_BACKGROUND_3, label: 'Purple' },
  ];
  const logoPresets = [
    { key: 'vertex', url: SAMPLE_LOGO_URL, label: 'Vertex' },
    { key: 'formatly', url: FORMATLY_LOGO_SVG, label: 'Formatly' },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden flex flex-col" style={{ maxHeight: '90vh' }}>
        <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-900 to-slate-800 flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white font-['Space_Grotesk']">Create New Campaign</h2>
            <p className="text-xs text-slate-400 mt-0.5">Set up assets & content, then generate all formats</p>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1.5 uppercase tracking-wide">Campaign Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
              placeholder="My Awesome Campaign" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1.5 uppercase tracking-wide">Brand Logo</label>
              <div className="relative h-24 rounded-xl bg-slate-900 border border-slate-200 overflow-hidden group flex items-center justify-center p-3 mb-2">
                {logoPreview ? <img src={logoPreview} alt="Logo" className="max-h-full max-w-full object-contain" /> : <span className="text-slate-500 text-xs">No Logo</span>}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button onClick={() => logoInputRef.current?.click()} className="px-2.5 py-1 text-xs font-semibold bg-white text-slate-800 rounded-lg">Change</button>
                </div>
              </div>
              <button onClick={() => logoInputRef.current?.click()} className="w-full py-2 border border-dashed border-blue-400 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition-colors">
                <Upload className="w-3.5 h-3.5" /><span>Upload Logo</span>
              </button>
              <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              <div className="mt-2 grid grid-cols-2 gap-1">
                {logoPresets.map(p => (
                  <button key={p.key} onClick={() => { if (selectedPresetLogo === p.key) { setSelectedPresetLogo(null); setLogoPreview(undefined); } else { setSelectedPresetLogo(p.key); setLogoPreview(p.url); } }}
                    className={h-8 rounded-lg border text-[11px] font-semibold transition-all }>
                    {p.label}{selectedPresetLogo === p.key ? ' ✓' : ''}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1.5 uppercase tracking-wide">Background Image</label>
              <div className="relative h-24 rounded-xl bg-slate-900 border border-slate-200 overflow-hidden group mb-2">
                {bgPreview && <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: url() }} />}
                {!bgPreview && <div className="h-full flex items-center justify-center"><span className="text-slate-500 text-xs">No Background</span></div>}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button onClick={() => bgInputRef.current?.click()} className="px-2.5 py-1 text-xs font-semibold bg-white text-slate-800 rounded-lg">Change</button>
                </div>
              </div>
              <button onClick={() => bgInputRef.current?.click()} className="w-full py-2 border border-dashed border-blue-400 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition-colors">
                <Upload className="w-3.5 h-3.5" /><span>Upload Background</span>
              </button>
              <input ref={bgInputRef} type="file" accept="image/*" onChange={handleBgUpload} className="hidden" />
              <div className="mt-2 grid grid-cols-3 gap-1">
                {presets.map(p => (
                  <button key={p.key} onClick={() => { if (selectedPresetBg === p.key) { setSelectedPresetBg(null); setBgPreview(undefined); } else { setSelectedPresetBg(p.key); setBgPreview(p.url); } }}
                    className={h-8 rounded-lg border relative overflow-hidden text-[10px] font-bold text-white transition-all }
                    style={{ backgroundImage: url(), backgroundSize: 'cover', backgroundPosition: 'center' }}>
                    <span className="relative z-10 drop-shadow">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-600 block uppercase tracking-wide">Campaign Content</label>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-slate-500">Intro text</span>
                <span className={	ext-[10px] font-mono }>{introText.length}/{CHAR_LIMITS['element-intro']}</span>
              </div>
              <input type="text" value={introText} onChange={e => setIntroText(e.target.value.slice(0, CHAR_LIMITS['element-intro']))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 transition-colors" placeholder="Special Announcement" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-slate-500">Main heading</span>
                <span className={	ext-[10px] font-mono }>{mainHeading.length}/{CHAR_LIMITS['element-heading']}</span>
              </div>
              <input type="text" value={mainHeading} onChange={e => setMainHeading(e.target.value.slice(0, CHAR_LIMITS['element-heading']))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 transition-colors font-medium" placeholder="Your main headline..." />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-slate-500">Supporting paragraph</span>
                <span className={	ext-[10px] font-mono }>{supportingParagraph.length}/{CHAR_LIMITS['element-paragraph']}</span>
              </div>
              <textarea rows={3} value={supportingParagraph} onChange={e => setSupportingParagraph(e.target.value.slice(0, CHAR_LIMITS['element-paragraph']))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 transition-colors resize-none leading-relaxed" placeholder="Supporting description..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] text-slate-500 block mb-1">Date / Event</span>
                <input type="text" value={dateText} onChange={e => setDateText(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 transition-colors" placeholder="November 18, 2026" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-slate-500">Location / Footer</span>
                  <span className={	ext-[10px] font-mono }>{locationText.length}/{CHAR_LIMITS['element-footer']}</span>
                </div>
                <input type="text" value={locationText} onChange={e => setLocationText(e.target.value.slice(0, CHAR_LIMITS['element-footer']))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 transition-colors" placeholder="Global Broadcast" />
              </div>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end space-x-3">
          <p className="text-xs text-slate-400 flex-1">All formats (Square, Portrait, Story, Landscape) auto-generated.</p>
          <button onClick={() => onConfirm({ name, logoUrl: logoPreview, backgroundUrl: bgPreview, introText, mainHeading, supportingParagraph, dateText, locationText })}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl flex items-center space-x-2 transition-colors shadow-md shadow-blue-200">
            <Sparkles className="w-4 h-4" /><span>Generate Campaign</span>
          </button>
        </div>
      </div>
    </div>
  );
};
"""

with open(r'write_editor_full.py', 'w', encoding='utf-8') as f:
    f.write("code = " + repr(code) + "\n")
    f.write("path = r'poster-automation\\frontend\\src\\pages\\CampaignEditorPage.tsx'\n")
    f.write("with open(path, 'w', encoding='utf-8') as f:\n")
    f.write("    f.write(code)\n")
    f.write("print('Setup modal written:', len(code))\n")

print("script written")
