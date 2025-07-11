// ========================================
// STANDALONE INSIGHTS FUNCTIONS
// ========================================
// These functions are designed to be completely self-contained
// with no external dependencies for easy packaging and reuse.

// ========================================
// TYPES
// ========================================

export type CtrfTestState =
  | 'passed'
  | 'failed'
  | 'skipped'
  | 'pending'
  | 'other'

export interface TestInsights {
  flakyRate: InsightsMetric
  failRate: InsightsMetric
  skippedRate: InsightsMetric
  averageTestDuration: InsightsMetric
  p95Duration: InsightsMetric
  appearsInRuns: number
  extra?: Record<string, unknown>
}

export interface CtrfTest {
  name: string
  status: CtrfTestState
  duration: number
  start?: number
  stop?: number
  suite?: string
  message?: string
  trace?: string
  line?: number
  ai?: string
  rawStatus?: string
  tags?: string[]
  type?: string
  filePath?: string
  retries?: number
  flaky?: boolean
  attempts?: CtrfTest[]
  browser?: string
  device?: string
  screenshot?: string
  parameters?: Record<string, unknown>
  steps?: Step[]
  insights?: TestInsights
  extra?: Record<string, unknown>
}

export interface Step {
  name: string
  status: CtrfTestState
}

export interface Summary {
  tests: number
  passed: number
  failed: number
  skipped: number
  pending: number
  other: number
  suites?: number
  start: number
  stop: number
  extra?: Record<string, unknown>
}

export interface CtrfEnvironment {
  reportName?: string
  appName?: string
  appVersion?: string
  osPlatform?: string
  osRelease?: string
  osVersion?: string
  buildName?: string
  buildNumber?: string
  buildUrl?: string
  repositoryName?: string
  repositoryUrl?: string
  branchName?: string
  testEnvironment?: string
  extra?: Record<string, unknown>
}

export interface Tool {
  name: string
  version?: string
  extra?: Record<string, unknown>
}

export interface Results {
  tool: Tool
  summary: Summary
  tests: CtrfTest[]
  environment?: CtrfEnvironment
  extra?: Record<string, unknown>
}

export interface CtrfReport {
  results: Results
  insights?: Insights
}

export interface Insights {
  flakyRate: InsightsMetric
  failRate: InsightsMetric
  skippedRate: InsightsMetric
  averageTestDuration: InsightsMetric
  averageRunDuration: InsightsMetric
  reportsAnalyzed: number
  extra?: Record<string, unknown>
}

export interface InsightsMetric {
  current: number
  previous: number
  change: number
}

export interface SimplifiedTestData {
  name: string
  suite?: string
  filePath?: string
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Determines if a test is flaky based on its retries and status.
 *
 * @param test - The CTRF test to evaluate.
 * @returns `true` if the test is considered flaky, otherwise `false`.
 */
export function isTestFlaky(test: CtrfTest): boolean {
  return (
    test.flaky ||
    (test.retries && test.retries > 0 && test.status === 'passed') ||
    false
  )
}

/**
 * Formats a ratio (0-1) as a percentage string for display.
 *
 * @param ratio - The ratio to format (0-1)
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted percentage string (e.g., "25.50%")
 */
export function formatAsPercentage(ratio: number, decimals: number = 2): string {
  return `${(ratio * 100).toFixed(decimals)}%`
}

/**
 * Formats an InsightsMetric as percentage strings for display.
 *
 * @param metric - The insights metric to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Object with formatted percentage strings
 */
export function formatInsightsMetricAsPercentage(
  metric: InsightsMetric,
  decimals: number = 2
): { current: string; previous: string; change: string } {
  return {
    current: formatAsPercentage(metric.current, decimals),
    previous: formatAsPercentage(metric.previous, decimals),
    change: `${metric.change >= 0 ? '+' : ''}${formatAsPercentage(metric.change, decimals)}`
  }
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
function validateReportForInsights(report: CtrfReport): boolean {
  return !!(report?.results?.tests && Array.isArray(report.results.tests))
}

/**
 * Base run-level metrics aggregated across multiple reports.
 */
interface AggregatedRunMetrics {
  totalAttempts: number      // Total test attempts (includes retries)
  totalAttemptsFailed: number // Total test attempts failed (includes retries)  
  totalResults: number       // Total test results with final status - not including retries
  totalResultsFailed: number // Total test results with final status failed - not including retries
  totalResultsPassed: number // Total test results with final status passed - not including retries
  totalResultsSkipped: number // Total test results with final status skipped/pending/other - not including retries
  totalResultsFlaky: number  // Total test results marked as flaky - not including retries
  totalResultsDuration: number      // Total duration of all tests
  reportsAnalyzed: number    // Total number of reports analyzed    
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
  reports: CtrfReport[]
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
      }

      metrics.totalResultsDuration += test.duration || 0
      metrics.durations.push(test.duration || 0)
    }

    // Track which tests appeared in this report
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
  let totalResultsDuration = 0

  for (const metrics of metricsMap.values()) {
    totalAttempts += metrics.totalAttempts
    totalAttemptsFailed += metrics.totalAttemptsFailed
    totalResults += metrics.totalResults
    totalResultsFailed += metrics.totalResultsFailed
    totalResultsPassed += metrics.totalResultsPassed
    totalResultsSkipped += metrics.totalResultsSkipped
    totalResultsFlaky += metrics.totalResultsFlaky
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
    totalResultsDuration,
    reportsAnalyzed: metricsMap.size
  }
}

// ========================================
// INSIGHT Flaky Rate FUNCTIONS
// ========================================

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

  return Number((runMetrics.totalResultsFlaky / runMetrics.totalAttempts).toFixed(4))
}

/**
 * Calculates flaky rate insights across all reports (current + all previous).
 *
 * @param currentReport - The current CTRF report
 * @param previousReports - Array of historical CTRF reports
 * @returns InsightsMetric with current value calculated across all reports
 */
export function calculateFlakyRateInsight(
  currentReport: CtrfReport,
  previousReports: CtrfReport[]
): InsightsMetric {
  // Combine current report with all previous reports
  const allReports = [currentReport, ...previousReports]

  // Calculate flaky rate across all reports
  const testMetrics = aggregateTestMetricsAcrossReports(allReports)
  const runMetrics = consolidateTestMetricsToRunMetrics(testMetrics)
  const current = calculateFlakyRateFromMetrics(runMetrics)

  return { current, previous: 0, change: 0 }
}

// ========================================
// INSIGHT Fail Rate FUNCTIONS
// ========================================

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

  return Number((runMetrics.totalResultsFailed / runMetrics.totalResults).toFixed(4))
}

/**
 * Calculates fail rate insights across all reports (current + all previous).
 *
 * @param currentReport - The current CTRF report
 * @param previousReports - Array of historical CTRF reports
 * @returns InsightsMetric with current value calculated across all reports
 */
export function calculateFailRateInsight(
  currentReport: CtrfReport,
  previousReports: CtrfReport[]
): InsightsMetric {
  // Combine current report with all previous reports
  const allReports = [currentReport, ...previousReports]

  // Calculate fail rate across all reports
  const testMetrics = aggregateTestMetricsAcrossReports(allReports)
  const runMetrics = consolidateTestMetricsToRunMetrics(testMetrics)
  const current = calculateFailRateFromMetrics(runMetrics)

  return { current, previous: 0, change: 0 }
}

// ========================================
// INSIGHT Skipped Rate FUNCTIONS
// ========================================

/**
 * Calculates overall skipped rate from consolidated run metrics.
 * Skipped rate = (totalResultsSkipped / totalResults) as ratio 0-1
 */
function calculateSkippedRateFromMetrics(
  runMetrics: AggregatedRunMetrics
): number {
  if (runMetrics.totalResults === 0) {
    return 0
  }

  return Number((runMetrics.totalResultsSkipped / runMetrics.totalResults).toFixed(4))
}

/**
 * Calculates skipped rate insights across all reports (current + all previous).
 *
 * @param currentReport - The current CTRF report
 * @param previousReports - Array of historical CTRF reports
 * @returns InsightsMetric with current value calculated across all reports
 */
export function calculateSkippedRateInsight(
  currentReport: CtrfReport,
  previousReports: CtrfReport[]
): InsightsMetric {
  // Combine current report with all previous reports
  const allReports = [currentReport, ...previousReports]

  // Calculate skipped rate across all reports
  const testMetrics = aggregateTestMetricsAcrossReports(allReports)
  const runMetrics = consolidateTestMetricsToRunMetrics(testMetrics)
  const current = calculateSkippedRateFromMetrics(runMetrics)

  return { current, previous: 0, change: 0 }
}

// ========================================
// INSIGHT Average Test Duration FUNCTIONS
// ========================================

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

  return Number((runMetrics.totalResultsDuration / runMetrics.totalResults).toFixed(2))
}

/**
 * Calculates average test duration insights across all reports (current + all previous).
 *
 * @param currentReport - The current CTRF report
 * @param previousReports - Array of historical CTRF reports
 * @returns InsightsMetric with current value calculated across all reports
 */
export function calculateAverageTestDurationInsight(
  currentReport: CtrfReport,
  previousReports: CtrfReport[]
): InsightsMetric {
  // Combine current report with all previous reports
  const allReports = [currentReport, ...previousReports]

  // Calculate average test duration across all reports
  const testMetrics = aggregateTestMetricsAcrossReports(allReports)
  const runMetrics = consolidateTestMetricsToRunMetrics(testMetrics)
  const current = calculateAverageTestDurationFromMetrics(runMetrics)

  return { current, previous: 0, change: 0 }
}

// ========================================
// INSIGHT Average Run Duration FUNCTIONS
// ========================================

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

  return Number((runMetrics.totalResultsDuration / runMetrics.reportsAnalyzed).toFixed(2))
}

/**
 * Calculates average run duration insights across all reports (current + all previous).
 *
 * @param currentReport - The current CTRF report
 * @param previousReports - Array of historical CTRF reports
 * @returns InsightsMetric with current value calculated across all reports
 */
export function calculateAverageRunDurationInsight(
  currentReport: CtrfReport,
  previousReports: CtrfReport[]
): InsightsMetric {
  // Combine current report with all previous reports
  const allReports = [currentReport, ...previousReports]

  const testMetrics = aggregateTestMetricsAcrossReports(allReports)
  const runMetrics = consolidateTestMetricsToRunMetrics(testMetrics)

  // Calculate average run duration across all reports
  const current = calculateAverageRunDurationFromMetrics(runMetrics)

  return { current, previous: 0, change: 0 }
}

// ========================================
// INSIGHT Current FUNCTIONS
// ========================================

/**
 * Recursively calculates insights for each report based on all reports that came before it chronologically.
 * Only sets the `current` field for each report - `previous` and `change` are calculated later.
 *
 * @param reports - Array of CTRF reports in reverse chronological order (newest first)
 * @param index - Current index being processed (default: 0)
 * @returns The reports array with insights populated for each report
 */
export function calculateRunInsights(
  reports: CtrfReport[],
  index: number = 0
): CtrfReport[] {
  // Base case: if we've processed all reports, return the array
  if (index >= reports.length) {
    return reports
  }

  // Get the current report and all reports that came before it chronologically
  const currentReport = reports[index]
  const previousReports = reports.slice(index + 1) // Reports that came before this one in time

  // Calculate insights for this report based on itself + all previous reports
  const allReportsUpToThisPoint = [currentReport, ...previousReports]
  const testMetrics = aggregateTestMetricsAcrossReports(allReportsUpToThisPoint)
  const runMetrics = consolidateTestMetricsToRunMetrics(testMetrics)

  // Set insights for this report (only current values, previous/change set later)
  const { reportsAnalyzed, ...relevantMetrics } = runMetrics
  
  currentReport.insights = {
    flakyRate: {
      current: calculateFlakyRateFromMetrics(runMetrics),
      previous: 0,
      change: 0
    },
    failRate: {
      current: calculateFailRateFromMetrics(runMetrics),
      previous: 0,
      change: 0
    },
    skippedRate: {
      current: calculateSkippedRateFromMetrics(runMetrics),
      previous: 0,
      change: 0
    },
    averageTestDuration: {
      current: calculateAverageTestDurationFromMetrics(runMetrics),
      previous: 0,
      change: 0
    },
    averageRunDuration: {
      current: calculateAverageRunDurationFromMetrics(runMetrics),
      previous: 0,
      change: 0
    },
    reportsAnalyzed: allReportsUpToThisPoint.length,
    extra: relevantMetrics
  }

  // Recursively process the next report
  return calculateRunInsights(reports, index + 1)
}

// ========================================
// TEST-LEVEL INSIGHTS FUNCTIONS
// ========================================

/**
 * Calculates test-level flaky rate for a specific test.
 */
function calculateTestFlakyRate(
  testName: string,
  testMetrics: AggregatedTestMetrics
): InsightsMetric {
  const current = testMetrics.totalResults === 0 ? 0 : 
    Number((testMetrics.totalResultsFlaky / testMetrics.totalResults).toFixed(4))

  return { current, previous: 0, change: 0 }
}

/**
 * Calculates test-level fail rate for a specific test.
 */
function calculateTestFailRate(
  testName: string,
  testMetrics: AggregatedTestMetrics
): InsightsMetric {
  const current = testMetrics.totalResults === 0 ? 0 : 
    Number((testMetrics.totalResultsFailed / testMetrics.totalResults).toFixed(4))

  return { current, previous: 0, change: 0 }
}

/**
 * Calculates test-level skipped rate for a specific test.
 */
function calculateTestSkippedRate(
  testName: string,
  testMetrics: AggregatedTestMetrics
): InsightsMetric {
  const current = testMetrics.totalResults === 0 ? 0 : 
    Number((testMetrics.totalResultsSkipped / testMetrics.totalResults).toFixed(4))

  return { current, previous: 0, change: 0 }
}

/**
 * Calculates test-level average duration for a specific test.
 */
function calculateTestAverageDuration(
  testName: string,
  testMetrics: AggregatedTestMetrics
): InsightsMetric {
  const current = testMetrics.totalResults === 0 ? 0 : 
    Number((testMetrics.totalResultsDuration / testMetrics.totalResults).toFixed(2))

  return { current, previous: 0, change: 0 }
}

/**
 * Calculates test-level p95 duration for a specific test.
 */
function calculateTestP95Duration(
  testName: string,
  testMetrics: AggregatedTestMetrics
): InsightsMetric {
  const current = calculateP95(testMetrics.durations)

  return { current, previous: 0, change: 0 }
}

/**
 * Calculates test-level insights for a specific test.
 */
function calculateTestInsights(
  testName: string,
  testMetrics: AggregatedTestMetrics,
): TestInsights {
  const { appearsInRuns, reportsAnalyzed, ...relevantMetrics } = testMetrics

  return {
    flakyRate: calculateTestFlakyRate(testName, testMetrics),
    failRate: calculateTestFailRate(testName, testMetrics),
    skippedRate: calculateTestSkippedRate(testName, testMetrics),
    averageTestDuration: calculateTestAverageDuration(testName, testMetrics),
    p95Duration: calculateTestP95Duration(testName, testMetrics),
    appearsInRuns: testMetrics.appearsInRuns,
    extra: relevantMetrics
  }
}

/**
 * Adds test-level insights to all tests in the current report.
 *
 * @param currentReport - The current CTRF report to add insights to
 * @param previousReports - Array of historical CTRF reports
 * @returns The current report with test-level insights added to each test
 */
export function addTestInsightsToCurrentReport(
  currentReport: CtrfReport,
  previousReports: CtrfReport[]
): CtrfReport {
  if (!validateReportForInsights(currentReport)) {
    return currentReport
  }

  // Combine current report with all previous reports for analysis
  const allReports = [currentReport, ...previousReports]
  const testMetrics = aggregateTestMetricsAcrossReports(allReports)

  // Create a copy of the current report to avoid mutating the original
  const reportWithInsights: CtrfReport = {
    ...currentReport,
    results: {
      ...currentReport.results,
      tests: currentReport.results.tests.map(test => {
        const testName = test.name
        const metrics = testMetrics.get(testName)
        
        if (metrics) {
          const testInsights = calculateTestInsights(testName, metrics)
          return {
            ...test,
            insights: testInsights
          }
        }
        
        // If no metrics found, return test without insights
        return test
      })
    }
  }

  return reportWithInsights
}

// ========================================
// BASELINE INSIGHTS FUNCTIONS
// ========================================

/**
 * Calculates baseline report-level insights using existing insights from current and previous reports.
 * Both reports should already have their insights populated.
 *
 * @param currentReport - The current CTRF report with insights
 * @param previousReport - The previous CTRF report with insights
 * @returns Insights with current, previous, and change values calculated
 */
export function calculateReportInsightsBaseline(
  currentReport: CtrfReport,
  previousReport: CtrfReport
): Insights {
  const currentInsights = currentReport.insights
  const previousInsights = previousReport.insights

  if (!currentInsights || !previousInsights) {
    console.log('Both reports must have insights populated')
    return currentReport.insights as Insights
  }

  return {
    flakyRate: {
      current: currentInsights.flakyRate.current,
      previous: previousInsights.flakyRate.current,
      change: Number((currentInsights.flakyRate.current - previousInsights.flakyRate.current).toFixed(4))
    },
    failRate: {
      current: currentInsights.failRate.current,
      previous: previousInsights.failRate.current,
      change: Number((currentInsights.failRate.current - previousInsights.failRate.current).toFixed(4))
    },
    skippedRate: {
      current: currentInsights.skippedRate.current,
      previous: previousInsights.skippedRate.current,
      change: Number((currentInsights.skippedRate.current - previousInsights.skippedRate.current).toFixed(4))
    },
    averageTestDuration: {
      current: currentInsights.averageTestDuration.current,
      previous: previousInsights.averageTestDuration.current,
      change: Number((currentInsights.averageTestDuration.current - previousInsights.averageTestDuration.current).toFixed(2))
    },
    averageRunDuration: {
      current: currentInsights.averageRunDuration.current,
      previous: previousInsights.averageRunDuration.current,
      change: Number((currentInsights.averageRunDuration.current - previousInsights.averageRunDuration.current).toFixed(2))
    },
    reportsAnalyzed: currentInsights.reportsAnalyzed,
    extra: currentInsights.extra
  }
}

/**
 * Gets test details for tests that have been removed since the baseline report.
 * A test is considered removed if it exists in the baseline report but not in the current report.
 *
 * @param currentReport - The current CTRF report
 * @param baselineReport - The baseline CTRF report to compare against
 * @returns Array of CtrfTest objects that were removed since baseline
 */
export function getTestsRemovedSinceBaseline(
  currentReport: CtrfReport,
  baselineReport: CtrfReport
): SimplifiedTestData[] {
  if (!validateReportForInsights(currentReport) || !validateReportForInsights(baselineReport)) {
    return []
  }

  const currentTestNames = new Set(currentReport.results.tests.map(test => test.name))
  const removedTests = baselineReport.results.tests.filter(test => !currentTestNames.has(test.name))

  return removedTests.map(test => ({
    name: test.name,
    suite: test.suite,
    filePath: test.filePath
  }))
}

/**
 * Gets test details for tests that have been added since the baseline report.
 * A test is considered added if it exists in the current report but not in the baseline report.
 *
 * @param currentReport - The current CTRF report
 * @param baselineReport - The baseline CTRF report to compare against
 * @returns Array of CtrfTest objects that were added since baseline
 */
export function getTestsAddedSinceBaseline(
  currentReport: CtrfReport,
  baselineReport: CtrfReport
): SimplifiedTestData[] {
  if (!validateReportForInsights(currentReport) || !validateReportForInsights(baselineReport)) {
    return []
  }

  const baselineTestNames = new Set(baselineReport.results.tests.map(test => test.name))
  const addedTests = currentReport.results.tests.filter(test => !baselineTestNames.has(test.name))

  return addedTests.map(test => ({
    name: test.name,
    suite: test.suite,
    filePath: test.filePath
  }))
}

/**
 * Sets the removed tests array to insights.extra.testsRemoved.
 * Calculates which tests were removed since the baseline and adds them to the insights extra data.
 *
 * @param insights - The insights object to modify
 * @param currentReport - The current CTRF report
 * @param baselineReport - The baseline CTRF report to compare against
 * @returns The insights object with testsRemoved added to extra
 */
export function setTestsRemovedToInsights(
  insights: Insights,
  currentReport: CtrfReport,
  baselineReport: CtrfReport
): Insights {
  const removedTests = getTestsRemovedSinceBaseline(currentReport, baselineReport)
  
  return {
    ...insights,
    extra: {
      ...insights.extra,
      testsRemoved: removedTests
    }
  }
}

/**
 * Sets the added tests array to insights.extra.testsAdded.
 * Calculates which tests were added since the baseline and adds them to the insights extra data.
 *
 * @param insights - The insights object to modify
 * @param currentReport - The current CTRF report
 * @param baselineReport - The baseline CTRF report to compare against
 * @returns The insights object with testsAdded added to extra
 */
export function setTestsAddedToInsights(
  insights: Insights,
  currentReport: CtrfReport,
  baselineReport: CtrfReport
): Insights {
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
// what to do
// p95 duration per test
// avg tests per run

// basline functions. Pass in a previous report and a current report and update current report with insights.
// tests removed since baseline
// tests added since baseline




