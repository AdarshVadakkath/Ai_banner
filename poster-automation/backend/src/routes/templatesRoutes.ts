import { Router } from 'express';
import { getTemplates, getTemplateById } from '../controllers/templatesController';

export const templatesRouter = Router();

templatesRouter.get('/', getTemplates);
templatesRouter.get('/:templateId', getTemplateById);
