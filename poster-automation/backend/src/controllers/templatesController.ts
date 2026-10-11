import { Request, Response } from 'express';
import { StorageService } from '../services/StorageService';

export const getTemplates = async (_req: Request, res: Response): Promise<void> => {
  try {
    const templates = await StorageService.listTemplates();
    res.json({ templates });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch templates', details: err.message });
  }
};

export const getTemplateById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { templateId } = req.params;
    const template = await StorageService.getTemplate(templateId);
    if (!template) {
      res.status(404).json({ error: `Template with ID '${templateId}' not found` });
      return;
    }
    res.json({ template });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch template', details: err.message });
  }
};
