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
  const fontSize = compact ? 10 : Math.max(11, Math.min(20, Math.round(canvasMinDimension * 0.022)));
  const paddingX = compact ? 12 : variant === 'tertiary' ? Math.round(fontSize * 1.1) : Math.round(fontSize * 1.65);
  const paddingY = compact ? 5 : variant === 'tertiary' ? Math.round(fontSize * 0.35) : Math.round(fontSize * 0.7);
  const labelWidth = measureTextBlock(text, fontSize, Math.max(1, availableWidth), { fontFamily: options.fontFamily, fontWeight: options.fontWeight }).width;
  const minWidth = compact ? 70 : variant === 'tertiary' ? 72 : 96;
  const neededWidth = Math.round(labelWidth + paddingX * 2);
  const maxWidth = Math.max(neededWidth, Math.floor(availableWidth * 0.85));
  return {
    width: Math.round(Math.min(availableWidth, Math.max(minWidth, Math.min(maxWidth, neededWidth)))),
    height: compact ? 24 : Math.max(variant === 'tertiary' ? 30 : 36, Math.round(fontSize + paddingY * 2)),
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

    // Square formats (1:1 aspect ratio, e.g. 1080x1080 Square / Carousel card and 1200x1200 Square)
    // require balanced text column geometry with dedicated independent lanes for intro,
    // heading, paragraph, CTA button and footer metadata so text never overlaps or collides with artwork.
    const isSquareRatio = width === height || format.aspectRatioLabel === '1:1' || (layoutFamily === 'square' && Math.abs(width - height) <= 2);
    if (isSquareRatio) {
      const squareWidth = Math.min(contentWidth, Math.round(width * 0.60));
      const squareGap = Math.max(20, Math.round(height * 0.024));
      const footerFontSize = Math.max(16, Math.round(height * 0.021));
      const footerText = [content.dateText, content.locationText]
        .filter((value) => Boolean(value && value.trim().length > 0))
        .join('  •  ');
      const footerMeasure = footerText
        ? measureTextBlock(footerText, footerFontSize, squareWidth, {
            fontFamily: template.typography.bodyFontFamily,
            fontWeight: '600',
            lineHeight: 1.3,
          })
        : { width: 0, height: 0, lines: [], lineCount: 0 };
      const footerH = footerText ? Math.ceil(footerMeasure.height) : 0;
      const footerY = footerText ? height - padBottom - footerH : height - padBottom;

      const ctaText = content.ctaText?.trim() || '';
      const ctaDimensions = ctaText
        ? calculateCtaDimensions(ctaText, squareWidth, minDimension, 'primary', {
            fontFamily: template.typography.bodyFontFamily,
            fontWeight: '700',
          })
        : null;
      const ctaY = ctaDimensions
        ? footerY - squareGap * 1.5 - ctaDimensions.height
        : footerY;

      const introFontSize = Math.max(16, Math.round(minDimension * tc.introFontSizeRatio));
      const introMeasure = content.introText?.trim()
        ? measureTextBlock(content.introText, introFontSize, squareWidth, {
            fontFamily: template.typography.bodyFontFamily,
            fontWeight: '700',
            lineHeight: 1.2,
          })
        : null;

      let headingFontSize = Math.min(tc.maxHeadingFontSize, Math.round(minDimension * tc.headingFontSizeRatio));
      let headingMeasure = measureTextBlock(content.mainHeading || '', headingFontSize, squareWidth, {
        fontFamily: template.typography.headingFontFamily,
        fontWeight: template.typography.headingWeight,
        lineHeight: 1.15,
      });
      while (headingMeasure.lineCount > tc.maxHeadingLines && headingFontSize > tc.minHeadingFontSize) {
        headingFontSize = Math.max(tc.minHeadingFontSize, headingFontSize - 2);
        headingMeasure = measureTextBlock(content.mainHeading || '', headingFontSize, squareWidth, {
          fontFamily: template.typography.headingFontFamily,
          fontWeight: template.typography.headingWeight,
          lineHeight: 1.15,
        });
      }

      let paragraphFontSize = Math.max(16, Math.round(minDimension * tc.paragraphFontSizeRatio));
      let paragraphMeasure = measureTextBlock(content.supportingParagraph || '', paragraphFontSize, squareWidth, {
        fontFamily: template.typography.bodyFontFamily,
        fontWeight: template.typography.bodyWeight,
        lineHeight: 1.35,
      });
      while (paragraphMeasure.lineCount > tc.maxParagraphLines && paragraphFontSize > 16) {
        paragraphFontSize -= 2;
        paragraphMeasure = measureTextBlock(content.supportingParagraph || '', paragraphFontSize, squareWidth, {
          fontFamily: template.typography.bodyFontFamily,
          fontWeight: template.typography.bodyWeight,
          lineHeight: 1.35,
        });
      }

      const copyHeight =
        (introMeasure ? introMeasure.height + Math.round(squareGap * 0.75) : 0) +
        (headingMeasure.height ? headingMeasure.height + squareGap : 0) +
        paragraphMeasure.height;
      const copyTop = Math.max(
        logoBottomY + Math.round(height * 0.08),
        Math.round((logoBottomY + ctaY - copyHeight) / 2)
      );
      let copyY = Math.min(copyTop, ctaY - squareGap - copyHeight);

      const colX = textAlign === 'center' ? Math.round(padLeft + (contentWidth - squareWidth) / 2) : padLeft;

      if (introMeasure) {
        elements.push({
          id: 'element-intro', type: 'intro', x: colX, y: Math.round(copyY), width: squareWidth,
          height: introMeasure.height, text: content.introText, fontSize: introFontSize,
          fontFamily: template.typography.bodyFontFamily, fontWeight: '700', lineHeight: 1.2,
          color: template.colorScheme.introText ?? accentColor, textAlign, isDraggable: true,
        });
        copyY += introMeasure.height + Math.round(squareGap * 0.75);
      }
      if (headingMeasure.height) {
        elements.push({
          id: 'element-heading', type: 'heading', x: colX, y: Math.round(copyY), width: squareWidth,
          height: headingMeasure.height, text: content.mainHeading, fontSize: headingFontSize,
          fontFamily: template.typography.headingFontFamily, fontWeight: template.typography.headingWeight,
          lineHeight: 1.15, color: textPrimaryColor, textAlign, isDraggable: true,
        });
        copyY += headingMeasure.height + squareGap;
      }
      if (paragraphMeasure.height) {
        elements.push({
          id: 'element-paragraph', type: 'paragraph', x: colX, y: Math.round(copyY), width: squareWidth,
          height: paragraphMeasure.height, text: content.supportingParagraph, fontSize: paragraphFontSize,
          fontFamily: template.typography.bodyFontFamily, fontWeight: template.typography.bodyWeight,
          lineHeight: 1.35, color: textSecondaryColor, textAlign, isDraggable: true,
        });
      }
      if (ctaDimensions) {
        elements.push({
          id: 'element-cta', type: 'cta-button', x: textAlign === 'center' ? colX + (squareWidth - ctaDimensions.width) / 2 : colX,
          y: Math.round(ctaY), width: ctaDimensions.width, height: ctaDimensions.height, text: ctaText,
          fontSize: ctaDimensions.fontSize, fontFamily: template.typography.bodyFontFamily, fontWeight: '700',
          lineHeight: 1.0, color: template.colorScheme.ctaText || '#FFFFFF',
          fill: template.colorScheme.ctaBackground || template.colorScheme.secondary || '#E5173F',
          ctaType: 'primary', textAlign: 'center', isDraggable: true,
        });
      }
      if (footerText) {
        elements.push({
          id: 'element-footer', type: 'footer', x: colX, y: Math.round(footerY), width: squareWidth,
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

      const squareLayout = { format, canvasWidth: width, canvasHeight: height, layoutFamily, elements, warnings, templateId, validationAttempts: 1, isValid: true };
      const validation = validateResolvedLayout(squareLayout, Math.min(padLeft, padRight, padTop, padBottom) * 0.35);
      squareLayout.warnings.push(...validation);
      squareLayout.isValid = !squareLayout.warnings.some((warning) => warning.severity === 'error');
      return squareLayout;
    }

    // The 300 × 250 medium rectangle is a compact 6:5 display unit.
    // Reserve dedicated, non-overlapping lanes: scaled logo at top, vertically-balanced copy
    // in a constrained column, properly sized single-line CTA button, and footer at bottom.
    const isMediumRectangle = format.id === 'medium-rectangle' && width === 300 && height === 250;
    if (isMediumRectangle) {
      const padL = 16;
      const padB = 10;
      const columnWidth = 195;

      // Ensure logo is compactly sized for 300x250
      const logoEl = elements.find((el) => el.type === 'logo');
      let effectiveLogoBottomY = 12;
      if (logoEl) {
        logoEl.x = padL;
        logoEl.y = 12;
        logoEl.height = 22;
        const logoAspect = assets.logoAspectRatio || 2.5;
        logoEl.width = Math.min(100, Math.round(logoEl.height * logoAspect));
        effectiveLogoBottomY = 12 + logoEl.height;
      }

      // Footer at bottom
      const footerText = [content.dateText, content.locationText].filter(Boolean).join('  •  ');
      const footerSize = 8.5;
      const footerMeasure = footerText
        ? measureTextBlock(footerText, footerSize, columnWidth, {
            fontFamily: template.typography.bodyFontFamily,
            fontWeight: '600',
            lineHeight: 1.2,
          })
        : { width: 0, height: 0, lines: [], lineCount: 0 };
      const footerH = footerText ? Math.ceil(footerMeasure.height) : 0;
      const footerY = footerText ? height - padB - footerH : height - padB;

      // CTA button above footer
      const ctaText = content.ctaText?.trim() || '';
      const ctaDimensions = ctaText
        ? calculateCtaDimensions(ctaText, columnWidth, minDimension, 'primary', {
            fontFamily: template.typography.bodyFontFamily,
            fontWeight: '700',
            compact: true,
          })
        : null;
      const ctaH = ctaDimensions ? ctaDimensions.height : 0;
      const ctaY = ctaDimensions ? footerY - 6 - ctaH : footerY;

      // Copy column between logo and CTA
      const introText = content.introText?.trim() || '';
      const introSize = 8.5;
      const introMeasure = introText
        ? measureTextBlock(introText, introSize, columnWidth, {
            fontFamily: template.typography.bodyFontFamily,
            fontWeight: '700',
            lineHeight: 1.15,
          })
        : null;

      let headingSize = 13.5;
      let headingMeasure = measureTextBlock(content.mainHeading || '', headingSize, columnWidth, {
        fontFamily: template.typography.headingFontFamily,
        fontWeight: template.typography.headingWeight,
        lineHeight: 1.15,
      });
      while (headingMeasure.lineCount > 2 && headingSize > 11) {
        headingSize -= 0.5;
        headingMeasure = measureTextBlock(content.mainHeading || '', headingSize, columnWidth, {
          fontFamily: template.typography.headingFontFamily,
          fontWeight: template.typography.headingWeight,
          lineHeight: 1.15,
        });
      }

      let paragraphSize = 9.5;
      let paragraphMeasure = measureTextBlock(content.supportingParagraph || '', paragraphSize, columnWidth, {
        fontFamily: template.typography.bodyFontFamily,
        fontWeight: template.typography.bodyWeight,
        lineHeight: 1.22,
      });
      while (paragraphMeasure.lineCount > 2 && paragraphSize > 8) {
        paragraphSize -= 0.5;
        paragraphMeasure = measureTextBlock(content.supportingParagraph || '', paragraphSize, columnWidth, {
          fontFamily: template.typography.bodyFontFamily,
          fontWeight: template.typography.bodyWeight,
          lineHeight: 1.22,
        });
      }

      const gap = 4;
      const introH = introMeasure ? introMeasure.height + gap : 0;
      const headingH = headingMeasure.height ? headingMeasure.height + gap : 0;
      const paragraphH = paragraphMeasure.height;
      const copyHeight = introH + headingH + paragraphH;

      const availableTop = effectiveLogoBottomY + 6;
      const availableBottom = ctaY - 6;
      const availableHeight = Math.max(copyHeight, availableBottom - availableTop);
      let copyY = Math.round(availableTop + (availableHeight - copyHeight) / 2);
      if (copyY + copyHeight > availableBottom) {
        copyY = Math.max(availableTop, availableBottom - copyHeight);
      }

      if (introMeasure) {
        elements.push({
          id: 'element-intro',
          type: 'intro',
          x: padL,
          y: Math.round(copyY),
          width: columnWidth,
          height: introMeasure.height,
          text: introText,
          fontSize: introSize,
          fontFamily: template.typography.bodyFontFamily,
          fontWeight: '700',
          lineHeight: 1.15,
          color: template.colorScheme.introText ?? accentColor,
          textAlign,
          isDraggable: true,
        });
        copyY += introMeasure.height + gap;
      }

      if (headingMeasure.height) {
        elements.push({
          id: 'element-heading',
          type: 'heading',
          x: padL,
          y: Math.round(copyY),
          width: columnWidth,
          height: headingMeasure.height,
          text: content.mainHeading,
          fontSize: headingSize,
          fontFamily: template.typography.headingFontFamily,
          fontWeight: template.typography.headingWeight,
          lineHeight: 1.15,
          color: textPrimaryColor,
          textAlign,
          isDraggable: true,
        });
        copyY += headingMeasure.height + gap;
      }

      if (paragraphMeasure.height) {
        elements.push({
          id: 'element-paragraph',
          type: 'paragraph',
          x: padL,
          y: Math.round(copyY),
          width: columnWidth,
          height: paragraphMeasure.height,
          text: content.supportingParagraph,
          fontSize: paragraphSize,
          fontFamily: template.typography.bodyFontFamily,
          fontWeight: template.typography.bodyWeight,
          lineHeight: 1.22,
          color: textSecondaryColor,
          textAlign,
          isDraggable: true,
        });
      }

      if (ctaDimensions) {
        elements.push({
          id: 'element-cta',
          type: 'cta-button',
          x: padL,
          y: Math.round(ctaY),
          width: ctaDimensions.width,
          height: ctaDimensions.height,
          text: ctaText,
          fontSize: ctaDimensions.fontSize,
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

      if (footerText) {
        elements.push({
          id: 'element-footer',
          type: 'footer',
          x: padL,
          y: Math.round(footerY),
          width: columnWidth,
          height: footerH,
          text: footerText,
          fontSize: footerSize,
          fontFamily: template.typography.bodyFontFamily,
          fontWeight: '600',
          lineHeight: 1.2,
          color: template.colorScheme.footerText ?? (accentColor || textSecondaryColor),
          textAlign,
          isDraggable: true,
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

      const mediumLayout = { format, canvasWidth: width, canvasHeight: height, layoutFamily, elements, warnings, templateId, validationAttempts: 1, isValid: true };
      const validation = validateResolvedLayout(mediumLayout, 2);
      mediumLayout.warnings.push(...validation);
      mediumLayout.isValid = !mediumLayout.warnings.some(warning => warning.severity === 'error');
      return mediumLayout;
    }

    // Specialized layout for Skyscraper and tall vertical display banners (e.g. 160x600 Skyscraper, 300x600 Half Page).
    // Provides centered optical alignment, tuned typography hierarchy for narrow viewports,
    // and balanced vertical distribution (centered logo, centered hero message block, centered CTA button, and centered footer metadata).
    if (layoutFamily === 'skyscraper') {
      const isNarrow = width <= 220; // 160x600 Skyscraper
      const padX = isNarrow ? 14 : 24;
      const colWidth = width - padX * 2;
      const colX = padX;

      // Ensure logo is centered and proportioned
      const logoEl = elements.find((el) => el.type === 'logo');
      let effectiveLogoBottomY = isNarrow ? 24 : 32;
      if (logoEl) {
        const logoAspect = assets.logoAspectRatio || (assets.logoWidth && assets.logoHeight ? assets.logoWidth / assets.logoHeight : 2.0);
        const maxLogoH = isNarrow ? 40 : 50;
        const maxLogoW = Math.min(colWidth * 0.85, isNarrow ? 120 : 200);
        let logoH = maxLogoH;
        let logoW = Math.round(logoH * logoAspect);
        if (logoW > maxLogoW) {
          logoW = Math.round(maxLogoW);
          logoH = Math.round(logoW / logoAspect);
        }
        logoEl.x = Math.round((width - logoW) / 2);
        logoEl.y = isNarrow ? 24 : 30;
        logoEl.width = logoW;
        logoEl.height = logoH;
        effectiveLogoBottomY = logoEl.y + logoH;
      }

      // Footer (Date & Location) anchored near bottom
      const footerLines = [content.dateText, content.locationText]
        .map((t) => t?.trim())
        .filter((t): t is string => Boolean(t && t.length > 0));
      const footerText = footerLines.join(isNarrow ? '\n' : '  •  ');
      const footerFontSize = isNarrow ? 9 : 12;
      const footerMeasure = footerText
        ? measureTextBlock(footerText, footerFontSize, colWidth, {
            fontFamily: template.typography.bodyFontFamily,
            fontWeight: '600',
            lineHeight: 1.3,
          })
        : { width: 0, height: 0, lines: [], lineCount: 0 };
      const footerH = footerText ? Math.ceil(footerMeasure.height) : 0;
      const padBottom = isNarrow ? 16 : 24;
      const footerY = footerText ? height - padBottom - footerH : height - padBottom;

      // CTA button above footer
      const ctaText = content.ctaText?.trim() || '';
      const ctaFontSize = isNarrow ? 11 : 14;
      const ctaH = isNarrow ? 32 : 40;
      let ctaW = 0;
      let ctaY = footerY;
      if (ctaText) {
        const labelW = measureTextBlock(ctaText, ctaFontSize, colWidth, {
          fontFamily: template.typography.bodyFontFamily,
          fontWeight: '700',
        }).width;
        ctaW = Math.round(Math.min(colWidth, Math.max(isNarrow ? 116 : 160, labelW + (isNarrow ? 26 : 36))));
        const ctaGapBelow = footerText ? (isNarrow ? 12 : 16) : 0;
        ctaY = footerY - ctaGapBelow - ctaH;
      }
      const ctaX = Math.round((width - ctaW) / 2);

      // Value proposition copy block (Intro + Heading + Paragraph)
      const introText = content.introText?.trim() || '';
      const introFontSize = isNarrow ? 9.5 : 13;
      const introMeasure = introText
        ? measureTextBlock(introText, introFontSize, colWidth, {
            fontFamily: template.typography.bodyFontFamily,
            fontWeight: '700',
            lineHeight: 1.2,
          })
        : null;

      const headingText = content.mainHeading?.trim() || '';
      let headingFontSize = isNarrow ? 16 : 24;
      let headingMeasure = measureTextBlock(headingText, headingFontSize, colWidth, {
        fontFamily: template.typography.headingFontFamily,
        fontWeight: template.typography.headingWeight || '800',
        lineHeight: 1.15,
      });
      const maxHeadingLines = 3;
      const minHeadingSize = isNarrow ? 13 : 18;
      while (headingMeasure.lineCount > maxHeadingLines && headingFontSize > minHeadingSize) {
        headingFontSize -= 0.5;
        headingMeasure = measureTextBlock(headingText, headingFontSize, colWidth, {
          fontFamily: template.typography.headingFontFamily,
          fontWeight: template.typography.headingWeight || '800',
          lineHeight: 1.15,
        });
      }

      const paragraphText = content.supportingParagraph?.trim() || '';
      let paragraphFontSize = isNarrow ? 10 : 13.5;
      let paragraphMeasure = measureTextBlock(paragraphText, paragraphFontSize, colWidth, {
        fontFamily: template.typography.bodyFontFamily,
        fontWeight: template.typography.bodyWeight || '500',
        lineHeight: 1.35,
      });
      const maxParagraphLines = 4;
      const minParagraphSize = isNarrow ? 8.5 : 11;
      while (paragraphMeasure.lineCount > maxParagraphLines && paragraphFontSize > minParagraphSize) {
        paragraphFontSize -= 0.5;
        paragraphMeasure = measureTextBlock(paragraphText, paragraphFontSize, colWidth, {
          fontFamily: template.typography.bodyFontFamily,
          fontWeight: template.typography.bodyWeight || '500',
          lineHeight: 1.35,
        });
      }

      const gapIntroHeading = introMeasure && headingMeasure.height ? (isNarrow ? 8 : 12) : 0;
      const gapHeadingParagraph = headingMeasure.height && paragraphMeasure.height ? (isNarrow ? 12 : 16) : 0;
      const introH = introMeasure ? introMeasure.height : 0;
      const headingH = headingMeasure.height ? headingMeasure.height : 0;
      const paragraphH = paragraphMeasure.height ? paragraphMeasure.height : 0;
      const copyHeight = introH + gapIntroHeading + headingH + gapHeadingParagraph + paragraphH;

      // Vertical placement of the copy block:
      // Balanced placement in the available zone between logo bottom and CTA top
      const availTop = effectiveLogoBottomY + (isNarrow ? 18 : 24);
      const availBottom = (ctaText ? ctaY : footerY) - (isNarrow ? 18 : 24);
      const availHeight = Math.max(copyHeight, availBottom - availTop);
      const slack = availHeight - copyHeight;
      let copyY = Math.round(availTop + slack * 0.40);
      if (copyY + copyHeight > availBottom) {
        copyY = Math.max(availTop, availBottom - copyHeight);
      }

      if (introMeasure) {
        elements.push({
          id: 'element-intro',
          type: 'intro',
          x: colX,
          y: Math.round(copyY),
          width: colWidth,
          height: introMeasure.height,
          text: introText,
          fontSize: introFontSize,
          fontFamily: template.typography.bodyFontFamily,
          fontWeight: '700',
          lineHeight: 1.2,
          color: template.colorScheme.introText ?? accentColor,
          textAlign: 'center',
          isDraggable: true,
        });
        copyY += introMeasure.height + gapIntroHeading;
      }

      if (headingMeasure.height) {
        elements.push({
          id: 'element-heading',
          type: 'heading',
          x: colX,
          y: Math.round(copyY),
          width: colWidth,
          height: headingMeasure.height,
          text: headingText,
          fontSize: headingFontSize,
          fontFamily: template.typography.headingFontFamily,
          fontWeight: template.typography.headingWeight || '800',
          lineHeight: 1.15,
          color: textPrimaryColor,
          textAlign: 'center',
          isDraggable: true,
        });
        copyY += headingMeasure.height + gapHeadingParagraph;
      }

      if (paragraphMeasure.height) {
        elements.push({
          id: 'element-paragraph',
          type: 'paragraph',
          x: colX,
          y: Math.round(copyY),
          width: colWidth,
          height: paragraphMeasure.height,
          text: paragraphText,
          fontSize: paragraphFontSize,
          fontFamily: template.typography.bodyFontFamily,
          fontWeight: template.typography.bodyWeight || '500',
          lineHeight: 1.35,
          color: textSecondaryColor,
          textAlign: 'center',
          isDraggable: true,
        });
      }

      if (ctaText) {
        elements.push({
          id: 'element-cta',
          type: 'cta-button',
          x: ctaX,
          y: Math.round(ctaY),
          width: ctaW,
          height: ctaH,
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

      if (footerText) {
        elements.push({
          id: 'element-footer',
          type: 'footer',
          x: colX,
          y: Math.round(footerY),
          width: colWidth,
          height: footerH,
          text: footerText,
          fontSize: footerFontSize,
          fontFamily: template.typography.bodyFontFamily,
          fontWeight: '600',
          lineHeight: 1.3,
          color: template.colorScheme.footerText ?? (accentColor || textSecondaryColor),
          textAlign: 'center',
          isDraggable: true,
        });
      }

      // Support format-level manual user drag/style overrides if provided
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

      const skyscraperLayout = {
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
      const validation = validateResolvedLayout(skyscraperLayout, 2);
      skyscraperLayout.warnings.push(...validation);
      skyscraperLayout.isValid = !skyscraperLayout.warnings.some((warning) => warning.severity === 'error');
      return skyscraperLayout;
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
