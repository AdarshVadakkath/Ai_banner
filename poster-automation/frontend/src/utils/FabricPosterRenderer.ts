import { Canvas, FabricImage, Textbox, Rect, Gradient, Circle } from 'fabric';
import { ResolvedPosterLayout, ResolvedElement } from '../types/poster';

export interface RenderOptions {
  isInteractive?: boolean;
  previewScale?: number;
  onElementModified?: (elementId: string, left: number, top: number) => void;
}

export class FabricPosterRenderer {
  /**
   * Renders a resolved layout onto a Fabric.js Canvas instance.
   */
  public static async renderToCanvas(
    canvas: Canvas,
    layout: ResolvedPosterLayout,
    options: RenderOptions = {}
  ): Promise<void> {
    const { isInteractive = false, previewScale = 1.0, onElementModified } = options;
    const { canvasWidth, canvasHeight, elements } = layout;

    // Reset canvas objects
    canvas.clear();

    // Set dimensions and display zoom
    canvas.setDimensions({
      width: Math.round(canvasWidth * previewScale),
      height: Math.round(canvasHeight * previewScale),
    });
    canvas.setZoom(previewScale);

    // Default base background color
    canvas.backgroundColor = '#0A0F1D';

    // Render elements in strict order
    for (const el of elements) {
      if (el.type === 'background' && el.imageUrl) {
        try {
          const img = await FabricImage.fromURL(el.imageUrl, {
            crossOrigin: 'anonymous',
          });

          // Respect the resolved fit mode. The layout engine owns offsets and
          // scale; the renderer only performs aspect-ratio-preserving fitting.
          const imgW = img.width || 1;
          const imgH = img.height || 1;
          const targetWidth = el.width || canvasWidth;
          const targetHeight = el.height || canvasHeight;
          const scale = (el.imageFit || 'cover') === 'contain'
            ? Math.min(targetWidth / imgW, targetHeight / imgH)
            : Math.max(targetWidth / imgW, targetHeight / imgH);
          const actualWidth = imgW * scale;
          const actualHeight = imgH * scale;
          const centeredLeft = (canvasWidth - actualWidth) / 2;
          const centeredTop = (canvasHeight - actualHeight) / 2;

          img.set({
            left: centeredLeft + (el.x || 0),
            top: centeredTop + (el.y || 0),
            scaleX: scale,
            scaleY: scale,
            selectable: isInteractive,
            hasControls: false,
            hasBorders: isInteractive,
            borderColor: '#38BDF8',
            hoverCursor: isInteractive ? 'grab' : 'default',
            data: { id: el.id, type: el.type },
          });

          canvas.add(img);
          canvas.sendObjectToBack(img);
        } catch (err) {
          console.warn('Could not load background image:', err);
        }
      } else if (el.type === 'overlay') {
        let fillStyle: any = el.fill || '#000000';

        if (el.gradient) {
          fillStyle = new Gradient({
            type: el.gradient.type,
            coords:
              el.width > el.height
                ? { x1: 0, y1: 0, x2: el.width, y2: 0 }
                : { x1: 0, y1: 0, x2: 0, y2: el.height },
            colorStops: el.gradient.stops.map((s) => ({
              offset: s.offset,
              color: s.color,
            })),
          });
        }

        const rect = new Rect({
          left: el.x,
          top: el.y,
          width: el.width,
          height: el.height,
          fill: fillStyle,
          opacity: el.opacity ?? 0.7,
          selectable: false,
          evented: false,
          data: { id: el.id, type: el.type },
        });

        canvas.add(rect);
      } else if (el.type === 'logo' && el.imageUrl) {
        try {
          const logoImg = await FabricImage.fromURL(el.imageUrl, {
            crossOrigin: 'anonymous',
          });

          const naturalW = logoImg.width || 1;
          const naturalH = logoImg.height || 1;
          // Scale uniformly to prevent squishing or distortion
          const scale = Math.min(el.width / naturalW, el.height / naturalH);
          const actualW = naturalW * scale;
          const actualH = naturalH * scale;

          logoImg.set({
            left: el.x + (el.width - actualW) / 2,
            top: el.y + (el.height - actualH) / 2,
            scaleX: scale,
            scaleY: scale,
            opacity: el.opacity !== undefined ? el.opacity : 1,
            selectable: isInteractive,
            hasControls: false,
            hasBorders: isInteractive,
            borderColor: '#38BDF8',
            hoverCursor: isInteractive ? 'move' : 'default',
            data: { id: el.id, type: el.type },
          });

          canvas.add(logoImg);
        } catch (err) {
          console.warn('Could not load logo image:', err);
        }
      } else if (['intro', 'heading', 'paragraph', 'footer', 'text'].includes(el.type) && el.text) {
        const weightMap: Record<string, string> = {
          regular: '400',
          medium: '500',
          semibold: '600',
          bold: '700',
          extrabold: '800',
        };
        const rawWeight = (el.fontWeight || '400').toString().toLowerCase();
        const resolvedWeight = weightMap[rawWeight] || el.fontWeight || '400';
        const charSpacing = (el as any).letterSpacing !== undefined ? Math.round((el as any).letterSpacing * 100) : 0;

        const textbox = new Textbox(el.text, {
          left: el.x,
          top: el.y,
          width: el.width,
          fontSize: el.fontSize,
          fontFamily: el.fontFamily || 'Plus Jakarta Sans',
          fontWeight: resolvedWeight,
          fill: el.color || '#FFFFFF',
          textAlign: el.textAlign || 'left',
          lineHeight: el.lineHeight || 1.2,
          charSpacing,
          opacity: el.opacity !== undefined ? el.opacity : 1,
          selectable: isInteractive,
          hasControls: false,
          hasBorders: isInteractive,
          borderColor: '#38BDF8',
          hoverCursor: isInteractive ? 'move' : 'default',
          lockScalingX: true,
          lockScalingY: true,
          lockRotation: true,
          splitByGrapheme: false,
          data: { id: el.id, type: el.type },
        });
        // Fabric aligns horizontally but has no native vertical alignment for
        // Textbox. Position the measured block within its resolved canvas box.
        const verticalAlign = (el as any).verticalAlign || 'top';
        if (verticalAlign !== 'top' && el.height > textbox.height) {
          textbox.set({ top: el.y + (verticalAlign === 'middle' ? (el.height - textbox.height) / 2 : el.height - textbox.height) });
        }

        canvas.add(textbox);
      } else if (el.type === 'cta-button' && el.text) {
        // Resolve fill (gradient or solid)
        let fillValue: any = el.fill || '#E5173F';
        if (el.gradient && el.gradient.stops && el.gradient.stops.length > 0) {
          const isRadial = el.gradient.type === 'radial';
          fillValue = new Gradient({
            type: isRadial ? 'radial' : 'linear',
            coords: isRadial
              ? {
                  r1: 0,
                  r2: Math.max(el.width, el.height) / 2,
                  x1: el.width / 2,
                  y1: el.height / 2,
                  x2: el.width / 2,
                  y2: el.height / 2,
                }
              : {
                  x1: 0,
                  y1: 0,
                  x2: el.width,
                  y2: 0,
                },
            colorStops: el.gradient.stops.map((s) => ({ offset: s.offset, color: s.color })),
          });
        }

        const borderRadius = el.borderRadius !== undefined ? el.borderRadius : Math.round(el.height * 0.35);

        const btnRect = new Rect({
          left: el.x,
          top: el.y,
          width: el.width,
          height: el.height,
          fill: fillValue,
          stroke: el.borderColor || undefined,
          strokeWidth: el.borderWidth || 0,
          rx: borderRadius,
          ry: borderRadius,
          opacity: el.opacity !== undefined ? el.opacity : 1,
          selectable: false,
          evented: false,
          data: { id: el.id + '-bg', type: el.type },
        });
        canvas.add(btnRect);

        // Position from the physical centre of the button. Textbox padding is
        // not a vertical-alignment mechanism and was making labels sit high.
        const labelInset = Math.max(4, Math.round((el.height || 32) * 0.16));
        const btnTextbox = new Textbox(el.text, {
          left: el.x + el.width / 2,
          top: el.y + el.height / 2,
          originX: 'center',
          originY: 'center',
          width: Math.max(1, el.width - labelInset * 2),
          fontSize: el.fontSize || 16,
          fontFamily: el.fontFamily || 'Plus Jakarta Sans',
          fontWeight: el.fontWeight || '700',
          fill: el.color || '#FFFFFF',
          textAlign: el.textAlign || 'center',
          lineHeight: 1.0,
          opacity: el.opacity !== undefined ? el.opacity : 1,
          selectable: isInteractive,
          hasControls: false,
          hasBorders: isInteractive,
          borderColor: '#38BDF8',
          hoverCursor: isInteractive ? 'move' : 'default',
          data: { id: el.id, type: el.type },
          padding: 0,
          splitByGrapheme: true,
        });
        canvas.add(btnTextbox);
      } else if (el.type === 'shape') {
        let shapeFill: any = el.fill || el.color || '#3B82F6';
        if (el.gradient && el.gradient.stops && el.gradient.stops.length > 0) {
          const isRadial = el.gradient.type === 'radial';
          shapeFill = new Gradient({
            type: isRadial ? 'radial' : 'linear',
            coords: isRadial
              ? {
                  r1: 0,
                  r2: Math.max(el.width, el.height) / 2,
                  x1: el.width / 2,
                  y1: el.height / 2,
                  x2: el.width / 2,
                  y2: el.height / 2,
                }
              : {
                  x1: 0,
                  y1: 0,
                  x2: el.width,
                  y2: 0,
                },
            colorStops: el.gradient.stops.map((s) => ({ offset: s.offset, color: s.color })),
          });
        }

        if (el.shapeType === 'circle') {
          const radius = Math.round(Math.min(el.width, el.height) / 2);
          const circle = new Circle({
            left: el.x,
            top: el.y,
            radius,
            fill: shapeFill,
            stroke: el.borderColor || undefined,
            strokeWidth: el.borderWidth || 0,
            opacity: el.opacity !== undefined ? el.opacity : 1,
            selectable: isInteractive,
            hasControls: false,
            hasBorders: isInteractive,
            borderColor: '#38BDF8',
            hoverCursor: isInteractive ? 'move' : 'default',
            data: { id: el.id, type: el.type },
          });
          canvas.add(circle);
        } else {
          const rx = el.borderRadius !== undefined ? el.borderRadius : 8;
          const rect = new Rect({
            left: el.x,
            top: el.y,
            width: el.width,
            height: el.height,
            fill: shapeFill,
            stroke: el.borderColor || undefined,
            strokeWidth: el.borderWidth || 0,
            opacity: el.opacity !== undefined ? el.opacity : 1,
            rx,
            ry: rx,
            selectable: isInteractive,
            hasControls: false,
            hasBorders: isInteractive,
            borderColor: '#38BDF8',
            hoverCursor: isInteractive ? 'move' : 'default',
            data: { id: el.id, type: el.type },
          });
          canvas.add(rect);
        }
      }
    }

    // Attach drag listener to report user modifications if interactive
    if (isInteractive && onElementModified) {
      canvas.off('object:modified');
      canvas.on('object:modified', (e) => {
        const target = e.target;
        if (target && target.get('data')) {
          const targetData = target.get('data') as { id: string };
          if (targetData?.id) {
            onElementModified(targetData.id, target.left || 0, target.top || 0);
          }
        }
      });
    }

    canvas.renderAll();
  }

  /**
   * Renders a high-resolution export image (PNG data URL) for a format without touching the visible DOM.
   */
  public static async renderToDataURL(layout: ResolvedPosterLayout): Promise<string> {
    const hiddenCanvasEl = document.createElement('canvas');
    hiddenCanvasEl.width = layout.canvasWidth;
    hiddenCanvasEl.height = layout.canvasHeight;

    const offscreenCanvas = new Canvas(hiddenCanvasEl, {
      width: layout.canvasWidth,
      height: layout.canvasHeight,
      selection: false,
    });

    await this.renderToCanvas(offscreenCanvas, layout, {
      isInteractive: false,
      previewScale: 1.0,
    });

    const dataUrl = offscreenCanvas.toDataURL({
      format: 'png',
      multiplier: 1.0,
      quality: 1.0,
    });

    offscreenCanvas.dispose();
    return dataUrl;
  }
}
