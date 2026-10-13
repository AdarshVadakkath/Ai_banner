import {
  PosterFormat,
  PosterTemplate,
  CampaignContent,
  CampaignAssets,
  LayoutFamily,
  LayoutPresetConfig,
  ResolvedPosterLayout,
  ResolvedElement,
  ValidationWarning,
  FormatAdjustment,
} from '../types/poster';

/**
 * Deterministically maps canvas dimensions to a layout family.
 */
export function selectLayoutFamily(width: number, height: number, category?: string): LayoutFamily {
  const ratio = width / height;

  // Ad units need their own hierarchy: a 728x90 banner should never inherit a
  // social landscape's stacked copy rules, and tall display ads need more text
  // room than a normal portrait post.
  if (height <= 120 || ratio >= 4.5) return 'compact';
  if (ratio <= 0.45 || (category === 'banner' && ratio <= 0.6 && height >= 500)) return 'skyscraper';

  if (ratio < 0.9) {
    return 'portrait'; // e.g. 4:5 (0.8), 9:16 (0.5625)
  }

  if (ratio >= 0.9 && ratio <= 1.25) {
    return 'square'; // 1:1
  }

  if (category === 'banner' || (ratio > 1.25 && ratio <= 1.95 && height < 750)) {
    return 'landscape'; // e.g. 1200x628
  }

  return 'widescreen'; // e.g. 1920x1080 (1.777)
}

export type LayoutTemplateId =
  | 'landscape-split'
  | 'landscape-text-focused'
  | 'square-balanced'
  | 'portrait-stack'
  | 'skyscraper-stack'
  | 'compact-strip';

/** Select a composition from geometry and content density, with no randomness. */
export function selectLayoutTemplate(
  family: LayoutFamily,
  content: CampaignContent,
  width: number,
  height: number
): LayoutTemplateId {
  const density = (content.mainHeading?.length || 0) + (content.supportingParagraph?.length || 0);
  if (family === 'compact') return 'compact-strip';
  if (family === 'skyscraper') return 'skyscraper-stack';
  if (family === 'portrait') return 'portrait-stack';
  if (family === 'square') return 'square-balanced';
  if (family === 'landscape' || family === 'widescreen') {
    return density > 150 || width / height < 1.55 ? 'landscape-text-focused' : 'landscape-split';
  }
  return 'square-balanced';
}

/**
 * Validates text fields against template character limits.
 */
export function validateContentLimits(
  content: CampaignContent,
  template: PosterTemplate
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const limits = template.characterLimits;

  if (content.introText && content.introText.length > limits.introText) {
    const excess = content.introText.length - limits.introText;
    warnings.push({
      field: 'introText',
      severity: 'error',
      excessCharacters: excess,
      message: `Shorten your introductory text by ${excess} character${excess > 1 ? 's' : ''}`,
    });
  }

  if (content.mainHeading && content.mainHeading.length > limits.mainHeading) {
    const excess = content.mainHeading.length - limits.mainHeading;
    warnings.push({
      field: 'mainHeading',
      severity: 'error',
      excessCharacters: excess,
      message: `Shorten your main heading by ${excess} character${excess > 1 ? 's' : ''}`,
    });
  }

  if (content.supportingParagraph && content.supportingParagraph.length > limits.supportingParagraph) {
    const excess = content.supportingParagraph.length - limits.supportingParagraph;
    warnings.push({
      field: 'supportingParagraph',
      severity: 'error',
      excessCharacters: excess,
      message: `Shorten your supporting paragraph by ${excess} character${excess > 1 ? 's' : ''}`,
    });
  }

  if (content.dateText && content.dateText.length > limits.dateText) {
    const excess = content.dateText.length - limits.dateText;
    warnings.push({
      field: 'dateText',
      severity: 'error',
      excessCharacters: excess,
      message: `Shorten your date details by ${excess} character${excess > 1 ? 's' : ''}`,
    });
  }

  if (content.locationText && content.locationText.length > limits.locationText) {
    const excess = content.locationText.length - limits.locationText;
    warnings.push({
      field: 'locationText',
      severity: 'error',
      excessCharacters: excess,
      message: `Shorten your location info by ${excess} character${excess > 1 ? 's' : ''}`,
    });
  }

  return warnings;
}

/**
 * Simulates text wrapping into lines and returns estimated line count.
 */
export interface TextMeasurement { width: number; height: number; lines: string[]; lineCount: number; }
export type CtaVariant = 'primary' | 'secondary' | 'tertiary';

type TextContext = Pick<CanvasRenderingContext2D, 'font' | 'measureText'>;

function getTextContext(): TextContext | null {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(1, 1).getContext('2d');
  if (typeof document !== 'undefined') return document.createElement('canvas').getContext('2d');
  return null;
}

function textWidth(value: string, fontSize: number, fontFamily = 'sans-serif', fontWeight = '400', letterSpacing = 0): number {
  const context = getTextContext();
  if (context) {
    context.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    return context.measureText(value).width + Math.max(0, [...value].length - 1) * letterSpacing;
  }
  // SSR/test fallback only; browser rendering always uses the actual loaded font.
  return [...value].reduce((total, char) => total + (/[MW@#]/.test(char) ? .82 : /[il.,' ]/.test(char) ? .28 : .56) * fontSize, 0);
}

/** Mirrors Fabric's word wrapping and breaks a single long token by grapheme. */
export function measureTextBlock(text: string, fontSize: number, maxLineWidth: number, options: { fontFamily?: string; fontWeight?: string; lineHeight?: number; letterSpacing?: number } = {}): TextMeasurement {
  if (!text?.trim()) return { width: 0, height: 0, lines: [], lineCount: 0 };
  const { fontFamily = 'sans-serif', fontWeight = '400', lineHeight = 1.2, letterSpacing = 0 } = options;
  const lines: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    let line = '';
    for (const token of paragraph.split(/(\s+)/).filter(Boolean)) {
      const candidate = line + token;
      if (line && textWidth(candidate, fontSize, fontFamily, fontWeight, letterSpacing) > maxLineWidth) {
        lines.push(line.trimEnd());
        line = token.trimStart();
      } else if (!line && textWidth(token, fontSize, fontFamily, fontWeight, letterSpacing) > maxLineWidth) {
        let part = '';
        for (const grapheme of [...token]) {
          if (part && textWidth(part + grapheme, fontSize, fontFamily, fontWeight, letterSpacing) > maxLineWidth) { lines.push(part); part = grapheme; }
          else part += grapheme;
        }
        line = part;
      } else line = candidate;
    }
    if (line.trim() || !lines.length) lines.push(line.trimEnd());
  }
  const width = Math.max(...lines.map((line) => textWidth(line, fontSize, fontFamily, fontWeight, letterSpacing)));
  return { width, height: Math.ceil(lines.length * fontSize * lineHeight), lines, lineCount: lines.length };
}

export function estimateLineCount(text: string, fontSize: number, maxLineWidth: number): number {
  return measureTextBlock(text, fontSize, maxLineWidth).lineCount;
}

/** Button geometry is based on the measured label, never a character count. */
export function calculateCtaDimensions(
  text: string,
  availableWidth: number,
  canvasMinDimension: number,
  variant: CtaVariant = 'primary',
  options: { fontFamily?: string; fontWeight?: string; compact?: boolean } = {}
): { width: number; height: number; fontSize: number } {
  const compact = options.compact ?? false;
  const fontSize = compact ? 11 : Math.max(11, Math.min(20, Math.round(canvasMinDimension * 0.022)));
  const paddingX = compact ? 18 : variant === 'tertiary' ? Math.round(fontSize * 1.1) : Math.round(fontSize * 1.65);
  const paddingY = compact ? 8 : variant === 'tertiary' ? Math.round(fontSize * 0.35) : Math.round(fontSize * 0.7);
  const labelWidth = measureTextBlock(text, fontSize, Math.max(1, availableWidth), { fontFamily: options.fontFamily, fontWeight: options.fontWeight }).width;
  const minWidth = compact ? 84 : variant === 'tertiary' ? 72 : 96;
  const maxWidth = Math.max(minWidth, Math.floor(availableWidth * (compact ? 0.34 : 0.72)));
  return {
    width: Math.round(Math.min(maxWidth, Math.max(minWidth, labelWidth + paddingX * 2))),
    height: compact ? 32 : Math.max(variant === 'tertiary' ? 30 : 36, Math.round(fontSize + paddingY * 2)),
    fontSize,
  };
}

/**
 * Deterministically calculates fitting font size within min/max bounds and max line limits.
 */
export function calculateFittedFontSize(
  text: string,
  initialFontSize: number,
  minFontSize: number,
  maxFontSize: number,
  maxLineWidth: number,
  maxLines: number
): { fontSize: number; lines: number; overflows: boolean } {
  if (!text) {
    return { fontSize: initialFontSize, lines: 0, overflows: false };
  }

  let size = Math.min(maxFontSize, Math.max(minFontSize, Math.round(initialFontSize)));
  let lines = estimateLineCount(text, size, maxLineWidth);

  while (lines > maxLines && size > minFontSize) {
    size = Math.max(minFontSize, size - 2);
    lines = estimateLineCount(text, size, maxLineWidth);
  }

  const overflows = lines > maxLines;
  return { fontSize: size, lines, overflows };
}

export interface LayoutEngineInput {
  template: PosterTemplate;
  content: CampaignContent;
  assets: CampaignAssets;
  format: PosterFormat;
  adjustment?: FormatAdjustment;
}

const TEXT_TYPES = new Set(['intro', 'heading', 'paragraph', 'footer', 'text', 'cta-button']);

/** Validate the exact resolved rectangles before renderer/export consumes them. */
export function validateResolvedLayout(layout: Pick<ResolvedPosterLayout, 'canvasWidth' | 'canvasHeight' | 'elements'>, safeMargin = 0): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const visible = layout.elements.filter((el) => el.type !== 'background' && el.type !== 'overlay');
  for (const el of visible) {
    if (el.x < safeMargin || el.y < safeMargin || el.x + el.width > layout.canvasWidth - safeMargin || el.y + el.height > layout.canvasHeight - safeMargin) {
      warnings.push({ field: el.id, severity: 'error', message: `${el.type} exceeds its safe layout bounds.` });
    }
    if (TEXT_TYPES.has(el.type) && el.text && el.fontSize) {
      const measured = measureTextBlock(el.text, el.fontSize, el.width, { fontFamily: el.fontFamily, fontWeight: el.fontWeight, lineHeight: el.lineHeight, letterSpacing: el.letterSpacing });
      if (measured.height > el.height + 1) warnings.push({ field: el.id, severity: 'error', message: `${el.type} text overflows its assigned region.` });
    }
  }
  for (let index = 0; index < visible.length; index++) {
    for (let other = index + 1; other < visible.length; other++) {
      const a = visible[index]; const b = visible[other];
      if ((a.type === 'logo' || b.type === 'logo') && (a.type === 'cta-button' || b.type === 'cta-button')) continue;
      const overlaps = a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
      if (overlaps) warnings.push({ field: `${a.id}:${b.id}`, severity: 'warning', message: `${a.type} overlaps ${b.type}; applying deterministic fallback when possible.` });
    }
  }
  return warnings;
}

/**
 * Main Layout Engine: Takes template, content, assets, and format, and computes
 * an exact, deterministic layout ready for Fabric.js or Sharp.
 */
export class LayoutEngine {
  public static computeLayout(input: LayoutEngineInput): ResolvedPosterLayout {
    const { template, content, assets, format, adjustment } = input;
    const width = format.width;
    const height = format.height;

    const layoutFamily = selectLayoutFamily(width, height, format.category);
    const templateId = selectLayoutTemplate(layoutFamily, content, width, height);
    const presetFamily: Exclude<LayoutFamily, 'compact' | 'skyscraper'> = layoutFamily === 'compact' ? 'landscape' : layoutFamily === 'skyscraper' ? 'portrait' : layoutFamily;
    const preset: LayoutPresetConfig = template.presets[presetFamily] || template.presets.square;

    const warnings: ValidationWarning[] = validateContentLimits(content, template);
    const elements: ResolvedElement[] = [];

    // 1. Resolve Background Image Element
    const activeBgId = adjustment?.backgroundId || assets.selectedBackgroundId;
    const activeBg = assets.backgroundImages.find((b) => b.id === activeBgId) || assets.backgroundImages[0];

    if (activeBg) {
      const offsetX = adjustment?.offsetX || 0;
      const offsetY = adjustment?.offsetY || 0;
      const scaleMultiplier = adjustment?.scale || 1.0;

      elements.push({
        id: 'element-background',
        type: 'background',
        x: offsetX * (width * 0.25),
        y: offsetY * (height * 0.25),
        width: width * scaleMultiplier,
        height: height * scaleMultiplier,
        imageUrl: activeBg.url,
        imageFit: assets.backgroundFit || 'cover',
        isDraggable: true,
      });
    }

    // 2. Readability Scrim / Contrast Overlay - Omitted per user request to preserve clean background image
    // (no unwanted black opacity layer)

    // Specialized horizontal layout for Leaderboard (728x90) strip format
    if (layoutFamily === 'compact') {
      const accentColor = template.colorScheme.accent || '#38BDF8';
      const textPrimaryColor = template.colorScheme.textPrimary || '#FFFFFF';

      let logoW = 0;
      if (assets.logoUrl) {
        const logoH = 34;
        const logoAspect = assets.logoAspectRatio || 2.5;
        logoW = Math.min(160, Math.round(logoH * logoAspect));
        elements.push({
          id: 'element-logo',
          type: 'logo',
          x: 24,
          y: Math.round((height - logoH) / 2),
          width: logoW,
          height: logoH,
          imageUrl: assets.logoUrl,
          isDraggable: true,
        });
      }

      // CTA button on far right
      const ctaText = content.ctaText || 'Book your study →';
      const compactCta = calculateCtaDimensions(ctaText, width - 48, height, 'primary', {
        fontFamily: template.typography.bodyFontFamily,
        fontWeight: '700',
        compact: true,
      });
      const ctaW = compactCta.width;
      const ctaH = compactCta.height;
      const ctaX = width - 24 - ctaW;
      const ctaY = Math.round((height - ctaH) / 2);
      elements.push({
        id: 'element-cta',
        type: 'cta-button',
        x: ctaX,
        y: ctaY,
        width: ctaW,
        height: ctaH,
        text: ctaText,
        fontSize: compactCta.fontSize,
        fontFamily: template.typography.bodyFontFamily,
        fontWeight: '700',
        lineHeight: 1.0,
        color: template.colorScheme.ctaText || '#FFFFFF',
        fill: template.colorScheme.ctaBackground || template.colorScheme.secondary || '#E5173F',
        ctaType: 'primary',
        textAlign: 'center',
        isDraggable: true,
      });

      // Text column between logo and button
      const textStartX = assets.logoUrl ? 24 + logoW + 28 : 28;
      const textAvailW = ctaX - textStartX - 20;

      if (content.introText) {
        elements.push({
          id: 'element-intro',
          type: 'intro',
          x: textStartX,
          y: 20,
          width: textAvailW,
          height: 14,
          text: content.introText,
          fontSize: 10,
          fontFamily: template.typography.bodyFontFamily,
          fontWeight: '700',
          lineHeight: 1.2,
          color: template.colorScheme.introText ?? accentColor,
          textAlign: 'left',
          isDraggable: true,
        });
      }

      if (content.mainHeading) {
        elements.push({
          id: 'element-heading',
          type: 'heading',
          x: textStartX,
          y: content.introText ? 38 : 30,
          width: textAvailW,
          height: 24,
          text: content.mainHeading,
          fontSize: 13,
          fontFamily: template.typography.headingFontFamily,
          fontWeight: '800',
          lineHeight: 1.15,
          color: textPrimaryColor,
          textAlign: 'left',
          isDraggable: true,
        });
      }

      if (adjustment?.elementOverrides) {
        for (const el of elements) {
          const override = adjustment.elementOverrides[el.id];
          if (override) {
            if (override.x !== undefined) el.x = override.x;
            if (override.y !== undefined) el.y = override.y;
            if (override.scale !== undefined) {
              el.width = el.width * override.scale;
              el.height = el.height * override.scale;
            }
            if (override.fontFamily !== undefined) el.fontFamily = override.fontFamily;
            if (override.fontWeight !== undefined) el.fontWeight = override.fontWeight;
            if (override.fontSize !== undefined) el.fontSize = override.fontSize;
            if (override.color !== undefined) el.color = override.color;
            if (override.textAlign !== undefined) el.textAlign = override.textAlign;
          }
        }
      }

      const compactLayout = {
        format,
        canvasWidth: width,
        canvasHeight: height,
        layoutFamily,
        elements,
        warnings,
        templateId,
        validationAttempts: 1,
        isValid: true,
      };
      const validation = validateResolvedLayout(compactLayout, 4);
      compactLayout.warnings.push(...validation);
      compactLayout.isValid = !validation.some((warning) => warning.severity === 'error');
      return compactLayout;
    }

    // Calculate Content Safe Bounds
    const padTop = height * preset.padding.top;
    const padBottom = height * preset.padding.bottom;
    const padLeft = width * preset.padding.left;
    const padRight = width * preset.padding.right;

    let contentWidth = width - padLeft - padRight;
    // For wide/landscape banners, dedicate 62% of the width to the text column to keep visual breathing room
    if (layoutFamily === 'landscape' || layoutFamily === 'widescreen') {
      contentWidth = Math.min(contentWidth, width * 0.58);
    }

    const minDimension = Math.min(width, height);
    const tc = preset.textConstraints;
    const elementGap = Math.round(minDimension * tc.elementSpacingRatio);

    // 3. Resolve Company Logo
    let logoBottomY = padTop;
    if (assets.logoUrl && preset.logoPosition !== 'none') {
      const maxLogoH = height <= 120
        ? Math.round(height * 0.42)
        : height <= 350
        ? Math.round(height * 0.18)
        : Math.max(Math.round(height * Math.max(preset.maxLogoHeightRatio || 0.08, 0.09)), 80);
      const logoAspect = assets.logoAspectRatio || (assets.logoWidth && assets.logoHeight ? assets.logoWidth / assets.logoHeight : 2.5);
      let logoW = Math.round(maxLogoH * logoAspect);
      let logoH = maxLogoH;

      const maxAllowedW = Math.min(contentWidth * 0.5, 420);
      if (logoW > maxAllowedW) {
        logoW = Math.round(maxAllowedW);
        logoH = Math.round(logoW / logoAspect);
      }

      let logoX = padLeft;
      if (preset.logoPosition === 'top-center' || preset.contentAlignment === 'center') {
        logoX = padLeft + (contentWidth - logoW) / 2;
      }

      const logoY = padTop;
      logoBottomY = logoY + logoH;

      elements.push({
        id: 'element-logo',
        type: 'logo',
        x: logoX,
        y: logoY,
        width: logoW,
        height: logoH,
        imageUrl: assets.logoUrl,
        isDraggable: true,
      });
    }

    const textAlign = preset.contentAlignment;
    const textPrimaryColor = template.colorScheme.textPrimary;
    const textSecondaryColor = template.colorScheme.textSecondary;
    const accentColor = template.colorScheme.accent;

    // Carousel cards are consumed as a 1080 × 1080 social placement, often
    // alongside an image subject on the right.  Do not let them inherit the
    // generic square flow: it estimates wrapped lines before Fabric applies
    // the selected font, which could let a headline paint over the paragraph.
    // This composition reserves independent lanes for copy, CTA and metadata.
    const isCarouselCard = format.id === 'carousel-card' && width === 1080 && height === 1080;
    if (isCarouselCard) {
      const carouselWidth = Math.min(contentWidth, Math.round(width * 0.62));
      const carouselGap = Math.max(22, Math.round(height * 0.024));
      const footerFontSize = Math.max(18, Math.round(height * 0.022));
      const footerText = [content.dateText, content.locationText]
        .filter((value) => Boolean(value && value.trim().length > 0))
        .join('  •  ');
      const footerMeasure = measureTextBlock(footerText, footerFontSize, carouselWidth, {
        fontFamily: template.typography.bodyFontFamily,
        fontWeight: '600',
        lineHeight: 1.3,
      });
      const footerH = footerText ? Math.ceil(footerMeasure.height) : 0;
      const footerY = footerText ? height - padBottom - footerH : height - padBottom;

      const ctaText = content.ctaText?.trim() || '';
      const ctaDimensions = ctaText
        ? calculateCtaDimensions(ctaText, carouselWidth, minDimension, 'primary', {
            fontFamily: template.typography.bodyFontFamily,
            fontWeight: '700',
          })
        : null;
      const ctaY = ctaDimensions
        ? footerY - carouselGap * 1.6 - ctaDimensions.height
        : footerY;

      const introFontSize = Math.max(18, Math.round(minDimension * tc.introFontSizeRatio));
      const introMeasure = content.introText?.trim()
        ? measureTextBlock(content.introText, introFontSize, carouselWidth, {
            fontFamily: template.typography.bodyFontFamily,
            fontWeight: '700',
            lineHeight: 1.2,
          })
        : null;

      let headingFontSize = Math.min(tc.maxHeadingFontSize, Math.round(minDimension * tc.headingFontSizeRatio));
      let headingMeasure = measureTextBlock(content.mainHeading || '', headingFontSize, carouselWidth, {
        fontFamily: template.typography.headingFontFamily,
        fontWeight: template.typography.headingWeight,
        lineHeight: 1.15,
      });
      while (headingMeasure.lineCount > tc.maxHeadingLines && headingFontSize > tc.minHeadingFontSize) {
        headingFontSize = Math.max(tc.minHeadingFontSize, headingFontSize - 2);
        headingMeasure = measureTextBlock(content.mainHeading || '', headingFontSize, carouselWidth, {
          fontFamily: template.typography.headingFontFamily,
          fontWeight: template.typography.headingWeight,
          lineHeight: 1.15,
        });
      }

      let paragraphFontSize = Math.max(18, Math.round(minDimension * tc.paragraphFontSizeRatio));
      let paragraphMeasure = measureTextBlock(content.supportingParagraph || '', paragraphFontSize, carouselWidth, {
        fontFamily: template.typography.bodyFontFamily,
        fontWeight: template.typography.bodyWeight,
        lineHeight: 1.35,
      });
      while (paragraphMeasure.lineCount > tc.maxParagraphLines && paragraphFontSize > 18) {
        paragraphFontSize -= 2;
        paragraphMeasure = measureTextBlock(content.supportingParagraph || '', paragraphFontSize, carouselWidth, {
          fontFamily: template.typography.bodyFontFamily,
          fontWeight: template.typography.bodyWeight,
          lineHeight: 1.35,
        });
      }

      const copyHeight =
        (introMeasure ? introMeasure.height + Math.round(carouselGap * 0.75) : 0) +
        (headingMeasure.height ? headingMeasure.height + carouselGap : 0) +
        paragraphMeasure.height;
      const copyTop = Math.max(
        logoBottomY + Math.round(height * 0.16),
        Math.round((logoBottomY + ctaY - copyHeight) / 2)
      );
      let copyY = Math.min(copyTop, ctaY - carouselGap - copyHeight);

      if (introMeasure) {
        elements.push({
          id: 'element-intro', type: 'intro', x: padLeft, y: Math.round(copyY), width: carouselWidth,
          height: introMeasure.height, text: content.introText, fontSize: introFontSize,
          fontFamily: template.typography.bodyFontFamily, fontWeight: '700', lineHeight: 1.2,
          color: template.colorScheme.introText ?? accentColor, textAlign, isDraggable: true,
        });
        copyY += introMeasure.height + Math.round(carouselGap * 0.75);
      }
      if (headingMeasure.height) {
        elements.push({
          id: 'element-heading', type: 'heading', x: padLeft, y: Math.round(copyY), width: carouselWidth,
          height: headingMeasure.height, text: content.mainHeading, fontSize: headingFontSize,
          fontFamily: template.typography.headingFontFamily, fontWeight: template.typography.headingWeight,
          lineHeight: 1.15, color: textPrimaryColor, textAlign, isDraggable: true,
        });
        copyY += headingMeasure.height + carouselGap;
      }
      if (paragraphMeasure.height) {
        elements.push({
          id: 'element-paragraph', type: 'paragraph', x: padLeft, y: Math.round(copyY), width: carouselWidth,
          height: paragraphMeasure.height, text: content.supportingParagraph, fontSize: paragraphFontSize,
          fontFamily: template.typography.bodyFontFamily, fontWeight: template.typography.bodyWeight,
          lineHeight: 1.35, color: textSecondaryColor, textAlign, isDraggable: true,
        });
      }
      if (ctaDimensions) {
        elements.push({
          id: 'element-cta', type: 'cta-button', x: textAlign === 'center' ? padLeft + (carouselWidth - ctaDimensions.width) / 2 : padLeft,
          y: Math.round(ctaY), width: ctaDimensions.width, height: ctaDimensions.height, text: ctaText,
          fontSize: ctaDimensions.fontSize, fontFamily: template.typography.bodyFontFamily, fontWeight: '700',
          lineHeight: 1.0, color: template.colorScheme.ctaText || '#FFFFFF',
          fill: template.colorScheme.ctaBackground || template.colorScheme.secondary || '#E5173F',
          ctaType: 'primary', textAlign: 'center', isDraggable: true,
        });
      }
      if (footerText) {
        elements.push({
          id: 'element-footer', type: 'footer', x: padLeft, y: Math.round(footerY), width: carouselWidth,
          height: footerH, text: footerText, fontSize: footerFontSize, fontFamily: template.typography.bodyFontFamily,
          fontWeight: '600', lineHeight: 1.3, color: template.colorScheme.footerText ?? (accentColor || textSecondaryColor),
          textAlign, isDraggable: true,
        });
      }

      if (adjustment?.elementOverrides) {
        for (const el of elements) {
          const override = adjustment.elementOverrides[el.id];
          if (!override) continue;
          if (override.x !== undefined) el.x = override.x;
          if (override.y !== undefined) el.y = override.y;
          if (override.scale !== undefined) { el.width *= override.scale; el.height *= override.scale; }
          if (override.fontFamily !== undefined) el.fontFamily = override.fontFamily;
          if (override.fontWeight !== undefined) el.fontWeight = override.fontWeight;
          if (override.fontSize !== undefined) el.fontSize = override.fontSize;
          if (override.color !== undefined) el.color = override.color;
          if (override.textAlign !== undefined) el.textAlign = override.textAlign;
        }
      }

      const carouselLayout = { format, canvasWidth: width, canvasHeight: height, layoutFamily, elements, warnings, templateId, validationAttempts: 1, isValid: true };
      const validation = validateResolvedLayout(carouselLayout, Math.min(padLeft, padRight, padTop, padBottom) * 0.35);
      carouselLayout.warnings.push(...validation);
      carouselLayout.isValid = !carouselLayout.warnings.some((warning) => warning.severity === 'error');
      return carouselLayout;
    }

    // The 300 × 250 medium rectangle is a compact display unit, not a
    // reduced social post. Reserve a narrow, non-overlapping copy column and
    // keep the CTA / footer in fixed bottom lanes.
    const isMediumRectangle = format.id === 'medium-rectangle' && width === 300 && height === 250;
    if (isMediumRectangle) {
      const columnWidth = Math.min(contentWidth, 210);
      const gap = 6;
      const footerText = [content.dateText, content.locationText].filter(Boolean).join('  •  ');
      const footerSize = 11;
      const footerMeasure = measureTextBlock(footerText, footerSize, columnWidth, { fontFamily: template.typography.bodyFontFamily, fontWeight: '600', lineHeight: 1.25 });
      const footerY = height - padBottom - footerMeasure.height;
      const ctaText = content.ctaText?.trim() || '';
      const cta = ctaText ? calculateCtaDimensions(ctaText, columnWidth, minDimension, 'primary', { fontFamily: template.typography.bodyFontFamily, fontWeight: '700', compact: true }) : null;
      const ctaY = cta ? footerY - gap * 2 - cta.height : footerY;
      const introSize = 10;
      const introMeasure = content.introText?.trim() ? measureTextBlock(content.introText, introSize, columnWidth, { fontFamily: template.typography.bodyFontFamily, fontWeight: '700', lineHeight: 1.2 }) : null;
      let headingSize = 17;
      let headingMeasure = measureTextBlock(content.mainHeading || '', headingSize, columnWidth, { fontFamily: template.typography.headingFontFamily, fontWeight: template.typography.headingWeight, lineHeight: 1.1 });
      while (headingMeasure.lineCount > 2 && headingSize > 13) {
        headingSize -= 1;
        headingMeasure = measureTextBlock(content.mainHeading || '', headingSize, columnWidth, { fontFamily: template.typography.headingFontFamily, fontWeight: template.typography.headingWeight, lineHeight: 1.1 });
      }
      let paragraphSize = 12;
      let paragraphMeasure = measureTextBlock(content.supportingParagraph || '', paragraphSize, columnWidth, { fontFamily: template.typography.bodyFontFamily, fontWeight: template.typography.bodyWeight, lineHeight: 1.25 });
      while (paragraphMeasure.lineCount > 3 && paragraphSize > 10) {
        paragraphSize -= 1;
        paragraphMeasure = measureTextBlock(content.supportingParagraph || '', paragraphSize, columnWidth, { fontFamily: template.typography.bodyFontFamily, fontWeight: template.typography.bodyWeight, lineHeight: 1.25 });
      }
      const copyHeight = (introMeasure ? introMeasure.height + gap : 0) + (headingMeasure.height ? headingMeasure.height + gap : 0) + paragraphMeasure.height;
      let y = Math.max(logoBottomY + 16, Math.min(74, ctaY - gap - copyHeight));
      if (introMeasure) { elements.push({ id: 'element-intro', type: 'intro', x: padLeft, y, width: columnWidth, height: introMeasure.height, text: content.introText, fontSize: introSize, fontFamily: template.typography.bodyFontFamily, fontWeight: '700', lineHeight: 1.2, color: template.colorScheme.introText ?? accentColor, textAlign, isDraggable: true }); y += introMeasure.height + gap; }
      if (headingMeasure.height) { elements.push({ id: 'element-heading', type: 'heading', x: padLeft, y, width: columnWidth, height: headingMeasure.height, text: content.mainHeading, fontSize: headingSize, fontFamily: template.typography.headingFontFamily, fontWeight: template.typography.headingWeight, lineHeight: 1.1, color: textPrimaryColor, textAlign, isDraggable: true }); y += headingMeasure.height + gap; }
      if (paragraphMeasure.height) elements.push({ id: 'element-paragraph', type: 'paragraph', x: padLeft, y, width: columnWidth, height: paragraphMeasure.height, text: content.supportingParagraph, fontSize: paragraphSize, fontFamily: template.typography.bodyFontFamily, fontWeight: template.typography.bodyWeight, lineHeight: 1.25, color: textSecondaryColor, textAlign, isDraggable: true });
      if (cta) elements.push({ id: 'element-cta', type: 'cta-button', x: padLeft, y: ctaY, width: cta.width, height: cta.height, text: ctaText, fontSize: cta.fontSize, fontFamily: template.typography.bodyFontFamily, fontWeight: '700', lineHeight: 1, color: template.colorScheme.ctaText || '#FFFFFF', fill: template.colorScheme.ctaBackground || template.colorScheme.secondary || '#E5173F', ctaType: 'primary', textAlign: 'center', isDraggable: true });
      if (footerText) elements.push({ id: 'element-footer', type: 'footer', x: padLeft, y: footerY, width: columnWidth, height: footerMeasure.height, text: footerText, fontSize: footerSize, fontFamily: template.typography.bodyFontFamily, fontWeight: '600', lineHeight: 1.25, color: template.colorScheme.footerText ?? (accentColor || textSecondaryColor), textAlign, isDraggable: true });
      const mediumLayout = { format, canvasWidth: width, canvasHeight: height, layoutFamily, elements, warnings, templateId, validationAttempts: 1, isValid: true };
      const validation = validateResolvedLayout(mediumLayout, 2);
      mediumLayout.warnings.push(...validation);
      mediumLayout.isValid = !mediumLayout.warnings.some(warning => warning.severity === 'error');
      return mediumLayout;
    }

    // 4. Calculate Text Elements & Typography
    // A. Intro Text
    let introH = 0;
    let introFontSize = Math.round(minDimension * tc.introFontSizeRatio);
    if (content.introText && content.introText.trim().length > 0) {
      introFontSize = Math.max(10, introFontSize);
      introH = Math.round(introFontSize * 1.4);
    }

    // B. Main Heading
    let headingH = 0;
    let headingLines = 0;
    let headingFontSize = Math.round(minDimension * tc.headingFontSizeRatio);
    const effectiveMinHeading = Math.min(tc.minHeadingFontSize, Math.max(12, Math.round(minDimension * 0.055)));
    const effectiveMaxHeading = Math.min(tc.maxHeadingFontSize, Math.max(16, Math.round(minDimension * 0.09)));
    if (content.mainHeading && content.mainHeading.trim().length > 0) {
      const fit = calculateFittedFontSize(
        content.mainHeading,
        headingFontSize,
        effectiveMinHeading,
        effectiveMaxHeading,
        contentWidth,
        tc.maxHeadingLines
      );
      headingFontSize = fit.fontSize;
      headingLines = fit.lines;
      headingH = Math.round(headingLines * headingFontSize * 1.15);

      if (fit.overflows) {
        warnings.push({
          field: 'mainHeading',
          severity: 'warning',
          message: 'Heading text is dense for this format. Consider shortening it for optimal visual balance.',
        });
      }
    }

    // C. Supporting Paragraph
    let paragraphH = 0;
    let paragraphLines = 0;
    let paragraphFontSize = Math.round(minDimension * tc.paragraphFontSizeRatio);
    if (content.supportingParagraph && content.supportingParagraph.trim().length > 0) {
      paragraphFontSize = Math.max(13, paragraphFontSize);
      paragraphLines = estimateLineCount(content.supportingParagraph, paragraphFontSize, contentWidth);
      if (paragraphLines > tc.maxParagraphLines) {
        paragraphFontSize = Math.max(12, paragraphFontSize - 2);
        paragraphLines = estimateLineCount(content.supportingParagraph, paragraphFontSize, contentWidth);
      }
      paragraphH = Math.round(paragraphLines * paragraphFontSize * 1.35);
    }

    // D. Footer Info (Date & Location)
    let footerH = 0;
    const footerFontSize = Math.max(12, Math.round(minDimension * tc.footerFontSizeRatio));
    const hasDate = Boolean(content.dateText && content.dateText.trim().length > 0);
    const hasLocation = Boolean(content.locationText && content.locationText.trim().length > 0);
    const hasFooter = hasDate || hasLocation;

    if (hasFooter) {
      footerH = Math.round(footerFontSize * 1.8);
    }

    // 5. Deterministic Vertical Layout Placement
    // Compute block heights and positions
    const contentBlockHeight =
      (introH > 0 ? introH + elementGap : 0) +
      (headingH > 0 ? headingH + elementGap : 0) +
      (paragraphH > 0 ? paragraphH + elementGap : 0) +
      (footerH > 0 ? footerH : 0);

    let currentY: number;

    if (preset.contentVerticalPosition === 'bottom') {
      // Keep left-aligned copy visually centered instead of pinning it to the
      // lower edge. The logo's computed position is intentionally untouched.
      currentY = Math.max(
        logoBottomY + elementGap,
        Math.round((height - contentBlockHeight) / 2)
      );
    } else if (preset.contentVerticalPosition === 'center') {
      // Centered in available space between logo and bottom
      const availableSpace = height - logoBottomY - padBottom;
      currentY = logoBottomY + Math.max(elementGap, (availableSpace - contentBlockHeight) / 2);
    } else {
      // Top anchored
      currentY = logoBottomY + elementGap * 1.5;
    }

    // Place Intro Element
    if (introH > 0) {
      elements.push({
        id: 'element-intro',
        type: 'intro',
        x: padLeft,
        y: Math.round(currentY),
        width: contentWidth,
        height: introH,
        text: content.introText,
        fontSize: introFontSize,
        fontFamily: template.typography.bodyFontFamily,
        fontWeight: '700',
        lineHeight: 1.2,
        color: template.colorScheme.introText ?? accentColor,
        textAlign,
        isDraggable: true,
      });
      currentY += introH + Math.round(elementGap * 0.7);
    }

    // Place Main Heading Element
    if (headingH > 0) {
      elements.push({
        id: 'element-heading',
        type: 'heading',
        x: padLeft,
        y: Math.round(currentY),
        width: contentWidth,
        height: headingH,
        text: content.mainHeading,
        fontSize: headingFontSize,
        fontFamily: template.typography.headingFontFamily,
        fontWeight: template.typography.headingWeight,
        lineHeight: 1.15,
        color: textPrimaryColor,
        textAlign,
        isDraggable: true,
      });
      currentY += headingH + elementGap;
    }

    // Place Supporting Paragraph Element
    if (paragraphH > 0) {
      elements.push({
        id: 'element-paragraph',
        type: 'paragraph',
        x: padLeft,
        y: Math.round(currentY),
        width: contentWidth,
        height: paragraphH,
        text: content.supportingParagraph,
        fontSize: paragraphFontSize,
        fontFamily: template.typography.bodyFontFamily,
        fontWeight: template.typography.bodyWeight,
        lineHeight: 1.35,
        color: textSecondaryColor,
        textAlign,
        isDraggable: true,
      });
      currentY += paragraphH + elementGap * 1.2;
    }

    // D. Footer Info (Date & Location)
    if (hasFooter) {
      const footerY = Math.max(currentY, height - padBottom - footerH);
      const combinedFooterText = [content.dateText, content.locationText]
        .filter((t) => Boolean(t && t.trim().length > 0))
        .join('  •  ');

      elements.push({
        id: 'element-footer',
        type: 'footer',
        x: padLeft,
        y: Math.round(footerY),
        width: contentWidth,
        height: footerH,
        text: combinedFooterText,
        fontSize: footerFontSize,
        fontFamily: template.typography.bodyFontFamily,
        fontWeight: '600',
        lineHeight: 1.4,
        color: template.colorScheme.footerText ?? (accentColor || textSecondaryColor),
        textAlign,
        isDraggable: true,
      });
    }

    // E. CTA Button
    const ctaText = content.ctaText || '';
    if (ctaText.trim().length > 0) {
      const primaryCta = calculateCtaDimensions(ctaText, contentWidth, minDimension, 'primary', {
        fontFamily: template.typography.bodyFontFamily,
        fontWeight: '700',
      });
      const ctaBtnH = primaryCta.height;
      const ctaFontSize = primaryCta.fontSize;
      const ctaBtnW = primaryCta.width;
      const ctaY = hasFooter
        ? Math.max(currentY, height - padBottom - footerH - elementGap * 1.5 - ctaBtnH)
        : Math.max(currentY, height - padBottom - ctaBtnH);
      const ctaX = preset.contentAlignment === 'center'
        ? padLeft + (contentWidth - ctaBtnW) / 2
        : padLeft;

      elements.push({
        id: 'element-cta',
        type: 'cta-button',
        x: ctaX,
        y: Math.round(ctaY),
        width: ctaBtnW,
        height: ctaBtnH,
        text: ctaText,
        fontSize: ctaFontSize,
        fontFamily: template.typography.bodyFontFamily,
        fontWeight: '700',
        lineHeight: 1.0,
        color: template.colorScheme.ctaText || '#FFFFFF',
        fill: template.colorScheme.ctaBackground || template.colorScheme.secondary || '#E5173F',
        ctaType: 'primary',
        textAlign: 'center',
        isDraggable: true,
      });
    }

    // First deterministic fallback: CTA is essential, so reserve a non-overlap
    // lane above the footer rather than allowing the renderer to paint over it.
    const cta = elements.find((element) => element.type === 'cta-button');
    const footer = elements.find((element) => element.type === 'footer');
    if (cta && footer && cta.y + cta.height > footer.y) {
      cta.y = Math.max(logoBottomY + elementGap, footer.y - elementGap - cta.height);
    }

    // Apply any format-level manual user drag/style overrides if provided
    if (adjustment?.elementOverrides) {
      for (const el of elements) {
        const override = adjustment.elementOverrides[el.id];
        if (override) {
          if (override.x !== undefined) el.x = override.x;
          if (override.y !== undefined) el.y = override.y;
          if (override.scale !== undefined) {
            el.width = el.width * override.scale;
            el.height = el.height * override.scale;
          }
          if (override.fontFamily !== undefined) el.fontFamily = override.fontFamily;
          if (override.fontWeight !== undefined) el.fontWeight = override.fontWeight;
          if (override.fontSize !== undefined) el.fontSize = override.fontSize;
          if (override.color !== undefined) el.color = override.color;
          if (override.textAlign !== undefined) el.textAlign = override.textAlign;
        }
      }
    }

    const layoutForValidation = { canvasWidth: width, canvasHeight: height, elements };
    let validation = validateResolvedLayout(layoutForValidation, Math.min(padLeft, padRight, padTop, padBottom) * 0.35);
    // A predictable second pass only adjusts the CTA, which is the one element
    // positioned after the vertical content stack.
    if (validation.some((warning) => warning.severity === 'error') && cta) {
      cta.y = Math.max(padTop, Math.min(cta.y, height - padBottom - cta.height));
      cta.width = Math.min(cta.width, contentWidth);
      validation = validateResolvedLayout(layoutForValidation, 0);
    }
    warnings.push(...validation);
    const hasErrors = warnings.some((w) => w.severity === 'error');

    return {
      format,
      canvasWidth: width,
      canvasHeight: height,
      layoutFamily,
      templateId,
      validationAttempts: cta ? 2 : 1,
      elements,
      warnings,
      isValid: !hasErrors,
    };
  }
}
