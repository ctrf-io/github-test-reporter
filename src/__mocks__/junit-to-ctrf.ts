import type { Report } from 'ctrf'

export const convertJUnitToCTRFReport = jest
  .fn()
  .mockImplementation(async (): Promise<Report | null> => {
    // Mock implementation that returns a basic CTRF report
    await Promise.resolve() // Satisfy eslint require-await rule
    return {
      reportFormat: 'CTRF',
      specVersion: '1.0.0',
      results: {
        tool: {
          name: 'junit-to-ctrf',
          version: '0.0.10-next.1'
        },
        summary: {
          tests: 0,
          passed: 0,
          failed: 0,
          skipped: 0,
          pending: 0,
          other: 0,
          start: 0,
          stop: 0
        },
        tests: []
      }
    } as Report
  })
