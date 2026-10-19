import { Router } from 'express';
import {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  duplicateProject,
  uploadProjectImages,
  getProjectImages,
} from '../controllers/projectsController';

export const projectsRouter = Router();

projectsRouter.get('/', getProjects);
projectsRouter.get('/:projectId', getProjectById);
projectsRouter.post('/', createProject);
projectsRouter.put('/:projectId', updateProject);
projectsRouter.delete('/:projectId', deleteProject);
projectsRouter.post('/:projectId/duplicate', duplicateProject);
projectsRouter.post('/:projectId/images', uploadProjectImages);
projectsRouter.get('/:projectId/images', getProjectImages);
