import type { ZoneRegistration } from '../types.js';

type RegisterFn = (zone: ZoneRegistration) => void;
type UnregisterFn = (id: string) => void;

function parseZoneElement(el: HTMLElement): ZoneRegistration | null {
  const id = el.dataset['feedbackZone'];
  const label = el.dataset['feedbackLabel'];
  if (!id || !label) return null;
  const metaRaw = el.dataset['feedbackMeta'];
  let meta: Record<string, unknown> | undefined;
  if (metaRaw) {
    try {
      meta = JSON.parse(metaRaw) as Record<string, unknown>;
    } catch {
      // ignore malformed meta
    }
  }
  return { id, label, element: el, ...(meta !== undefined && { meta }) };
}

export function startAutoDiscovery(
  root: Document | Element,
  register: RegisterFn,
  unregister: UnregisterFn,
): () => void {
  // Register already-existing zones
  const existing = (root instanceof Document ? root.documentElement : root).querySelectorAll<HTMLElement>(
    '[data-feedback-zone]',
  );
  existing.forEach((el) => {
    const zone = parseZoneElement(el);
    if (zone) register(zone);
  });

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          // Check the node itself
          if (node.dataset['feedbackZone']) {
            const zone = parseZoneElement(node);
            if (zone) register(zone);
          }
          // Check descendants
          node.querySelectorAll<HTMLElement>('[data-feedback-zone]').forEach((el) => {
            const zone = parseZoneElement(el);
            if (zone) register(zone);
          });
        });
        mutation.removedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          if (node.dataset['feedbackZone']) {
            unregister(node.dataset['feedbackZone']);
          }
          node.querySelectorAll<HTMLElement>('[data-feedback-zone]').forEach((el) => {
            if (el.dataset['feedbackZone']) unregister(el.dataset['feedbackZone']);
          });
        });
      }
    }
  });

  observer.observe(root instanceof Document ? root.documentElement : root, {
    childList: true,
    subtree: true,
  });

  return () => observer.disconnect();
}
