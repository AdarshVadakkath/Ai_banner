import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { Canvas } from 'fabric';
import { FabricPosterRenderer } from '../../utils/FabricPosterRenderer';
import { Move, RotateCcw, } from 'lucide-react';
export const PosterCanvasPreview = ({ layout, selectedFormats, activeFormatId, onSelectFormat, onElementModified, onResetToTemplate, }) => {
    const canvasElRef = useRef(null);
    const fabricCanvasRef = useRef(null);
    const containerRef = useRef(null);
    const [isRepositionMode, setIsRepositionMode] = useState(false);
    const [containerDimensions, setContainerDimensions] = useState({ width: 500, height: 600 });
    // Update container dimensions on window resize
    useEffect(() => {
        const updateSize = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                setContainerDimensions({
                    width: Math.max(300, rect.width - 32),
                    height: Math.max(380, Math.min(680, window.innerHeight - 240)),
                });
            }
        };
        updateSize();
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, []);
    // Compute preview scaling factor to fit neatly within available container bounds
    const maxWidth = containerDimensions.width;
    const maxHeight = containerDimensions.height;
    const scaleX = maxWidth / layout.canvasWidth;
    const scaleY = maxHeight / layout.canvasHeight;
    const previewScale = Math.min(scaleX, scaleY, 0.55); // Cap scale so high res formats preview smoothly
    // Initialize or update Fabric.js canvas
    useEffect(() => {
        if (!canvasElRef.current)
            return;
        if (!fabricCanvasRef.current) {
            fabricCanvasRef.current = new Canvas(canvasElRef.current, {
                selection: false,
                preserveObjectStacking: true,
            });
        }
        const canvas = fabricCanvasRef.current;
        // Render the resolved deterministic layout
        FabricPosterRenderer.renderToCanvas(canvas, layout, {
            isInteractive: isRepositionMode,
            previewScale,
            onElementModified,
        }).catch((err) => {
            console.error('Error rendering to Fabric canvas:', err);
        });
        return () => {
            // Don't dispose on every render, just keep instance
        };
    }, [layout, previewScale, isRepositionMode]);
    // Clean up canvas on unmount
    useEffect(() => {
        return () => {
            if (fabricCanvasRef.current) {
                fabricCanvasRef.current.dispose();
                fabricCanvasRef.current = null;
            }
        };
    }, []);
    return (_jsxs("div", { className: "bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden h-full", children: [_jsxs("div", { className: "border-b border-slate-200 bg-slate-50/80 px-4 py-2.5 flex items-center justify-between overflow-x-auto", children: [_jsxs("div", { className: "flex items-center space-x-1.5 shrink-0", children: [_jsx("span", { className: "text-xs font-bold text-slate-500 uppercase tracking-wider mr-2 hidden sm:inline", children: "Preview size:" }), selectedFormats.map((fmt) => {
                                const isActive = fmt.id === activeFormatId;
                                return (_jsxs("button", { onClick: () => onSelectFormat(fmt.id), className: `px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 flex items-center space-x-1.5 ${isActive
                                        ? 'bg-slate-900 text-white shadow-xs'
                                        : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300'}`, children: [_jsx("span", { children: fmt.name }), _jsx("span", { className: `text-[10px] font-mono px-1 py-0.2 rounded ${isActive ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-500'}`, children: fmt.aspectRatioLabel })] }, fmt.id));
                            })] }), _jsxs("div", { className: "hidden lg:flex items-center space-x-1.5 text-xs text-slate-500 ml-4", children: [_jsx("span", { className: "w-2 h-2 rounded-full bg-emerald-500" }), _jsxs("span", { className: "font-medium capitalize", children: [layout.layoutFamily, " Preset"] })] })] }), _jsxs("div", { ref: containerRef, className: "flex-1 bg-slate-900/95 flex items-center justify-center p-4 sm:p-6 overflow-hidden relative select-none", style: { minHeight: '440px' }, children: [_jsx("div", { className: "absolute inset-0 opacity-10 pointer-events-none", style: {
                            backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
                            backgroundSize: '20px 20px',
                        } }), _jsx("div", { className: "relative shadow-2xl rounded-lg overflow-hidden border border-white/10 bg-slate-950", children: _jsx("canvas", { ref: canvasElRef }) }), isRepositionMode && (_jsxs("div", { className: "absolute top-4 left-4 bg-sky-500 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg flex items-center space-x-1.5 animate-bounce-subtle", children: [_jsx(Move, { className: "w-3.5 h-3.5" }), _jsx("span", { children: "Reposition Mode Active \u2022 Drag elements to fine-tune" })] }))] }), _jsxs("div", { className: "border-t border-slate-200 bg-white px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs", children: [_jsxs("div", { className: "flex items-center space-x-3 text-slate-600", children: [_jsxs("span", { className: "font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-semibold", children: [layout.canvasWidth, " \u00D7 ", layout.canvasHeight, " px"] }), _jsx("span", { className: "text-slate-400", children: "\u2022" }), _jsx("span", { children: layout.format.name })] }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsxs("button", { type: "button", onClick: () => setIsRepositionMode(!isRepositionMode), className: `px-3 py-1.5 rounded-lg font-medium flex items-center space-x-1.5 transition-colors border ${isRepositionMode
                                    ? 'bg-sky-50 text-sky-700 border-sky-300 font-semibold'
                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`, children: [_jsx(Move, { className: "w-3.5 h-3.5" }), _jsx("span", { children: isRepositionMode ? 'Lock positioning' : 'Move background/elements' })] }), onResetToTemplate && (_jsxs("button", { type: "button", onClick: onResetToTemplate, className: "px-3 py-1.5 rounded-lg font-medium bg-white text-slate-600 border border-slate-200 hover:text-slate-900 hover:bg-slate-50 flex items-center space-x-1.5 transition-colors", title: "Reset any manual adjustments to the pure deterministic template layout", children: [_jsx(RotateCcw, { className: "w-3.5 h-3.5" }), _jsx("span", { children: "Reset to template" })] }))] })] })] }));
};
