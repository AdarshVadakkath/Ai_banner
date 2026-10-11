import React from 'react';
import { CampaignContent, PosterTemplate } from '../../types/poster';
import { AlertCircle, CheckCircle2, Type } from 'lucide-react';

interface CampaignInfoSectionProps {
  content: CampaignContent;
  template: PosterTemplate;
  onChange: (updated: Partial<CampaignContent>) => void;
}

export const CampaignInfoSection: React.FC<CampaignInfoSectionProps> = ({
  content,
  template,
  onChange,
}) => {
  const limits = template.characterLimits;

  // Helper to render character counter badge
  const renderCounter = (currentLength: number, maxLimit: number, fieldLabel: string) => {
    const isExceeded = currentLength > maxLimit;
    const isClose = currentLength >= maxLimit - 5 && !isExceeded;
    const excess = currentLength - maxLimit;

    let badgeClass = 'text-slate-400 bg-slate-100';
    if (isExceeded) {
      badgeClass = 'text-rose-700 bg-rose-50 font-bold border border-rose-200';
    } else if (isClose) {
      badgeClass = 'text-amber-700 bg-amber-50 font-medium border border-amber-200';
    }

    return (
      <div className="flex items-center space-x-2 text-xs">
        {isExceeded && (
          <span className="text-rose-600 flex items-center space-x-1 font-medium">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Shorten your {fieldLabel} by {excess} character{excess > 1 ? 's' : ''}</span>
          </span>
        )}
        <span className={`px-2 py-0.5 rounded text-[11px] font-mono ${badgeClass}`}>
          {currentLength} / {maxLimit} characters
        </span>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
      <div className="flex items-center space-x-2.5 pb-2 border-b border-slate-100">
        <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
          1
        </span>
        <h3 className="font-bold text-slate-900 text-base">Campaign information</h3>
      </div>

      {/* Campaign Internal Name */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          Campaign name <span className="text-slate-400 font-normal">(Internal project title)</span>
        </label>
        <input
          type="text"
          value={content.campaignName}
          onChange={(e) => onChange({ campaignName: e.target.value })}
          placeholder="e.g. Q4 Global Summit 2026"
          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 transition-colors"
        />
      </div>

      {/* Small Introductory Text */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-semibold text-slate-700">
            Small introductory text <span className="text-slate-400 font-normal">(Top badge / category)</span>
          </label>
          {renderCounter((content.introText || '').length, limits.introText, 'introductory text')}
        </div>
        <input
          type="text"
          value={content.introText}
          onChange={(e) => onChange({ introText: e.target.value })}
          placeholder="e.g. ANNUAL TECH SUMMIT"
          className={`w-full px-3 py-2 text-sm rounded-lg border transition-colors ${
            (content.introText || '').length > limits.introText
              ? 'border-rose-400 focus:ring-rose-200'
              : 'border-slate-200 focus:border-slate-800 focus:ring-slate-900/10'
          }`}
        />
      </div>

      {/* Large Main Heading */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-semibold text-slate-700">
            Main heading <span className="text-rose-500 font-bold">*</span>
          </label>
          {renderCounter((content.mainHeading || '').length, limits.mainHeading, 'heading')}
        </div>
        <input
          type="text"
          value={content.mainHeading}
          onChange={(e) => onChange({ mainHeading: e.target.value })}
          placeholder="e.g. Pioneering the Next Frontier of Cloud"
          className={`w-full px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
            (content.mainHeading || '').length > limits.mainHeading
              ? 'border-rose-400 bg-rose-50/20 focus:ring-rose-200'
              : 'border-slate-200 focus:border-slate-800 focus:ring-slate-900/10'
          }`}
        />
      </div>

      {/* Supporting Paragraph */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-semibold text-slate-700">
            Supporting paragraph <span className="text-slate-400 font-normal">(Details / value proposition)</span>
          </label>
          {renderCounter((content.supportingParagraph || '').length, limits.supportingParagraph, 'supporting paragraph')}
        </div>
        <textarea
          rows={3}
          value={content.supportingParagraph}
          onChange={(e) => onChange({ supportingParagraph: e.target.value })}
          placeholder="e.g. Join 5,000+ engineers for 3 days of inspiring keynotes, collaborative workshops, and live demos."
          className={`w-full px-3 py-2 text-sm rounded-lg border transition-colors resize-none ${
            (content.supportingParagraph || '').length > limits.supportingParagraph
              ? 'border-rose-400 focus:ring-rose-200'
              : 'border-slate-200 focus:border-slate-800 focus:ring-slate-900/10'
          }`}
        />
      </div>

      {/* Date and Location in a 2-column grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-slate-700">Date or event details</label>
            {renderCounter((content.dateText || '').length, limits.dateText, 'date')}
          </div>
          <input
            type="text"
            value={content.dateText}
            onChange={(e) => onChange({ dateText: e.target.value })}
            placeholder="e.g. October 24–26, 2026"
            className={`w-full px-3 py-2 text-sm rounded-lg border transition-colors ${
              (content.dateText || '').length > limits.dateText
                ? 'border-rose-400 focus:ring-rose-200'
                : 'border-slate-200 focus:border-slate-800'
            }`}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-slate-700">Location or footer text</label>
            {renderCounter((content.locationText || '').length, limits.locationText, 'location')}
          </div>
          <input
            type="text"
            value={content.locationText}
            onChange={(e) => onChange({ locationText: e.target.value })}
            placeholder="e.g. Moscone Center, SF & Online"
            className={`w-full px-3 py-2 text-sm rounded-lg border transition-colors ${
              (content.locationText || '').length > limits.locationText
                ? 'border-rose-400 focus:ring-rose-200'
                : 'border-slate-200 focus:border-slate-800'
            }`}
          />
        </div>
      </div>
    </div>
  );
};
