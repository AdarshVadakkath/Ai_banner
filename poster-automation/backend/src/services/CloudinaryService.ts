// Cloudinary SDK is dynamically imported AFTER configuration to prevent the
// SDK from reading a stale system-level CLOUDINARY_URL env var at module load
// time, which caused it to throw before .env values were applied.

type UploadedImage = { secureUrl: string; publicId: string; width?: number; height?: number };

async function getConfiguredCloudinary() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey    = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your .env file.',
    );
  }

  // Dynamic import: SDK is loaded only when needed, never at module-load time.
  const { v2: cloudinary } = await import('cloudinary');

  // Unset any stale CLOUDINARY_URL that the SDK might pick up before our config
  // call — the SDK validates it on import if it finds one in the environment.
  delete process.env['CLOUDINARY_URL'];

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  return cloudinary;
}

export class CloudinaryService {
  static async uploadImage(buffer: Buffer, mimeType: string, filename = 'banner.png'): Promise<UploadedImage> {
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'].includes(mimeType)) {
      throw new Error('Unsupported image type. Use PNG, JPEG, WebP, or SVG.');
    }

    const cloudinary = await getConfiguredCloudinary();

    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'banners',
          resource_type: 'image',
          use_filename: true,
          unique_filename: true,
          overwrite: false,
          filename_override: filename.replace(/\.[^.]+$/, ''),
        },
        (error, result) => {
          if (error || !result) return reject(error || new Error('Cloudinary did not return an upload result.'));
          resolve({
            secureUrl: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
          });
        },
      );
      stream.end(buffer);
    });
  }

  static async uploadDataUrl(dataUrl: string, filename = 'banner.png'): Promise<UploadedImage> {
    // Trim to remove any accidental whitespace/newlines that break the regex
    const trimmed = dataUrl.trim();

    // Accept png, jpeg, webp — the $ anchor is applied after trimming
    const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=\n\r]+)$/.exec(trimmed);
    if (!match) throw new Error('Preview image must be a PNG, JPEG, or WebP data URL.');

    // Strip any embedded newlines from the base64 payload (some renderers add them)
    const base64Data = match[2].replace(/[\r\n]/g, '');
    const buffer = Buffer.from(base64Data, 'base64');

    if (buffer.length === 0) throw new Error('Preview image is empty.');
    if (buffer.length > 15 * 1024 * 1024) throw new Error('Preview image must be 15 MB or smaller.');

    return this.uploadImage(buffer, match[1], filename);
  }

  static async destroy(publicId: string): Promise<void> {
    if (!publicId) return;
    const cloudinary = await getConfiguredCloudinary();
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: 'image', invalidate: true });
    if (result.result !== 'ok' && result.result !== 'not found') {
      throw new Error('Cloudinary image deletion failed.');
    }
  }
}
