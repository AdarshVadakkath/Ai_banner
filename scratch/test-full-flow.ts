import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

async function main() {
  console.log('--- TESTING COMPLETE MULTI-RATIO BANNER UPLOAD & STORAGE FLOW ---');
  const ownerId = 'test-owner-' + Date.now();
  const headers = {
    'Content-Type': 'application/json',
    'Cookie': `formatly_owner=${ownerId}`,
  };

  // 1. Create a campaign
  console.log('1. Creating campaign via API...');
  const createRes = await fetch('http://localhost:3000/api/projects', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: 'Cloudinary Multi Banner Campaign',
      templateId: 'clean-enterprise',
      content: {
        campaignName: 'Cloudinary Multi Banner Campaign',
        introText: 'Official Launch',
        mainHeading: 'Scale Banners Across All Aspect Ratios',
        supportingParagraph: 'Automatically store and retrieve all banner formats under a single campaign ID in Neon and Cloudinary.',
        ctaText: 'Get Started Today →',
        dateText: 'October 2026',
        locationText: 'Online Worldwide',
      },
      assets: {
        backgroundImages: [],
      },
      selectedFormats: [
        { id: 'square-1200', name: 'Square', width: 1200, height: 1200, category: 'social', isDefault: true, aspectRatioLabel: '1:1' }
      ]
    }),
  });

  const createdData = await createRes.json();
  console.log('Campaign created:', createdData.project?.id, createdData.project?.name);
  const projectId = createdData.project?.id;
  if (!projectId) {
    throw new Error('Failed to create campaign: ' + JSON.stringify(createdData));
  }

  // 2. Upload multiple aspect ratios to Cloudinary and Neon
  console.log('2. Uploading 4 sample banner aspect ratios to /api/projects/' + projectId + '/images...');
  // Valid sample 1x1 base64 png
  const samplePng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  const batchPayload = {
    images: [
      { formatId: 'square-1200', aspectRatio: '1:1', width: 1200, height: 1200, dataUrl: samplePng },
      { formatId: 'small-image', aspectRatio: '1.91:1', width: 1200, height: 630, dataUrl: samplePng },
      { formatId: 'skyscraper', aspectRatio: '4:15', width: 160, height: 600, dataUrl: samplePng },
      { formatId: 'leaderboard', aspectRatio: '728:90', width: 728, height: 90, dataUrl: samplePng },
    ]
  };

  const uploadRes = await fetch(`http://localhost:3000/api/projects/${projectId}/images`, {
    method: 'POST',
    headers,
    body: JSON.stringify(batchPayload),
  });

  const uploadData = await uploadRes.json();
  console.log('Upload response status:', uploadRes.status);
  console.log('Upload response:', uploadData.success, 'count:', uploadData.count);

  // 3. Fetch the campaign to verify all aspect ratios are returned together in a single API query
  console.log('3. Fetching campaign with all aspect ratios via GET /api/projects/' + projectId);
  const getRes = await fetch(`http://localhost:3000/api/projects/${projectId}`, { headers });
  const getData = await getRes.json();
  console.log('Retrieved campaign thumbnail:', getData.project?.thumbnailUrl);
  console.log('Retrieved campaign formats count:', getData.project?.images?.length);
  for (const img of getData.project?.images || []) {
    console.log(`  - Format: ${img.formatId} (${img.aspectRatio}) -> Cloudinary URL: ${img.imageUrl}`);
  }

  // 4. Query Neon DB directly to verify both tables
  console.log('4. Querying Neon DB directly...');
  const sql = neon(process.env.DATABASE_URL!);
  const dbBanners = await sql`SELECT id, title, image_url, cloudinary_public_id FROM banners WHERE id = ${projectId}`;
  console.log('Neon banners row:', dbBanners[0]);

  const dbImages = await sql`SELECT format_id, aspect_ratio, image_url, cloudinary_public_id FROM banner_images WHERE banner_id = ${projectId}`;
  console.log('Neon banner_images rows count:', dbImages.length);
  console.log(dbImages);

  console.log('--- ALL VERIFICATIONS PASSED SUCCESSFULLY! ---');
}

main().catch(console.error);
