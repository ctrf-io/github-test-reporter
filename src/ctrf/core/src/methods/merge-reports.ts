import { Report, Summary } from '../../types/ctrf'
import { CTRF_REPORT_FORMAT, CTRF_SPEC_VERSION } from '../constants'

/**
 * Merges multiple CTRF reports into a single report.
 *
 * @param reports Array of CTRF report objects to be merged.
 * @returns The merged CTRF report object.
 */
export function mergeReports(reports: Report[]): Report {
  if (!reports || reports.length === 0) {
    throw new Error('No reports provided for merging.')
  }

  const mergedReport: Report = {
    reportFormat: CTRF_REPORT_FORMAT,
    specVersion: CTRF_SPEC_VERSION,
    results: {
      tool: reports[0].results.tool,
      summary: initializeEmptySummary(),
      tests: []
    }
  }

  reports.forEach(report => {
    const { summary, tests, environment, extra } = report.results

    mergedReport.results.summary.tests += summary.tests
    mergedReport.results.summary.passed += summary.passed
    mergedReport.results.summary.failed += summary.failed
    mergedReport.results.summary.skipped += summary.skipped
    mergedReport.results.summary.pending += summary.pending
    mergedReport.results.summary.other += summary.other

    if (summary.suites !== undefined) {
      mergedReport.results.summary.suites =
        (mergedReport.results.summary.suites || 0) + summary.suites
    }

    mergedReport.results.summary.start = Math.min(
      mergedReport.results.summary.start,
      summary.start
    )
    mergedReport.results.summary.stop = Math.max(
      mergedReport.results.summary.stop,
      summary.stop
    )

    mergedReport.results.tests.push(...tests)

    if (environment) {
      mergedReport.results.environment = {
        ...mergedReport.results.environment,
        ...environment
      }
    }

    if (extra) {
      mergedReport.results.extra = {
        ...mergedReport.results.extra,
        ...extra
      }
    }
  })

  return mergedReport
}

/**
 * Initializes an empty summary object.
 *
 * @returns An empty Summary object.
 */
function initializeEmptySummary(): Summary {
  return {
    tests: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    pending: 0,
    other: 0,
    flaky: 0,
    duration: 0,
    start: Number.MAX_SAFE_INTEGER,
    stop: 0
  }
}
