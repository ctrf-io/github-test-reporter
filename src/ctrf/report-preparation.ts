import * as core from '@actions/core'
import { uploadArtifact } from '../client/github'
import { CtrfReport, GitHubContext, Inputs } from '../types'
import { readCtrfReports, writeReportToFile } from '../utils'
import {
  enrichCurrentReportWithRunDetails,
  groupTestsBySuiteOrFilePath,
  groupTestsByFile,
  prefixTestNames
} from './enrichers'
import { stripAnsiFromErrors } from './helpers'
import { processPreviousResultsAndMetrics } from './metrics'
import { convertJUnitToCTRFReport } from 'junit-to-ctrf'
import {
  numberOfReportsEnabled,
  isAnyFailedOnlyReportEnabled,
  isAnyFlakyOnlyReportEnabled,
  isAnySkippedReportEnabled
} from '../utils/report-utils'

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
  let report: CtrfReport | null
  core.startGroup(`📜 Preparing CTRF report`)
  if (hasJunitIntegration(inputs)) {
    core.info('JUnit integration detected')
    report = (await convertJUnitToCTRFReport(inputs.ctrfPath)) as CtrfReport
    if (!report) {
      throw new Error(`JUnit report not found at: ${inputs.ctrfPath}`)
    }
  } else {
    report = readCtrfReports(inputs.ctrfPath)
  }
  report = stripAnsiFromErrors(report)
  report = enrichCurrentReportWithRunDetails(report, githubContext)
  if (inputs.uploadArtifact) await uploadArtifact(inputs.artifactName, report)

  if (inputs.writeCtrfToFile) {
    writeReportToFile(inputs.writeCtrfToFile, report)
  }

  if (shouldGroupTests(inputs)) {
    report = groupTestsBySuiteOrFilePath(
      report,
      inputs.groupBy === 'suite' ? true : false
    )
  }

  if (inputs.fileReport) {
    report = groupTestsByFile(report)
  }

  core.endGroup()

  if (shouldProcessPreviousResults(inputs)) {
    report = await processPreviousResultsAndMetrics(
      inputs,
      report,
      githubContext
    )
  }

  core.startGroup(`📜 Further enriching CTRF report`)
  report = addFooterDisplayFlags(report, inputs)

  if (shouldPrefixTestNames(inputs)) {
    report = prefixTestNames(report)
  }

  if (inputs.writeCtrfToFile) {
    writeReportToFile(inputs.writeCtrfToFile, report)
  }
  core.endGroup()

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
    inputs.insightsReport ||
    inputs.slowestReport ||
    inputs.fetchPreviousResults
  )
}

/**
 * Determines if junit-to-ctrf integration is enabled and configured in the inputs.
 * This checks if there is a valid junit configuration in the integrationsConfig.
 *
 * @param inputs - The user-provided inputs.
 * @returns `true` if junit integration is configured, otherwise `false`.
 */
function hasJunitIntegration(inputs: Inputs): boolean {
  return Boolean(inputs.integrationsConfig?.['junit-to-ctrf'])
}

/**
 * Adds boolean flags to determine what to display for failed, flaky and skipped test reports.
 *
 * @param report - The CTRF report to enhance.
 * @param inputs - The user-provided inputs.
 * @returns The enhanced CTRF report with display flags.
 */
export function addFooterDisplayFlags(
  report: CtrfReport,
  inputs: Inputs
): CtrfReport {
  if (!report.results.summary.extra) {
    report.results.summary.extra = {
      flakyRate: 0,
      flakyRateChange: 0,
      failRate: 0,
      failRateChange: 0,
      finalResults: 0,
      finalFailures: 0,
      includeFailedReportCurrentFooter: false,
      includeFlakyReportCurrentFooter: false,
      includeFailedReportAllFooter: false,
      includeFlakyReportAllFooter: false,
      includeMeasuredOverFooter: false,
      includeSkippedReportCurrentFooter: false,
      includeSkippedReportAllFooter: false,
      showSkippedReports: true,
      showFailedReports: true,
      showFlakyReports: true
    }
  } else {
    report.results.summary.extra.includeFailedReportCurrentFooter = false
    report.results.summary.extra.includeFailedReportAllFooter = false
    report.results.summary.extra.includeFlakyReportCurrentFooter = false
    report.results.summary.extra.includeFlakyReportAllFooter = false
    report.results.summary.extra.includeSkippedReportCurrentFooter = false
    report.results.summary.extra.showSkippedReports = true
    report.results.summary.extra.showFailedReports = true
    report.results.summary.extra.showFlakyReports = true
  }

  const includesPreviousResults =
    (report.results.extra?.previousReports?.length ?? 0) > 0

  let numOfReportsEnabled = numberOfReportsEnabled(inputs)
  // If no reports are enabled, set to 5 to show default reports
  numOfReportsEnabled = numOfReportsEnabled === 0 ? 5 : numOfReportsEnabled

  const flakyThisRun = report.results.tests.some(test => test.flaky === true)
  const failsThisRun = report.results.summary.failed > 0

  const flakyAllRuns = (report.results.summary.extra.totalFlakyTests ?? 0) > 0
  const failsAllRuns = (report.results.summary.extra.finalFailures ?? 0) > 0

  const skippedThisRun = report.results.summary.skipped > 0

  if (skippedThisRun === false) {
    report.results.summary.extra.includeSkippedReportCurrentFooter =
      isAnySkippedReportEnabled(inputs) && numOfReportsEnabled > 1
    if (numOfReportsEnabled > 1) {
      report.results.summary.extra.showSkippedReports = false
    }
  }
  if (includesPreviousResults) {
    report.results.summary.extra.includeMeasuredOverFooter = true
    if (flakyAllRuns === false) {
      report.results.summary.extra.includeFlakyReportAllFooter =
        isAnyFlakyOnlyReportEnabled(inputs) && numOfReportsEnabled > 1
      if (numOfReportsEnabled > 1) {
        report.results.summary.extra.showFlakyReports = false
      }
    }
    if (failsAllRuns === false) {
      report.results.summary.extra.includeFailedReportAllFooter =
        isAnyFailedOnlyReportEnabled(inputs) && numOfReportsEnabled > 1
      if (numOfReportsEnabled > 1) {
        report.results.summary.extra.showFailedReports = false
      }
    }
    return report
  } else {
    if (flakyThisRun === false) {
      report.results.summary.extra.includeFlakyReportCurrentFooter =
        isAnyFlakyOnlyReportEnabled(inputs) && numOfReportsEnabled > 1
      if (numOfReportsEnabled > 1) {
        report.results.summary.extra.showFlakyReports = false
      }
    }
    if (failsThisRun === false) {
      report.results.summary.extra.includeFailedReportCurrentFooter =
        isAnyFailedOnlyReportEnabled(inputs) && numOfReportsEnabled > 1
      if (numOfReportsEnabled > 1) {
        report.results.summary.extra.showFailedReports = false
      }
    }
    return report
  }
}
