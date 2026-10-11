import { CampaignProject } from '../types/poster';
import { DEFAULT_POSTER_FORMATS } from './formats';

// High-quality SVG logo data URLs (vector, crisp at any size)
export const SAMPLE_LOGO_URL = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 60" width="240" height="60"><rect width="240" height="60" rx="8" fill="none"/><circle cx="30" cy="30" r="18" fill="%2338BDF8"/><path d="M22 30 L38 20 L38 40 Z" fill="%23FFFFFF"/><text x="60" y="38" font-family="system-ui, sans-serif" font-weight="800" font-size="24" fill="%23FFFFFF" letter-spacing="1">VERTEX</text><text x="165" y="38" font-family="system-ui, sans-serif" font-weight="400" font-size="14" fill="%2394A3B8">LABS</text></svg>`;

export const SAMPLE_BACKGROUND_1 = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1920" width="1920" height="1920"><defs><radialGradient id="g1" cx="30%25" cy="20%25" r="70%25"><stop offset="0%25" stop-color="%231E293B"/><stop offset="50%25" stop-color="%230F172A"/><stop offset="100%25" stop-color="%23020617"/></radialGradient><radialGradient id="glow" cx="80%25" cy="30%25" r="45%25"><stop offset="0%25" stop-color="%230284C7" stop-opacity="0.35"/><stop offset="100%25" stop-color="%230F172A" stop-opacity="0"/></radialGradient><pattern id="grid" width="80" height="80" patternUnits="userSpaceOnUse"><path d="M 80 0 L 0 0 0 80" fill="none" stroke="%23334155" stroke-width="1" stroke-opacity="0.25"/></pattern></defs><rect width="100%25" height="100%25" fill="url(%23g1)"/><rect width="100%25" height="100%25" fill="url(%23glow)"/><rect width="100%25" height="100%25" fill="url(%23grid)"/><circle cx="1500" cy="600" r="450" fill="%2338BDF8" fill-opacity="0.08"/><circle cx="400" cy="1400" r="600" fill="%232563EB" fill-opacity="0.06"/></svg>`;

export const SAMPLE_BACKGROUND_2 = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1920" width="1920" height="1920"><defs><linearGradient id="bg2" x1="0" y1="0" x2="1" y2="1"><stop offset="0%25" stop-color="%23111827"/><stop offset="40%25" stop-color="%231F2937"/><stop offset="80%25" stop-color="%23030712"/></linearGradient><radialGradient id="amberGlow" cx="25%25" cy="40%25" r="50%25"><stop offset="0%25" stop-color="%23F59E0B" stop-opacity="0.28"/><stop offset="100%25" stop-color="%23111827" stop-opacity="0"/></radialGradient></defs><rect width="100%25" height="100%25" fill="url(%23bg2)"/><rect width="100%25" height="100%25" fill="url(%23amberGlow)"/><path d="M -200 1200 Q 960 400 2120 1400" stroke="%23F59E0B" stroke-width="3" stroke-opacity="0.25" fill="none"/><path d="M -200 1300 Q 960 500 2120 1500" stroke="%23F97316" stroke-width="1.5" stroke-opacity="0.2" fill="none"/></svg>`;

export const SAMPLE_BACKGROUND_3 = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1920" width="1920" height="1920"><defs><linearGradient id="bg3" x1="0" y1="0" x2="1" y2="1"><stop offset="0%25" stop-color="%2318181B"/><stop offset="50%25" stop-color="%2327272A"/><stop offset="100%25" stop-color="%2309090B"/></linearGradient><radialGradient id="purpleGlow" cx="70%25" cy="30%25" r="55%25"><stop offset="0%25" stop-color="%23A855F7" stop-opacity="0.32"/><stop offset="100%25" stop-color="%2318181B" stop-opacity="0"/></radialGradient></defs><rect width="100%25" height="100%25" fill="url(%23bg3)"/><rect width="100%25" height="100%25" fill="url(%23purpleGlow)"/><circle cx="1300" cy="500" r="300" fill="%23EC4899" fill-opacity="0.12"/></svg>`;

export const DEFAULT_SAMPLE_PROJECTS: CampaignProject[] = [
  {
    id: 'campaign-summit-2026',
    name: 'Future AI & Cloud Summit 2026',
    templateId: 'modern-minimal',
    content: {
      campaignName: 'Future AI & Cloud Summit 2026',
      introText: 'ANNUAL GLOBAL CONFERENCE',
      mainHeading: 'Pioneering the Next Frontier of Intelligent Systems',
      supportingParagraph: 'Join 5,000+ industry leaders, engineers, and visionaries for 3 immersive days of architecture keynotes, workshops, and exclusive live sessions.',
      dateText: 'October 24–26, 2026',
      locationText: 'Moscone Center, San Francisco & Online',
      ctaText: 'Reserve Early Access',
    },
    assets: {
      logoUrl: SAMPLE_LOGO_URL,
      logoAspectRatio: 4.0,
      backgroundImages: [
        {
          id: 'bg-cloud-mesh',
          name: 'Cyber Mesh Ambient',
          url: SAMPLE_BACKGROUND_1,
          width: 1920,
          height: 1920,
          aspectRatio: 1.0,
        },
        {
          id: 'bg-warm-horizon',
          name: 'Amber Glow Flow',
          url: SAMPLE_BACKGROUND_2,
          width: 1920,
          height: 1920,
          aspectRatio: 1.0,
        },
      ],
      selectedBackgroundId: 'bg-cloud-mesh',
      backgroundFit: 'cover',
      formatAdjustments: {},
    },
    selectedFormats: DEFAULT_POSTER_FORMATS.slice(0, 4), // Square, Portrait, Story, Landscape
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'campaign-product-launch',
    name: 'NextGen Autonomous Core Launch',
    templateId: 'bold-event',
    content: {
      campaignName: 'NextGen Autonomous Core Launch',
      introText: 'PRODUCT ANNOUNCEMENT',
      mainHeading: 'Unprecedented Velocity. Zero Compromise.',
      supportingParagraph: 'Designed for mission-critical real-time processing with sub-millisecond deterministic latency at scale.',
      dateText: 'Streaming Live Nov 12',
      locationText: 'Global Broadcast • YouTube & LinkedIn',
      ctaText: 'Watch Keynote',
    },
    assets: {
      logoUrl: SAMPLE_LOGO_URL,
      logoAspectRatio: 4.0,
      backgroundImages: [
        {
          id: 'bg-warm-horizon',
          name: 'Amber Glow Flow',
          url: SAMPLE_BACKGROUND_2,
          width: 1920,
          height: 1920,
          aspectRatio: 1.0,
        },
      ],
      selectedBackgroundId: 'bg-warm-horizon',
      backgroundFit: 'cover',
      formatAdjustments: {},
    },
    selectedFormats: [DEFAULT_POSTER_FORMATS[0], DEFAULT_POSTER_FORMATS[1], DEFAULT_POSTER_FORMATS[3]],
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
  },
];
