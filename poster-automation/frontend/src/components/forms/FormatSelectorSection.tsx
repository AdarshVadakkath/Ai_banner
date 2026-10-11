import React, { useState } from 'react';
import { PosterFormat } from '../../types/poster';
import { DEFAULT_POSTER_FORMATS, FORMAT_LIMITS } from '../../constants/formats';
import { CheckSquare, Square, Plus, Sliders, AlertCircle } from 'lucide-react';

interface FormatSelectorSectionProps {
  selectedFormats: PosterFormat[];
  onChange: (formats: PosterFormat[]) => void;
  activePreviewFormatId?: string;
  onSelectPreviewFormat?: (formatId: string) => void;
}

export const FormatSelectorSection: React.FC<FormatSelectorSectionProps> = ({
  selectedFormats,
  onChange,
  activePreviewFormatId,
  onSelectPreviewFormat,
}) => {
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customName, setCustomName] = useState('Custom Banner');
  const [customWidth, setCustomWidth] = useState(1080);
  const [customHeight, setCustomHeight] = useState(1080);
  const [customError, setCustomError] = useState<string | null>(null);

  const isSelected = (id: string) => selectedFormats.some((f) => f.id === id);

  const toggleFormat = (format: PosterFormat) => {
    if (isSelected(format.id)) {
      // Don't allow deselecting the very last one
      if (selectedFormats.length === 1) return;
      onChange(selectedFormats.filter((f) => f.id !== format.id));
    } else {
      onChange([...selectedFormats, format]);
      if (onSelectPreviewFormat) {
        onSelectPreviewFormat(format.id);
      }
    }
  };

  const selectAll = () => {
    onChange(DEFAULT_POSTER_FORMATS);
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (customWidth < FORMAT_LIMITS.minWidth || customWidth > FORMAT_LIMITS.maxWidth) {
      setCustomError(`Width must be between ${FORMAT_LIMITS.minWidth} and ${FORMAT_LIMITS.maxWidth} px`);
      return;
    }
    if (customHeight < FORMAT_LIMITS.minHeight || customHeight > FORMAT_LIMITS.maxHeight) {
      setCustomError(`Height must be between ${FORMAT_LIMITS.minHeight} and ${FORMAT_LIMITS.maxHeight} px`);
      return;
    }

    const customId = `custom-${Date.now()}`;
    const ratio = (customWidth / customHeight).toFixed(2);
    const newFormat: PosterFormat = {
      id: customId,
      name: customName.trim() || 'Custom Size',
      width: Number(customWidth),
      height: Number(customHeight),
      aspectRatioLabel: `${ratio}:1`,
      category: 'custom',
    };

    onChange([...selectedFormats, newFormat]);
    setShowCustomModal(false);
    setCustomError(null);
    if (onSelectPreviewFormat) onSelectPreviewFormat(customId);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center space-x-2.5">
          <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
            3
          </span>
          <div>
            <h3 className="font-bold text-slate-900 text-base">Choose poster sizes</h3>
            <span className="text-xs text-slate-500">
              {selectedFormats.length} size{selectedFormats.length > 1 ? 's' : ''} selected for automatic layout
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={selectAll}
          className="text-xs font-semibold text-sky-600 hover:text-sky-700"
        >
          Select all
        </button>
      </div>

      {/* Preset Format Cards Grid */}
      <div className="space-y-2">
        {DEFAULT_POSTER_FORMATS.map((fmt) => {
          const checked = isSelected(fmt.id);
          const isCurrentPreview = activePreviewFormatId === fmt.id;

          return (
            <div
              key={fmt.id}
              onClick={() => toggleFormat(fmt)}
              className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                checked
                  ? 'border-slate-800 bg-slate-50/70 shadow-xs'
                  : 'border-slate-200 bg-white hover:border-slate-300 opacity-75'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="text-slate-900">
                  {checked ? (
                    <CheckSquare className="w-4 h-4 text-slate-900" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400" />
                  )}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold text-slate-900">{fmt.name}</span>
                    <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                      {fmt.width} × {fmt.height}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 capitalize">
                    {fmt.category} ratio ({fmt.aspectRatioLabel})
                  </span>
                </div>
              </div>

              {/* Preview target indicator */}
              {checked && onSelectPreviewFormat && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectPreviewFormat(fmt.id);
                  }}
                  className={`text-xs px-2.5 py-1 rounded font-medium transition-colors ${
                    isCurrentPreview
                      ? 'bg-slate-900 text-white font-semibold'
                      : 'text-slate-600 hover:bg-slate-200/60'
                  }`}
                >
                  {isCurrentPreview ? 'Previewing' : 'Preview'}
                </button>
              )}
            </div>
          );
        })}

        {/* Any added custom formats */}
        {selectedFormats
          .filter((f) => f.category === 'custom')
          .map((fmt) => {
            const isCurrentPreview = activePreviewFormatId === fmt.id;
            return (
              <div
                key={fmt.id}
                className="p-3 rounded-lg border border-slate-800 bg-sky-50/40 flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <CheckSquare className="w-4 h-4 text-sky-600" />
                  <div>
                    <span className="text-sm font-semibold text-slate-900">{fmt.name}</span>
                    <span className="text-[11px] font-mono text-slate-500 ml-2">
                      {fmt.width} × {fmt.height}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {onSelectPreviewFormat && (
                    <button
                      type="button"
                      onClick={() => onSelectPreviewFormat(fmt.id)}
                      className={`text-xs px-2.5 py-1 rounded font-medium ${
                        isCurrentPreview ? 'bg-slate-900 text-white' : 'text-slate-600'
                      }`}
                    >
                      {isCurrentPreview ? 'Previewing' : 'Preview'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onChange(selectedFormats.filter((f) => f.id !== fmt.id))}
                    className="text-xs text-rose-600 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
      </div>

      {/* Custom Size Action */}
      {!showCustomModal ? (
        <button
          type="button"
          onClick={() => setShowCustomModal(true)}
          className="w-full py-2.5 border border-dashed border-slate-300 hover:border-slate-400 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center justify-center space-x-1.5 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add custom size</span>
        </button>
      ) : (
        <form onSubmit={handleAddCustom} className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900">Custom Dimensions</span>
            <button
              type="button"
              onClick={() => setShowCustomModal(false)}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              Cancel
            </button>
          </div>

          {customError && (
            <div className="p-2 bg-rose-50 text-rose-700 text-xs rounded border border-rose-200 flex items-center space-x-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{customError}</span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Label</label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Name"
                className="w-full px-2 py-1 text-xs rounded border border-slate-200 bg-white"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Width (px)</label>
              <input
                type="number"
                min={FORMAT_LIMITS.minWidth}
                max={FORMAT_LIMITS.maxWidth}
                value={customWidth}
                onChange={(e) => setCustomWidth(Number(e.target.value))}
                className="w-full px-2 py-1 text-xs rounded border border-slate-200 bg-white"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Height (px)</label>
              <input
                type="number"
                min={FORMAT_LIMITS.minHeight}
                max={FORMAT_LIMITS.maxHeight}
                value={customHeight}
                onChange={(e) => setCustomHeight(Number(e.target.value))}
                className="w-full px-2 py-1 text-xs rounded border border-slate-200 bg-white"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold shadow-xs"
          >
            Add format
          </button>
        </form>
      )}
    </div>
  );
};
