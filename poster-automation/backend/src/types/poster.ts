export type FormatCategory = 'social' | 'story' | 'banner' | 'display' | 'custom';

export interface PosterFormat {
  id: string;
  name: string;
  width: number;
  height: number;
  aspectRatioLabel: string;
  category: FormatCategory;
  isDefault?: boolean;
}

export interface CampaignContent {
  campaignName: string;
  introText: string;
  mainHeading: string;
  supportingParagraph: string;
  dateText: string;
  locationText: string;
  ctaText?: string;
}

export interface AssetRecord {
  id: string;
  url: string;
  name: string;
  width?: number;
  height?: number;
  aspectRatio?: number;
}

export interface FormatAdjustment {
  backgroundId?: string;
  offsetX?: number;
  offsetY?: number;
  scale?: number;
  elementOverrides?: Record<string, { x?: number; y?: number }>;
}

export interface CampaignAssets {
  logoUrl?: string;
  logoAspectRatio?: number;
  backgroundImages: AssetRecord[];
  selectedBackgroundId?: string;
  backgroundFit: 'cover' | 'contain';
  formatAdjustments: Record<string, FormatAdjustment>;
}

export type LayoutFamily = 'square' | 'portrait' | 'landscape' | 'widescreen';

export interface LayoutPresetConfig {
  family: LayoutFamily;
  name: string;
  padding: { top: number; right: number; bottom: number; left: number };
  contentAlignment: 'left' | 'center' | 'right';
  contentVerticalPosition: 'top' | 'center' | 'bottom';
  logoPosition: 'top-left' | 'top-center' | 'bottom-left' | 'bottom-center' | 'none';
  maxLogoHeightRatio: number;
  textConstraints: {
    introFontSizeRatio: number;
    headingFontSizeRatio: number;
    paragraphFontSizeRatio: number;
    footerFontSizeRatio: number;
    minHeadingFontSize: number;
    maxHeadingFontSize: number;
    maxHeadingLines: number;
    maxParagraphLines: number;
    elementSpacingRatio: number;
  };
  overlayTreatment: 'bottom-scrim' | 'dark-vignette' | 'left-scrim' | 'soft-overlay' | 'none';
  overlayOpacity: number;
}

export interface PosterTemplate {
  id: string;
  name: string;
  description: string;
  category: 'Modern Corporate' | 'Bold Event' | 'Tech Minimal' | 'Editorial Festival';
  colorScheme: {
    primary: string;
    secondary: string;
    accent: string;
    textPrimary: string;
    textSecondary: string;
    overlayColor: string;
    overlayOpacity: number;
  };
  typography: {
    headingFontFamily: string;
    bodyFontFamily: string;
    headingWeight: string;
    bodyWeight: string;
  };
  characterLimits: {
    introText: number;
    mainHeading: number;
    supportingParagraph: number;
    dateText: number;
    locationText: number;
  };
  presets: Record<LayoutFamily, LayoutPresetConfig>;
}

export type ResolvedElementType = 'background' | 'overlay' | 'logo' | 'intro' | 'heading' | 'paragraph' | 'footer' | 'badge';

export interface ResolvedElement {
  id: string;
  type: ResolvedElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  lineHeight?: number;
  color?: string;
  textAlign?: 'left' | 'center' | 'right';
  imageUrl?: string;
  imageFit?: 'cover' | 'contain';
  opacity?: number;
  fill?: string;
  gradient?: {
    type: 'linear' | 'radial';
    stops: Array<{ offset: number; color: string }>;
  };
  isDraggable?: boolean;
}

export interface ValidationWarning {
  field: string;
  message: string;
  severity: 'warning' | 'error';
  excessCharacters?: number;
}

export interface ResolvedPosterLayout {
  format: PosterFormat;
  canvasWidth: number;
  canvasHeight: number;
  layoutFamily: LayoutFamily;
  elements: ResolvedElement[];
  warnings: ValidationWarning[];
  isValid: boolean;
}

export interface CampaignProject {
  id: string;
  name: string;
  templateId: string;
  content: CampaignContent;
  assets: CampaignAssets;
  selectedFormats: PosterFormat[];
  createdAt: string;
  updatedAt: string;
  thumbnailUrl?: string;
}
