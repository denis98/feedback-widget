# Changelog

All notable changes to this project are documented here. This project adheres
to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
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
