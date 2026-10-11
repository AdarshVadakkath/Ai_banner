import { CampaignProject, PosterTemplate, AssetRecord } from '../types/poster';

const API_BASE = '/api';

export class ApiService {
  public static async getHealth(): Promise<{ status: string; service: string }> {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('Health check failed');
    return res.json();
  }

  public static async getProjects(): Promise<CampaignProject[]> {
    const res = await fetch(`${API_BASE}/projects`);
    if (!res.ok) throw new Error('Failed to fetch projects');
    const data = await res.json();
    return data.projects || [];
  }

  public static async getProject(id: string): Promise<CampaignProject> {
    const res = await fetch(`${API_BASE}/projects/${id}`);
    if (!res.ok) throw new Error(`Project ${id} not found`);
    const data = await res.json();
    return data.project;
  }

  public static async createProject(payload: Partial<CampaignProject>): Promise<CampaignProject> {
    const res = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create project');
    }
    const data = await res.json();
    return data.project;
  }

  public static async updateProject(id: string, payload: Partial<CampaignProject>): Promise<CampaignProject> {
    const res = await fetch(`${API_BASE}/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update project');
    }
    const data = await res.json();
    return data.project;
  }

  public static async deleteProject(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/projects/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete project');
  }

  public static async duplicateProject(id: string): Promise<CampaignProject> {
    const res = await fetch(`${API_BASE}/projects/${id}/duplicate`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to duplicate project');
    const data = await res.json();
    return data.project;
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
}
