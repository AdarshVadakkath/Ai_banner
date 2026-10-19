import { index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/**
 * A banner is the persisted campaign in the editor. Flexible editor
 * state belongs in JSONB so template changes do not require schema churn.
 */
export const banners = pgTable('banners', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull(),
  title: text('title').notNull(),
  originalPrompt: text('original_prompt'),
  imageUrl: text('image_url'),
  cloudinaryPublicId: text('cloudinary_public_id'),
  imageWidth: integer('image_width'),
  imageHeight: integer('image_height'),
  templateId: text('template_id').notNull(),
  designSettings: jsonb('design_settings').notNull(),
  generationStatus: text('generation_status').notNull().default('ready'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('banners_owner_updated_idx').on(table.ownerId, table.updatedAt),
  index('banners_cloudinary_public_id_idx').on(table.cloudinaryPublicId),
]);

/**
 * Multiple rendered aspect ratios and format assets stored under a single campaign/banner ID.
 */
export const bannerImages = pgTable('banner_images', {
  id: text('id').primaryKey(),
  bannerId: text('banner_id').notNull().references(() => banners.id, { onDelete: 'cascade' }),
  formatId: text('format_id').notNull(),         // e.g. 'skyscraper', 'square-1200', 'leaderboard'
  aspectRatio: text('aspect_ratio').notNull(),   // e.g. '4:15', '1:1', '728:90', '16:9'
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  imageUrl: text('image_url').notNull(),
  cloudinaryPublicId: text('cloudinary_public_id'),
  fileSizeBytes: integer('file_size_bytes'),
  mimeType: text('mime_type').notNull().default('image/png'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('banner_images_banner_format_idx').on(table.bannerId, table.formatId),
  index('banner_images_banner_id_idx').on(table.bannerId),
  index('banner_images_aspect_ratio_idx').on(table.bannerId, table.aspectRatio),
]);

export const bannersRelations = relations(banners, ({ many }) => ({
  images: many(bannerImages),
}));

export const bannerImagesRelations = relations(bannerImages, ({ one }) => ({
  banner: one(banners, {
    fields: [bannerImages.bannerId],
    references: [banners.id],
  }),
}));

