import { Request, Response } from 'express';

export const getHealth = (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    service: 'Formatly Multi-Format Poster Engine API',
  });
};
