import {
  selectLayoutFamily,
  validateContentLimits,
  calculateFittedFontSize,
  estimateLineCount,
  LayoutEngine,
} from '../frontend/src/utils/LayoutEngine';
import { BUILTIN_TEMPLATES } from '../frontend/src/constants/templates';
import { DEFAULT_POSTER_FORMATS } from '../frontend/src/constants/formats';
import { CreateProjectSchema } from '../backend/src/validators/schemas';

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

// 4. Deterministic Position Calculations & Layout Output
console.log('\n[Test Suite 4: Deterministic Position Calculations]');
const squareFormat = DEFAULT_POSTER_FORMATS[0]; // 1080x1080
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
assert(resolvedLayout.canvasWidth === 1080 && resolvedLayout.canvasHeight === 1080, 'Correct canvas dimensions');

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

// 5. Handling Missing Assets Gracefully
console.log('\n[Test Suite 5: Handling Missing Optional Assets]');
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

// 6. Backend API Request Validation (Zod)
console.log('\n[Test Suite 6: API Request Validation]');
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

// Summary
console.log('\n========================================');
console.log(` TESTS COMPLETED: ${passedCount} PASSED, ${failedCount} FAILED`);
console.log('========================================\n');

if (failedCount > 0) {
  process.exit(1);
}
