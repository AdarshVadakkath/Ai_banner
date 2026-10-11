import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import multer from 'multer';
import { StorageService } from '../services/StorageService';

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

    await StorageService.ensureDirectories();
    const uploadsDir = StorageService.getUploadsDir();

    const originalName = req.file.originalname || 'upload.png';
    const ext = path.extname(originalName).toLowerCase() || '.png';
    const baseId = `asset-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const filename = `${baseId}${ext}`;
    const targetPath = path.join(uploadsDir, filename);

    let width = 1200;
    let height = 800;

    if (req.file.mimetype === 'image/svg+xml') {
      // For SVG, save directly
      await fs.promises.writeFile(targetPath, req.file.buffer);
      width = 800;
      height = 600;
    } else {
      // Use Sharp to read metadata and write optimized image
      const image = sharp(req.file.buffer);
      const metadata = await image.metadata();

      width = metadata.width || 1200;
      height = metadata.height || 800;

      // If dimensions are excessively huge (>3000px), resize while preserving aspect ratio
      if (width > 3200 || height > 3200) {
        await image
          .resize({ width: 3200, height: 3200, fit: 'inside', withoutEnlargement: true })
          .toFile(targetPath);
      } else {
        await fs.promises.writeFile(targetPath, req.file.buffer);
      }
    }

    const aspectRatio = Number((width / height).toFixed(3));
    const assetUrl = `/uploads/${filename}`;

    res.status(201).json({
      asset: {
        id: baseId,
        url: assetUrl,
        name: originalName,
        width,
        height,
        aspectRatio,
      },
    });
  } catch (err: any) {
    console.error('Asset upload error:', err);
    res.status(500).json({ error: 'Asset processing failed', details: err.message });
  }
};
