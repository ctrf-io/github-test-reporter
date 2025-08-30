import { context } from '@actions/github'
import * as core from '@actions/core'
import {
  fetchWorkflowRun,
  fetchWorkflowRuns,
  processArtifactsFromRun
} from '../client/github'
import { isMatchingWorkflowRun } from '../github'
import { Inputs, GitHubContext } from '../types'
import { enrichReportWithInsights } from 'ctrf'
import type { Report } from 'ctrf'
import { storePreviousResults } from './previous-results'
import { storeSlowestTests } from './slowest-tests'
import { limitPreviousReports } from './helpers'
import { calculateAverageTestsPerRun } from './average-test-duration'
import { handleBaseline } from './handle-baseline'
import { enrichReportWithSummaryInsights } from './summary-insights'

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
  report: Report,
  githubContext: GitHubContext
): Promise<Report> {
  const MAX_PAGES = Math.ceil(inputs.maxWorkflowRunsToCheck / 100)
  const PAGE_SIZE = 100
  let completed = 0
  let page = 1
  const reports: Report[] = []
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

    let updatedReport = storePreviousResults(report, reports)

    updatedReport = limitPreviousReports(
      updatedReport,
      inputs.previousResultsMax
    )

    const { report: updatedReportWithBaseline, baselineReport } =
      handleBaseline(inputs, updatedReport, reports)
    updatedReport = updatedReportWithBaseline

    updatedReport = enrichReportWithInsights(
      updatedReport,
      reports,
      baselineReport ?? undefined
    )

    updatedReport = enrichReportWithSummaryInsights(
      updatedReport,
      reports,
      baselineReport ?? undefined
    )

    console.log(`Insights Summary: ${JSON.stringify(updatedReport.insights?.extra?.summary, null, 2)}`)

    updatedReport = storeSlowestTests(updatedReport)

    console.log(`Insights Summary after storing slowest tests: ${JSON.stringify(updatedReport.insights?.extra?.summary, null, 2)}`)


    updatedReport = calculateAverageTestsPerRun(updatedReport, reports)

    console.log(`Insights Summary after calculating average tests per run: ${JSON.stringify(updatedReport.insights?.extra?.summary, null, 2)}`)

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
