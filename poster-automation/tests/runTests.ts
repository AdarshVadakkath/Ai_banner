import {
  selectLayoutFamily,
  validateContentLimits,
  calculateFittedFontSize,
  estimateLineCount,
  measureTextBlock,
  selectLayoutTemplate,
  validateResolvedLayout,
  calculateCtaDimensions,
  LayoutEngine,
} from '../frontend/src/utils/LayoutEngine';
import { BUILTIN_TEMPLATES } from '../frontend/src/constants/templates';
import { DEFAULT_POSTER_FORMATS } from '../frontend/src/constants/formats';
import { CreateProjectSchema, BatchUploadImagesSchema } from '../backend/src/validators/schemas';

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    passedCount++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    failedCount++;
    console.error(`  ✗ FAIL: ${testName}${details ? ` -> ${details}` : ''}`);
  }
}

console.log('\n========================================');
console.log(' RUNNING FORMATLY LAYOUT & ENGINE TESTS');
console.log('========================================\n');

// 1. Layout Family Selection by Aspect Ratio
console.log('[Test Suite 1: Aspect-Ratio Layout Family Selection]');
const portraitFamily = selectLayoutFamily(1080, 1920); // 9:16 = 0.5625
assert(portraitFamily === 'portrait', 'Calculates 1080x1920 (9:16) as portrait family');

const squareFamily = selectLayoutFamily(1080, 1080); // 1:1 = 1.0
assert(squareFamily === 'square', 'Calculates 1080x1080 (1:1) as square family');

const landscapeFamily = selectLayoutFamily(1200, 628, 'banner'); // 1.91 banner
assert(landscapeFamily === 'landscape', 'Calculates 1200x628 as landscape banner family');

const widescreenFamily = selectLayoutFamily(1920, 1080); // 16:9 = 1.777
assert(widescreenFamily === 'widescreen', 'Calculates 1920x1080 as widescreen family');
assert(selectLayoutFamily(728, 90, 'banner') === 'compact', 'Classifies leaderboard as compact family');
assert(selectLayoutFamily(160, 600, 'banner') === 'skyscraper', 'Classifies 160x600 as skyscraper family');

// 2. Character Limits & Validation
console.log('\n[Test Suite 2: Character Limits Validation]');
const template = BUILTIN_TEMPLATES[0]; // Modern Minimal (heading limit 55, intro 40)
const validContent = {
  campaignName: 'Test Campaign',
  introText: 'Short intro text',
  mainHeading: 'A Concise and Impactful Main Heading',
  supportingParagraph: 'A short supporting paragraph under the limit.',
  dateText: 'Oct 24, 2026',
  locationText: 'San Francisco, CA',
};

const validWarnings = validateContentLimits(validContent, template);
assert(validWarnings.length === 0, 'Valid content produces zero warnings or errors');

const exceedingContent = {
  ...validContent,
  mainHeading: 'This heading is deliberately constructed to exceed the strict 55 character maximum limit set by template',
};
const exceedWarnings = validateContentLimits(exceedingContent, template);
assert(
  exceedWarnings.some((w) => w.field === 'mainHeading' && w.severity === 'error'),
  'Flags exceeded character limit as error with excess character count'
);
assert(
  exceedWarnings[0].excessCharacters! > 0,
  `Correctly reports excess characters (${exceedWarnings[0].excessCharacters} excess)`
);

// 3. Text Fitting & Dynamic Font Sizing
console.log('\n[Test Suite 3: Text Fitting & Overflow Detection]');
const shortHeadingFit = calculateFittedFontSize('Pioneering AI', 60, 20, 80, 900, 3);
assert(shortHeadingFit.fontSize === 60, 'Preserves target font size when text comfortably fits');
assert(!shortHeadingFit.overflows, 'Does not overflow on short text');

const denseHeading = 'The Complete Strategic Transformation of Global Infrastructure Across Heterogeneous Distributed Computing Systems';
const denseHeadingFit = calculateFittedFontSize(denseHeading, 60, 24, 80, 800, 2);
assert(denseHeadingFit.fontSize <= 60, 'Shrinks font size to accommodate long heading');
const longWordMeasurement = measureTextBlock('Supercalifragilisticexpialidocious', 24, 100);
assert(longWordMeasurement.lineCount > 1, 'Breaks an unspaced long word without clipping');
assert(measureTextBlock('WWW', 20, 500).width > measureTextBlock('iii', 20, 500).width, 'Measures proportional character widths');

console.log('\n[Test Suite 4: Template Selection and Validation]');
assert(selectLayoutTemplate('landscape', validContent, 1200, 630) === 'landscape-split', 'Selects image-balanced landscape template for concise content');
assert(selectLayoutTemplate('landscape', { ...validContent, supportingParagraph: 'A '.repeat(100) }, 1200, 630) === 'landscape-text-focused', 'Selects text-focused landscape template for dense content');
const invalidBounds = validateResolvedLayout({ canvasWidth: 100, canvasHeight: 100, elements: [{ id: 'x', type: 'heading', x: 80, y: 10, width: 30, height: 20, text: 'Test', fontSize: 12 }] });
assert(invalidBounds.some((warning) => warning.severity === 'error'), 'Reports out-of-bounds elements as validation errors');
const primaryButton = calculateCtaDimensions('Start your free trial', 420, 600, 'primary');
const tertiaryButton = calculateCtaDimensions('Learn more', 420, 600, 'tertiary');
assert(primaryButton.width <= 420 * 0.72 && primaryButton.width > tertiaryButton.width, 'Sizes primary CTA from its measured label within available space');
assert(primaryButton.height > tertiaryButton.height, 'Uses a compact height for tertiary CTA links');

// 5. Deterministic Position Calculations & Layout Output
console.log('\n[Test Suite 5: Deterministic Position Calculations]');
const squareFormat = DEFAULT_POSTER_FORMATS.find((format) => format.id === 'square-1200')!;
const resolvedLayout = LayoutEngine.computeLayout({
  template,
  content: validContent,
  assets: {
    logoUrl: 'data:image/svg+xml;utf8,<svg></svg>',
    logoAspectRatio: 3.0,
    backgroundImages: [{ id: 'bg-1', url: 'bg.jpg', name: 'BG 1' }],
    selectedBackgroundId: 'bg-1',
    backgroundFit: 'cover',
    formatAdjustments: {},
  },
  format: squareFormat,
});

assert(resolvedLayout.isValid, 'Layout engine marks valid content as valid');
assert(resolvedLayout.canvasWidth === 1200 && resolvedLayout.canvasHeight === 1200, 'Correct canvas dimensions');

const bgElement = resolvedLayout.elements.find((e) => e.type === 'background');
assert(Boolean(bgElement), 'Includes background element');

const logoElement = resolvedLayout.elements.find((e) => e.type === 'logo');
assert(Boolean(logoElement), 'Includes logo element');
assert(
  logoElement!.width === Math.round(logoElement!.height * 3.0),
  'Preserves exact logo aspect ratio (3:1)'
);

const headingElement = resolvedLayout.elements.find((e) => e.type === 'heading');
assert(Boolean(headingElement && headingElement.y > 0), 'Calculates valid positive Y coordinate for heading');

const footerElement = resolvedLayout.elements.find((e) => e.type === 'footer');
assert(Boolean(footerElement && footerElement.y > headingElement!.y), 'Footer sits deterministically below heading');

// 6. Handling Missing Assets Gracefully
console.log('\n[Test Suite 6: Handling Missing Optional Assets]');
const noLogoLayout = LayoutEngine.computeLayout({
  template,
  content: validContent,
  assets: {
    backgroundImages: [],
    backgroundFit: 'cover',
    formatAdjustments: {},
  },
  format: squareFormat,
});
assert(!noLogoLayout.elements.some((e) => e.type === 'logo'), 'Gracefully handles omitted logo asset');
assert(!noLogoLayout.elements.some((e) => e.type === 'background'), 'Gracefully handles omitted background image');

// 7. Every registered output format resolves deterministically
console.log('\n[Test Suite 7: Format Registry Coverage]');
for (const format of DEFAULT_POSTER_FORMATS) {
  const formatLayout = LayoutEngine.computeLayout({ template, content: validContent, assets: { backgroundImages: [], backgroundFit: 'cover', formatAdjustments: {} }, format });
  assert(formatLayout.canvasWidth === format.width && formatLayout.canvasHeight === format.height && Boolean(formatLayout.templateId), `Resolves ${format.name} with its configured output dimensions`);
}

// 7b. Skyscraper (160x600) Centered Alignment and Vertical Formation
console.log('\n[Test Suite 7b: Skyscraper (160x600) Alignment & Formation]');
const skyscraperFormat = DEFAULT_POSTER_FORMATS.find((f) => f.id === 'skyscraper')!;
const skyscraperLayout = LayoutEngine.computeLayout({
  template,
  content: {
    ...validContent,
    ctaText: 'Book your study →',
    introText: 'Special Announcement',
    mainHeading: 'Delivering Relevance at Scale',
    supportingParagraph: 'AI-driven solutions for smarter decisions and better outcomes.',
    dateText: 'November 18, 2026',
    locationText: 'Global Broadcast & In-Person',
  },
  assets: {
    logoUrl: 'data:image/svg+xml;utf8,<svg width="40" height="40"></svg>',
    logoAspectRatio: 1.0,
    backgroundImages: [],
    backgroundFit: 'cover',
    formatAdjustments: {},
  },
  format: skyscraperFormat,
});

assert(skyscraperLayout.isValid, 'Skyscraper layout is marked valid with zero errors');
const skyLogo = skyscraperLayout.elements.find((e) => e.type === 'logo')!;
const skyIntro = skyscraperLayout.elements.find((e) => e.type === 'intro')!;
const skyHeading = skyscraperLayout.elements.find((e) => e.type === 'heading')!;
const skyPara = skyscraperLayout.elements.find((e) => e.type === 'paragraph')!;
const skyCta = skyscraperLayout.elements.find((e) => e.type === 'cta-button')!;
const skyFooter = skyscraperLayout.elements.find((e) => e.type === 'footer')!;

assert(Boolean(skyLogo && skyIntro && skyHeading && skyPara && skyCta && skyFooter), 'Includes all skyscraper elements');
assert(skyIntro.textAlign === 'center', 'Intro text is center aligned');
assert(skyHeading.textAlign === 'center', 'Main heading is center aligned');
assert(skyPara.textAlign === 'center', 'Supporting paragraph is center aligned');
assert(skyCta.textAlign === 'center', 'CTA button is center aligned');
assert(skyFooter.textAlign === 'center', 'Footer is center aligned');

assert(skyLogo.x === Math.round((160 - skyLogo.width) / 2), 'Logo is horizontally centered at canvas midpoint');
assert(skyCta.x === Math.round((160 - skyCta.width) / 2), 'CTA button is horizontally centered at canvas midpoint');
assert(skyIntro.y < skyHeading.y, 'Intro precedes heading vertically');
assert(skyHeading.y < skyPara.y, 'Heading precedes paragraph vertically');
assert(skyPara.y < skyCta.y, 'Paragraph precedes CTA button vertically');
assert(skyCta.y < skyFooter.y, 'CTA button precedes footer vertically');


// 8. Backend API Request Validation (Zod)
console.log('\n[Test Suite 8: API Request Validation]');
const validPayload = {
  name: 'Q4 Launch Campaign',
  templateId: 'modern-minimal',
  content: validContent,
  assets: {
    backgroundImages: [],
    backgroundFit: 'cover',
    formatAdjustments: {},
  },
  selectedFormats: [squareFormat],
};
const parseResult = CreateProjectSchema.safeParse(validPayload);
assert(parseResult.success, 'Valid project payload passes Zod validation');

const invalidPayload = {
  name: '', // empty name
  templateId: 'modern-minimal',
  content: validContent,
  assets: { backgroundImages: [] },
  selectedFormats: [], // empty formats
};
const invalidParseResult = CreateProjectSchema.safeParse(invalidPayload);
assert(!invalidParseResult.success, 'Rejects invalid project payload with empty name and empty formats');

// 9. Multi-Aspect Ratio Batch Upload Validation (Zod)
console.log('\n[Test Suite 9: Multi-Aspect Ratio Batch Upload Validation]');
const validBatchPayload = {
  images: [
    {
      formatId: 'skyscraper',
      aspectRatio: '4:15',
      width: 160,
      height: 600,
      dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    },
    {
      formatId: 'square-1200',
      aspectRatio: '1:1',
      width: 1200,
      height: 1200,
      dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    },
  ],
};
const batchParseResult = BatchUploadImagesSchema.safeParse(validBatchPayload);
assert(batchParseResult.success, 'Valid multi-aspect ratio batch payload passes validation');

const invalidBatchPayload = {
  images: [],
};
const invalidBatchResult = BatchUploadImagesSchema.safeParse(invalidBatchPayload);
assert(!invalidBatchResult.success, 'Rejects empty images array in batch upload');


// Summary
console.log('\n========================================');
console.log(` TESTS COMPLETED: ${passedCount} PASSED, ${failedCount} FAILED`);
console.log('========================================\n');

if (failedCount > 0) {
  process.exit(1);
}
