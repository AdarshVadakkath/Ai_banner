export type FormatCategory = 'social' | 'story' | 'banner' | 'display' | 'custom';

export interface PosterFormat {
  id: string;
  name: string;
  width: number;
  height: number;
  aspectRatioLabel: string;
  aspectRatio?: string;
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
  publicId?: string;
  name: string;
  width?: number;
  height?: number;
  aspectRatio?: number;
}

export interface FormatAdjustment {
  backgroundId?: string;
  offsetX?: number; // Normalized -1 to 1 offset
  offsetY?: number;
  scale?: number;   // 1.0 default
  elementOverrides?: Record<string, { x?: number; y?: number; scale?: number; fontFamily?: string; fontWeight?: string; fontSize?: number; color?: string; textAlign?: 'left' | 'center' | 'right' }>;
}

export interface CampaignAssets {
  logoUrl?: string;
  logoPublicId?: string;
  logoWidth?: number;
  logoHeight?: number;
  logoAspectRatio?: number;
  backgroundImages: AssetRecord[];
  selectedBackgroundId?: string;
  backgroundFit: 'cover' | 'contain';
  formatAdjustments: Record<string, FormatAdjustment>;
}

/** Broad composition groups. Compact display placements intentionally use their
 * own family instead of inheriting a scaled social-post composition. */
export type LayoutFamily = 'square' | 'portrait' | 'landscape' | 'widescreen' | 'compact' | 'skyscraper';

export interface LayoutPresetConfig {
  family: LayoutFamily;
  name: string;
  padding: { top: number; right: number; bottom: number; left: number }; // Normalized (0.0 to 0.2)
  contentAlignment: 'left' | 'center' | 'right';
  contentVerticalPosition: 'top' | 'center' | 'bottom';
  logoPosition: 'top-left' | 'top-center' | 'bottom-left' | 'bottom-center' | 'none';
  maxLogoHeightRatio: number; // Percentage of canvas height
  textConstraints: {
    introFontSizeRatio: number;      // e.g. 0.025 of min dimension
    headingFontSizeRatio: number;    // e.g. 0.065
    paragraphFontSizeRatio: number;  // e.g. 0.03
    footerFontSizeRatio: number;     // e.g. 0.024
    minHeadingFontSize: number;      // in px
    maxHeadingFontSize: number;      // in px
    maxHeadingLines: number;
    maxParagraphLines: number;
    elementSpacingRatio: number;     // gap between elements
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
    /** Per-campaign CTA overrides; omitted values retain the template defaults. */
    ctaBackground?: string;
    ctaText?: string;
    /** Per-campaign colors for text that previously inherited the accent blue. */
    introText?: string;
    footerText?: string;
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
  // Compact and skyscraper formats intentionally reuse a base landscape or
  // portrait preset while the engine applies their dedicated composition rules.
  presets: Record<Exclude<LayoutFamily, 'compact' | 'skyscraper'>, LayoutPresetConfig>;
}

export type ResolvedElementType = 'background' | 'overlay' | 'logo' | 'intro' | 'heading' | 'paragraph' | 'footer' | 'badge' | 'cta-button' | 'text' | 'shape';

export interface ResolvedElement {
  id: string;
  type: ResolvedElementType;
  shapeType?: 'rect' | 'circle' | 'triangle';
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
  verticalAlign?: 'top' | 'middle' | 'bottom';
  imageUrl?: string;
  imageFit?: 'cover' | 'contain';
  opacity?: number;
  fill?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  ctaType?: 'primary' | 'secondary' | 'tertiary';
  letterSpacing?: number;
  gradient?: {
    type: 'linear' | 'radial';
    stops: Array<{ offset: number; color: string }>;
    angle?: number;
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
  /** Deterministic composition chosen within the family. */
  templateId?: string;
  validationAttempts?: number;
  elements: ResolvedElement[];
  warnings: ValidationWarning[];
  isValid: boolean;
}

export interface CampaignImage {
  id: string;
  bannerId: string;
  formatId: string;
  aspectRatio: string;
  width: number;
  height: number;
  imageUrl: string;
  cloudinaryPublicId?: string;
  fileSizeBytes?: number;
  createdAt?: string;
  updatedAt?: string;
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
  images?: CampaignImage[];
  imagesByRatio?: Record<string, CampaignImage>;
  imagesByFormat?: Record<string, CampaignImage>;
}
