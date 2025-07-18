// Mock for the CTRF package
import type { Report } from 'ctrf'

const mockMergeReports = jest.fn((reports: Report[]) => {
  // Simple mock implementation
  if (reports.length === 0) return null
  if (reports.length === 1) return reports[0]

  // Merge multiple reports
  const merged = { ...reports[0] }
  merged.results = { ...reports[0].results }
  merged.results.tests = []
  merged.results.summary = {
    tests: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    pending: 0,
    other: 0,
    start: 0,
    stop: 0
  }

  reports.forEach(report => {
    if (report.results && report.results.tests) {
      merged.results.tests.push(...report.results.tests)
    }
    if (report.results && report.results.summary) {
      merged.results.summary.tests += report.results.summary.tests || 0
      merged.results.summary.passed += report.results.summary.passed || 0
      merged.results.summary.failed += report.results.summary.failed || 0
      merged.results.summary.skipped += report.results.summary.skipped || 0
      merged.results.summary.pending += report.results.summary.pending || 0
      merged.results.summary.other += report.results.summary.other || 0
    }
  })

  return merged
})

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const mockReadReportsFromGlobPattern = jest.fn((_pattern: string) => {
  // Mock implementation that returns a simple report
  return [
    {
      results: {
        tool: { name: 'mock-tool', version: '1.0.0' },
        summary: {
          tests: 1,
          passed: 1,
          failed: 0,
          skipped: 0,
          pending: 0,
          other: 0,
          start: 0,
          stop: 0
        },
        tests: [],
        environment: {}
      }
    }
  ]
})

export {
  mockMergeReports as mergeReports,
  mockReadReportsFromGlobPattern as readReportsFromGlobPattern
}
