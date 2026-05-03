import { defineConfig } from 'tsup'

export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: ['esm'],
  platform: 'node',
  outDir: 'dist',
  sourcemap: true,
  splitting: false,
  clean: true,
  // Bundle every dependency so dist/index.js is self-contained (same as ncc)
  noExternal: [/.*/],
  // Provide CJS globals so bundled CJS deps (e.g. @actions/core, yargs) work in ESM
  banner: {
    js: [
      "import { createRequire as __cjsRequire } from 'module';",
      "const require = __cjsRequire(import.meta.url);",
      "const __filename = import.meta.filename;",
      "const __dirname = import.meta.dirname;"
    ].join('\n')
  }
})
