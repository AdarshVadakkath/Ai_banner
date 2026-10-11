import { Router } from 'express';
import { uploadMiddleware, uploadAsset } from '../controllers/assetsController';

export const assetsRouter = Router();

assetsRouter.post('/upload', uploadMiddleware, uploadAsset);
