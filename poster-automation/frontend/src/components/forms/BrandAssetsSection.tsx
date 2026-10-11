import React, { useRef, useState } from 'react';
import { CampaignAssets, AssetRecord } from '../../types/poster';
import { ApiService } from '../../services/apiService';
import {
  Upload,
  Image as ImageIcon,
  Trash2,
  Check,
  RotateCcw,
  AlertCircle,
  Move,
  Layers,
} from 'lucide-react';

interface BrandAssetsSectionProps {
  assets: CampaignAssets;
  onChange: (updated: Partial<CampaignAssets>) => void;
  onResetPosition?: () => void;
}

export const BrandAssetsSection: React.FC<BrandAssetsSectionProps> = ({
  assets,
  onChange,
  onResetPosition,
}) => {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Handle Logo Upload
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    setUploadError(null);
    try {
      const asset = await ApiService.uploadAsset(file);
      onChange({
        logoUrl: asset.url,
        logoAspectRatio: asset.aspectRatio || 3.0,
      });
    } catch (err: any) {
      setUploadError(err.message || 'Logo upload failed');
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  // Remove Logo
  const handleRemoveLogo = () => {
    onChange({
      logoUrl: undefined,
      logoAspectRatio: undefined,
    });
  };

  // Handle Background Image Upload
  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingBg(true);
    setUploadError(null);
    try {
      const newImages: AssetRecord[] = [...assets.backgroundImages];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const asset = await ApiService.uploadAsset(file);
        newImages.push(asset);
      }
      onChange({
        backgroundImages: newImages,
        selectedBackgroundId: newImages[newImages.length - 1]?.id || assets.selectedBackgroundId,
      });
    } catch (err: any) {
      setUploadError(err.message || 'Background upload failed');
    } finally {
      setUploadingBg(false);
      if (bgInputRef.current) bgInputRef.current.value = '';
    }
  };

  // Select Active Background
  const handleSelectBackground = (id: string) => {
    onChange({ selectedBackgroundId: id });
  };

  // Remove Background
  const handleRemoveBackground = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = assets.backgroundImages.filter((img) => img.id !== id);
    const nextSelected =
      assets.selectedBackgroundId === id
        ? filtered[0]?.id || undefined
        : assets.selectedBackgroundId;

    onChange({
      backgroundImages: filtered,
      selectedBackgroundId: nextSelected,
    });
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-5">
      <div className="flex items-center space-x-2.5 pb-2 border-b border-slate-100">
        <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
          2
        </span>
        <h3 className="font-bold text-slate-900 text-base">Brand assets</h3>
      </div>

      {uploadError && (
        <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* 1. Company Logo */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
          Company logo <span className="text-slate-400 font-normal">(Preserves original aspect ratio)</span>
        </label>

        <input
          type="file"
          ref={logoInputRef}
          onChange={handleLogoUpload}
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="hidden"
        />

        {assets.logoUrl ? (
          <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50/50">
            <div className="flex items-center space-x-3">
              <div className="w-16 h-10 bg-white rounded border border-slate-200 p-1 flex items-center justify-center overflow-hidden">
                <img
                  src={assets.logoUrl}
                  alt="Logo preview"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div>
                <span className="text-xs font-medium text-slate-800 block">Brand Logo Active</span>
                <span className="text-[11px] text-slate-500">
                  Aspect ratio: {assets.logoAspectRatio ? `${assets.logoAspectRatio.toFixed(1)}:1` : 'Standard'}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                disabled={uploadingLogo}
                className="px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-md transition-colors"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={handleRemoveLogo}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                title="Remove logo"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => logoInputRef.current?.click()}
            disabled={uploadingLogo}
            className="w-full py-4 border-2 border-dashed border-slate-200 hover:border-slate-400 rounded-lg flex flex-col items-center justify-center text-slate-500 hover:text-slate-800 transition-colors bg-slate-50/30"
          >
            <Upload className="w-5 h-5 mb-1 text-slate-400" />
            <span className="text-xs font-semibold">
              {uploadingLogo ? 'Processing logo...' : 'Upload company logo'}
            </span>
            <span className="text-[11px] text-slate-400">PNG, JPEG, WebP, or SVG</span>
          </button>
        )}
      </div>

      {/* 2. Background Images */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-slate-700">
            Background images <span className="text-slate-400 font-normal">({assets.backgroundImages.length} available)</span>
          </label>

          <input
            type="file"
            ref={bgInputRef}
            onChange={handleBgUpload}
            multiple
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
          />

          <button
            type="button"
            onClick={() => bgInputRef.current?.click()}
            disabled={uploadingBg}
            className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center space-x-1"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload image</span>
          </button>
        </div>

        {assets.backgroundImages.length === 0 ? (
          <div
            onClick={() => bgInputRef.current?.click()}
            className="w-full py-6 border-2 border-dashed border-slate-200 hover:border-slate-400 rounded-lg flex flex-col items-center justify-center text-slate-500 cursor-pointer bg-slate-50/30 transition-colors"
          >
            <ImageIcon className="w-6 h-6 mb-1 text-slate-400" />
            <span className="text-xs font-semibold">Upload background image</span>
            <span className="text-[11px] text-slate-400">High-resolution PNG, JPEG, or WebP</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {assets.backgroundImages.map((img) => {
              const isSelected = img.id === assets.selectedBackgroundId;
              return (
                <div
                  key={img.id}
                  onClick={() => handleSelectBackground(img.id)}
                  className={`relative group rounded-lg overflow-hidden border cursor-pointer aspect-video bg-slate-900 transition-all ${
                    isSelected
                      ? 'ring-2 ring-sky-500 border-sky-500 shadow-sm'
                      : 'border-slate-200 hover:border-slate-400 opacity-80 hover:opacity-100'
                  }`}
                >
                  <img
                    src={img.url}
                    alt={img.name}
                    className="w-full h-full object-cover"
                  />

                  {/* Selected checkmark pill */}
                  {isSelected && (
                    <div className="absolute top-1.5 left-1.5 bg-sky-500 text-white rounded-full p-0.5 shadow">
                      <Check className="w-3 h-3" />
                    </div>
                  )}

                  {/* Remove button */}
                  {assets.backgroundImages.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => handleRemoveBackground(img.id, e)}
                      className="absolute top-1.5 right-1.5 p-1 bg-black/60 hover:bg-rose-600 text-white rounded opacity-0 group-hover:opacity-100 transition-all"
                      title="Remove background"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}

                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-1.5">
                    <span className="text-[10px] text-white font-medium truncate block">
                      {img.name}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Image Fitting Mode & Controls */}
      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-slate-700">Fitting rule:</span>
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
            <button
              type="button"
              onClick={() => onChange({ backgroundFit: 'cover' })}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                assets.backgroundFit === 'cover'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Cover (Fill)
            </button>
            <button
              type="button"
              onClick={() => onChange({ backgroundFit: 'contain' })}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                assets.backgroundFit === 'contain'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Contain
            </button>
          </div>
        </div>

        {onResetPosition && (
          <button
            type="button"
            onClick={onResetPosition}
            className="text-slate-500 hover:text-slate-800 flex items-center space-x-1 text-xs font-medium"
            title="Reset position to default template coordinates"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset position</span>
          </button>
        )}
      </div>
    </div>
  );
};
