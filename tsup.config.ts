import { defineConfig } from 'tsup';

// By default zod + modern-screenshot are externalized (npm convention: they are
// declared as `dependencies` and installed by the consumer).
//
// Set BUNDLE_DEPS=1 (npm run build:vendored) to bundle them into a single
// self-contained file — used for vendoring the widget into apps that can't
// resolve a compatible zod/modern-screenshot (e.g. the ProjectFlow/kanban app,
// whose transitive zod is v4 while this widget needs v3).
const bundleDeps = process.env.BUNDLE_DEPS === '1';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  // No code-splitting → a single self-contained index.{js,cjs}.
  splitting: false,
  external: ['react', 'react-dom', ...(bundleDeps ? [] : ['zod', 'modern-screenshot'])],
  ...(bundleDeps ? { noExternal: ['zod', 'modern-screenshot'] } : {}),
  injectStyle: true,
});
