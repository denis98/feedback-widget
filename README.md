# @denis98/feedback-widget

[![npm version](https://img.shields.io/npm/v/@denis98/feedback-widget.svg)](https://www.npmjs.com/package/@denis98/feedback-widget)
[![CI](https://github.com/denis98/feedback-widget/actions/workflows/ci.yml/badge.svg)](https://github.com/denis98/feedback-widget/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

Lightweight, open-source feedback widget for React. Users report bugs, request
features, or leave general feedback — optionally with **pixel-perfect
screenshots** (full page, a clicked element, or a freely drawn region), which
they can **annotate** right in the browser. Submissions are delivered to any
webhook (e.g. a ticket system).

## Features

- 🎯 **Flexible selection** — click a single element, **drag a region** over
  several components, pick a registered zone, or capture the full screen.
- 🖼 **Pixel-perfect screenshots** — Screen Capture API cropped to the selection,
  with a `modern-screenshot` DOM-render fallback (no permission required).
- ✏️ **Annotate** — freehand pen + rectangle, colors, undo/clear, flattened into
  the image on save.
- 🗂 **Multiple screenshots** per submission with an in-form gallery; add more
  via “Weiteres Bild”, even after navigating to another page.
- 📝 **Flexible form schema** — declare your own `fields`; values map to the
  submitter (`user`) or arbitrary `custom` data.
- ✉️ **Contact + thank-you** — optional name/email so you can follow up.
- 🔌 **Webhook delivery** with retry, optional HMAC signing, and Zod-validated
  payloads. Zero UI dependencies (inline styles).

## Install

```bash
npm install @denis98/feedback-widget
```

Peer dependencies: `react` and `react-dom` (>= 18).

## Usage

```tsx
import { FeedbackProvider } from '@denis98/feedback-widget';

export function App() {
  return (
    <FeedbackProvider
      webhookUrl="/api/feedback"
      selectionMode="pixel" // click an element OR drag a region
      screenshot
      collectContact // optional name + email fields
      user={{ id: '42', email: 'a@b.c', name: 'Ada' }}
    >
      <YourApp />
    </FeedbackProvider>
  );
}
```

The provider renders a floating trigger button and the feedback modal. Pass a
custom `trigger` render-prop to replace the button, or `trigger={null}` to drive
the widget yourself via `useFeedbackContext()`.

## Selection modes

| Mode     | Behaviour                                                              |
| -------- | ---------------------------------------------------------------------- |
| `zone`   | Only `<FeedbackZone>` regions are selectable.                          |
| `pixel`  | Click an element or drag a free region.                                |
| `hybrid` | Zones take priority; element/region selection applies everywhere else. |
| `region` | Drag-to-select region only.                                            |
| `none`   | Skip selection and open the form directly.                             |

When `screenshot` is enabled the selection bar also offers **🖥 Ganzer
Bildschirm** and **Ohne Screenshot** (text-only).

## Screenshots

Capture strategy, tuned for fidelity — including a single selected region:

1. **Screen Capture API** (`getDisplayMedia` + `preferCurrentTab`) grabs a real
   frame of the tab and crops it to the selection. Off-screen elements are
   scrolled into view first.
2. **`modern-screenshot` fallback** (`domToPng`) when Screen Capture is
   unavailable or denied — no permission, lower fidelity.

Screenshots are delivered as base64 PNG data URLs (`screenshots: string[]`, plus
`screenshot` = the first, for backward compatibility).

## Flexible form fields

```tsx
<FeedbackProvider
  webhookUrl="/api/feedback"
  fields={[
    { name: 'name', label: 'Name', type: 'text', mapTo: 'name' },
    { name: 'email', label: 'E-Mail', type: 'email', mapTo: 'email' },
    {
      name: 'severity',
      label: 'Severity',
      type: 'select',
      options: [
        { value: 'low', label: 'Low' },
        { value: 'high', label: 'High' },
      ],
    },
  ]}
>
  {/* … */}
</FeedbackProvider>
```

`mapTo` fields go into `payload.user`; everything else into `payload.custom`.

## Webhook payload

```ts
interface WebhookPayload {
  projectId: string;
  feedbackId: string; // UUID
  type: 'bug' | 'feature' | 'general';
  title: string;
  description: string;
  zone: ZoneInfo | null;
  context: { url; userAgent; viewport; timestamp; locale };
  user: { id?; email?; name? } | null;
  screenshot: string | null; // data:image/png;base64,…  (= screenshots[0])
  screenshots: string[];
  custom: Record<string, unknown>;
}
```

Return a `WebhookResponse` (`{ ticketId?, ticketUrl?, message? }`) to show a
confirmation linking to the created ticket. Set `secret` to sign the body
(`X-Feedback-Signature`, HMAC-SHA256). `formatters` (`toMarkdown`,
`toPlainText`, `toHTML`) help render the payload server-side.

## Development

```bash
npm run dev            # tsup watch build
npm test               # vitest
npm run typecheck      # tsc --noEmit
npm run build          # bundle to dist/ (deps externalized)
npm run build:vendored # self-contained bundle (zod + modern-screenshot inlined)
npm run storybook      # interactive playground
```

## License

[MIT](./LICENSE) © Denis Graipel
