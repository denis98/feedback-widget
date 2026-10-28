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

function getElementSelector(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${CSS.escape(el.id)}` : '';
  if (id) return `${tag}${id}`;

  const classes = Array.from(el.classList)
    .filter((c) => !c.startsWith('feedback-widget-'))
    .slice(0, 3)
    .map((c) => `.${CSS.escape(c)}`)
    .join('');

  const parent = el.parentElement;
  if (parent) {
    const siblings = Array.from(parent.children).filter((c) => c.tagName === el.tagName);
    if (siblings.length > 1) {
      const index = siblings.indexOf(el) + 1;
      return `${tag}${classes}:nth-child(${index})`;
    }
  }

  return `${tag}${classes}`;
}
