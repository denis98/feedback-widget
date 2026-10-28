import { defineConfig } from 'tsup';

// By default modern-screenshot is externalized (npm convention: it is declared
// as a `dependency` and installed by the consumer).
//
// Set BUNDLE_DEPS=1 (npm run build:vendored) to bundle it into a single
// self-contained file for vendoring the widget into other apps.
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
  external: ['react', 'react-dom', ...(bundleDeps ? [] : ['modern-screenshot'])],
  ...(bundleDeps ? { noExternal: ['modern-screenshot'] } : {}),
  injectStyle: true,
});
