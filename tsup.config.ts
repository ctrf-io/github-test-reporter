import { defineConfig } from "tsup";

export default defineConfig({
	entry: { index: "src/index.ts" },
	format: ["esm"],
	platform: "node",
	outDir: "dist",
	sourcemap: true,
	splitting: false,
	clean: true,
	// Bundle every dependency so dist/index.js is self-contained (same as ncc)
	noExternal: [/.*/],
	banner: {
		js: "import { createRequire as __cjsRequire } from 'node:module'; const require = __cjsRequire(import.meta.url);",
	},
	// Inject CJS globals as symbols so bundled dependency names cannot collide.
	esbuildOptions(options) {
		options.inject = ["./scripts/cjs-globals.ts"];
	},
});
