import express from 'express';
import cors from 'cors';
import path from 'path';
import { healthRouter } from './routes/healthRoutes';
import { projectsRouter } from './routes/projectsRoutes';
import { templatesRouter } from './routes/templatesRoutes';
import { assetsRouter } from './routes/assetsRoutes';
import { StorageService } from './services/StorageService';

export const app = express();

// Ensure storage directories exist at startup
StorageService.ensureDirectories().catch((err) => {
  console.error('Failed to initialize storage directories:', err);
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static uploads serving
app.use('/uploads', express.static(StorageService.getUploadsDir()));

// API Routes
app.use('/api', healthRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/assets', assetsRouter);

// 404 Handler for API
app.use('/api/*', (_req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handling middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err?.message || 'Unexpected error occurred',
  });
});
