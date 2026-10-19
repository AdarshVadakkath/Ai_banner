import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

let database: ReturnType<typeof drizzle<typeof schema>> | undefined;
let initialized = false;

export async function initDatabaseSchema(): Promise<void> {
  if (initialized) return;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return;

  try {
    const sql = neon(connectionString);
    await sql`
      CREATE TABLE IF NOT EXISTS "banners" (
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
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS "banners_owner_updated_idx" ON "banners" ("owner_id", "updated_at");
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS "banners_cloudinary_public_id_idx" ON "banners" ("cloudinary_public_id");
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS "banner_images" (
        "id" text PRIMARY KEY NOT NULL,
        "banner_id" text NOT NULL REFERENCES "banners"("id") ON DELETE CASCADE,
        "format_id" text NOT NULL,
        "aspect_ratio" text NOT NULL,
        "width" integer NOT NULL,
        "height" integer NOT NULL,
        "image_url" text NOT NULL,
        "cloudinary_public_id" text,
        "file_size_bytes" integer,
        "mime_type" text DEFAULT 'image/png' NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
        CONSTRAINT "banner_images_banner_format_unique" UNIQUE ("banner_id", "format_id")
      );
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS "banner_images_banner_id_idx" ON "banner_images" ("banner_id");
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS "banner_images_aspect_ratio_idx" ON "banner_images" ("banner_id", "aspect_ratio");
    `;
    initialized = true;
    console.log('[Database] Schema verified: banners & banner_images tables ready.');
  } catch (err) {
    console.warn('[Database] Schema verification warning:', err instanceof Error ? err.message : err);
  }
}

export function getDb() {
  if (!database) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error('Database storage is not configured. Set DATABASE_URL on the server.');
    database = drizzle({ client: neon(connectionString), schema });
    initDatabaseSchema().catch(() => undefined);
  }
  return database;
}

