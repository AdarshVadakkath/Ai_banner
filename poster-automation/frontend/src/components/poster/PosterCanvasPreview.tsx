import React, { useEffect, useRef, useState } from 'react';
import { Canvas } from 'fabric';
import { ResolvedPosterLayout, PosterFormat } from '../../types/poster';
import { FabricPosterRenderer } from '../../utils/FabricPosterRenderer';
import {
  Move,
  RotateCcw,
  Maximize2,
  Sliders,
  CheckCircle2,
  Info,
} from 'lucide-react';

interface PosterCanvasPreviewProps {
  layout: ResolvedPosterLayout;
  selectedFormats: PosterFormat[];
  activeFormatId: string;
  onSelectFormat: (formatId: string) => void;
  onElementModified?: (elementId: string, x: number, y: number) => void;
  onResetToTemplate?: () => void;
}

export const PosterCanvasPreview: React.FC<PosterCanvasPreviewProps> = ({
  layout,
  selectedFormats,
  activeFormatId,
  onSelectFormat,
  onElementModified,
  onResetToTemplate,
}) => {
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<Canvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
    if (!canvasElRef.current) return;

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

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden h-full">
      {/* Top Format Tabs Bar */}
      <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-2.5 flex items-center justify-between overflow-x-auto">
        <div className="flex items-center space-x-1.5 shrink-0">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-2 hidden sm:inline">
            Preview size:
          </span>
          {selectedFormats.map((fmt) => {
            const isActive = fmt.id === activeFormatId;
            return (
              <button
                key={fmt.id}
                onClick={() => onSelectFormat(fmt.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 flex items-center space-x-1.5 ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300'
                }`}
              >
                <span>{fmt.name}</span>
                <span className={`text-[10px] font-mono px-1 py-0.2 rounded ${isActive ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-500'}`}>
                  {fmt.aspectRatioLabel}
                </span>
              </button>
            );
          })}
        </div>

        {/* Layout Preset Indicator */}
        <div className="hidden lg:flex items-center space-x-1.5 text-xs text-slate-500 ml-4">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span className="font-medium capitalize">{layout.layoutFamily} Preset</span>
        </div>
      </div>

      {/* Canvas Viewport Area */}
      <div
        ref={containerRef}
        className="flex-1 bg-slate-900/95 flex items-center justify-center p-4 sm:p-6 overflow-hidden relative select-none"
        style={{ minHeight: '440px' }}
      >
        {/* Subtle grid background */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />

        {/* Poster Canvas Frame */}
        <div className="relative shadow-2xl rounded-lg overflow-hidden border border-white/10 bg-slate-950">
          <canvas ref={canvasElRef} />
        </div>

        {/* Reposition Mode Floating Badge */}
        {isRepositionMode && (
          <div className="absolute top-4 left-4 bg-sky-500 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg flex items-center space-x-1.5 animate-bounce-subtle">
            <Move className="w-3.5 h-3.5" />
            <span>Reposition Mode Active • Drag elements to fine-tune</span>
          </div>
        )}
      </div>

      {/* Bottom Canvas Controls & Status Bar */}
      <div className="border-t border-slate-200 bg-white px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-3 text-slate-600">
          <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-semibold">
            {layout.canvasWidth} × {layout.canvasHeight} px
          </span>
          <span className="text-slate-400">•</span>
          <span>{layout.format.name}</span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Reposition Mode Toggle */}
          <button
            type="button"
            onClick={() => setIsRepositionMode(!isRepositionMode)}
            className={`px-3 py-1.5 rounded-lg font-medium flex items-center space-x-1.5 transition-colors border ${
              isRepositionMode
                ? 'bg-sky-50 text-sky-700 border-sky-300 font-semibold'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Move className="w-3.5 h-3.5" />
            <span>{isRepositionMode ? 'Lock positioning' : 'Move background/elements'}</span>
          </button>

          {/* Reset to Template Button */}
          {onResetToTemplate && (
            <button
              type="button"
              onClick={onResetToTemplate}
              className="px-3 py-1.5 rounded-lg font-medium bg-white text-slate-600 border border-slate-200 hover:text-slate-900 hover:bg-slate-50 flex items-center space-x-1.5 transition-colors"
              title="Reset any manual adjustments to the pure deterministic template layout"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to template</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
