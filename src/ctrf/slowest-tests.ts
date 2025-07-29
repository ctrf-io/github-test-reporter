import { Report } from 'ctrf'

/**
 * Interface for a slowest test entry stored in the current report
 */
export interface SlowestTest {
  name: string
  totalResults: number
  totalResultsFailed: number
  totalResultsPassed: number
  averageDuration: number
  p95Duration: number
}

/**
 * Stores slowest tests in the current report's slowestTests array.
 *
 * @param currentReport The current CTRF report to enrich with slowest tests
 * @returns The current report with slowestTests populated
 */
export function storeSlowestTests(currentReport: Report): Report {
  if (!currentReport.results?.tests) {
    return currentReport
  }

  const slowestTests: SlowestTest[] = currentReport.results.tests.map(test => ({
    name: test.name,
    totalResults: (test.insights?.extra?.totalResults as number) || 0,
    totalResultsFailed:
      (test.insights?.extra?.totalResultsFailed as number) || 0,
    totalResultsPassed:
      (test.insights?.extra?.totalResultsPassed as number) || 0,
    averageDuration: test.insights?.averageTestDuration?.current || 0,
    p95Duration: test.insights?.p95Duration?.current || 0
  }))

  slowestTests.sort((a, b) => b.p95Duration - a.p95Duration)

  if (!currentReport.extra) {
    currentReport.extra = {}
  }

  currentReport.extra.slowestTests = slowestTests

  return currentReport
}
