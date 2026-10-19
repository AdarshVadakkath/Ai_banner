import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { app as backendApp } from './poster-automation/backend/src/app.ts';
import { initDatabaseSchema } from './poster-automation/backend/src/db/client.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const PORT = Number(process.env.PORT) || 3000;
  const isProduction = process.env.NODE_ENV === 'production';
  initDatabaseSchema().catch((err) => console.warn('[Database] Startup schema init warning:', err));

  // Use the backend Express application which already has all API routes configured
  const app = backendApp;

  const httpServer = http.createServer(app);

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite middleware mounted in development mode');
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  const tryListen = (port: number) => {
    const serverInstance = httpServer.listen(port, '0.0.0.0', () => {
      console.log(`Formatly Full-Stack Server running at http://localhost:${port}`);
    });
    serverInstance.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`Port ${port} is in use, retrying on http://localhost:${port + 1}...`);
        tryListen(port + 1);
      } else {
        console.error('Server error:', err);
        process.exit(1);
      }
    });
  };

  tryListen(PORT);
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
