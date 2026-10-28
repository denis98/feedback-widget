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

/** The node itself (if it is a zone) plus all zone descendants. */
function zonesIn(node: HTMLElement): HTMLElement[] {
  return [node, ...node.querySelectorAll<HTMLElement>('[data-feedback-zone]')].filter(
    (el) => el.dataset['feedbackZone'],
  );
}

export function startAutoDiscovery(
  root: Document | Element,
  register: RegisterFn,
  unregister: UnregisterFn,
): () => void {
  const rootEl = root instanceof Document ? root.documentElement : root;
  const add = (el: HTMLElement) => {
    const zone = parseZoneElement(el);
    if (zone) register(zone);
  };

  // Register already-existing zones
  rootEl.querySelectorAll<HTMLElement>('[data-feedback-zone]').forEach(add);

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) zonesIn(node).forEach(add);
      });
      mutation.removedNodes.forEach((node) => {
        if (node instanceof HTMLElement)
          zonesIn(node).forEach((el) => unregister(el.dataset['feedbackZone']!));
      });
    }
  });

  observer.observe(rootEl, { childList: true, subtree: true });

  return () => observer.disconnect();
}
