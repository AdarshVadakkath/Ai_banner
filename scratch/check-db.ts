import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { initDatabaseSchema } from '../poster-automation/backend/src/db/client';

async function main() {
  console.log('Connecting to database...');
  await initDatabaseSchema();
  
  const sql = neon(process.env.DATABASE_URL!);
  const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
  console.log('Public tables in Neon:');
  console.log(tables);

  const banners = await sql`SELECT id, title, image_url, cloudinary_public_id FROM banners`;
  console.log('Banners in DB:');
  console.log(banners);

  const bannerImages = await sql`SELECT * FROM banner_images`;
  console.log('Banner images in DB:');
  console.log(bannerImages);
}

main().catch(console.error);
