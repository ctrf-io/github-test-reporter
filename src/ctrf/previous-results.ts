import { Report } from 'ctrf'

/**
 * Interface for a previous result entry stored in the current report
 */
export interface PreviousResult {
  start: number
  stop: number
  buildId?: string
  buildName?: string
  buildNumber?: string
  buildUrl?: string
  result: string
  tests: number
  passed: number
  failed: number
  skipped: number
  flaky: number
  other: number
  duration: number
}

/**
 * Stores previous results in the current report's previousResults array.
 * Extracts key metrics from each previous report and adds them to the current report.
 *
 * @param currentReport The current CTRF report to enrich with previous results
 * @param previousReports Array of previous CTRF reports to extract metrics from
 * @returns The current report with previousResults populated
 */
export function storePreviousResults(
  currentReport: Report,
  previousReports: Report[]
): Report {
  if (!currentReport || !Array.isArray(previousReports)) {
    throw new Error(
      'Invalid input: currentReport must be a valid CTRF report and previousReports must be an array'
    )
  }

  if (!currentReport.extra) {
    currentReport.extra = {}
  }

  const previousResults: PreviousResult[] = previousReports.map(report => {
    if (!report.results || !report.results.summary) {
      throw new Error('Invalid previous report: missing results or summary')
    }

    const summary = report.results.summary
    const tests = report.results.tests || []

    const flakyCount = tests.filter(test => test.flaky === true).length

    const duration = summary.stop - summary.start

    let result = 'passed'
    if (summary.failed > 0) {
      result = 'failed'
    } else if (
      (summary.skipped > 0 || summary.pending > 0 || summary.other > 0) &&
      summary.passed === 0
    ) {
      result = 'skipped'
    } else if (summary.tests === 0) {
      result = 'empty'
    }

    return {
      start: report.results.summary.start,
      stop: report.results.summary.stop,
      buildId: report.results.environment?.buildId,
      buildName: report.results.environment?.buildName,
      buildNumber: report.results.environment?.buildNumber,
      buildUrl: report.results.environment?.buildUrl,
      result,
      tests: summary.tests,
      passed: summary.passed,
      failed: summary.failed,
      skipped: summary.skipped,
      flaky: flakyCount,
      other: summary.other,
      duration,
      environment: report.results.environment
    }
  })

  previousResults.sort((a, b) => b.start - a.start)

  currentReport.extra.previousResults = previousResults

  return currentReport
}
