import { defineConfig } from 'tsup'

export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: ['esm'],
  outDir: 'dist',
  sourcemap: true,
  splitting: false,
  clean: true,
  // Bundle every dependency so dist/index.js is self-contained (same as ncc)
  noExternal: [/.*/]
})
