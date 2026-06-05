/**
 * Screenshot utility
 *
 * Goal: a faithful, pixel-perfect screenshot — for the full page AND for a
 * single selected region of the screen.
 *
 * Strategy (both scopes):
 *   1. Screen Capture API (getDisplayMedia + preferCurrentTab) – grabs a real,
 *      pixel-perfect frame of the current tab. When a target element is given,
 *      the frame is cropped to the element's bounding box. This is the only way
 *      to reproduce the page exactly as the user sees it (fonts, images,
 *      canvas/WebGL, cross-origin content, shadow DOM, …).
 *   2. modern-screenshot (domToPng) fallback – no permission required, but
 *      re-renders the DOM and can drop styles/images. Used only when Screen
 *      Capture is unavailable or the user denies the permission prompt.
 *
 * Widget elements are hidden before capture and restored afterwards.
 */

import { domToPng } from 'modern-screenshot';

export interface ScreenshotOptions {
  /** Capture a specific element instead of the full viewport. */
  targetEl?: HTMLElement;
  /**
   * Capture an arbitrary rectangle (CSS px, viewport-relative). Takes priority
   * over targetEl. Used by free region ("rubber-band") selection.
   */
  clip?: { x: number; y: number; width: number; height: number };
  /** Include the mouse cursor. Default: false */
  cursor?: boolean;
}

/** A rectangle in device pixels of a captured frame. */
export interface CropRect {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

const WIDGET_SELECTOR = '[data-feedback-widget], [data-feedback-modal]';

// ── Hide / restore helpers ────────────────────────────────────────────────────

type HiddenEntry = { el: HTMLElement; display: string };

function hideWidgets(): HiddenEntry[] {
  return Array.from(document.querySelectorAll<HTMLElement>(WIDGET_SELECTOR)).map((el) => {
    const display = el.style.display;
    el.style.display = 'none';
    return { el, display };
  });
}

function restoreWidgets(entries: HiddenEntry[]): void {
  entries.forEach(({ el, display }) => { el.style.display = display; });
}

function hideCursor(): () => void {
  const prev = document.documentElement.style.cursor;
  document.documentElement.style.cursor = 'none';
  return () => { document.documentElement.style.cursor = prev; };
}

function waitForRepaint(): Promise<void> {
  return new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
}

// ── Element resolution ────────────────────────────────────────────────────────

/**
 * Resolves the DOM element for a given zone, trying three strategies:
 * 1. Zone registry (FeedbackZone components)
 * 2. data-feedback-zone DOM attribute (auto-discovered zones)
 * 3. CSS selector path (pixel-selected elements)
 */
export function resolveTargetElement(
  zoneId: string,
  cssPath: string | undefined,
  zones: Map<string, { element: HTMLElement }>,
): HTMLElement | undefined {
  const registered = zones.get(zoneId)?.element;
  if (registered?.isConnected) return registered;

  const byAttr = document.querySelector<HTMLElement>(
    `[data-feedback-zone="${CSS.escape(zoneId)}"]`,
  );
  if (byAttr) return byAttr;

  if (cssPath) {
    const byPath = document.querySelector<HTMLElement>(cssPath);
    if (byPath) return byPath;
  }

  return undefined;
}

// ── Crop math (pure, unit-tested) ─────────────────────────────────────────────

/**
 * Maps a CSS-pixel rectangle in the viewport to a device-pixel crop rectangle
 * inside a captured frame.
 *
 * The captured frame (`frameW`×`frameH`, device px) corresponds to the visible
 * viewport (`viewportW`×`viewportH`, CSS px). `clip` is in CSS px relative to
 * the viewport (i.e. what `getBoundingClientRect()` returns). The result is
 * clamped to the frame bounds and never smaller than 1×1.
 */
export function computeCropRect(
  frameW: number,
  frameH: number,
  viewportW: number,
  viewportH: number,
  clip: { x: number; y: number; width: number; height: number },
): CropRect {
  const scaleX = viewportW > 0 ? frameW / viewportW : 1;
  const scaleY = viewportH > 0 ? frameH / viewportH : 1;

  // Clamp the clip to the visible viewport before scaling.
  const left = Math.max(0, Math.min(clip.x, viewportW));
  const top = Math.max(0, Math.min(clip.y, viewportH));
  const right = Math.max(left, Math.min(clip.x + clip.width, viewportW));
  const bottom = Math.max(top, Math.min(clip.y + clip.height, viewportH));

  const sx = Math.round(left * scaleX);
  const sy = Math.round(top * scaleY);
  const sw = Math.max(1, Math.min(frameW - sx, Math.round((right - left) * scaleX)));
  const sh = Math.max(1, Math.min(frameH - sy, Math.round((bottom - top) * scaleY)));

  return { sx, sy, sw, sh };
}

// ── Method 1: modern-screenshot (fallback) ────────────────────────────────────

async function captureViaModernScreenshot(
  targetEl: HTMLElement | undefined,
  cursor: boolean,
): Promise<string> {
  const hidden = hideWidgets();
  const restoreCur = cursor ? null : hideCursor();
  await waitForRepaint();

  try {
    const scale = window.devicePixelRatio ?? 1;
    if (targetEl) {
      return await domToPng(targetEl, { scale });
    }
    return await domToPng(document.body, {
      scale,
      width: window.innerWidth,
      height: window.innerHeight,
    });
  } finally {
    restoreCur?.();
    restoreWidgets(hidden);
  }
}

// ── Method 2: Screen Capture API (full page + cropped region) ─────────────────

function isScreenCaptureSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices?.getDisplayMedia === 'function' &&
    typeof ImageCapture !== 'undefined'
  );
}

/**
 * Grabs a frame of the current tab via the Screen Capture API. When `clip` is
 * provided (CSS px, viewport-relative) the frame is cropped to that region,
 * yielding a pixel-perfect screenshot of just the selected element.
 */
async function captureViaScreenCaptureAPI(
  cursor: boolean,
  clip?: { x: number; y: number; width: number; height: number },
): Promise<string> {
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: {
      displaySurface: 'browser',
      ...(cursor ? {} : { cursor: 'never' }),
    },
    preferCurrentTab: true,
    audio: false,
  } as DisplayMediaStreamOptions & MediaStreamConstraints);

  const track = stream.getVideoTracks()[0];
  if (!track) throw new Error('No video track');

  try {
    const imageCapture = new ImageCapture(track);

    const hidden = hideWidgets();
    const restoreCur = cursor ? null : hideCursor();
    await waitForRepaint();

    const bitmap = await imageCapture.grabFrame();
    restoreCur?.();
    restoreWidgets(hidden);

    const crop: CropRect = clip
      ? computeCropRect(bitmap.width, bitmap.height, window.innerWidth, window.innerHeight, clip)
      : { sx: 0, sy: 0, sw: bitmap.width, sh: bitmap.height };

    const canvas = document.createElement('canvas');
    canvas.width = crop.sw;
    canvas.height = crop.sh;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No 2d context');
    ctx.drawImage(bitmap, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, crop.sw, crop.sh);

    return canvas.toDataURL('image/png');
  } finally {
    track.stop();
    stream.getTracks().forEach((t) => t.stop());
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

function isUserAbort(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.name === 'NotAllowedError' || err.name === 'AbortError')
  );
}

/** Scrolls an element into view if it lies (partly) outside the viewport. */
async function ensureInViewport(el: HTMLElement): Promise<void> {
  const r = el.getBoundingClientRect();
  const offscreen =
    r.bottom <= 0 || r.top >= window.innerHeight || r.right <= 0 || r.left >= window.innerWidth;
  if (offscreen) {
    el.scrollIntoView({ block: 'center', inline: 'center' });
    await waitForRepaint();
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Crops a PNG data URL to a viewport-relative CSS rectangle. */
async function cropDataUrl(
  dataUrl: string,
  clip: { x: number; y: number; width: number; height: number },
): Promise<string> {
  const img = await loadImage(dataUrl);
  const crop = computeCropRect(img.width, img.height, window.innerWidth, window.innerHeight, clip);
  const canvas = document.createElement('canvas');
  canvas.width = crop.sw;
  canvas.height = crop.sh;
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;
  ctx.drawImage(img, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, crop.sw, crop.sh);
  return canvas.toDataURL('image/png');
}

export async function captureScreenshot(options: ScreenshotOptions = {}): Promise<string> {
  const { targetEl, cursor = false } = options;

  // Resolve the crop region (viewport-relative CSS px): explicit clip wins,
  // otherwise derive it from the target element (scrolling it into view first).
  let clip = options.clip;
  if (!clip && targetEl) {
    await ensureInViewport(targetEl);
    const rect = targetEl.getBoundingClientRect();
    clip = { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
  }

  // Preferred path: pixel-perfect capture of the tab, cropped to the selection.
  if (isScreenCaptureSupported()) {
    try {
      return await captureViaScreenCaptureAPI(cursor, clip);
    } catch (err) {
      if (!isUserAbort(err)) {
        console.warn('[feedback-widget] Screen Capture API failed, falling back to DOM render:', err);
      }
      // fall through to modern-screenshot
    }
  }

  // Fallback: re-render the DOM (no permission needed, lower fidelity).
  if (clip) {
    const full = await captureViaModernScreenshot(undefined, cursor);
    return cropDataUrl(full, clip);
  }
  return captureViaModernScreenshot(targetEl, cursor);
}
