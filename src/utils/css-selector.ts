/**
 * Builds a unique CSS selector path for a DOM element.
 * Example: main > .card-list > .card:nth-child(3)
 */
export function getCssPath(element: Element): string {
  const parts: string[] = [];
  let el: Element | null = element;

  while (el && el !== document.body && el !== document.documentElement) {
    parts.unshift(getElementSelector(el));
    el = el.parentElement;
  }

  return parts.join(' > ');
}

function cssEscape(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(value);
  // Minimal fallback: escape characters that are invalid in identifiers.
  return value.replace(/[^a-zA-Z0-9_-]/g, (ch) => `\\${ch}`);
}

function getElementSelector(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${cssEscape(el.id)}` : '';
  if (id) return `${tag}${id}`;

  const classes = Array.from(el.classList)
    .filter((c) => !c.startsWith('feedback-widget-'))
    .slice(0, 3)
    .map((c) => `.${cssEscape(c)}`)
    .join('');

  const parent = el.parentElement;
  if (parent) {
    const siblings = Array.from(parent.children).filter(
      (c) => c.tagName === el.tagName,
    );
    if (siblings.length > 1) {
      const index = siblings.indexOf(el) + 1;
      return `${tag}${classes}:nth-child(${index})`;
    }
  }

  return `${tag}${classes}`;
}
