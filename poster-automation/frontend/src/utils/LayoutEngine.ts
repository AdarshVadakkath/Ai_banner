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
export function estimateLineCount(text: string, fontSize: number, maxLineWidth: number): number {
  if (!text || text.trim().length === 0) return 0;
  // Average proportional character width for sans-serif / grotesk is roughly 0.54 * fontSize
  const charWidth = fontSize * 0.54;
  const words = text.split(/\s+/);
  let lines = 1;
  let currentLineWidth = 0;

  for (const word of words) {
    const wordWidth = word.length * charWidth;
    const spaceWidth = charWidth;

    if (currentLineWidth + wordWidth > maxLineWidth) {
      if (currentLineWidth > 0) {
        lines++;
        currentLineWidth = wordWidth;
      } else {
        // Single word exceeds line width
        lines++;
        currentLineWidth = wordWidth;
      }
    } else {
      currentLineWidth += wordWidth + spaceWidth;
    }
  }

  return lines;
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
    const preset: LayoutPresetConfig = template.presets[layoutFamily] || template.presets.square;

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

    // 2. Add Readability Scrim / Contrast Overlay
    if (preset.overlayTreatment !== 'none') {
      const overlayColor = template.colorScheme.overlayColor || '#000000';
      const opacity = preset.overlayOpacity || template.colorScheme.overlayOpacity || 0.65;

      if (preset.overlayTreatment === 'bottom-scrim') {
        elements.push({
          id: 'element-overlay',
          type: 'overlay',
          x: 0,
          y: height * 0.2,
          width,
          height: height * 0.8,
          opacity,
          gradient: {
            type: 'linear',
            stops: [
              { offset: 0, color: 'rgba(0,0,0,0)' },
              { offset: 0.45, color: overlayColor + 'B0' },
              { offset: 1, color: overlayColor + 'FA' },
            ],
          },
          isDraggable: false,
        });
      } else if (preset.overlayTreatment === 'left-scrim') {
        elements.push({
          id: 'element-overlay',
          type: 'overlay',
          x: 0,
          y: 0,
          width: width * 0.75,
          height,
          opacity,
          gradient: {
            type: 'linear',
            stops: [
              { offset: 0, color: overlayColor + 'F0' },
              { offset: 0.65, color: overlayColor + 'A0' },
              { offset: 1, color: 'rgba(0,0,0,0)' },
            ],
          },
          isDraggable: false,
        });
      } else {
        // Dark vignette / full soft scrim
        elements.push({
          id: 'element-overlay',
          type: 'overlay',
          x: 0,
          y: 0,
          width,
          height,
          fill: overlayColor,
          opacity: opacity * 0.75,
          isDraggable: false,
        });
      }
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
      const maxLogoH = Math.round(height * preset.maxLogoHeightRatio);
      const logoAspect = assets.logoAspectRatio || 2.8;
      let logoW = Math.round(maxLogoH * logoAspect);
      let logoH = maxLogoH;

      if (logoW > contentWidth * 0.4) {
        logoW = Math.round(contentWidth * 0.4);
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

    // 4. Calculate Text Elements & Typography
    const textAlign = preset.contentAlignment;
    const textPrimaryColor = template.colorScheme.textPrimary;
    const textSecondaryColor = template.colorScheme.textSecondary;
    const accentColor = template.colorScheme.accent;

    // A. Intro Text
    let introH = 0;
    let introFontSize = Math.round(minDimension * tc.introFontSizeRatio);
    if (content.introText && content.introText.trim().length > 0) {
      introFontSize = Math.max(14, introFontSize);
      introH = Math.round(introFontSize * 1.4);
    }

    // B. Main Heading
    let headingH = 0;
    let headingLines = 0;
    let headingFontSize = Math.round(minDimension * tc.headingFontSizeRatio);
    if (content.mainHeading && content.mainHeading.trim().length > 0) {
      const fit = calculateFittedFontSize(
        content.mainHeading,
        headingFontSize,
        tc.minHeadingFontSize,
        tc.maxHeadingFontSize,
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
      // Anchored to bottom padding
      currentY = height - padBottom - contentBlockHeight;
      // Make sure content doesn't collide with top logo
      if (currentY < logoBottomY + elementGap) {
        currentY = logoBottomY + elementGap;
      }
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
        text: content.introText.toUpperCase(),
        fontSize: introFontSize,
        fontFamily: template.typography.bodyFontFamily,
        fontWeight: '700',
        lineHeight: 1.2,
        color: accentColor,
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

    // Place Footer Elements (Date and Location)
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
        color: accentColor || textSecondaryColor,
        textAlign,
        isDraggable: true,
      });
    }

    // Apply any format-level manual user drag overrides if provided
    if (adjustment?.elementOverrides) {
      for (const el of elements) {
        const override = adjustment.elementOverrides[el.id];
        if (override) {
          if (override.x !== undefined) el.x = override.x;
          if (override.y !== undefined) el.y = override.y;
        }
      }
    }

    const hasErrors = warnings.some((w) => w.severity === 'error');

    return {
      format,
      canvasWidth: width,
      canvasHeight: height,
      layoutFamily,
      elements,
      warnings,
      isValid: !hasErrors,
    };
  }
}
