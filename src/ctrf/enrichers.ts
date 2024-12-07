import {
  CtrfReport,
  CtrfTest,
  TestMetrics,
  Summary,
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
 * property of the current CTRF report.
 *
 * @param reports - Array of previous CTRF reports to include in the current report.
 * @param report - The current CTRF report to which the previous reports will be added.
 * @returns The updated current CTRF report with the `previousReports` array populated.
 */
export function addPreviousReportsToCurrentReport(
  reports: CtrfReport[],
  report: CtrfReport
): CtrfReport {
  report.results.extra = report.results.extra || {}
  report.results.extra.previousReports =
    report.results.extra.previousReports || []

  for (const previous of reports) {
    const summaryExtra = {
      result: previous.results.summary.failed > 0 ? 'failed' : 'passed',
      flaky: previous.results.tests.filter(test => test.flaky).length,
      flakyRate: 0.0,
      flakyRateChange: 0.0,
      totalFailRate: 0.0,
      totalFailRateChange: 0.0
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
 * Enrich a CTRF test with reliability metrics
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
 * Enrich the CTRF report summary with overall metrics
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

  report.results.summary.extra = {
    ...(report.results.summary.extra || {}),
    flakyRate,
    flakyRateChange: calculateRateChange(flakyRate, previousFlakyRate),
    failRate,
    failRateChange: calculateRateChange(failRate, previousFailRate),
    finalResults: combinedMetrics.finalResults,
    finalFailures: combinedMetrics.finalFailures,
    reportsUsed: reportsUsed + 1
  }
}

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

export function groupTestsBySuiteOrFilePath(
  report: CtrfReport,
  useSuite: boolean
): CtrfReport {
  if (!report.results.extra) {
    report.results.extra = {}
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
        extra: { groupKey }
      }
    })
  )

  report.results.extra.suites = groupedReports
  return report
}

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
    extra: { result: 'passed', duration: 0 } 
  }

  for (const test of tests) {
    if (summary[test.status] !== undefined) {
      summary[test.status]++
    } else {
      summary.other++
    }

    if (summary.extra) {
      summary.extra.duration += test.duration || 0
    }
  }

  if (summary.extra) {
    summary.extra.result = summary.failed > 0 ? 'failed' : 'passed'
  }

  return summary
}

// TODO  remove the duplication here! previous use workflow-run, current uses GithubContext??
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

  extendedReport.results.summary.extra =
    extendedReport.results.summary.extra ?? {}
  extendedReport.results.summary.failed > 0
    ? (extendedReport.results.summary.extra.result = 'failed')
    : (extendedReport.results.summary.extra.result = 'passed')

  return extendedReport
}
