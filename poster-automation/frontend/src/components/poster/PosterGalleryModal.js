import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import JSZip from 'jszip';
import { PosterInlineEditor } from './PosterInlineEditor';
import { Download, FolderArchive, ArrowLeft, CheckCircle2, X, Pencil, } from 'lucide-react';
export const PosterGalleryModal = ({ isOpen, onClose, campaignName, posters, content, assets, template, onSaveChanges, }) => {
    const [downloadingZip, setDownloadingZip] = useState(false);
    const [downloadedAll, setDownloadedAll] = useState(false);
    const [downloadError, setDownloadError] = useState(null);
    const [editingItem, setEditingItem] = useState(null);
    const [updatedPosters, setUpdatedPosters] = useState(posters);
    // Keep local posters in sync when parent re-generates
    React.useEffect(() => { setUpdatedPosters(posters); }, [posters]);
    if (!isOpen)
        return null;
    // Individual PNG download
    const handleDownloadSingle = (item) => {
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
        }
        catch (err) {
            console.error('ZIP generation failed:', err);
            setDownloadError(err.message || 'Failed to create ZIP package');
        }
        finally {
            setDownloadingZip(false);
        }
    };
    return (_jsxs("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-md animate-fade-in", children: [_jsxs("div", { className: "bg-white rounded-2xl max-w-6xl w-full max-h-[94vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden", children: [_jsxs("div", { className: "p-4 sm:p-6 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 bg-slate-50/60", children: [_jsxs("div", { className: "flex items-center space-x-3", children: [_jsxs("button", { onClick: onClose, className: "p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-colors flex items-center space-x-1", children: [_jsx(ArrowLeft, { className: "w-4 h-4" }), _jsx("span", { className: "text-xs font-semibold hidden sm:inline", children: "Back to Editor" })] }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center space-x-2", children: [_jsxs("h2", { className: "text-lg sm:text-xl font-bold text-slate-900", children: ["Generated Posters (", posters.length, ")"] }), _jsx("span", { className: "px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200", children: "Ready to Export" })] }), _jsx("p", { className: "text-xs text-slate-500 truncate max-w-md", children: campaignName })] })] }), _jsxs("div", { className: "flex items-center space-x-3", children: [_jsx("button", { onClick: handleDownloadAllZip, disabled: downloadingZip || posters.length === 0, className: "px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition-all flex items-center space-x-2 active:scale-98", children: downloadingZip ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" }), _jsx("span", { children: "Packaging ZIP..." })] })) : downloadedAll ? (_jsxs(_Fragment, { children: [_jsx(CheckCircle2, { className: "w-4 h-4 text-emerald-400" }), _jsx("span", { children: "Downloaded!" })] })) : (_jsxs(_Fragment, { children: [_jsx(FolderArchive, { className: "w-4 h-4 text-sky-400" }), _jsx("span", { children: "Download all (ZIP)" })] })) }), _jsx("button", { onClick: onClose, className: "p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-lg transition-colors", children: _jsx(X, { className: "w-5 h-5" }) })] })] }), downloadError && (_jsx("div", { className: "px-6 py-2 bg-rose-50 text-rose-700 text-xs border-b border-rose-200", children: downloadError })), _jsx("div", { className: "flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/70", children: _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", children: updatedPosters.map((item, idx) => (_jsxs("div", { className: "bg-white rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow flex flex-col overflow-hidden group", children: [_jsxs("div", { className: "p-3 bg-slate-900/90 flex items-center justify-center min-h-[260px] relative overflow-hidden", children: [_jsx("img", { src: item.dataUrl, alt: item.format.name, className: "max-h-[320px] max-w-full object-contain rounded shadow-md" }), _jsx("div", { className: "absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center", children: _jsxs("button", { onClick: () => setEditingItem(item), className: "px-4 py-2 bg-[#6366f1] hover:bg-[#5254cc] text-white text-xs font-bold rounded-xl flex items-center space-x-2 shadow-lg transition-all transform scale-90 group-hover:scale-100", children: [_jsx(Pencil, { className: "w-3.5 h-3.5" }), _jsx("span", { children: "Open in Editor" })] }) })] }), _jsxs("div", { className: "p-4 flex items-center justify-between border-t border-slate-100 bg-white", children: [_jsxs("div", { children: [_jsx("h4", { className: "text-sm font-bold text-slate-900", children: item.format.name }), _jsxs("span", { className: "text-xs font-mono text-slate-500", children: [item.width, " \u00D7 ", item.height, " px \u2022 ", item.format.aspectRatioLabel] })] }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx("button", { onClick: () => setEditingItem(item), className: "p-1.5 bg-[#6366f1]/10 hover:bg-[#6366f1]/20 text-[#6366f1] rounded-lg transition-colors flex items-center", title: `Edit ${item.format.name} in editor`, children: _jsx(Pencil, { className: "w-3.5 h-3.5" }) }), _jsxs("button", { onClick: () => handleDownloadSingle(item), className: "px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition-colors flex items-center space-x-1.5 shadow-xs", title: `Download ${item.format.name} PNG`, children: [_jsx(Download, { className: "w-3.5 h-3.5 text-slate-600" }), _jsx("span", { children: "Download" })] })] })] })] }, idx))) }) }), _jsxs("div", { className: "p-4 border-t border-slate-200 bg-white flex items-center justify-between text-xs text-slate-500", children: [_jsx("span", { children: "All posters rendered at full deterministic output resolutions." }), _jsx("button", { onClick: onClose, className: "text-slate-700 hover:text-slate-950 font-semibold", children: "Return to campaign editor" })] })] }), editingItem && (_jsx(PosterInlineEditor, { isOpen: !!editingItem, onClose: () => setEditingItem(null), format: editingItem.format, content: content, assets: assets, template: template, onSaveChanges: (updatedContent, updatedAssets) => {
                    onSaveChanges(updatedContent, updatedAssets);
                }, onReExport: (dataUrl, filename) => {
                    // Update the poster card with the newly exported image
                    setUpdatedPosters((prev) => prev.map((p) => p.format.id === editingItem.format.id
                        ? { ...p, dataUrl, filename }
                        : p));
                } }))] }));
};
