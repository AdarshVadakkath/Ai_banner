import { CampaignProject, PosterTemplate, AssetRecord } from '../types/poster';

const API_BASE = '/api';

export class ApiService {
  public static async getHealth(): Promise<{ status: string; service: string }> {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('Health check failed');
    return res.json();
  }

  private static getLocalProjects(): CampaignProject[] {
    try {
      const raw = localStorage.getItem('formatly_local_projects');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private static setLocalProjects(projects: CampaignProject[]): void {
    try {
      localStorage.setItem('formatly_local_projects', JSON.stringify(projects));
    } catch (e) {
      console.warn('Could not save to localStorage:', e);
    }
  }

  private static getDeletedProjectIds(): Set<string> {
    try {
      const raw = localStorage.getItem('formatly_deleted_project_ids');
      return new Set(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set();
    }
  }

  private static addDeletedProjectId(id: string): void {
    try {
      const set = this.getDeletedProjectIds();
      set.add(id);
      localStorage.setItem('formatly_deleted_project_ids', JSON.stringify(Array.from(set)));
    } catch (e) {
      console.warn('Could not save deleted project IDs:', e);
    }
  }

  private static removeDeletedProjectId(id: string): void {
    try {
      const set = this.getDeletedProjectIds();
      set.delete(id);
      localStorage.setItem('formatly_deleted_project_ids', JSON.stringify(Array.from(set)));
    } catch (e) {
      console.warn('Could not update deleted project IDs:', e);
    }
  }

  public static async getProjects(): Promise<CampaignProject[]> {
    let backendProjects: CampaignProject[] = [];
    try {
      const res = await fetch(`${API_BASE}/projects`);
      if (res.ok) {
        const data = await res.json();
        backendProjects = data.projects || [];
      }
    } catch (e) {
      console.warn('Backend getProjects failed, relying on localStorage:', e);
    }

    const deletedIds = this.getDeletedProjectIds();
    const localProjects = this.getLocalProjects();
    const mergedMap = new Map<string, CampaignProject>();
    for (const p of backendProjects) {
      if (!deletedIds.has(p.id)) mergedMap.set(p.id, p);
    }
    for (const p of localProjects) {
      if (deletedIds.has(p.id)) continue;
      if (!mergedMap.has(p.id)) {
        mergedMap.set(p.id, p);
      } else {
        const existing = mergedMap.get(p.id)!;
        if (new Date(p.updatedAt).getTime() > new Date(existing.updatedAt).getTime()) {
          mergedMap.set(p.id, p);
        }
      }
    }
    const combined = Array.from(mergedMap.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    this.setLocalProjects(combined);
    return combined;
  }

  public static async getProject(id: string): Promise<CampaignProject> {
    try {
      const res = await fetch(`${API_BASE}/projects/${id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.project) return data.project;
      }
    } catch (e) {
      console.warn(`Backend getProject(${id}) failed, checking localStorage:`, e);
    }

    const local = this.getLocalProjects().find((p) => p.id === id);
    if (local) return local;
    throw new Error(`Project ${id} not found`);
  }

  public static async createProject(payload: Partial<CampaignProject>): Promise<CampaignProject> {
    let created: CampaignProject | null = null;
    try {
      const res = await fetch(`${API_BASE}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        created = data.project;
      }
    } catch (e) {
      console.warn('Backend createProject failed, saving locally:', e);
    }

    if (!created) {
      const id = `project-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      created = {
        id,
        name: payload.name || 'New Campaign',
        templateId: payload.templateId || 'modern-minimal',
        content: payload.content || ({} as any),
        assets: payload.assets || ({} as any),
        selectedFormats: payload.selectedFormats || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        thumbnailUrl: payload.thumbnailUrl,
      };
    }

    const current = this.getLocalProjects();
    this.removeDeletedProjectId(created.id);
    this.setLocalProjects([created, ...current.filter((p) => p.id !== created!.id)]);
    return created;
  }

  public static async updateProject(id: string, payload: Partial<CampaignProject>): Promise<CampaignProject> {
    let updated: CampaignProject | null = null;
    try {
      const res = await fetch(`${API_BASE}/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        updated = data.project;
      }
    } catch (e) {
      console.warn(`Backend updateProject(${id}) failed, updating locally:`, e);
    }

    const current = this.getLocalProjects();
    const existingIndex = current.findIndex((p) => p.id === id);
    if (existingIndex >= 0) {
      const merged: CampaignProject = {
        ...current[existingIndex],
        ...payload,
        updatedAt: new Date().toISOString(),
      };
      current[existingIndex] = merged;
      this.setLocalProjects([...current]);
      if (!updated) updated = merged;
    } else if (updated) {
      this.setLocalProjects([updated, ...current]);
    }

    if (!updated) throw new Error('Failed to update project');
    return updated;
  }

  public static async deleteProject(id: string): Promise<void> {
    this.addDeletedProjectId(id);
    try {
      await fetch(`${API_BASE}/projects/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.warn(`Backend deleteProject(${id}) failed:`, e);
    }
    const current = this.getLocalProjects().filter((p) => p.id !== id);
    this.setLocalProjects(current);
  }

  public static async duplicateProject(id: string): Promise<CampaignProject> {
    let duplicated: CampaignProject | null = null;
    try {
      const res = await fetch(`${API_BASE}/projects/${id}/duplicate`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        duplicated = data.project;
      }
    } catch (e) {
      console.warn(`Backend duplicateProject(${id}) failed:`, e);
    }

    if (!duplicated) {
      const target = this.getLocalProjects().find((p) => p.id === id);
      if (!target) throw new Error(`Cannot duplicate, project ${id} not found`);
      const newId = `project-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      duplicated = {
        ...target,
        id: newId,
        name: `${target.name} (Copy)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    const current = this.getLocalProjects();
    this.setLocalProjects([duplicated, ...current]);
    return duplicated;
  }

  public static async getTemplates(): Promise<PosterTemplate[]> {
    const res = await fetch(`${API_BASE}/templates`);
    if (!res.ok) throw new Error('Failed to fetch templates');
    const data = await res.json();
    return data.templates || [];
  }

  public static async uploadAsset(file: File): Promise<AssetRecord> {
    const formData = new FormData();
    formData.append('asset', file);

    const res = await fetch(`${API_BASE}/assets/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Asset upload failed');
    }

    const data = await res.json();
    return data.asset;
  }

  public static async uploadProjectImages(
    projectId: string,
    images: Array<{ formatId: string; aspectRatio: string; width: number; height: number; dataUrl: string }>
  ): Promise<CampaignProject | null> {
    try {
      const res = await fetch(`${API_BASE}/projects/${projectId}/images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.project) {
          const current = this.getLocalProjects();
          const existingIndex = current.findIndex((p) => p.id === projectId);
          if (existingIndex >= 0) {
            current[existingIndex] = data.project;
            this.setLocalProjects([...current]);
          }
          return data.project;
        }
      }
    } catch (e) {
      console.warn(`Backend uploadProjectImages(${projectId}) failed:`, e);
    }
    return null;
  }
}
