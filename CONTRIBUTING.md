# Contributing

Thanks for your interest in improving `@denis98/feedback-widget`!

## Development setup

```bash
npm install
npm run dev          # tsup watch build
npm test             # vitest (unit + component + integration)
npm run typecheck    # tsc --noEmit
npm run storybook    # interactive playground at :6006
```

## Before opening a PR

Please make sure the full check suite passes:

```bash
npm run typecheck
npm test
npm run build
```

- Keep the public API typed and documented (see `src/types.ts`).
- Add or update tests for any behavior change (`test/`).
- The default build externalizes `zod` and `modern-screenshot`. Use
  `npm run build:vendored` only when producing a self-contained bundle for
  environments that cannot resolve a compatible `zod`/`modern-screenshot`.

## Commit messages

Conventional Commits are appreciated (`feat:`, `fix:`, `docs:`, `chore:` …) —
they make changelog generation straightforward.

## Releasing

Releases are versioned with [Changesets](https://github.com/changesets/changesets).
Add a changeset with `npx changeset` describing your change; the release
workflow publishes to npm on merge to `main`.
