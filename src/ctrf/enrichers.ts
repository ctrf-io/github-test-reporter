import {
  CtrfReport,
  CtrfTest,
  TestMetrics,
  Summary,
  EnhancedSummaryExtra,
  GitHubContext
} from '../types'
import {
  processTestMetrics,
  combineMetrics,
  calculateFlakyRate,
  calculateFailRate,
  calculateRateChange,
  createEmptyMetrics
} from './metrics'

/**
 * Adds a list of previous CTRF reports to the `results.extra.previousReports`
 * property of the current CTRF report. For efficiency, an empty tests array is added for each previous report.
 *
 * @param reports - Array of previous CTRF reports to include in the current report.
 * @param report - The current CTRF report to which the previous reports will be added.
 * @returns The updated current CTRF report with the `previousReports` array populated.
 */
export function addPreviousReportsToCurrentReport(
  reports: CtrfReport[],
  report: CtrfReport
): CtrfReport {
  report.results.extra = report.results.extra || { previousReports: [] }
  report.results.extra.previousReports =
    report.results.extra.previousReports || []

  for (const previous of reports) {
    const summaryExtra: EnhancedSummaryExtra = {
      result: previous.results.summary.failed > 0 ? 'failed' : 'passed',
      flaky: previous.results.tests.filter(test => test.flaky).length,
      flakyRate: 0.0,
      flakyRateChange: 0.0,
      failRate: 0.0,
      failRateChange: 0.0,
      finalResults: previous.results.summary.tests,
      finalFailures: previous.results.summary.failed
    }

    previous.results.summary.extra = summaryExtra

    const previousReport: CtrfReport = {
      results: {
        tool: previous.results.tool,
        summary: previous.results.summary,
        tests: [],
        environment: previous.results.environment
      }
    }

    report.results.extra.previousReports.push(previousReport)
  }

  return report
}

/**
 * Enriches a CTRF test with reliability metrics based on historical and current metrics.
 *
 * @param test - The CTRF test to enrich with metrics.
 * @param historicalMetrics - The historical metrics for the test.
 * @param previousMetrics - The metrics from the previous period for the test.
 */
export function enrichTestWithMetrics(
  test: CtrfTest,
  historicalMetrics: TestMetrics,
  previousMetrics: TestMetrics
): void {
  const currentMetrics = processTestMetrics(test)
  const combinedMetrics = combineMetrics(historicalMetrics, currentMetrics)

  const flakyRate = calculateFlakyRate(
    combinedMetrics.totalAttempts,
    combinedMetrics.flakyCount
  )

  const previousFlakyRate = calculateFlakyRate(
    previousMetrics.totalAttempts,
    previousMetrics.flakyCount
  )

  const failRate = calculateFailRate(
    combinedMetrics.finalResults,
    combinedMetrics.finalFailures
  )

  const previousFailRate = calculateFailRate(
    previousMetrics.finalResults,
    previousMetrics.finalFailures
  )
  test.extra = {
    ...(test.extra || {}),
    totalAttempts: combinedMetrics.totalAttempts,
    flakyRate,
    flakyRateChange: calculateRateChange(flakyRate, previousFlakyRate),
    passedCount: combinedMetrics.passedCount,
    failedCount: combinedMetrics.failedCount,
    failRate,
    failRateChange: calculateRateChange(failRate, previousFailRate),
    finalResults: combinedMetrics.finalResults,
    finalFailures: combinedMetrics.finalFailures
  }
}

/**
 * Calculates the average number of tests per run across all reports.
 *
 * @param currentTests - The number of tests in the current report
 * @param previousReports - Array of previous reports
 * @param reportsUsed - Number of historical reports used
 * @returns The average number of tests per run, rounded to the nearest integer
 */
function calculateAverageTestsPerRun(
  currentTests: number,
  previousReports: CtrfReport[],
  reportsUsed: number
): number {
  const totalTests =
    currentTests +
    previousReports.reduce((sum, r) => sum + r.results.summary.tests, 0)
  return Math.round(totalTests / (reportsUsed + 1))
}

/**
 * Calculates the total number of flaky tests across all reports.
 *
 * @param currentTests - Array of tests from the current report
 * @param previousReports - Array of previous reports
 * @returns The total number of flaky tests
 */
function calculateTotalFlakyTests(
  currentTests: CtrfTest[],
  previousReports: CtrfReport[]
): number {
  const currentFlakyCount = currentTests.filter(test => test.flaky).length
  const previousFlakyCount = previousReports.reduce((sum, r) => {
    const flaky = r.results.summary.extra?.flaky
    return sum + (typeof flaky === 'number' ? flaky : 0)
  }, 0)
  return currentFlakyCount + previousFlakyCount
}

/**
 * Calculates the total number of test failures across all reports.
 *
 * @param currentFailures - Number of failures in the current report
 * @param previousReports - Array of previous reports
 * @returns The total number of test failures
 */
function calculateTotalFailures(
  currentFailures: number,
  previousReports: CtrfReport[]
): number {
  return (
    currentFailures +
    previousReports.reduce((sum, r) => sum + r.results.summary.failed, 0)
  )
}

/**
 * Calculates the p95 duration threshold from an array of test durations.
 *
 * @param durations - Array of test durations
 * @returns The p95 threshold duration
 */
function calculateP95Duration(durations: number[]): number {
  if (durations.length === 0) return 0
  const sortedDurations = [...durations].sort((a, b) => a - b)
  const p95Index = Math.ceil(durations.length * 0.95) - 1
  return sortedDurations[p95Index]
}

/**
 * Finds the slowest test based on p95 duration from the current test run.
 * This helps filter out unusually long outlier runs.
 *
 * @param tests - Array of tests to analyze
 * @returns Object containing the name and p95 duration of the slowest test, or undefined if no tests
 */
function findSlowestTestByP95(
  tests: CtrfTest[]
): { name: string; duration: number } | undefined {
  if (!tests.length) return undefined

  const testGroups = tests.reduce(
    (groups, test) => {
      const name = test.name
      if (!groups[name]) {
        groups[name] = []
      }
      groups[name].push(test.duration || 0)
      return groups
    },
    {} as Record<string, number[]>
  )

  const testP95Durations = Object.entries(testGroups).map(
    ([name, durations]) => ({
      name,
      duration: calculateP95Duration(durations)
    })
  )

  return testP95Durations.reduce((slowest, current) => {
    return current.duration > slowest.duration ? current : slowest
  }, testP95Durations[0])
}

/**
 * Calculates the average duration for each test across all runs and sorts them.
 * Returns only the top 10 slowest tests.
 *
 * @param tests - Array of tests to analyze
 * @param previousReports - Array of previous reports
 * @returns Array of tests with average durations, sorted by duration
 */
function calculateAndSortTestDurations(
  tests: CtrfTest[],
  previousReports: CtrfReport[]
): CtrfTest[] {
  const testDurations: Record<string, number[]> = {}

  tests.forEach(test => {
    if (!testDurations[test.name]) {
      testDurations[test.name] = []
    }
    if (test.duration) {
      testDurations[test.name].push(test.duration)
    }
  })

  previousReports.forEach(report => {
    report.results.tests.forEach(test => {
      if (!testDurations[test.name]) {
        testDurations[test.name] = []
      }
      if (test.duration) {
        testDurations[test.name].push(test.duration)
      }
    })
  })

  const testsWithAvg = tests.map(test => {
    const durations = testDurations[test.name] || []
    if (durations.length > 0) {
      const currentExtra = test.extra || {
        totalAttempts: 0,
        flakyRate: 0,
        flakyRateChange: 0,
        passedCount: 0,
        failedCount: 0,
        failRate: 0,
        failRateChange: 0,
        finalResults: 0,
        finalFailures: 0
      }
      test.extra = {
        ...currentExtra,
        avgDuration: calculateP95Duration(durations)
      }
    }
    return test
  })

  return testsWithAvg
    .filter(test => test.extra?.avgDuration !== undefined)
    .sort((a, b) => {
      const aDuration = a.extra?.avgDuration || 0
      const bDuration = b.extra?.avgDuration || 0
      return bDuration - aDuration
    })
    .slice(0, 10)
}

/**
 * Enriches the CTRF report summary with overall metrics, including flaky and fail rates.
 *
 * @param report - The CTRF report to enrich.
 * @param historicalData - A map of historical metrics for all tests.
 * @param previousData - A map of metrics from the previous period.
 * @param reportsUsed - The number of historical reports used.
 */
export function enrichReportSummary(
  report: CtrfReport,
  historicalData: Map<string, TestMetrics>,
  previousData: Map<string, TestMetrics>,
  reportsUsed: number
): void {
  const currentMetrics = report.results.tests.reduce(
    (acc, test) => combineMetrics(acc, processTestMetrics(test)),
    createEmptyMetrics()
  )

  const historicalMetrics = Array.from(historicalData.values()).reduce(
    (acc, metrics) => combineMetrics(acc, metrics),
    createEmptyMetrics()
  )

  const previousMetrics = Array.from(previousData.values()).reduce(
    (acc, metrics) => combineMetrics(acc, metrics),
    createEmptyMetrics()
  )

  const combinedMetrics = combineMetrics(historicalMetrics, currentMetrics)

  const flakyRate = calculateFlakyRate(
    combinedMetrics.totalAttempts,
    combinedMetrics.flakyCount
  )

  const previousFlakyRate = calculateFlakyRate(
    previousMetrics.totalAttempts,
    previousMetrics.flakyCount
  )

  const failRate = calculateFailRate(
    combinedMetrics.finalResults,
    combinedMetrics.finalFailures
  )

  const previousFailRate = calculateFailRate(
    previousMetrics.finalResults,
    previousMetrics.finalFailures
  )

  const previousReports = report.results.extra?.previousReports || []
  const averageTestsPerRun = calculateAverageTestsPerRun(
    report.results.summary.tests,
    previousReports,
    reportsUsed
  )
  const totalFlakyTests = calculateTotalFlakyTests(
    report.results.tests,
    previousReports
  )
  const totalFailures = calculateTotalFailures(
    report.results.summary.failed,
    previousReports
  )
  const slowestTest = findSlowestTestByP95(report.results.tests)

  report.results.tests = calculateAndSortTestDurations(
    report.results.tests,
    previousReports
  )

  report.results.summary.extra = {
    ...(report.results.summary.extra || {}),
    flakyRate,
    flakyRateChange: calculateRateChange(flakyRate, previousFlakyRate),
    failRate,
    failRateChange: calculateRateChange(failRate, previousFailRate),
    finalResults: combinedMetrics.finalResults,
    finalFailures: combinedMetrics.finalFailures,
    reportsUsed: reportsUsed + 1,
    averageTestsPerRun,
    totalFlakyTests,
    totalFailures,
    slowestTest
  }
}

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

// TODO  remove the duplication here! previous use workflow-run, current uses GithubContext??
/**
 * Enriches a CTRF report with details from a GitHub Actions workflow run.
 *
 * @param report - The CTRF report to enrich.
 * @param run - The GitHub Actions workflow run details.
 * @returns The updated CTRF report with enriched run details.
 */
export function enrichReportWithRunDetails(
  report: CtrfReport,
  run: import('@octokit/openapi-types').components['schemas']['workflow-run']
): CtrfReport {
  const extendedReport = report

  extendedReport.results.environment = extendedReport.results.environment ?? {}
  extendedReport.results.environment.extra =
    extendedReport.results.environment.extra ?? {}

  extendedReport.results.environment.extra.runId = run.id
  extendedReport.results.environment.extra.runNumber = run.run_number
  extendedReport.results.environment.extra.buildUrl = run.html_url
  extendedReport.results.environment.extra.runName = run.name

  return extendedReport
}

// TODO  remove the duplication here! previous use workflow-run, current uses GithubContext??
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
  extendedReport.results.environment.extra =
    extendedReport.results.environment.extra ?? {}

  extendedReport.results.environment.extra.runId = run.run_id
  extendedReport.results.environment.extra.runNumber = run.run_number
  extendedReport.results.environment.extra.buildUrl = run.build_url
  extendedReport.results.environment.extra.runName = run.job

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
