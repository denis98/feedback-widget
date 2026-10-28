# Changelog

All notable changes to this project are documented here. This project adheres
to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Removed (breaking)
- `zod` dependency. The exports `webhookPayloadSchema`, `webhookResponseSchema`,
  `zoneInfoSchema`, `feedbackContextSchema` and `userInfoSchema` are gone;
  validate payloads on the receiving side with your own schema.
- Deprecated `isOpen` on `useFeedbackContext()` (use `phase`) and on
  `TriggerRenderProps` (it was always `false`).
- `ResolvedConfig` no longer carries `autoDiscovery`, `screenshotCursor`,
  `collectContact` and `locale`; `config.retry` is now the partial user input.

### Changed
- DOM screenshot fallback is ~5× faster on large pages: content fully outside
  the viewport is no longer cloned (offscreen boxes keep their size, so the
  visible result is unchanged).
- Webhook responses are read field by field: invalid fields are dropped
  individually, and `ticketUrl` is only accepted as an `http(s)` URL.

### Fixed
- DOM-render screenshot fallback (Safari/Firefox, or Screen Capture denied) now
  keeps the scroll offsets of nested scroll containers and the document, so the
  image matches what is on screen. `fixed`/`sticky` children are not shifted.

### Added
- Add images from other sources to the open form: paste (Ctrl+V / ⌘V), drag &
  drop, or the “Bild hochladen” file picker. They are converted to PNG and
  downscaled to 2560 px on the longest edge. New context method
  `addScreenshot`, messages `form.imageHint`, `form.uploadImage`,
  `form.dropHere`, `form.imageRejected`.
- Pixel-perfect screenshots via the Screen Capture API, cropped to the
  selected element or a freely drawn region (`computeCropRect`).
- Free region selection (rubber-band drag) in addition to single-element clicks
  (`RegionSelector`).
- In-browser screenshot annotation (freehand pen + rectangle, colors, undo/clear)
  via `ScreenshotAnnotator`.
- Multiple screenshots per submission with an in-form gallery and "Weiteres Bild"
  (add another) flow that survives SPA navigation.
- Flexible form schema (`fields`) so each app can collect custom data; values map
  to `payload.user` (`mapTo`) or `payload.custom`. `collectContact` sugar for
  name/email.
- "Ohne Screenshot" option to submit text-only feedback.
- Click suppression during selection so picking an element/region does not
  activate the underlying page.

### Changed
- Default build externalizes `zod` and `modern-screenshot`; a self-contained
  build is available via `npm run build:vendored`.
- **zod 4 support**: widget now works with both zod 3 and 4
  (`"zod": "^3.23.8 || ^4.0.0"`); `z.record` calls use the two-argument form.
- `publishConfig.provenance` removed so local `npm publish` works; enable
  provenance in the CI release workflow instead (`npm publish --provenance`).

## [0.1.0]

- Initial widget: feedback modal, zone/pixel/hybrid selection, webhook delivery
  with retry, formatters, and Zod-validated payload schema.
