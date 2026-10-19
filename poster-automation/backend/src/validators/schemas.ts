import { z } from 'zod';

export const PosterFormatSchema = z.object({
  id: z.string(),
  name: z.string(),
  width: z.number().int().min(50).max(4000),
  height: z.number().int().min(50).max(4000),
  aspectRatioLabel: z.string(),
  category: z.enum(['social', 'story', 'banner', 'display', 'custom']),
  isDefault: z.boolean().optional(),
});

export const CampaignContentSchema = z.object({
  campaignName: z.string().min(1, 'Campaign name is required'),
  introText: z.string().default(''),
  mainHeading: z.string().min(1, 'Main heading is required'),
  supportingParagraph: z.string().default(''),
  dateText: z.string().default(''),
  locationText: z.string().default(''),
  ctaText: z.string().optional(),
});

export const AssetRecordSchema = z.object({
  id: z.string(),
  url: z.string(),
  // Cloudinary's public ID is needed to manage the uploaded asset later
  // (for example, when a campaign is deleted). Keep it alongside its URL
  // instead of letting Zod strip it from the saved design settings.
  publicId: z.string().optional(),
  name: z.string(),
  width: z.number().optional(),
  height: z.number().optional(),
  aspectRatio: z.number().optional(),
});

export const FormatAdjustmentSchema = z.object({
  backgroundId: z.string().optional(),
  offsetX: z.number().optional(),
  offsetY: z.number().optional(),
  scale: z.number().optional(),
  elementOverrides: z.record(z.string(), z.object({ x: z.number().optional(), y: z.number().optional() })).optional(),
});

export const CampaignAssetsSchema = z.object({
  logoUrl: z.string().optional(),
  logoPublicId: z.string().optional(),
  logoWidth: z.number().optional(),
  logoHeight: z.number().optional(),
  logoAspectRatio: z.number().optional(),
  backgroundImages: z.array(AssetRecordSchema).default([]),
  selectedBackgroundId: z.string().optional(),
  backgroundFit: z.enum(['cover', 'contain']).default('cover'),
  formatAdjustments: z.record(z.string(), FormatAdjustmentSchema).default({}),
});

export const CreateProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  templateId: z.string().min(1, 'Template ID is required'),
  content: CampaignContentSchema,
  assets: CampaignAssetsSchema,
  selectedFormats: z.array(PosterFormatSchema).min(1, 'At least one format must be selected'),
  thumbnailUrl: z.string().optional(),
});

export const UpdateProjectSchema = CreateProjectSchema.partial();

export const SavePreviewSchema = z.object({
  dataUrl: z.string().max(21_000_000),
  filename: z.string().min(1).max(160).optional(),
});

export const AspectRatioUploadItemSchema = z.object({
  formatId: z.string().min(1, 'Format ID is required'),
  aspectRatio: z.string().min(1, 'Aspect ratio is required'),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  dataUrl: z.string().min(1, 'Image data URL is required'),
  filename: z.string().optional(),
});

export const BatchUploadImagesSchema = z.object({
  images: z.array(AspectRatioUploadItemSchema).min(1, 'At least one image must be provided'),
});

