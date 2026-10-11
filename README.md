# Formatly — Rule-Based Multi-Format Poster Automation Platform

Formatly is a full-stack web application that automates the generation of multiple poster formats (Square social posts, Portrait stories, Landscape banners, and Presentation widescreen slides) from a single content template using deterministic geometric and typographic rules.

---

## 🌟 Key Highlights & Architectural Principles

- **100% Deterministic & Zero AI**: No text-to-image models, no probabilistic guessing, and no AI API dependencies. Every element position, text wrapping calculation, line constraint, and background crop is calculated mathematically.
- **Aspect-Ratio Family Engine**: Formats are categorized into aspect ratio families (`square`, `portrait`, `landscape`, `widescreen`), adapting hierarchy, padding, and text columns dynamically without distorting branding or logo proportions.
- **Interactive Live Preview**: Powered by Fabric.js with responsive scaling, element repositioning mode, and an instant "Reset to template" button to prevent permanent layout damage.
- **Batch Export**: Renders pixel-accurate high-resolution posters (e.g. 1080×1080, 1080×1350, 1080×1920, 1200×628, 1920×1080) with individual PNG downloads and one-click ZIP packaging via JSZip.
- **Production REST API**: Express backend with Zod validation, Multer asset uploading, Sharp image metadata optimization, and persistent local storage.

---

## 📁 Project Structure

```
poster-automation/
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── common/         # Header, HelpModal
│   │   │   ├── forms/          # CampaignInfo, BrandAssets, FormatSelector, GenerateSection
│   │   │   ├── poster/         # PosterCanvasPreview (Fabric.js), PosterGalleryModal (ZIP export)
│   │   │   └── projects/       # ProjectCard, ProjectRenameModal
│   │   ├── constants/          # Formats, Built-in templates, Sample projects
│   │   ├── pages/              # DashboardPage, CampaignEditorPage
│   │   ├── services/           # apiService (REST client)
│   │   ├── types/              # TypeScript poster & template schemas
│   │   ├── utils/              # LayoutEngine, FabricPosterRenderer
│   │   └── App.tsx
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── backend/
│   ├── src/
│   │   ├── config/             # Templates, formats, sample data
│   │   ├── controllers/        # health, projects, templates, assets
│   │   ├── routes/             # health, projects, templates, assets
│   │   ├── services/           # StorageService, LayoutEngine
│   │   ├── validators/         # Zod API validation schemas
│   │   ├── types/              # Backend TypeScript types
│   │   ├── app.ts              # Express application configuration
│   │   └── server.ts           # Standalone backend server runner
│   ├── storage/
│   │   ├── projects/           # JSON persistence files
│   │   ├── templates/          # Template definitions
│   │   ├── uploads/            # Uploaded brand assets & backgrounds
│   │   └── exports/            # Export cache
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   └── .gitignore
├── tests/
│   └── runTests.ts             # Unit tests for layout rules, limits, & validations
└── README.md
```

---

## 🚀 Quick Start & Development

### 1. Unified Full-Stack Run (Root)

The root environment includes a combined Express API + Vite dev server running on port `3000`:

```bash
# Install dependencies
npm install

# Run tests
npm test

# Start full-stack dev server (API at /api, Web UI at port 3000)
npm run dev
```

### 2. Independent Backend Execution

You can run the backend independently:

```bash
cd poster-automation/backend
npm install
cp .env.example .env
npm run dev
```
The REST API will be available at `http://localhost:3001` with endpoints:
- `GET /api/health`
- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/:projectId`
- `PUT /api/projects/:projectId`
- `DELETE /api/projects/:projectId`
- `POST /api/projects/:projectId/duplicate`
- `GET /api/templates`
- `GET /api/templates/:templateId`
- `POST /api/assets/upload` (Multer + Sharp)

### 3. Independent Frontend Execution

```bash
cd poster-automation/frontend
npm install
npm run dev
```
Runs Vite on port `3000` with automated proxying to the backend API on port `3001`.

---

## ⚙️ Layout Engine Rules Explained

The layout engine (`LayoutEngine.ts`) implements deterministic rules:

1. **Aspect-Ratio Family Selection**:
   - `width / height < 0.9` ➔ **Portrait** (e.g. 4:5, 9:16 Story)
   - `0.9 <= width / height <= 1.25` ➔ **Square** (1:1)
   - `1.25 < width / height <= 1.95` with banner height ➔ **Landscape** (1.91:1)
   - `width / height >= 1.6` ➔ **Widescreen** (16:9)

2. **Typography Fitting & Overflow**:
   - Base font sizes are computed relative to `min(canvasWidth, canvasHeight)`.
   - The engine simulates line wrapping based on proportional character widths.
   - If line count exceeds `maxHeadingLines`, font size is reduced down to `minHeadingFontSize`.
   - If text still cannot fit comfortably, an explicit validation warning is generated.

3. **Logo Aspect Ratio Preservation**:
   - The logo width is constrained to `contentWidth * 0.4` and height to `canvasHeight * maxLogoHeightRatio`.
   - The original aspect ratio is preserved strictly without stretching.

4. **Contrast & Scrim Overlay**:
   - Dynamic gradient scrims (`bottom-scrim`, `left-scrim`, or `dark-vignette`) protect typography contrast over high-contrast or variable background images.

---

## 🧪 Testing

Run the deterministic test suite:

```bash
npm test
```

Tests cover:
- Aspect-ratio layout family classification
- Character limit validation and excess character reporting
- Font size shrinking and line overflow protection
- Logo aspect ratio preservation
- Deterministic vertical positioning order
- Missing asset fallbacks
- Zod schema validation for API requests

---

## 📦 Exporting Posters

1. Open any campaign in the editor.
2. Select your required output formats (Square, Portrait, Story, Landscape, Widescreen, or Custom).
3. Review the live Fabric.js canvas preview and switch tabs to inspect each format.
4. Click **"Create all posters"**.
5. Download individual PNG images or download all formats packaged in a single ZIP file.
