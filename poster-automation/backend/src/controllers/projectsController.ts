import { Request, Response } from 'express';
import { and, desc, eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { getDb } from '../db/client';
import { banners, bannerImages } from '../db/schema';
import { CloudinaryService } from '../services/CloudinaryService';
import { BatchUploadImagesSchema, CreateProjectSchema, UpdateProjectSchema } from '../validators/schemas';
import { CampaignAssets, CampaignProject } from '../types/poster';

type OwnedRequest = Request & { ownerId?: string };
const owner = (req: Request) => (req as OwnedRequest).ownerId!;
const settings = (project: Pick<CampaignProject, 'content' | 'assets' | 'selectedFormats'>) => ({
  content: project.content, assets: project.assets, selectedFormats: project.selectedFormats,
});

const asProject = (row: typeof banners.$inferSelect & { images?: Array<typeof bannerImages.$inferSelect> }): CampaignProject => {
  const value = row.designSettings as { content: CampaignProject['content']; assets: CampaignAssets; selectedFormats: CampaignProject['selectedFormats'] };
  const images = (row.images || []).map((img) => ({
    id: img.id,
    bannerId: img.bannerId,
    formatId: img.formatId,
    aspectRatio: img.aspectRatio,
    width: img.width,
    height: img.height,
    imageUrl: img.imageUrl,
    cloudinaryPublicId: img.cloudinaryPublicId || undefined,
    fileSizeBytes: img.fileSizeBytes || undefined,
    createdAt: img.createdAt.toISOString(),
    updatedAt: img.updatedAt.toISOString(),
  }));

  const imagesByRatio = Object.fromEntries(images.map((img) => [img.aspectRatio, img]));
  const imagesByFormat = Object.fromEntries(images.map((img) => [img.formatId, img]));

  return {
    id: row.id,
    name: row.title,
    templateId: row.templateId,
    content: value.content,
    assets: value.assets,
    selectedFormats: value.selectedFormats,
    thumbnailUrl: row.imageUrl || undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    images,
    imagesByRatio,
    imagesByFormat,
  };
};

const cloudinaryIds = (project: CampaignProject) => {
  const ids = new Set<string>();
  const settingsAssets = project.assets as CampaignAssets & { logoPublicId?: string; backgroundImages: Array<{ publicId?: string }> };
  if (settingsAssets.logoPublicId) ids.add(settingsAssets.logoPublicId);
  for (const asset of settingsAssets.backgroundImages || []) if (asset.publicId) ids.add(asset.publicId);
  return ids;
};

function databaseError(res: Response, operation: string, err: unknown) {
  console.error(`${operation} failed:`, err instanceof Error ? err.message : err);
  res.status(503).json({ error: 'Banner storage is temporarily unavailable. Please retry.' });
}

export const getProjects = async (req: Request, res: Response): Promise<void> => {
  try {
    const rows = await getDb().query.banners.findMany({
      where: eq(banners.ownerId, owner(req)),
      with: { images: true },
      orderBy: desc(banners.updatedAt),
    });
    res.json({ projects: rows.map(asProject) });
  } catch (err) { databaseError(res, 'Fetching banners', err); }
};

export const getProjectById = async (req: Request, res: Response): Promise<void> => {
  try {
    const row = await getDb().query.banners.findFirst({
      where: and(eq(banners.id, req.params.projectId), eq(banners.ownerId, owner(req))),
      with: { images: true },
    });
    if (!row) { res.status(404).json({ error: 'Banner not found' }); return; }
    res.json({ project: asProject(row) });
  } catch (err) { databaseError(res, 'Fetching banner', err); }
};

export const createProject = async (req: Request, res: Response): Promise<void> => {
  const parsed = CreateProjectSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() }); return; }
  let preview: Awaited<ReturnType<typeof CloudinaryService.uploadDataUrl>> | undefined;

  // Upload thumbnail to Cloudinary (non-fatal: banner is saved even if upload fails)
  if (parsed.data.thumbnailUrl?.startsWith('data:')) {
    try {
      preview = await CloudinaryService.uploadDataUrl(parsed.data.thumbnailUrl, `${parsed.data.name}.png`);
      console.log('[Cloudinary] Thumbnail uploaded:', preview.secureUrl);
    } catch (cloudErr) {
      console.error('[Cloudinary] Thumbnail upload FAILED on createProject:', cloudErr instanceof Error ? cloudErr.message : cloudErr);
    }
  }

  try {
    const now = new Date();
    const id = `banner-${randomUUID()}`;
    const inserted = (await getDb().insert(banners).values({
      id, ownerId: owner(req), title: parsed.data.name, templateId: parsed.data.templateId,
      originalPrompt: parsed.data.content.mainHeading || null,
      imageUrl: preview?.secureUrl || null,
      cloudinaryPublicId: preview?.publicId || null,
      imageWidth: preview?.width || null,
      imageHeight: preview?.height || null,
      designSettings: settings(parsed.data), generationStatus: 'ready', createdAt: now, updatedAt: now,
    }).returning())[0];
    res.status(201).json({ project: asProject(inserted) });
  } catch (err) {
    if (preview) await CloudinaryService.destroy(preview.publicId).catch(() => undefined);
    databaseError(res, 'Creating banner', err);
  }
};

export const updateProject = async (req: Request, res: Response): Promise<void> => {
  const parsed = UpdateProjectSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() }); return; }
  let preview: Awaited<ReturnType<typeof CloudinaryService.uploadDataUrl>> | undefined;

  try {
    const existing = (await getDb().select().from(banners).where(and(eq(banners.id, req.params.projectId), eq(banners.ownerId, owner(req)))).limit(1))[0];
    if (!existing) { res.status(404).json({ error: 'Banner not found' }); return; }
    const oldProject = asProject(existing);
    const merged: CampaignProject = {
      ...oldProject, ...parsed.data, content: { ...oldProject.content, ...parsed.data.content },
      assets: { ...oldProject.assets, ...parsed.data.assets } as CampaignAssets,
      selectedFormats: parsed.data.selectedFormats || oldProject.selectedFormats,
    };

    // Upload new thumbnail to Cloudinary (non-fatal)
    if (parsed.data.thumbnailUrl?.startsWith('data:')) {
      try {
        preview = await CloudinaryService.uploadDataUrl(parsed.data.thumbnailUrl, `${merged.name}.png`);
        console.log('[Cloudinary] Thumbnail uploaded:', preview.secureUrl);
      } catch (cloudErr) {
        console.error('[Cloudinary] Thumbnail upload FAILED on updateProject:', cloudErr instanceof Error ? cloudErr.message : cloudErr);
      }
    }

    const updated = (await getDb().update(banners).set({
      title: merged.name, templateId: merged.templateId, originalPrompt: merged.content.mainHeading || null,
      imageUrl: preview?.secureUrl || existing.imageUrl || null,
      cloudinaryPublicId: preview?.publicId || existing.cloudinaryPublicId,
      imageWidth: preview?.width || existing.imageWidth,
      imageHeight: preview?.height || existing.imageHeight,
      designSettings: settings(merged), updatedAt: new Date(),
    }).where(and(eq(banners.id, existing.id), eq(banners.ownerId, owner(req)))).returning())[0];

    if (preview && existing.cloudinaryPublicId && existing.cloudinaryPublicId !== preview.publicId) {
      CloudinaryService.destroy(existing.cloudinaryPublicId).catch(() => undefined);
    }

    // Retrieve updated project with all associated aspect ratio images
    const reloaded = await getDb().query.banners.findFirst({
      where: and(eq(banners.id, existing.id), eq(banners.ownerId, owner(req))),
      with: { images: true },
    });

    res.json({ project: asProject(reloaded || updated) });
  } catch (err) {
    if (preview) await CloudinaryService.destroy(preview.publicId).catch(() => undefined);
    databaseError(res, 'Updating banner', err);
  }
};

export const deleteProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const existingImages = await getDb().select().from(bannerImages).where(eq(bannerImages.bannerId, req.params.projectId));
    const existing = (await getDb().delete(banners).where(and(eq(banners.id, req.params.projectId), eq(banners.ownerId, owner(req)))).returning())[0];
    if (!existing) { res.status(404).json({ error: 'Banner not found' }); return; }
    const project = asProject(existing);
    const ids = cloudinaryIds(project);
    if (existing.cloudinaryPublicId) ids.add(existing.cloudinaryPublicId);
    for (const img of existingImages) {
      if (img.cloudinaryPublicId) ids.add(img.cloudinaryPublicId);
    }
    await Promise.all([...ids].map((id) => CloudinaryService.destroy(id).catch(() => undefined)));
    res.json({ success: true });
  } catch (err) { databaseError(res, 'Deleting banner', err); }
};

export const duplicateProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const existing = (await getDb().select().from(banners).where(and(eq(banners.id, req.params.projectId), eq(banners.ownerId, owner(req)))).limit(1))[0];
    if (!existing) { res.status(404).json({ error: 'Banner not found' }); return; }
    const now = new Date();
    const copied = (await getDb().insert(banners).values({ ...existing, id: `banner-${randomUUID()}`, title: `${existing.title} (Copy)`, cloudinaryPublicId: null, createdAt: now, updatedAt: now }).returning())[0];

    const originalImages = await getDb().select().from(bannerImages).where(eq(bannerImages.bannerId, existing.id));
    for (const img of originalImages) {
      await getDb().insert(bannerImages).values({
        ...img,
        id: `img-${randomUUID()}`,
        bannerId: copied.id,
        createdAt: now,
        updatedAt: now,
      });
    }

    const fullCopied = await getDb().query.banners.findFirst({
      where: eq(banners.id, copied.id),
      with: { images: true },
    });

    res.status(201).json({ project: asProject(fullCopied || copied) });
  } catch (err) { databaseError(res, 'Duplicating banner', err); }
};

/**
 * Uploads and stores multiple image aspect ratios under a single campaign ID.
 * Performs parallel upload to Cloudinary and atomic upsert into banner_images table.
 */
export const uploadProjectImages = async (req: Request, res: Response): Promise<void> => {
  const parsed = BatchUploadImagesSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  try {
    const banner = (await getDb().select().from(banners).where(and(eq(banners.id, req.params.projectId), eq(banners.ownerId, owner(req)))).limit(1))[0];
    if (!banner) {
      res.status(404).json({ error: 'Banner not found' });
      return;
    }

    const now = new Date();
    const safeTitle = banner.title.replace(/[^a-zA-Z0-9_-]/g, '_');

    // Concurrently upload images to Cloudinary
    const uploadTasks = parsed.data.images.map(async (item) => {
      let secureUrl = item.dataUrl;
      let publicId: string | undefined;

      if (item.dataUrl.startsWith('data:')) {
        try {
          const uploaded = await CloudinaryService.uploadDataUrl(
            item.dataUrl,
            `${safeTitle}-${item.formatId}.png`
          );
          secureUrl = uploaded.secureUrl;
          publicId = uploaded.publicId;
        } catch (uploadErr) {
          console.warn(`[Cloudinary] Upload failed for format ${item.formatId}, falling back:`, uploadErr);
        }
      }

      return {
        id: `img-${randomUUID()}`,
        bannerId: banner.id,
        formatId: item.formatId,
        aspectRatio: item.aspectRatio,
        width: item.width,
        height: item.height,
        imageUrl: secureUrl,
        cloudinaryPublicId: publicId || null,
        fileSizeBytes: Math.round((item.dataUrl.length * 3) / 4),
        mimeType: 'image/png',
        createdAt: now,
        updatedAt: now,
      };
    });

    const processedImages = await Promise.all(uploadTasks);

    // Atomically upsert each aspect ratio in banner_images
    for (const img of processedImages) {
      await getDb().insert(bannerImages).values(img).onConflictDoUpdate({
        target: [bannerImages.bannerId, bannerImages.formatId],
        set: {
          imageUrl: img.imageUrl,
          cloudinaryPublicId: img.cloudinaryPublicId,
          width: img.width,
          height: img.height,
          fileSizeBytes: img.fileSizeBytes,
          updatedAt: now,
        },
      });
    }

    // Sync primary banner thumbnail if a square or default format is uploaded
    const thumbImg = processedImages.find((i) => i.formatId === 'square-1200' || i.aspectRatio === '1:1') || processedImages[0];
    if (thumbImg) {
      await getDb().update(banners).set({
        imageUrl: thumbImg.imageUrl,
        cloudinaryPublicId: thumbImg.cloudinaryPublicId || banner.cloudinaryPublicId,
        imageWidth: thumbImg.width,
        imageHeight: thumbImg.height,
        updatedAt: now,
      }).where(eq(banners.id, banner.id));
    }

    // Fetch the updated campaign with all aspect ratios in a single query
    const updated = await getDb().query.banners.findFirst({
      where: and(eq(banners.id, banner.id), eq(banners.ownerId, owner(req))),
      with: { images: true },
    });

    res.status(201).json({
      success: true,
      count: processedImages.length,
      project: updated ? asProject(updated) : undefined,
    });
  } catch (err) {
    databaseError(res, 'Uploading aspect ratio images', err);
  }
};

export const getProjectImages = async (req: Request, res: Response): Promise<void> => {
  try {
    const banner = (await getDb().select().from(banners).where(and(eq(banners.id, req.params.projectId), eq(banners.ownerId, owner(req)))).limit(1))[0];
    if (!banner) { res.status(404).json({ error: 'Banner not found' }); return; }

    const images = await getDb().select().from(bannerImages).where(eq(bannerImages.bannerId, banner.id));
    res.json({
      images: images.map((img) => ({
        id: img.id,
        formatId: img.formatId,
        aspectRatio: img.aspectRatio,
        width: img.width,
        height: img.height,
        imageUrl: img.imageUrl,
        createdAt: img.createdAt.toISOString(),
        updatedAt: img.updatedAt.toISOString(),
      })),
      imagesByRatio: Object.fromEntries(images.map((img) => [img.aspectRatio, img])),
      imagesByFormat: Object.fromEntries(images.map((img) => [img.formatId, img])),
    });
  } catch (err) {
    databaseError(res, 'Fetching aspect ratio images', err);
  }
};
