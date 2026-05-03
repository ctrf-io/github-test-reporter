import { defineConfig } from 'vitest/config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      exclude: ['src/ctrf/core/**'],
      reporter: ['json-summary', 'text', 'lcov']
    }
  },
  resolve: {
    alias: {
      src: path.resolve(__dirname, 'src'),
      '@actions/artifact': path.resolve(
        __dirname,
        'src/__mocks__/actions-artifact.ts'
      ),
      ctrf: path.resolve(__dirname, 'src/__mocks__/ctrf.ts'),
      'handlebars-helpers-ctrf': path.resolve(
        __dirname,
        'src/__mocks__/handlebars-helpers-ctrf.ts'
      ),
      'junit-to-ctrf': path.resolve(__dirname, 'src/__mocks__/junit-to-ctrf.ts')
    }
  }
})
