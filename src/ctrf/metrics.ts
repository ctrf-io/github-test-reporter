import { context } from '@actions/github'
import {
  fetchAllWorkflowRuns,
  processArtifactsFromRuns
} from '../client/github'
import { filterWorkflowRuns } from '../github'
import { CtrfReport, TestMetrics, CtrfTest, Inputs } from '../types'
import {
  enrichTestWithMetrics,
  enrichReportSummary,
  addPreviousReportsToCurrentReport
} from '.'

/**
 * Test Metrics Processing System for CTRF Reports
 *
 * This module enhances CTRF test reports with reliability metrics by analyzing
 * both current and historical test execution data. It extends the standard CTRF
 * schema with additional metrics while maintaining compatibility.
 *
 * Key Metrics:
 * - Flaky Rate: Percentage of test runs that required retries to pass
 * - Fail Rate: Percentage of tests that ultimately failed
 * - Rate Changes: Percentage point differences between current and historical metrics
 *
 * Processing Flow:
 * 1. Aggregate historical test data from previous reports
 * 2. Process current report test results
 * 3. Calculate reliability metrics for each test
 * 4. Enrich both individual tests and summary with metrics
 */

/**
 * Enhanced types for metrics tracking
 */

/**
 * Main function to process a CTRF report and enrich it with reliability metrics.
 *
 * @param currentReport - Current CTRF report to process
 * @param previousReports - Historical CTRF reports for trend analysis
 * @param maxReports - Maximum number of reports to consider including current
 * @param reportsToExclude - Number of recent reports to exclude from historical analysis
 * @returns Enhanced CTRF report with reliability metrics
 */
export function processTestReliabilityMetrics(
  currentReport: CtrfReport,
  previousReports: CtrfReport[],
  maxReports = 100,
  reportsToExclude = 0
): CtrfReport {
  const previousReportsToUse = maxReports - 1
  const { metricsMap: historicalData, reportsUsed } =
    aggregateHistoricalTestData(
      previousReports,
      previousReportsToUse,
      reportsToExclude
    )

  const { metricsMap: previousPeriodData } = aggregateHistoricalTestData(
    previousReports,
    previousReportsToUse,
    reportsToExclude + 1
  )

  // Enrich individual tests with metrics
  currentReport.results.tests.forEach(test => {
    const testHistory = historicalData.get(test.name) || createEmptyMetrics()
    const previousHistory =
      previousPeriodData.get(test.name) || createEmptyMetrics()

    enrichTestWithMetrics(test, testHistory, previousHistory)
  })

  // Enrich report summary, passing reportsUsed
  enrichReportSummary(
    currentReport,
    historicalData,
    previousPeriodData,
    reportsUsed
  )

  return currentReport
}

/**
 * Initialize empty metrics object
 */
export function createEmptyMetrics(): TestMetrics {
  return {
    totalAttempts: 0,
    flakyCount: 0,
    passedCount: 0,
    failedCount: 0,
    finalResults: 0,
    finalFailures: 0
  }
}

/**
 * Calculate flaky rate as a percentage
 */
export function calculateFlakyRate(
  attempts: number,
  flakyCount: number
): number {
  return attempts > 0 ? Number((flakyCount / attempts) * 100) : 0
}

/**
 * Calculate failure rate as a percentage
 */
export function calculateFailRate(
  totalResults: number,
  failedResults: number
): number {
  return totalResults > 0 ? Number((failedResults / totalResults) * 100) : 0
}

/**
 * Calculate percentage point change between two rates
 */
export function calculateRateChange(current: number, previous: number): number {
  return Number(current - previous)
}

/**
 * Determine if a test is considered flaky based on CTRF test data
 */
export function isTestFlaky(test: CtrfTest): boolean {
  return (
    test.flaky ||
    (test.retries && test.retries > 0 && test.status === 'passed') ||
    false
  )
}

/**
 * Process a single test and extract its metrics
 */
export function processTestMetrics(test: CtrfTest): TestMetrics {
  const attempts = 1 + (test.retries || 0)
  const isPassed = test.status === 'passed'

  return {
    totalAttempts: attempts,
    flakyCount: isTestFlaky(test) ? test.retries || 0 : 0,
    passedCount: isPassed ? 1 : 0,
    failedCount: isPassed ? test.retries || 0 : attempts,
    finalResults: 1,
    finalFailures: isPassed ? 0 : 1
  }
}

/**
 * Aggregate metrics from historical test reports
 */
function aggregateHistoricalTestData(
  previousReports: CtrfReport[],
  maxReports: number,
  reportsToExclude = 0
): { metricsMap: Map<string, TestMetrics>; reportsUsed: number } {
  const metricsMap = new Map<string, TestMetrics>()

  const reportsToProcess = previousReports.slice(
    reportsToExclude,
    reportsToExclude + maxReports
  )

  const reportsUsed = reportsToProcess.length

  reportsToProcess.forEach(report => {
    report.results.tests.forEach(test => {
      if (!metricsMap.has(test.name)) {
        metricsMap.set(test.name, createEmptyMetrics())
      }

      const currentMetrics = processTestMetrics(test)
      const existingMetrics = metricsMap.get(test.name)!
      metricsMap.set(test.name, combineMetrics(existingMetrics, currentMetrics))
    })
  })

  return { metricsMap, reportsUsed }
}

/**
 * Combine two metric objects, summing their values
 */
export function combineMetrics(a: TestMetrics, b: TestMetrics): TestMetrics {
  return {
    totalAttempts: a.totalAttempts + b.totalAttempts,
    flakyCount: a.flakyCount + b.flakyCount,
    passedCount: a.passedCount + b.passedCount,
    failedCount: a.failedCount + b.failedCount,
    finalResults: a.finalResults + b.finalResults,
    finalFailures: a.finalFailures + b.finalFailures
  }
}

export async function processPreviousResultsAndMetrics(
  inputs: Inputs,
  report: CtrfReport,
  githubContext: any
): Promise<CtrfReport> {
  const workflowRuns = await fetchAllWorkflowRuns(
    context.repo.owner,
    context.repo.repo
  )

  const filteredRuns = filterWorkflowRuns(workflowRuns, githubContext)

  const reports = await processArtifactsFromRuns(
    filteredRuns,
    inputs.artifactName
  )

  let updatedReport = addPreviousReportsToCurrentReport(reports, report)

  if (inputs.flakyRateReport || inputs.failRateReport || inputs.customReport) {
    updatedReport = processTestReliabilityMetrics(
      updatedReport,
      reports,
      inputs.metricsReportsMax
    )
  }

  return updatedReport
}
