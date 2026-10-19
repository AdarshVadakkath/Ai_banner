import 'dotenv/config';
import { CloudinaryService } from '../poster-automation/backend/src/services/CloudinaryService';

async function main() {
  console.log('Testing Cloudinary upload...');
  // 1x1 transparent png
  const sampleDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  try {
    const res = await CloudinaryService.uploadDataUrl(sampleDataUrl, 'test-banner.png');
    console.log('Cloudinary upload success:', res);
    await CloudinaryService.destroy(res.publicId);
    console.log('Cloudinary destroy success');
  } catch (err) {
    console.error('Cloudinary upload error:', err);
  }
}

main();
