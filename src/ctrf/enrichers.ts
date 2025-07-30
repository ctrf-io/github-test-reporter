import {
  CtrfReport,
  CtrfTest,
  Summary,
  EnhancedSummaryExtra,
  GitHubContext
} from '../types'

// /**
//  * Calculates the average number of tests per run across all reports.
//  *
//  * @param currentTests - The number of tests in the current report
//  * @param previousReports - Array of previous reports
//  * @param reportsUsed - Number of historical reports used
//  * @returns The average number of tests per run, rounded to the nearest integer
//  */
// function calculateAverageTestsPerRun(
//   currentTests: number,
//   previousReports: CtrfReport[],
//   reportsUsed: number
// ): number {
//   const totalTests =
//     currentTests +
//     previousReports.reduce((sum, r) => sum + r.results.summary.tests, 0)
//   return Math.round(totalTests / (reportsUsed + 1))
// }

/**
 * Adds a prefix to each test name in the CTRF report based on the suite or file path.
 *
 * @param report - The CTRF report containing the tests to prefix.
 * @returns The updated CTRF report with prefixed test names.
 */
export function prefixTestNames(report: CtrfReport): CtrfReport {
  const workspacePath = process.env.GITHUB_WORKSPACE || ''

  report.results.tests = report.results.tests.map(test => {
    let prefix = ''

    if (test.suite) {
      prefix = test.suite
    } else if (test.filePath) {
      prefix = test.filePath.startsWith(workspacePath)
        ? test.filePath.slice(workspacePath.length)
        : test.filePath
    }

    test.name = prefix ? `${prefix} - ${test.name}` : test.name

    return test
  })

  return report
}

/**
 * Groups tests in a CTRF report by either their suite or file path.
 *
 * @param report - The CTRF report containing tests to group.
 * @param useSuite - If true, groups tests by suite; otherwise, groups by file path.
 * @returns The updated CTRF report with tests grouped into `extra.suites`.
 */
export function groupTestsBySuiteOrFilePath(
  report: CtrfReport,
  useSuite: boolean
): CtrfReport {
  if (!report.results.extra) {
    report.results.extra = { previousReports: [] }
  }

  const workspacePath = (process.env.GITHUB_WORKSPACE || '').replace(/\/$/, '')

  const groupedTests: Record<string, CtrfTest[]> = {}
  for (const test of report.results.tests) {
    const key = useSuite
      ? test.suite
      : test.filePath
        ? test.filePath.replace(workspacePath, '').replace(/^\//, '')
        : undefined

    if (key) {
      if (!groupedTests[key]) {
        groupedTests[key] = []
      }
      groupedTests[key].push(test)
    } else {
      if (!groupedTests['ungrouped']) {
        groupedTests['ungrouped'] = []
      }
      groupedTests['ungrouped'].push(test)
    }
  }

  const groupedReports: CtrfReport[] = Object.entries(groupedTests).map(
    ([groupKey, tests]) => ({
      results: {
        tool: report.results.tool,
        summary: calculateSummary(tests),
        tests,
        extra: {
          groupKey,
          previousReports: []
        }
      }
    })
  )

  report.results.extra.suites = groupedReports
  return report
}

/**
 * Groups tests in a CTRF report by their file path specifically for file reports.
 *
 * @param report - The CTRF report containing tests to group.
 * @returns The updated CTRF report with tests grouped into `extra.files`.
 */
export function groupTestsByFile(report: CtrfReport): CtrfReport {
  if (!report.results.extra) {
    report.results.extra = { previousReports: [] }
  }

  const workspacePath = (process.env.GITHUB_WORKSPACE || '').replace(/\/$/, '')

  const groupedTests: Record<string, CtrfTest[]> = {}
  for (const test of report.results.tests) {
    const key = test.filePath
      ? test.filePath.replace(workspacePath, '').replace(/^\//, '')
      : undefined

    if (key) {
      if (!groupedTests[key]) {
        groupedTests[key] = []
      }
      groupedTests[key].push(test)
    } else {
      if (!groupedTests['ungrouped']) {
        groupedTests['ungrouped'] = []
      }
      groupedTests['ungrouped'].push(test)
    }
  }

  const groupedReports: CtrfReport[] = Object.entries(groupedTests).map(
    ([groupKey, tests]) => ({
      results: {
        tool: report.results.tool,
        summary: calculateSummary(tests),
        tests,
        extra: {
          groupKey,
          previousReports: []
        }
      }
    })
  )

  report.results.extra.files = groupedReports
  return report
}

/**
 * Calculates a summary for a given set of CTRF tests.
 *
 * @param tests - An array of CTRF tests to summarize.
 * @returns A summary object containing counts and additional metrics for the tests.
 */
export function calculateSummary(tests: CtrfTest[]): Summary {
  const summary: Summary = {
    tests: tests.length,
    passed: 0,
    failed: 0,
    skipped: 0,
    pending: 0,
    other: 0,
    start: 0,
    stop: 0,
    extra: {
      result: 'passed',
      duration: 0,
      flakyRate: 0,
      flakyRateChange: 0,
      failRate: 0,
      failRateChange: 0,
      finalResults: 0,
      finalFailures: 0
    }
  }

  for (const test of tests) {
    if (summary[test.status] !== undefined) {
      summary[test.status]++
    } else {
      summary.other++
    }

    if (summary.extra && typeof summary.extra.duration === 'number') {
      summary.extra.duration += test.duration || 0
    }
  }

  if (summary.extra) {
    summary.extra.result = summary.failed > 0 ? 'failed' : 'passed'
  }

  return summary
}

// TODO remove this function
/**
 * Enriches a CTRF report with details from a GitHub Actions workflow run.
 *
 * @param report - The CTRF report to enrich.
 * @param run - The GitHub Actions workflow run details.
 * @returns The updated CTRF report with enriched run details.
 */
export function enrichReportWithRunDetails(report: CtrfReport): CtrfReport {
  const extendedReport = report

  extendedReport.results.environment = extendedReport.results.environment ?? {}

  return extendedReport
}

/**
 * Enriches the current CTRF report with details from the GitHub Actions context.
 *
 * @param report - The CTRF report to enrich.
 * @param run - The GitHub context details to use for enrichment.
 * @returns The updated CTRF report with enriched run details.
 */
export function enrichCurrentReportWithRunDetails(
  report: CtrfReport,
  run: GitHubContext
): CtrfReport {
  const extendedReport = report

  extendedReport.results.environment = extendedReport.results.environment ?? {}

  if (!extendedReport.results.environment.buildName) {
    extendedReport.results.environment.buildName = run.job
  }
  if (!extendedReport.results.environment.buildNumber) {
    extendedReport.results.environment.buildNumber = run.run_number.toString()
  }
  if (!extendedReport.results.environment.buildUrl) {
    extendedReport.results.environment.buildUrl = run.build_url
  }

  if (!extendedReport.results.environment.buildId) {
    extendedReport.results.environment.buildId = run.run_id.toString()
  }

  if (!extendedReport.results.environment.branchName) {
    extendedReport.results.environment.branchName =
      run.ref?.replace('refs/heads/', '') || ''
  }

  const defaultSummaryExtra: EnhancedSummaryExtra = {
    flakyRate: 0,
    flakyRateChange: 0,
    failRate: 0,
    failRateChange: 0,
    finalResults: 0,
    finalFailures: 0,
    result: extendedReport.results.summary.failed > 0 ? 'failed' : 'passed'
  }

  extendedReport.results.summary.extra = {
    ...(extendedReport.results.summary.extra || defaultSummaryExtra),
    result: extendedReport.results.summary.failed > 0 ? 'failed' : 'passed'
  }

  return extendedReport
}
