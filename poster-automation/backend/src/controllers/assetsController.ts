import { Request, Response } from 'express';
import sharp from 'sharp';
import multer from 'multer';
import { CloudinaryService } from '../services/CloudinaryService';

// Configure multer memory storage so sharp can process before writing
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15 MB
  },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type. Please upload PNG, JPEG, WebP, or SVG.'));
    }
  },
});

export const uploadMiddleware = upload.single('asset');

export const uploadAsset = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No image file uploaded' });
      return;
    }

    const originalName = req.file.originalname || 'upload.png';
    const baseId = `asset-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    let width = 1200;
    let height = 800;

    if (req.file.mimetype === 'image/svg+xml') {
      width = 800;
      height = 600;
    } else {
      const image = sharp(req.file.buffer);
      const metadata = await image.metadata();

      width = metadata.width || 1200;
      height = metadata.height || 800;

      if (width > 3200 || height > 3200) {
        const resized = await image
          .resize({ width: 3200, height: 3200, fit: 'inside', withoutEnlargement: true })
          .toBuffer();
        const resizedMetadata = await sharp(resized).metadata();
        width = resizedMetadata.width || width;
        height = resizedMetadata.height || height;
        req.file.buffer = resized;
      }
    }

    const uploaded = await CloudinaryService.uploadImage(req.file.buffer, req.file.mimetype, originalName);
    const aspectRatio = Number((width / height).toFixed(3));

    res.status(201).json({
      asset: {
        id: baseId,
        url: uploaded.secureUrl,
        publicId: uploaded.publicId,
        name: originalName,
        width: uploaded.width || width,
        height: uploaded.height || height,
        aspectRatio,
      },
    });
  } catch (err: any) {
    console.error('Asset upload failed:', err?.message);
    res.status(500).json({ error: 'Asset upload failed. Please retry.', details: err?.message });
  }
};
