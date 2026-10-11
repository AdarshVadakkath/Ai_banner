import { z } from 'zod';

export const PosterFormatSchema = z.object({
  id: z.string(),
  name: z.string(),
  width: z.number().int().min(400).max(4000),
  height: z.number().int().min(400).max(4000),
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
