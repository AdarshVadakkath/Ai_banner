import React from 'react';
import { ValidationWarning } from '../../types/poster';
import { Sparkles, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';

interface GenerateSectionProps {
  onGenerateAll: () => void;
  isValid: boolean;
  warnings: ValidationWarning[];
  formatsCount: number;
  isGenerating?: boolean;
}

export const GenerateSection: React.FC<GenerateSectionProps> = ({
  onGenerateAll,
  isValid,
  warnings,
  formatsCount,
  isGenerating = false,
}) => {
  const errorWarnings = warnings.filter((w) => w.severity === 'error');
  const advisoryWarnings = warnings.filter((w) => w.severity === 'warning');

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
      <div className="flex items-center space-x-2.5 pb-2 border-b border-slate-100">
        <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
          4
        </span>
        <h3 className="font-bold text-slate-900 text-base">Create posters</h3>
      </div>

      {/* Validation Message display if any issues */}
      {errorWarnings.length > 0 && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-xs space-y-1 text-rose-800">
          <div className="font-semibold flex items-center space-x-1.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Please address content limits before creating posters:</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 pl-1 text-[11px] text-rose-700">
            {errorWarnings.map((w, i) => (
              <li key={i}>{w.message}</li>
            ))}
          </ul>
        </div>
      )}

      {errorWarnings.length === 0 && advisoryWarnings.length > 0 && (
        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{advisoryWarnings[0].message}</span>
        </div>
      )}

      {errorWarnings.length === 0 && (
        <div className="text-xs text-slate-500 flex items-center space-x-1.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            Content is validated and ready for deterministic rendering across {formatsCount} format
            {formatsCount > 1 ? 's' : ''}.
          </span>
        </div>
      )}

      {/* Primary Action Button */}
      <button
        type="button"
        disabled={!isValid || formatsCount === 0 || isGenerating}
        onClick={onGenerateAll}
        className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center space-x-2 shadow-sm transition-all ${
          !isValid || formatsCount === 0 || isGenerating
            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
            : 'bg-slate-900 hover:bg-slate-800 text-white active:scale-98 shadow-md hover:shadow-lg'
        }`}
      >
        <Sparkles className="w-4 h-4 text-sky-400" />
        <span>{isGenerating ? 'Rendering all variations...' : 'Create all posters'}</span>
        <ArrowRight className="w-4 h-4 text-slate-400" />
      </button>
    </div>
  );
};
