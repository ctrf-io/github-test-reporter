import * as core from '@actions/core'
import { uploadArtifact } from '../client/github'
import { CtrfReport, GitHubContext, Inputs } from '../types'
import { readCtrfReports, writeReportToFile } from '../utils'
import {
  enrichCurrentReportWithRunDetails,
  groupTestsBySuiteOrFilePath,
  prefixTestNames
} from './enrichers'
import { stripAnsiFromErrors } from './helpers'
import { processPreviousResultsAndMetrics } from './metrics'

/**
 * Prepares a CTRF report by applying various processing steps, including
 * enriching with GitHub context, grouping tests, prefixing test names,
 * and processing previous results.
 *
 * @param inputs - The user-provided inputs containing processing options and paths.
 * @param githubContext - The GitHub context for the workflow run.
 * @returns A promise resolving to the prepared CTRF report.
 */
export async function prepareReport(
  inputs: Inputs,
  githubContext: GitHubContext
): Promise<CtrfReport> {
  core.startGroup(`📜 Preparing CTRF report`)
  let report: CtrfReport = readCtrfReports(inputs.ctrfPath)
  report = stripAnsiFromErrors(report)
  report = enrichCurrentReportWithRunDetails(report, githubContext)
  if (inputs.uploadArtifact) await uploadArtifact(inputs.artifactName, report)
  if (inputs.writeCtrfToFile) writeReportToFile(inputs.writeCtrfToFile, report)

  if (shouldGroupTests(inputs)) {
    report = groupTestsBySuiteOrFilePath(
      report,
      inputs.groupBy === 'suite' ? true : false
    )
  }

  if (shouldPrefixTestNames(inputs)) {
    report = prefixTestNames(report)
  }
  core.endGroup()

  if (shouldProcessPreviousResults(inputs)) {
    report = await processPreviousResultsAndMetrics(
      inputs,
      report,
      githubContext
    )
  }

  return report
}

/**
 * Determines if the tests in the CTRF report should be grouped based on the inputs.
 *
 * @param inputs - The user-provided inputs.
 * @returns `true` if tests should be grouped, otherwise `false`.
 */
function shouldGroupTests(inputs: Inputs): boolean {
  return (
    inputs.alwaysGroupBy || inputs.suiteFoldedReport || inputs.suiteListReport
  )
}

/**
 * Determines if test names in the CTRF report should be prefixed based on the inputs.
 *
 * @param inputs - The user-provided inputs.
 * @returns `true` if test names should be prefixed, otherwise `false`.
 */
function shouldPrefixTestNames(inputs: Inputs): boolean {
  return (
    inputs.useSuiteName && !inputs.suiteFoldedReport && !inputs.suiteListReport
  )
}

/**
 * Determines if previous results should be processed and metrics added to the CTRF report
 * based on the inputs.
 *
 * @param inputs - The user-provided inputs.
 * @returns `true` if previous results should be processed, otherwise `false`.
 */
function shouldProcessPreviousResults(inputs: Inputs): boolean {
  return (
    inputs.previousResultsReport ||
    inputs.flakyRateReport ||
    inputs.failRateReport ||
    inputs.fetchPreviousResults
  )
}
