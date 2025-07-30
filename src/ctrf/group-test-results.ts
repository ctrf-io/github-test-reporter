import { CtrfReport, CtrfTest, Inputs, Summary } from '../types'

/**
 * Determines if the tests in the CTRF report should be grouped based on the inputs.
 *
 * @param inputs - The user-provided inputs.
 * @returns `true` if tests should be grouped, otherwise `false`.
 */
export function shouldGroupTests(inputs: Inputs): boolean {
  return (
    inputs.alwaysGroupBy || inputs.suiteFoldedReport || inputs.suiteListReport
  )
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
    stop: 0
  }

  for (const test of tests) {
    if (summary[test.status] !== undefined) {
      summary[test.status]++
    } else {
      summary.other++
    }
  }

  return summary
}
