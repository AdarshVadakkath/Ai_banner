export const DEFAULT_POSTER_FORMATS = [
    {
        id: 'small-image',
        name: 'Small image',
        width: 1200,
        height: 630,
        aspectRatioLabel: '1.91:1',
        category: 'banner',
        isDefault: true,
    },
    {
        id: 'square-1200',
        name: 'Square',
        width: 1200,
        height: 1200,
        aspectRatioLabel: '1:1',
        category: 'social',
        isDefault: true,
    },
    {
        id: 'vertical-630',
        name: 'Vertical',
        width: 630,
        height: 1200,
        aspectRatioLabel: '1:1.9',
        category: 'social',
        isDefault: true,
    },
    {
        id: 'carousel-card',
        name: 'Carousel card',
        width: 1080,
        height: 1080,
        aspectRatioLabel: '1:1',
        category: 'social',
        isDefault: true,
    },
    {
        id: 'spotlight-ad',
        name: 'Spotlight / text ad',
        width: 1200,
        height: 630,
        aspectRatioLabel: '1.91:1',
        category: 'banner',
    },
    {
        id: 'feed-image',
        name: 'Feed image',
        width: 1200,
        height: 630,
        aspectRatioLabel: '1.91:1',
        category: 'social',
    },
    {
        id: 'square-post',
        name: 'Square (1080)',
        width: 1080,
        height: 1080,
        aspectRatioLabel: '1:1',
        category: 'social',
    },
    {
        id: 'medium-rectangle',
        name: 'Medium rectangle',
        width: 300,
        height: 250,
        aspectRatioLabel: '6:5',
        category: 'banner',
    },
    {
        id: 'half-page',
        name: 'Half page',
        width: 300,
        height: 600,
        aspectRatioLabel: '1:2',
        category: 'banner',
    },
    {
        id: 'leaderboard',
        name: 'Leaderboard',
        width: 728,
        height: 90,
        aspectRatioLabel: '728:90',
        category: 'banner',
    },
    {
        id: 'skyscraper',
        name: 'Skyscraper',
        width: 160,
        height: 600,
        aspectRatioLabel: '4:15',
        category: 'banner',
    },
];
// Top hero formats for header ratio switcher
export const HERO_FORMATS = [
    DEFAULT_POSTER_FORMATS[0], // Small image
    DEFAULT_POSTER_FORMATS[1], // Square 1200
    DEFAULT_POSTER_FORMATS[2], // Vertical
    DEFAULT_POSTER_FORMATS[3], // Carousel card
    DEFAULT_POSTER_FORMATS[7], // Medium rectangle
    DEFAULT_POSTER_FORMATS[9], // Leaderboard
    DEFAULT_POSTER_FORMATS[10], // Skyscraper
];
// All formats for generation matching reference image
export const ALL_GENERATE_FORMATS = DEFAULT_POSTER_FORMATS;
export const FORMAT_LIMITS = {
    minWidth: 90,
    maxWidth: 4000,
    minHeight: 90,
    maxHeight: 4000,
};
