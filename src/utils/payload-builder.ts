import type { BuildPayloadInput, WebhookPayload } from '../types.js';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getBrowserLocale(): string {
  if (typeof navigator === 'undefined') return 'en';
  return navigator.language ?? 'en';
}

function getViewport(): { width: number; height: number } {
  if (typeof window === 'undefined') return { width: 0, height: 0 };
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

export function buildPayload(input: BuildPayloadInput): WebhookPayload {
  const screenshots = input.screenshots ?? (input.screenshot ? [input.screenshot] : []);
  return {
    projectId: input.projectId,
    feedbackId: generateUUID(),
    type: input.type,
    title: input.title,
    description: input.description,
    zone: input.zone ?? null,
    context: {
      url: input.url ?? (typeof window !== 'undefined' ? window.location.href : ''),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      viewport: getViewport(),
      timestamp: new Date().toISOString(),
      locale: getBrowserLocale(),
    },
    user: input.user,
    screenshot: input.screenshot ?? screenshots[0] ?? null,
    screenshots,
    custom: input.custom,
  };
}
