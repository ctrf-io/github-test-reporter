import {
  InsightsMetric,
  Report,
  Test,
  TestInsights,
  RootInsights
} from '../../types/ctrf'
import { sortReportsByTimestamp } from './utilities/sort-reports'

export interface SimplifiedTestData {
  name: string
  suite?: string[]
  filePath?: string
}

/**
 * Utility function that determines if a test is flaky based on its retries and status.
 *
 * @param test - The CTRF test to evaluate.
 * @returns `true` if the test is considered flaky, otherwise `false`.
 */
export function isTestFlaky(test: Test): boolean {
  return (
    test.flaky ||
    (test.retries && test.retries > 0 && test.status === 'passed') ||
    false
  )
}

/**
 * Utility function that formats a ratio (0-1) as a percentage string for display.
 *
 * @param ratio - The ratio to format (0-1)
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted percentage string (e.g., "25.50%")
 */
export function formatAsPercentage(
  ratio: number,
  decimals: number = 2
): string {
  return `${(ratio * 100).toFixed(decimals)}%`
}

/**
 * Utility function that formats an InsightsMetric as percentage strings for display.
 *
 * @param metric - The insights metric to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Object with formatted percentage strings
 */
export function formatInsightsMetricAsPercentage(
  metric: InsightsMetric,
  decimals: number = 2
): { current: string; baseline: string; change: string } {
  return {
    current: formatAsPercentage(metric.current, decimals),
    baseline: formatAsPercentage(metric.baseline, decimals),
    change: `${metric.change >= 0 ? '+' : ''}${formatAsPercentage(metric.change, decimals)}`
  }
}

/**
 * Utility function that calculates percent fractional change between current and baseline values.
 * Used for duration metrics where the change should be expressed as a ratio (e.g., 0.25 = 25% increase).
 *
 * @param current - The current value
 * @param baseline - The baseline value to compare against
 * @param decimals - Number of decimal places (default: 4)
 * @returns Percent fractional change, or 0 if baseline is 0
 */
export function calculatePercentChange(
  current: number,
  baseline: number,
  decimals: number = 4
): number {
  if (baseline === 0) {
    return 0
  }
  return Number(((current - baseline) / baseline).toFixed(decimals))
}

/**
 * Calculates the 95th percentile from an array of numbers.
 *
 * @param values - Array of numeric values
 * @returns The 95th percentile value
 */
function calculateP95(values: number[]): number {
  if (values.length === 0) return 0

  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.ceil(sorted.length * 0.95) - 1

  return Number(sorted[Math.max(0, index)].toFixed(2))
}

/**
 * Helper function to validate that reports have the necessary data for insights calculation.
 */
function validateReportForInsights(report: Report): boolean {
  return !!(report?.results?.tests && Array.isArray(report.results.tests))
}

/**
 * Base run-level metrics aggregated across multiple reports.
 * Key distinction: "Attempts" include retries, "Results" are final test outcomes only.
 */
interface AggregatedRunMetrics {
  // ATTEMPT METRICS (includes retries)
  totalAttempts: number // Total test executions including retries (e.g., test fails 2x then passes = 3 attempts)
  totalAttemptsFailed: number // Total failed test executions including retries (e.g., 2 failed attempts + 1 final pass = 2 failed attempts)
  totalAttemptsFlaky: number // Total retry attempts for flaky tests only, failed before the final result was passed (e.g., flaky test with 2 retries = 2 flaky attempts)

  // RESULT METRICS (final test outcomes only, no retries counted)
  totalResults: number // Total number of tests executed (each test counted once regardless of retries)
  totalResultsFailed: number // Number of tests with final status "failed" (1 per test regardless of retry count)
  totalResultsPassed: number // Number of tests with final status "passed" (1 per test regardless of retry count)
  totalResultsSkipped: number // Number of tests with final status "skipped/pending/other" (1 per test)
  totalResultsFlaky: number // Number of tests marked as flaky (1 per test regardless of retry count)

  // OTHER METRICS
  totalResultsDuration: number // Total duration of all final test results (retries not included in duration)
  reportsAnalyzed: number // Total number of reports analyzed
}

/**
 * Aggregated run metrics for a single test across multiple reports,
 */
interface AggregatedTestMetrics extends AggregatedRunMetrics {
  appearsInRuns: number // Number of runs test appears in
  durations: number[] // Individual duration values for percentile calculations
}

/**
 * Aggregates test metrics across multiple reports.
 */
function aggregateTestMetricsAcrossReports(
  reports: Report[]
): Map<string, AggregatedTestMetrics> {
  const metricsMap = new Map<string, AggregatedTestMetrics>()

  for (let reportIndex = 0; reportIndex < reports.length; reportIndex++) {
    const report = reports[reportIndex]
    if (!validateReportForInsights(report)) continue

    for (const test of report.results.tests) {
      const isPassed = test.status === 'passed'
      const isFailed = test.status === 'failed'
      const isSkipped = test.status === 'skipped'
      const isPending = test.status === 'pending'
      const isOther = test.status === 'other'

      const testName = test.name

      if (!metricsMap.has(testName)) {
        metricsMap.set(testName, {
          totalAttempts: 0,
          totalAttemptsFailed: 0,
          totalResults: 0,
          totalResultsFailed: 0,
          totalResultsPassed: 0,
          totalResultsSkipped: 0,
          totalResultsFlaky: 0,
          totalAttemptsFlaky: 0,
          totalResultsDuration: 0,
          appearsInRuns: 0,
          reportsAnalyzed: 0,
          durations: []
        })
      }

      const metrics = metricsMap.get(testName)!

      metrics.totalResults += 1
      metrics.totalAttempts += 1 + (test.retries || 0)
      metrics.totalAttemptsFailed += test.retries || 0

      if (isFailed) {
        metrics.totalResultsFailed += 1
        metrics.totalAttemptsFailed += 1 + (test.retries || 0)
      } else if (isPassed) {
        metrics.totalResultsPassed += 1
      } else if (isSkipped) {
        metrics.totalResultsSkipped += 1
      } else if (isPending) {
        metrics.totalResultsSkipped += 1
      } else if (isOther) {
        metrics.totalResultsSkipped += 1
      }
      if (isTestFlaky(test)) {
        metrics.totalResultsFlaky += 1
        metrics.totalAttemptsFlaky += test.retries || 0
      }

      metrics.totalResultsDuration += test.duration || 0
      metrics.durations.push(test.duration || 0)
    }

    const testsInThisReport = new Set<string>()
    for (const test of report.results.tests) {
      testsInThisReport.add(test.name)
    }
    for (const testName of testsInThisReport) {
      const metrics = metricsMap.get(testName)!
      metrics.appearsInRuns += 1
    }
  }

  return metricsMap
}

/**
 * Consolidates all test-level metrics into overall run-level metrics.
 */
function consolidateTestMetricsToRunMetrics(
  metricsMap: Map<string, AggregatedTestMetrics>
): AggregatedRunMetrics {
  let totalAttempts = 0
  let totalAttemptsFailed = 0
  let totalResults = 0
  let totalResultsFailed = 0
  let totalResultsPassed = 0
  let totalResultsSkipped = 0
  let totalResultsFlaky = 0
  let totalAttemptsFlaky = 0
  let totalResultsDuration = 0

  for (const metrics of metricsMap.values()) {
    totalAttempts += metrics.totalAttempts
    totalAttemptsFailed += metrics.totalAttemptsFailed
    totalResults += metrics.totalResults
    totalResultsFailed += metrics.totalResultsFailed
    totalResultsPassed += metrics.totalResultsPassed
    totalResultsSkipped += metrics.totalResultsSkipped
    totalResultsFlaky += metrics.totalResultsFlaky
    totalAttemptsFlaky += metrics.totalAttemptsFlaky
    totalResultsDuration += metrics.totalResultsDuration
  }

  return {
    totalAttempts,
    totalAttemptsFailed,
    totalResults,
    totalResultsFailed,
    totalResultsPassed,
    totalResultsSkipped,
    totalResultsFlaky,
    totalAttemptsFlaky,
    totalResultsDuration,
    reportsAnalyzed: metricsMap.size
  }
}

/**
 * Calculates overall flaky rate from consolidated run metrics.
 * Flaky rate = (failed attempts from flaky tests) / (total attempts) as ratio 0-1
 */
function calculateFlakyRateFromMetrics(
  runMetrics: AggregatedRunMetrics
): number {
  if (runMetrics.totalAttempts === 0) {
    return 0
  }

  return Number(
    (
      runMetrics.totalAttemptsFlaky /
      (runMetrics.totalResults + runMetrics.totalAttemptsFlaky)
    ).toFixed(4)
  )
}

/**
 * Calculates overall fail rate from consolidated run metrics.
 * Fail rate = (totalResultsFailed / totalResults) as ratio 0-1
 */
function calculateFailRateFromMetrics(
  runMetrics: AggregatedRunMetrics
): number {
  if (runMetrics.totalResults === 0) {
    return 0
  }

  return Number(
    (runMetrics.totalResultsFailed / runMetrics.totalResults).toFixed(4)
  )
}

/**
 * Calculates overall pass rate from consolidated run metrics.
 * Pass rate = (totalResultsPassed / totalResults) as ratio 0-1
 */
function calculatePassRateFromMetrics(
  runMetrics: AggregatedRunMetrics
): number {
  if (runMetrics.totalResults === 0) {
    return 0
  }

  return Number(
    (runMetrics.totalResultsPassed / runMetrics.totalResults).toFixed(4)
  )
}

/**
 * Calculates average test duration from consolidated run metrics.
 * Average test duration = (totalDuration / totalResults)
 */
function calculateAverageTestDurationFromMetrics(
  runMetrics: AggregatedRunMetrics
): number {
  if (runMetrics.totalResults === 0) {
    return 0
  }

  return Number(
    (runMetrics.totalResultsDuration / runMetrics.totalResults).toFixed(2)
  )
}

/**
 * Calculates average run duration from consolidated run metrics.
 * Average run duration = (totalDuration / reportsAnalyzed)
 */
function calculateAverageRunDurationFromMetrics(
  runMetrics: AggregatedRunMetrics
): number {
  if (runMetrics.reportsAnalyzed === 0) {
    return 0
  }

  return Number(
    (runMetrics.totalResultsDuration / runMetrics.reportsAnalyzed).toFixed(2)
  )
}

/**
 * Calculates p95 run duration from a collection of reports.
 * Uses the actual run duration (summary.stop - summary.start) for each report.
 *
 * @param reports - Array of CTRF reports to calculate p95 from
 * @returns The 95th percentile run duration
 */
function calculateP95RunDurationFromReports(reports: Report[]): number {
  const runDurations: number[] = []

  for (const report of reports) {
    if (validateReportForInsights(report) && report.results?.summary) {
      const { start, stop } = report.results.summary
      if (start && stop && stop > start) {
        const runDuration = stop - start
        runDurations.push(runDuration)
      }
    }
  }

  return calculateP95(runDurations)
}

/**
 * Internal helper function that recursively calculates insights for each report based on all reports that came before it chronologically.
 * Only sets the `current` field for each report - `previous` and `change` are calculated later.
 *
 * @param reports - Array of CTRF reports in reverse chronological order (newest first)
 * @param index - Current index being processed (default: 0)
 * @returns The reports array with insights populated for each report
 */
function calculateRunInsights(reports: Report[], index: number = 0): Report[] {
  if (index >= reports.length) {
    return reports
  }

  const currentReport = reports[index]
  const previousReports = reports.slice(index + 1)

  const allReportsUpToThisPoint = [currentReport, ...previousReports]
  const testMetrics = aggregateTestMetricsAcrossReports(allReportsUpToThisPoint)
  const runMetrics = consolidateTestMetricsToRunMetrics(testMetrics)

  const { ...relevantMetrics } = runMetrics

  currentReport.insights = {
    passRate: {
      current: calculatePassRateFromMetrics(runMetrics),
      baseline: 0,
      change: 0
    },
    flakyRate: {
      current: calculateFlakyRateFromMetrics(runMetrics),
      baseline: 0,
      change: 0
    },
    failRate: {
      current: calculateFailRateFromMetrics(runMetrics),
      baseline: 0,
      change: 0
    },
    averageTestDuration: {
      current: calculateAverageTestDurationFromMetrics(runMetrics),
      baseline: 0,
      change: 0
    },
    averageRunDuration: {
      current: calculateAverageRunDurationFromMetrics(runMetrics),
      baseline: 0,
      change: 0
    },
    p95RunDuration: {
      current: calculateP95RunDurationFromReports(allReportsUpToThisPoint),
      baseline: 0,
      change: 0
    },
    runsAnalyzed: allReportsUpToThisPoint.length,
    extra: relevantMetrics
  }

  return calculateRunInsights(reports, index + 1)
}

/**
 * Calculates test-level insights with baseline comparison for a specific test.
 *
 * @param testName - Name of the test
 * @param currentTestMetrics - Current aggregated test metrics
 * @param baselineTestMetrics - Baseline aggregated test metrics (optional)
 * @returns TestInsights with current, previous, and change values
 */
function calculateTestInsightsWithBaseline(
  testName: string,
  currentTestMetrics: AggregatedTestMetrics,
  baselineTestMetrics?: AggregatedTestMetrics
): TestInsights {
  const currentPassRate =
    currentTestMetrics.totalResults === 0
      ? 0
      : Number(
          (
            currentTestMetrics.totalResultsPassed /
            currentTestMetrics.totalResults
          ).toFixed(4)
        )
  const currentFlakyRate =
    currentTestMetrics.totalAttempts === 0
      ? 0
      : Number(
          (
            currentTestMetrics.totalAttemptsFlaky /
            (currentTestMetrics.totalResults +
              currentTestMetrics.totalAttemptsFlaky)
          ).toFixed(4)
        )

  const currentFailRate =
    currentTestMetrics.totalResults === 0
      ? 0
      : Number(
          (
            currentTestMetrics.totalResultsFailed /
            currentTestMetrics.totalResults
          ).toFixed(4)
        )
  const currentAverageDuration =
    currentTestMetrics.totalResults === 0
      ? 0
      : Number(
          (
            currentTestMetrics.totalResultsDuration /
            currentTestMetrics.totalResults
          ).toFixed(2)
        )
  const currentP95Duration = calculateP95(currentTestMetrics.durations)

  let baselinePassRate = 0
  let baselineFlakyRate = 0
  let baselineFailRate = 0
  let baselineAverageDuration = 0
  let baselineP95Duration = 0

  if (baselineTestMetrics) {
    baselinePassRate =
      baselineTestMetrics.totalResults === 0
        ? 0
        : Number(
            (
              baselineTestMetrics.totalResultsPassed /
              baselineTestMetrics.totalResults
            ).toFixed(4)
          )
    baselineFlakyRate =
      baselineTestMetrics.totalAttempts === 0
        ? 0
        : Number(
            (
              baselineTestMetrics.totalAttemptsFlaky /
              baselineTestMetrics.totalAttempts
            ).toFixed(4)
          )
    baselineFailRate =
      baselineTestMetrics.totalResults === 0
        ? 0
        : Number(
            (
              baselineTestMetrics.totalResultsFailed /
              baselineTestMetrics.totalResults
            ).toFixed(4)
          )
    baselineAverageDuration =
      baselineTestMetrics.totalResults === 0
        ? 0
        : Number(
            (
              baselineTestMetrics.totalResultsDuration /
              baselineTestMetrics.totalResults
            ).toFixed(2)
          )
    baselineP95Duration = calculateP95(baselineTestMetrics.durations)
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { durations: _durations, ...relevantMetrics } = currentTestMetrics

  return {
    passRate: {
      current: currentPassRate,
      baseline: baselinePassRate,
      change: Number((currentPassRate - baselinePassRate).toFixed(4))
    },
    flakyRate: {
      current: currentFlakyRate,
      baseline: baselineFlakyRate,
      change: Number((currentFlakyRate - baselineFlakyRate).toFixed(4))
    },
    failRate: {
      current: currentFailRate,
      baseline: baselineFailRate,
      change: Number((currentFailRate - baselineFailRate).toFixed(4))
    },
    averageTestDuration: {
      current: currentAverageDuration,
      baseline: baselineAverageDuration,
      change: currentAverageDuration - baselineAverageDuration
    },
    p95TestDuration: {
      current: currentP95Duration,
      baseline: baselineP95Duration,
      change: currentP95Duration - baselineP95Duration
    },
    executedInRuns: currentTestMetrics.appearsInRuns,
    extra: relevantMetrics
  }
}

/**
 * Internal helper function that adds test-level insights with baseline comparison to all tests in the current report.
 *
 * @param currentReport - The current CTRF report to add insights to
 * @param previousReports - Array of historical CTRF reports
 * @param baselineReport - The baseline report to compare against (optional)
 * @returns The current report with test-level insights (including baseline comparisons) added to each test
 */
function addTestInsightsWithBaselineToCurrentReport(
  currentReport: Report,
  previousReports: Report[],
  baselineReport?: Report
): Report {
  if (!validateReportForInsights(currentReport)) {
    return currentReport
  }

  const allReports = [currentReport, ...previousReports]
  const currentTestMetrics = aggregateTestMetricsAcrossReports(allReports)

  let baselineTestMetrics: Map<string, AggregatedTestMetrics> | undefined
  if (baselineReport && validateReportForInsights(baselineReport)) {
    const baselineIndex = previousReports.findIndex(
      report =>
        report.results?.summary?.start ===
        baselineReport.results?.summary?.start
    )

    if (baselineIndex >= 0) {
      const reportsUpToBaseline = previousReports.slice(baselineIndex)
      baselineTestMetrics =
        aggregateTestMetricsAcrossReports(reportsUpToBaseline)
    }
  }

  const reportWithInsights: Report = {
    ...currentReport,
    results: {
      ...currentReport.results,
      tests: currentReport.results.tests.map(test => {
        const testName = test.name
        const currentMetrics = currentTestMetrics.get(testName)

        if (currentMetrics) {
          const baselineMetrics = baselineTestMetrics?.get(testName)
          const testInsights = calculateTestInsightsWithBaseline(
            testName,
            currentMetrics,
            baselineMetrics
          )
          return {
            ...test,
            insights: testInsights
          }
        }

        return test
      })
    }
  }

  return reportWithInsights
}

/**
 * Internal helper function that calculates baseline report-level insights using existing insights from current and previous reports.
 * Both reports should already have their insights populated.
 *
 * @param currentReport - The current CTRF report with insights
 * @param previousReport - The previous CTRF report with insights
 * @returns Insights with current, previous, and change values calculated
 */
function calculateReportInsightsBaseline(
  currentReport: Report,
  baslineReport: Report
): RootInsights {
  const currentInsights = currentReport.insights
  const previousInsights = baslineReport.insights

  if (!currentInsights || !previousInsights) {
    console.log('Both reports must have insights populated')
    return currentReport.insights as RootInsights
  }

  return {
    passRate: {
      current: currentInsights?.passRate?.current ?? 0,
      baseline: previousInsights?.passRate?.current ?? 0,
      change: Number(
        (
          (currentInsights?.passRate?.current ?? 0) -
          (previousInsights?.passRate?.current ?? 0)
        ).toFixed(4)
      )
    },
    flakyRate: {
      current: currentInsights?.flakyRate?.current ?? 0,
      baseline: previousInsights?.flakyRate?.current ?? 0,
      change: Number(
        (
          (currentInsights?.flakyRate?.current ?? 0) -
          (previousInsights?.flakyRate?.current ?? 0)
        ).toFixed(4)
      )
    },
    failRate: {
      current: currentInsights?.failRate?.current ?? 0,
      baseline: previousInsights?.failRate?.current ?? 0,
      change: Number(
        (
          (currentInsights?.failRate?.current ?? 0) -
          (previousInsights?.failRate?.current ?? 0)
        ).toFixed(4)
      )
    },
    averageTestDuration: {
      current: currentInsights?.averageTestDuration?.current ?? 0,
      baseline: previousInsights?.averageTestDuration?.current ?? 0,
      change:
        (currentInsights?.averageTestDuration?.current ?? 0) -
        (previousInsights?.averageTestDuration?.current ?? 0)
    },
    averageRunDuration: {
      current: currentInsights?.averageRunDuration?.current ?? 0,
      baseline: previousInsights?.averageRunDuration?.current ?? 0,
      change:
        (currentInsights?.averageRunDuration?.current ?? 0) -
        (previousInsights?.averageRunDuration?.current ?? 0)
    },
    p95RunDuration: {
      current: currentInsights?.p95RunDuration?.current ?? 0,
      baseline: previousInsights?.p95RunDuration?.current ?? 0,
      change:
        (currentInsights?.p95RunDuration?.current ?? 0) -
        (previousInsights?.p95RunDuration?.current ?? 0)
    },
    runsAnalyzed: currentInsights?.runsAnalyzed ?? 0,
    extra: currentInsights.extra
  }
}

/**
 * Internal helper function that gets test details for tests that have been removed since the baseline report.
 * A test is considered removed if it exists in the baseline report but not in the current report.
 *
 * @param currentReport - The current CTRF report
 * @param baselineReport - The baseline CTRF report to compare against
 * @returns Array of CtrfTest objects that were removed since baseline
 */
function getTestsRemovedSinceBaseline(
  currentReport: Report,
  baselineReport: Report
): SimplifiedTestData[] {
  if (
    !validateReportForInsights(currentReport) ||
    !validateReportForInsights(baselineReport)
  ) {
    return []
  }

  const currentTestNames = new Set(
    currentReport.results.tests.map(test => test.name)
  )
  const removedTests = baselineReport.results.tests.filter(
    test => !currentTestNames.has(test.name)
  )

  return removedTests.map(test => ({
    name: test.name,
    suite: test.suite,
    filePath: test.filePath
  }))
}

/**
 * Internal helper function that gets test details for tests that have been added since the baseline report.
 * A test is considered added if it exists in the current report but not in the baseline report.
 *
 * @param currentReport - The current CTRF report
 * @param baselineReport - The baseline CTRF report to compare against
 * @returns Array of CtrfTest objects that were added since baseline
 */
function getTestsAddedSinceBaseline(
  currentReport: Report,
  baselineReport: Report
): SimplifiedTestData[] {
  if (
    !validateReportForInsights(currentReport) ||
    !validateReportForInsights(baselineReport)
  ) {
    return []
  }

  const baselineTestNames = new Set(
    baselineReport.results.tests.map(test => test.name)
  )
  const addedTests = currentReport.results.tests.filter(
    test => !baselineTestNames.has(test.name)
  )

  return addedTests.map(test => ({
    name: test.name,
    suite: test.suite,
    filePath: test.filePath
  }))
}

/**
 * Internal helper function that sets the removed tests array to insights.extra.testsRemoved.
 * Calculates which tests were removed since the baseline and adds them to the insights extra data.
 *
 * @param insights - The insights object to modify
 * @param currentReport - The current CTRF report
 * @param baselineReport - The baseline CTRF report to compare against
 * @returns The insights object with testsRemoved added to extra
 */
function setTestsRemovedToInsights(
  insights: RootInsights,
  currentReport: Report,
  baselineReport: Report
): RootInsights {
  const removedTests = getTestsRemovedSinceBaseline(
    currentReport,
    baselineReport
  )

  return {
    ...insights,
    extra: {
      ...insights.extra,
      testsRemoved: removedTests
    }
  }
}

/**
 * Internal helper function that sets the added tests array to insights.extra.testsAdded.
 * Calculates which tests were added since the baseline and adds them to the insights extra data.
 *
 * @param insights - The insights object to modify
 * @param currentReport - The current CTRF report
 * @param baselineReport - The baseline CTRF report to compare against
 * @returns The insights object with testsAdded added to extra
 */
function setTestsAddedToInsights(
  insights: RootInsights,
  currentReport: Report,
  baselineReport: Report
): RootInsights {
  const addedTests = getTestsAddedSinceBaseline(currentReport, baselineReport)

  return {
    ...insights,
    extra: {
      ...insights.extra,
      testsAdded: addedTests
    }
  }
}

// ========================================
// MAIN CONSUMER API FUNCTION
// ========================================

/**
 * @param currentReport - The current CTRF report to enrich
 * @param previousReports - Array of historical CTRF reports
 * @param baseline - Optional baseline report to compare against. If not provided, no baseline comparisons are made.
 * @returns The current report fully enriched with run-level insights, test-level insights, and baseline comparisons (if baseline provided)
 */
export function enrichReportWithInsights(
  currentReport: Report,
  previousReports: Report[] = [],
  baseline?: Report
): Report {
  if (!validateReportForInsights(currentReport)) {
    console.warn('Current report is not valid for insights calculation')
    return currentReport
  }

  const sortedPreviousReports = sortReportsByTimestamp(previousReports)

  const allReports = [currentReport, ...sortedPreviousReports]
  const reportsWithRunInsights = calculateRunInsights([...allReports])

  const currentReportWithRunInsights = reportsWithRunInsights[0]
  const currentReportWithTestInsights =
    addTestInsightsWithBaselineToCurrentReport(
      currentReportWithRunInsights,
      sortedPreviousReports,
      baseline
    )

  if (!baseline) {
    return currentReportWithTestInsights
  }

  let baselineInsights = calculateReportInsightsBaseline(
    currentReportWithTestInsights,
    baseline
  )

  baselineInsights = setTestsAddedToInsights(
    baselineInsights,
    currentReportWithTestInsights,
    baseline
  )

  baselineInsights = setTestsRemovedToInsights(
    baselineInsights,
    currentReportWithTestInsights,
    baseline
  )

  // Remove testsAdded and testsRemoved as they're not part of the official schema yet
  if (baselineInsights.extra?.testsAdded) {
    delete baselineInsights.extra.testsAdded
  }
  if (baselineInsights.extra?.testsRemoved) {
    delete baselineInsights.extra.testsRemoved
  }

  return {
    ...currentReportWithTestInsights,
    insights: baselineInsights
  }
}
