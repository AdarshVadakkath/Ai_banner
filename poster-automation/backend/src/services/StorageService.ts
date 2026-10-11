import fs from 'fs';
import path from 'path';
import { CampaignProject, PosterTemplate } from '../types/poster';
import { BUILTIN_TEMPLATES } from '../config/templates';
import { DEFAULT_SAMPLE_PROJECTS } from '../config/sampleData';

const STORAGE_ROOT = path.resolve(process.cwd(), 'poster-automation/backend/storage');
const PROJECTS_DIR = path.join(STORAGE_ROOT, 'projects');
const TEMPLATES_DIR = path.join(STORAGE_ROOT, 'templates');
const UPLOADS_DIR = path.join(STORAGE_ROOT, 'uploads');
const EXPORTS_DIR = path.join(STORAGE_ROOT, 'exports');

export class StorageService {
  private static initialized = false;

  public static async ensureDirectories(): Promise<void> {
    if (this.initialized) return;

    for (const dir of [STORAGE_ROOT, PROJECTS_DIR, TEMPLATES_DIR, UPLOADS_DIR, EXPORTS_DIR]) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    // Seed default sample templates if not already written
    for (const template of BUILTIN_TEMPLATES) {
      const templatePath = path.join(TEMPLATES_DIR, `${template.id}.json`);
      if (!fs.existsSync(templatePath)) {
        await fs.promises.writeFile(templatePath, JSON.stringify(template, null, 2), 'utf-8');
      }
    }

    // Seed default sample projects if projects directory is empty
    const existingProjects = await fs.promises.readdir(PROJECTS_DIR);
    if (existingProjects.filter((f) => f.endsWith('.json')).length === 0) {
      for (const sample of DEFAULT_SAMPLE_PROJECTS) {
        const samplePath = path.join(PROJECTS_DIR, `${sample.id}.json`);
        await fs.promises.writeFile(samplePath, JSON.stringify(sample, null, 2), 'utf-8');
      }
    }

    this.initialized = true;
  }

  public static async listProjects(): Promise<CampaignProject[]> {
    await this.ensureDirectories();
    const files = await fs.promises.readdir(PROJECTS_DIR);
    const projects: CampaignProject[] = [];

    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      try {
        const content = await fs.promises.readFile(path.join(PROJECTS_DIR, file), 'utf-8');
        projects.push(JSON.parse(content));
      } catch (err) {
        console.error(`Error reading project file ${file}:`, err);
      }
    }

    // Sort newest first
    return projects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  public static async getProject(id: string): Promise<CampaignProject | null> {
    await this.ensureDirectories();
    const filePath = path.join(PROJECTS_DIR, `${id}.json`);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  public static async saveProject(project: CampaignProject): Promise<CampaignProject> {
    await this.ensureDirectories();
    const filePath = path.join(PROJECTS_DIR, `${project.id}.json`);
    await fs.promises.writeFile(filePath, JSON.stringify(project, null, 2), 'utf-8');
    return project;
  }

  public static async deleteProject(id: string): Promise<boolean> {
    await this.ensureDirectories();
    const filePath = path.join(PROJECTS_DIR, `${id}.json`);
    if (!fs.existsSync(filePath)) {
      return false;
    }
    await fs.promises.unlink(filePath);
    return true;
  }

  public static async listTemplates(): Promise<PosterTemplate[]> {
    await this.ensureDirectories();
    return BUILTIN_TEMPLATES;
  }

  public static async getTemplate(id: string): Promise<PosterTemplate | null> {
    await this.ensureDirectories();
    const found = BUILTIN_TEMPLATES.find((t) => t.id === id);
    return found || null;
  }

  public static getUploadsDir(): string {
    return UPLOADS_DIR;
  }
}
