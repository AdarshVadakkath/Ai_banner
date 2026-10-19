CREATE TABLE "banners" (
  "id" text PRIMARY KEY NOT NULL,
  "owner_id" text NOT NULL,
  "title" text NOT NULL,
  "original_prompt" text,
  "image_url" text,
  "cloudinary_public_id" text,
  "image_width" integer,
  "image_height" integer,
  "template_id" text NOT NULL,
  "design_settings" jsonb NOT NULL,
  "generation_status" text DEFAULT 'ready' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX "banners_owner_updated_idx" ON "banners" USING btree ("owner_id", "updated_at");
CREATE INDEX "banners_cloudinary_public_id_idx" ON "banners" USING btree ("cloudinary_public_id");
