import { PosterFormat } from '../types/poster';

export const DEFAULT_POSTER_FORMATS: PosterFormat[] = [
  {
    id: 'square-post',
    name: 'Square post',
    width: 1080,
    height: 1080,
    aspectRatioLabel: '1:1',
    category: 'social',
    isDefault: true,
  },
  {
    id: 'portrait-post',
    name: 'Portrait post',
    width: 1080,
    height: 1350,
    aspectRatioLabel: '4:5',
    category: 'social',
    isDefault: true,
  },
  {
    id: 'story',
    name: 'Story',
    width: 1080,
    height: 1920,
    aspectRatioLabel: '9:16',
    category: 'story',
    isDefault: true,
  },
  {
    id: 'landscape-post',
    name: 'Landscape post',
    width: 1200,
    height: 628,
    aspectRatioLabel: '1.91:1',
    category: 'banner',
    isDefault: true,
  },
  {
    id: 'presentation-widescreen',
    name: 'Presentation widescreen',
    width: 1920,
    height: 1080,
    aspectRatioLabel: '16:9',
    category: 'display',
    isDefault: true,
  },
];

export const FORMAT_LIMITS = {
  minWidth: 400,
  maxWidth: 4000,
  minHeight: 400,
  maxHeight: 4000,
};
