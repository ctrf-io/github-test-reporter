import { vi } from 'vitest'

// Mock for handlebars-helpers-ctrf package
export const loadHelpers = vi.fn(() => {
  // No-op function - the actual helpers are registered in the test file
})
