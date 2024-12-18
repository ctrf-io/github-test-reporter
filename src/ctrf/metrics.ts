import { context } from '@actions/github'
import {
  fetchAllWorkflowRuns,
  fetchWorkflowRun,
  processArtifactsFromRuns
} from '../client/github'
import { filterWorkflowRuns } from '../github'
import {
  CtrfReport,
  TestMetrics,
  CtrfTest,
  Inputs,
  GitHubContext
} from '../types'
import {
  enrichTestWithMetrics,
  enrichReportSummary,
  addPreviousReportsToCurrentReport
} from '.'

/**
 * Processes a CTRF report and enriches it with reliability metrics.
 *
 * @param currentReport - The current CTRF report to process.
 * @param previousReports - Array of historical CTRF reports for trend analysis.
 * @param maxReports - Maximum number of reports to consider, including the current one (default: 100).
 * @param reportsToExclude - Number of recent reports to exclude from historical analysis (default: 0).
 * @returns The enhanced CTRF report with added reliability metrics.
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
 * Creates an empty `TestMetrics` object with all values initialized to zero.
 *
 * @returns A new `TestMetrics` object with zeroed fields.
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
 * Calculates the flaky rate as a percentage.
 *
 * @param attempts - Total number of test attempts.
 * @param flakyCount - Number of flaky test runs.
 * @returns The flaky rate as a percentage.
 */
export function calculateFlakyRate(
  attempts: number,
  flakyCount: number
): number {
  return attempts > 0 ? Number((flakyCount / attempts) * 100) : 0
}

/**
 * Calculates the failure rate as a percentage.
 *
 * @param totalResults - Total number of test results.
 * @param failedResults - Total number of failed test results.
 * @returns The failure rate as a percentage.
 */
export function calculateFailRate(
  totalResults: number,
  failedResults: number
): number {
  return totalResults > 0 ? Number((failedResults / totalResults) * 100) : 0
}

/**
 * Calculates the percentage point change between two rates.
 *
 * @param current - The current rate.
 * @param previous - The previous rate.
 * @returns The percentage point change between the current and previous rates.
 */
export function calculateRateChange(current: number, previous: number): number {
  return Number(current - previous)
}

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
 * Processes a single test and extracts its metrics.
 *
 * @param test - The CTRF test to process.
 * @returns A `TestMetrics` object representing the test's metrics.
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
 * Aggregates metrics from historical test reports.
 *
 * @param previousReports - Array of historical CTRF reports.
 * @param maxReports - Maximum number of reports to process.
 * @param reportsToExclude - Number of recent reports to exclude from processing (default: 0).
 * @returns An object containing a metrics map and the number of reports used.
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
      const existingMetrics = metricsMap.get(test.name) || createEmptyMetrics()
      metricsMap.set(test.name, combineMetrics(existingMetrics, currentMetrics))
    })
  })

  return { metricsMap, reportsUsed }
}

/**
 * Combines two `TestMetrics` objects by summing their respective values.
 *
 * @param a - The first `TestMetrics` object.
 * @param b - The second `TestMetrics` object.
 * @returns A new `TestMetrics` object with combined values.
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

/**
 * Processes previous workflow run results and enriches the CTRF report with reliability metrics.
 *
 * @param inputs - The user-provided inputs for processing.
 * @param report - The current CTRF report to process.
 * @param githubContext - The GitHub context for the workflow run.
 * @returns A promise resolving to the updated CTRF report with processed metrics.
 */
export async function processPreviousResultsAndMetrics(
  inputs: Inputs,
  report: CtrfReport,
  githubContext: GitHubContext
): Promise<CtrfReport> {
  const workflowRuns = await fetchAllWorkflowRuns(
    context.repo.owner,
    context.repo.repo
  )

  const currentWorkflowRun = await fetchWorkflowRun(
    context.repo.owner,
    context.repo.repo,
    githubContext.run_id
  )

  const filteredRuns = filterWorkflowRuns(
    workflowRuns,
    githubContext,
    currentWorkflowRun
  )

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
