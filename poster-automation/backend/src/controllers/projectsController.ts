import { Request, Response } from 'express';
import { StorageService } from '../services/StorageService';
import { CreateProjectSchema, UpdateProjectSchema } from '../validators/schemas';
import { CampaignProject, CampaignAssets } from '../types/poster';

export const getProjects = async (_req: Request, res: Response): Promise<void> => {
  try {
    const projects = await StorageService.listProjects();
    res.json({ projects });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch projects', details: err.message });
  }
};

export const getProjectById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    const project = await StorageService.getProject(projectId);
    if (!project) {
      res.status(404).json({ error: `Project '${projectId}' not found` });
      return;
    }
    res.json({ project });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch project', details: err.message });
  }
};

export const createProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = CreateProjectSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten(),
      });
      return;
    }

    const id = `project-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const newProject: CampaignProject = {
      id,
      name: parseResult.data.name,
      templateId: parseResult.data.templateId,
      content: parseResult.data.content,
      assets: parseResult.data.assets as CampaignAssets,
      selectedFormats: parseResult.data.selectedFormats,
      thumbnailUrl: parseResult.data.thumbnailUrl,
      createdAt: now,
      updatedAt: now,
    };

    await StorageService.saveProject(newProject);
    res.status(201).json({ project: newProject });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create project', details: err.message });
  }
};

export const updateProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    const existing = await StorageService.getProject(projectId);
    if (!existing) {
      res.status(404).json({ error: `Project '${projectId}' not found` });
      return;
    }

    const parseResult = UpdateProjectSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten(),
      });
      return;
    }

    const updated: CampaignProject = {
      ...existing,
      ...parseResult.data,
      content: { ...existing.content, ...parseResult.data.content },
      assets: { ...existing.assets, ...parseResult.data.assets } as CampaignAssets,
      updatedAt: new Date().toISOString(),
    };

    await StorageService.saveProject(updated);
    res.json({ project: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update project', details: err.message });
  }
};

export const deleteProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    const success = await StorageService.deleteProject(projectId);
    if (!success) {
      res.status(404).json({ error: `Project '${projectId}' not found` });
      return;
    }
    res.json({ success: true, message: `Project '${projectId}' deleted` });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete project', details: err.message });
  }
};

export const duplicateProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    const existing = await StorageService.getProject(projectId);
    if (!existing) {
      res.status(404).json({ error: `Project '${projectId}' not found` });
      return;
    }

    const newId = `project-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const duplicated: CampaignProject = {
      ...existing,
      id: newId,
      name: `${existing.name} (Copy)`,
      createdAt: now,
      updatedAt: now,
    };

    await StorageService.saveProject(duplicated);
    res.status(201).json({ project: duplicated });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to duplicate project', details: err.message });
  }
};
