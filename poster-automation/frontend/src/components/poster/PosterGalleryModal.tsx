import React, { useState } from 'react';
import JSZip from 'jszip';
import { PosterFormat } from '../../types/poster';
import {
  Download,
  FolderArchive,
  ArrowLeft,
  CheckCircle2,
  X,
  Sparkles,
  Layers,
  ExternalLink,
} from 'lucide-react';

export interface GeneratedPosterItem {
  format: PosterFormat;
  dataUrl: string;
  width: number;
  height: number;
  filename: string;
}

interface PosterGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignName: string;
  posters: GeneratedPosterItem[];
}

export const PosterGalleryModal: React.FC<PosterGalleryModalProps> = ({
  isOpen,
  onClose,
  campaignName,
  posters,
}) => {
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [downloadedAll, setDownloadedAll] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Individual PNG download
  const handleDownloadSingle = (item: GeneratedPosterItem) => {
    const link = document.createElement('a');
    link.href = item.dataUrl;
    link.download = item.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Batch ZIP download with JSZip
  const handleDownloadAllZip = async () => {
    setDownloadingZip(true);
    setDownloadError(null);
    try {
      const zip = new JSZip();
      const folderName = `${campaignName.replace(/[^a-zA-Z0-9_-]/g, '_')}_posters`;
      const folder = zip.folder(folderName) || zip;

      for (const item of posters) {
        // Extract base64 payload from dataUrl
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

      setDownloadedAll(true);
      setTimeout(() => setDownloadedAll(false), 4000);
    } catch (err: any) {
      console.error('ZIP generation failed:', err);
      setDownloadError(err.message || 'Failed to create ZIP package');
    } finally {
      setDownloadingZip(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[94vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 bg-slate-50/60">
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-colors flex items-center space-x-1"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-xs font-semibold hidden sm:inline">Back to Editor</span>
            </button>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                  Generated Posters ({posters.length})
                </h2>
                <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                  Ready to Export
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate max-w-md">{campaignName}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleDownloadAllZip}
              disabled={downloadingZip || posters.length === 0}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition-all flex items-center space-x-2 active:scale-98"
            >
              {downloadingZip ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Packaging ZIP...</span>
                </>
              ) : downloadedAll ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Downloaded!</span>
                </>
              ) : (
                <>
                  <FolderArchive className="w-4 h-4 text-sky-400" />
                  <span>Download all (ZIP)</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {downloadError && (
          <div className="px-6 py-2 bg-rose-50 text-rose-700 text-xs border-b border-rose-200">
            {downloadError}
          </div>
        )}

        {/* Posters Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/70">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posters.map((item, idx) => (
              <div
                key={idx}
                className="bg-white rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow flex flex-col overflow-hidden"
              >
                {/* Image Preview Box */}
                <div className="p-3 bg-slate-900/90 flex items-center justify-center min-h-[260px] relative group overflow-hidden">
                  <img
                    src={item.dataUrl}
                    alt={item.format.name}
                    className="max-h-[320px] max-w-full object-contain rounded shadow-md"
                  />
                </div>

                {/* Card Details & Download Action */}
                <div className="p-4 flex items-center justify-between border-t border-slate-100 bg-white">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{item.format.name}</h4>
                    <span className="text-xs font-mono text-slate-500">
                      {item.width} × {item.height} px • {item.format.aspectRatioLabel}
                    </span>
                  </div>

                  <button
                    onClick={() => handleDownloadSingle(item)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition-colors flex items-center space-x-1.5 shadow-xs"
                    title={`Download ${item.format.name} PNG`}
                  >
                    <Download className="w-3.5 h-3.5 text-slate-600" />
                    <span>Download</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between text-xs text-slate-500">
          <span>All posters rendered at full deterministic output resolutions.</span>
          <button
            onClick={onClose}
            className="text-slate-700 hover:text-slate-950 font-semibold"
          >
            Return to campaign editor
          </button>
        </div>
      </div>
    </div>
  );
};
