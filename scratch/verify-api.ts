import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const countB = await sql`SELECT COUNT(*) FROM banners`;
  const countI = await sql`SELECT COUNT(*) FROM banner_images`;
  console.log('Banners count:', countB);
  console.log('Banner images count:', countI);
  const rows = await sql`SELECT id, owner_id, title, image_url, cloudinary_public_id FROM banners`;
  console.log('Banners:', rows);
  if (rows[0]) {
    const ownerId = rows[0].owner_id;
    const bannerId = rows[0].id;
    console.log('Fetching with cookie formatly_owner=' + ownerId);
    const res = await fetch(`http://localhost:3000/api/projects/${bannerId}`, {
      headers: {
        'Cookie': `formatly_owner=${ownerId}`,
      }
    });
    const data = await res.json();
    console.log('API response status:', res.status);
    console.log('API response project images count:', data.project?.images?.length);
    console.log('API response project images:', data.project?.images);
    console.log('API response project image_url:', data.project?.thumbnailUrl);
  }
}

main().catch(console.error);
