import * as core from '@actions/core'
import { uploadArtifact } from '../client/github/index.js'
import { GitHubContext, Inputs } from '../types/index.js'
import type { CTRFReport } from 'ctrf'
import { readCtrfReports, writeReportToFile } from '../utils/index.js'
import {
  enrichCurrentReportWithRunDetails,
  removeTestDurations
} from './enrichers.js'
import { stripAnsiFromErrors } from './helpers.js'
import { processPreviousResultsAndMetrics } from './metrics.js'
import { convertJUnitToCTRFReport } from 'junit-to-ctrf'
import { addFooterDisplayFlags } from './report-conditionals.js'
import {
  prefixTestNames,
  shouldPrefixTestNames
} from './prefix-test-names-with-suite.js'
import { shouldProcessPreviousResults } from './previous-results.js'
import {
  groupTestsByFile,
  groupTestsBySuiteOrFilePath,
  shouldGroupTests
} from './group-test-results.js'
import { normalizeLegacyReport } from './adapter/normalize.js'

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
): Promise<CTRFReport> {
  let report: CTRFReport | null
  core.startGroup(`📜 Preparing CTRF report`)
  if (hasJunitIntegration(inputs)) {
    core.info('JUnit integration detected')
    const junitResult = await convertJUnitToCTRFReport(inputs.ctrfPath)
    if (junitResult === null) {
      throw new Error(`JUnit report not found at: ${inputs.ctrfPath}`)
    }
    report = normalizeLegacyReport(junitResult)
  } else {
    report = readCtrfReports(inputs.ctrfPath, inputs.exitOnNoFiles)
  }

  report = stripAnsiFromErrors(report)
  report = enrichCurrentReportWithRunDetails(report, githubContext)

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
    report = removeTestDurations(report)
  }

  core.startGroup(`📜 Further enriching CTRF report`)
  report = addFooterDisplayFlags(report, inputs)

  if (shouldPrefixTestNames(inputs)) {
    report = prefixTestNames(report)
  }

  if (inputs.writeCtrfToFile) {
    writeReportToFile(inputs.writeCtrfToFile, report)
  }
  if (inputs.uploadArtifact) await uploadArtifact(inputs.artifactName, report)
  core.endGroup()

  return report
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
