import React from 'react';
import { X, CheckCircle2, ShieldCheck, Cpu, SlidersHorizontal, Sparkles } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 sm:p-8">
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">How Formatly Works</h2>
              <p className="text-xs text-slate-500">Deterministic, Rule-Based Multi-Format Poster Engine</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-6 space-y-6 text-sm text-slate-600 leading-relaxed">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80">
            <h3 className="font-semibold text-slate-900 mb-1 flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Zero AI • 100% Deterministic Design Rules</span>
            </h3>
            <p className="text-xs text-slate-600">
              Formatly does not use generative AI or probabilistic guessing. Every layout decision, font sizing, line wrap, and logo proportion is calculated mathematically from your chosen template's geometry and constraints.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 mb-2">The 4-Step Production Workflow</h4>
            <ol className="list-decimal list-inside space-y-2 text-slate-700 text-xs">
              <li><strong className="text-slate-900">Campaign Content:</strong> Enter your copy once. Real-time character counters guide you so headings and paragraphs remain punchy and balanced.</li>
              <li><strong className="text-slate-900">Brand Assets:</strong> Provide your company logo and background image(s). Logo proportions and contrast overlays are preserved automatically.</li>
              <li><strong className="text-slate-900">Poster Sizes:</strong> Select social, portrait, story, banner, and widescreen presets or custom dimensions.</li>
              <li><strong className="text-slate-900">Create Posters:</strong> Generate pixel-accurate high-resolution posters simultaneously and download individually or in a single ZIP file.</li>
            </ol>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 mb-2">Aspect-Ratio Layout Presets</h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg border border-slate-200 bg-white">
                <span className="font-semibold text-slate-900 block">Square (1:1)</span>
                <span className="text-slate-500">Instagram & LinkedIn posts. Balanced vertical content anchoring.</span>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 bg-white">
                <span className="font-semibold text-slate-900 block">Portrait & Story (4:5, 9:16)</span>
                <span className="text-slate-500">Instagram Stories, TikTok. Tall vertical flow with bottom contrast scrim.</span>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 bg-white">
                <span className="font-semibold text-slate-900 block">Landscape Banner (1.91:1)</span>
                <span className="text-slate-500">Facebook & Twitter link cards. Left-side hero focus with image breathing room.</span>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 bg-white">
                <span className="font-semibold text-slate-900 block">Widescreen Display (16:9)</span>
                <span className="text-slate-500">Keynote presentations and digital signage displays.</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg shadow-sm"
          >
            Got it, let's create
          </button>
        </div>
      </div>
    </div>
  );
};
