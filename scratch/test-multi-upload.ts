import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
import * as schema from '../poster-automation/backend/src/db/schema';
import { CloudinaryService } from '../poster-automation/backend/src/services/CloudinaryService';

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle({ client: sql, schema });

  const existingBanners = await db.select().from(schema.banners);
  console.log('Existing banners in DB:', existingBanners.length);
  if (existingBanners.length === 0) {
    console.log('No banners found.');
    return;
  }

  const banner = existingBanners[0];
  console.log('Testing with banner:', banner.id, banner.title);

  // Let's test uploading 3 sample aspect ratio images for this campaign
  const testFormats = [
    { formatId: 'square-1200', aspectRatio: '1:1', width: 1200, height: 1200 },
    { formatId: 'landscape-1200x628', aspectRatio: '1.91:1', width: 1200, height: 628 },
    { formatId: 'story-1080x1920', aspectRatio: '9:16', width: 1080, height: 1920 },
  ];

  const samplePng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  for (const fmt of testFormats) {
    console.log(`Uploading ${fmt.formatId}...`);
    const uploadRes = await CloudinaryService.uploadDataUrl(samplePng, `${banner.id}-${fmt.formatId}.png`);
    console.log(`Uploaded to Cloudinary: ${uploadRes.secureUrl}`);

    await db.insert(schema.bannerImages).values({
      id: `img-${Date.now()}-${fmt.formatId}`,
      bannerId: banner.id,
      formatId: fmt.formatId,
      aspectRatio: fmt.aspectRatio,
      width: fmt.width,
      height: fmt.height,
      imageUrl: uploadRes.secureUrl,
      cloudinaryPublicId: uploadRes.publicId,
      fileSizeBytes: 1024,
      mimeType: 'image/png',
      createdAt: new Date(),
      updatedAt: new Date(),
    }).onConflictDoUpdate({
      target: [schema.bannerImages.bannerId, schema.bannerImages.formatId],
      set: {
        imageUrl: uploadRes.secureUrl,
        cloudinaryPublicId: uploadRes.publicId,
        updatedAt: new Date(),
      }
    });
  }

  // Also update banner thumbnail
  const first = await db.select().from(schema.bannerImages).where(eq(schema.bannerImages.bannerId, banner.id)).limit(1);
  if (first[0]) {
    await db.update(schema.banners).set({
      imageUrl: first[0].imageUrl,
      cloudinaryPublicId: first[0].cloudinaryPublicId,
      imageWidth: first[0].width,
      imageHeight: first[0].height,
      updatedAt: new Date(),
    }).where(eq(schema.banners.id, banner.id));
  }

  console.log('Querying campaign with images:');
  const result = await db.query.banners.findFirst({
    where: eq(schema.banners.id, banner.id),
    with: { images: true },
  });
  console.log('Banner with images:', JSON.stringify(result, null, 2));
}

main().catch(console.error);
