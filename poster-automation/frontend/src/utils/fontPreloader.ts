/**
 * Font Preloader Utility
 *
 * Ensures that Google Fonts (or any web fonts) are fully loaded before
 * canvas-based text measurement or Fabric.js rendering runs.
 *
 * Without this, the LayoutEngine's `measureText()` calls fall back to a
 * system font, producing wrong character widths → wrong line breaks →
 * wrong element positions → misaligned banners in production.
 */

/** The fonts we need for poster rendering. */
const REQUIRED_FONTS: Array<{ family: string; weight: string }> = [
  { family: 'Plus Jakarta Sans', weight: '400' },
  { family: 'Plus Jakarta Sans', weight: '500' },
  { family: 'Plus Jakarta Sans', weight: '600' },
  { family: 'Plus Jakarta Sans', weight: '700' },
  { family: 'Plus Jakarta Sans', weight: '800' },
  { family: 'Space Grotesk', weight: '500' },
  { family: 'Space Grotesk', weight: '700' },
  { family: 'Inter', weight: '400' },
  { family: 'Inter', weight: '500' },
  { family: 'Inter', weight: '600' },
  { family: 'Inter', weight: '700' },
];

let fontsReady = false;
let fontsPromise: Promise<boolean> | null = null;

/**
 * Returns true if all required font faces have already loaded.
 */
export function areFontsReady(): boolean {
  return fontsReady;
}

/**
 * Waits for all required font faces to load. The result is cached so
 * subsequent calls return immediately.
 *
 * Uses the Font Loading API (`document.fonts.check` / `document.fonts.ready`)
 * with a timeout fallback so we never block forever.
 */
export async function waitForFonts(timeoutMs = 5000): Promise<boolean> {
  if (fontsReady) return true;
  if (fontsPromise) return fontsPromise;

  fontsPromise = (async () => {
    try {
      // Use the standard Font Loading API
      if (typeof document !== 'undefined' && document.fonts) {
        // First, wait for the browser's font loading queue to settle
        await Promise.race([
          document.fonts.ready,
          new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
        ]);

        // Now actively check each required font face
        const allLoaded = REQUIRED_FONTS.every(({ family, weight }) =>
          document.fonts.check(`${weight} 16px "${family}"`)
        );

        if (!allLoaded) {
          // Force-load any missing font faces
          const loadPromises = REQUIRED_FONTS.map(({ family, weight }) => {
            if (!document.fonts.check(`${weight} 16px "${family}"`)) {
              return document.fonts.load(`${weight} 16px "${family}"`).catch(() => {
                // Individual font load failure is non-fatal
              });
            }
            return Promise.resolve();
          });

          await Promise.race([
            Promise.all(loadPromises),
            new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
          ]);
        }

        fontsReady = true;
        return true;
      }
    } catch {
      // Font loading API not available or errored; fall through to timeout
    }

    // Absolute fallback: just wait a bit for fonts to likely have loaded
    await new Promise<void>((resolve) => setTimeout(resolve, 1500));
    fontsReady = true;
    return true;
  })();

  return fontsPromise;
}

/**
 * React hook-friendly: returns whether fonts have finished loading.
 * Components can use this to gate rendering.
 */
export function useFontsLoaded(): boolean {
  // This is a simple synchronous check; components should call
  // waitForFonts() in useEffect and re-render when it resolves.
  return fontsReady;
}
