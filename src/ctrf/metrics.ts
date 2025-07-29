import { context } from '@actions/github'
import * as core from '@actions/core'
import {
  fetchWorkflowRun,
  fetchWorkflowRuns,
  processArtifactsFromRun
} from '../client/github'
import { isMatchingWorkflowRun } from '../github'
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
import { enrichReportWithInsights } from 'ctrf'
import { enrichReportSummaryWithLegacyProperties } from './legacy-properties'
import { storePreviousResults } from './previous-results'

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
    finalFailures: test.status === 'failed' ? 1 : 0
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
  const MAX_PAGES = Math.ceil(inputs.maxWorkflowRunsToCheck / 100)
  const PAGE_SIZE = 100
  let completed = 0
  let page = 1
  const reports: CtrfReport[] = []
  let totalRunsChecked = 0

  core.startGroup(`⏮️ Processing previous results`)
  core.debug(
    `Configuration: previousResultsMax=${inputs.previousResultsMax}, maxWorkflowRunsToCheck=${inputs.maxWorkflowRunsToCheck}, maxPreviousRunsToFetch=${inputs.maxPreviousRunsToFetch}`
  )
  core.debug(`Artifact name to process: ${inputs.artifactName}`)
  core.info(`Starting workflow runs processing...`)
  try {
    const currentWorkflowRun = await fetchWorkflowRun(
      context.repo.owner,
      context.repo.repo,
      githubContext.run_id
    )
    core.debug(
      `Current workflow details - ID: ${currentWorkflowRun.id}, Name: ${currentWorkflowRun.name}, Run #: ${currentWorkflowRun.run_number}`
    )

    while (completed < inputs.maxPreviousRunsToFetch) {
      core.debug(
        `Pagination: Current page ${page}, Completed reports ${completed}/${inputs.maxPreviousRunsToFetch}, Total runs checked: ${totalRunsChecked}/${inputs.maxWorkflowRunsToCheck}`
      )

      const workflowRuns = await fetchWorkflowRuns(
        context.repo.owner,
        context.repo.repo,
        PAGE_SIZE,
        page,
        currentWorkflowRun.workflow_id
      )
      if (workflowRuns.length === 0) {
        core.debug(`No workflow runs found for page ${page}`)
        break
      }

      core.debug(
        `Processing ${workflowRuns.length} workflow runs from page ${page}`
      )
      for (const run of workflowRuns) {
        totalRunsChecked++
        if (totalRunsChecked > inputs.maxWorkflowRunsToCheck) {
          core.info(
            `Reached maximum workflow runs limit (${inputs.maxWorkflowRunsToCheck} runs)`
          )
          break
        }

        core.debug(
          `Checking if run ${run.id} matches current workflow run ${currentWorkflowRun.id}`
        )
        if (run.id === currentWorkflowRun.id) {
          core.debug(
            `Run ${run.id} is the same as the current workflow run ${currentWorkflowRun.id}, skipping`
          )
          continue
        }
        const isMatching = isMatchingWorkflowRun(
          run,
          githubContext,
          currentWorkflowRun
        )
        core.debug(
          `Run ${run.id}: ${run.name} ${run.run_number} is ${isMatching ? 'matching' : 'not matching'} ${currentWorkflowRun.id}: ${currentWorkflowRun.name} ${currentWorkflowRun.run_number}`
        )
        if (isMatching) {
          core.debug(`Attempting to process artifacts for run ${run.id}`)
          try {
            const artifacts = await processArtifactsFromRun(
              run,
              inputs.artifactName
            )
            core.debug(
              `Retrieved ${artifacts.length} artifacts from run ${run.id}`
            )
            reports.push(...artifacts)
            completed = reports.length
            core.debug(`Processed report from run ${run.id}`)
            core.debug(`Processed ${completed} reports in total`)
          } catch (error) {
            core.debug(
              `Error processing artifacts for run ${run.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
            )
            core.info(
              `Skipping artifact processing for run ${run.id} due to an error`
            )
            continue
          }
        }
        if (
          completed >= inputs.maxPreviousRunsToFetch ||
          totalRunsChecked >= inputs.maxWorkflowRunsToCheck
        ) {
          core.debug(
            `Processed ${completed + 1} reports (max: ${inputs.maxPreviousRunsToFetch}), checked ${totalRunsChecked} runs (max: ${inputs.maxWorkflowRunsToCheck}), breaking`
          )
          break
        }
      }

      page++
      if (
        page > MAX_PAGES ||
        totalRunsChecked >= inputs.maxWorkflowRunsToCheck
      ) {
        core.info(
          `Reached maximum limit (${MAX_PAGES} pages, ${inputs.maxWorkflowRunsToCheck} workflow runs)`
        )
        break
      }
    }
    let updatedReport = addPreviousReportsToCurrentReport(reports, report)

    updatedReport = processTestReliabilityMetrics(
      updatedReport,
      reports,
      inputs.metricsReportsMax
    )
    // @ts-expect-error - types are not compatible with ctrf library but structure is
    updatedReport = enrichReportWithInsights(
      // @ts-expect-error - types are not compatible with ctrf library but structure is
      updatedReport,
      reports,
      inputs.baseline
    )

    // @ts-expect-error - types are not compatible with ctrf library but structure is
    updatedReport = storePreviousResults(updatedReport, reports)

    // TODO remove this once we have a proper way to store previous results
    if (updatedReport.results.extra?.previousReports) {
      updatedReport.results.extra.previousReports = []
    }

    updatedReport = enrichReportSummaryWithLegacyProperties(updatedReport)

    core.info(
      `Successfully processed ${reports.length + 1} reports from ${totalRunsChecked} workflow runs`
    )
    core.endGroup()
    return updatedReport
  } catch (error) {
    core.endGroup()

    if (
      error instanceof Error &&
      error.message.includes('GitHub token is required to authenticate Octokit')
    ) {
      core.warning(
        `${error.message}\n` +
          'Unable to fetch previous test results - this is likely a permissions issue.\n' +
          'To enable previous results and test metrics, you need to:\n' +
          '1. Set the GITHUB_TOKEN environment variable, or\n' +
          '2. Use the default GitHub Actions token: "${{ secrets.GITHUB_TOKEN }}"\n\n' +
          'Add this to your workflow file:\n\n' +
          'jobs:\n' +
          '  test:\n' +
          '    runs-on: ubuntu-latest\n' +
          '    permissions:\n' +
          '      actions: read\n' +
          '      contents: read\n\n' +
          'See documentation: https://docs.github.com/en/actions/security-for-github-actions/security-guides/automatic-token-authentication#permissions-for-the-github_token\n\n' +
          'The token is needed to access workflow runs and artifacts from previous test executions.\n' +
          'Without it, the action will skip previous results processing and only generate reports from the current run.'
      )

      return report
    }

    throw error
  }
}
