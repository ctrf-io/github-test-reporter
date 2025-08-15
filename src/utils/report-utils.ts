import { Inputs } from '../types'
import { Report } from 'ctrf'
import * as core from '@actions/core'

/**
 * Converts a kebab-case report type (e.g., 'summary-report') to camelCase input property (e.g., 'summaryReport')
 *
 * @param reportType - The kebab-case report type
 * @returns The corresponding camelCase input property name or undefined if invalid
 */
export function reportTypeToInputKey(
  reportType: string
): keyof Inputs | undefined {
  if (!reportType.endsWith('-report')) {
    return undefined
  }

  try {
    const baseName = reportType.slice(0, -7)
    const camelCaseName = baseName.replace(
      /-([a-z])/g,
      (_: string, letter: string) => letter.toUpperCase()
    )
    const inputKey = `${camelCaseName}Report`

    if (isInputKey(inputKey)) {
      return inputKey
    }

    return undefined
  } catch {
    return undefined
  }
}

/**
 * Type guard to check if a string is a valid key of the Inputs interface
 *
 * @param key - The string to check
 * @returns Whether the string is a valid key of the Inputs interface
 */
function isInputKey(key: string): key is keyof Inputs {
  const validInputKeys: (keyof Inputs)[] = [
    'summaryReport',
    'githubReport',
    'failedReport',
    'failRateReport',
    'flakyReport',
    'flakyRateReport',
    'failedFoldedReport',
    'previousResultsReport',
    'aiReport',
    'skippedReport',
    'testReport',
    'testListReport',
    'suiteFoldedReport',
    'suiteListReport',
    'pullRequestReport',
    'commitReport',
    'customReport',
    'communityReport',
    'insightsReport',
    'slowestReport',
    'fileReport'
  ]

  return validInputKeys.includes(key as keyof Inputs)
}

/**
 * Checks if a CTRF report is within GitHub Actions output size limits and logs appropriate messages
 *
 * @param report - The CTRF report to check
 * @param outputName - The name of the output (for logging purposes)
 * @returns An object containing the JSON string and whether it's safe to output
 */
export function checkReportSize(
  report: Report,
  outputName = 'report'
): { reportJson: string; isSafeToOutput: boolean } {
  const reportJson = JSON.stringify(report)
  const reportSizeBytes = Buffer.byteLength(reportJson, 'utf8')
  const reportSizeMB = (reportSizeBytes / (1024 * 1024)).toFixed(2)

  if (reportSizeBytes > 1000000) {
    // 1MB limit
    core.info(
      `${outputName} is ${reportSizeMB}MB, which exceeds GitHub's 1MB output limit. ` +
        `Skipping ${outputName} output. Consider using write-ctrf-to-file instead.`
    )
    return { reportJson, isSafeToOutput: false }
  } else {
    return { reportJson, isSafeToOutput: true }
  }
}

/**
 * Checks if any failed test reports are enabled
 *
 * @param inputs - The user-provided inputs
 * @returns Whether any failed test reports are enabled
 */
export function isAnyFailedOnlyReportEnabled(inputs: Inputs): boolean {
  return (
    inputs.failedReport ||
    inputs.failedFoldedReport ||
    inputs.aiReport ||
    inputs.failRateReport
  )
}

/**
 * Checks if any flaky test reports are enabled
 *
 * @param inputs - The user-provided inputs
 * @returns Whether any flaky test reports are enabled
 */
export function isAnyFlakyOnlyReportEnabled(inputs: Inputs): boolean {
  return inputs.flakyReport || inputs.flakyRateReport
}

/**
 * Checks if any reports requiring previous results are enabled
 *
 * @param inputs - The user-provided inputs
 * @returns Whether any previous results reports are enabled
 */
export function isAnyPreviousResultsReportEnabled(inputs: Inputs): boolean {
  return (
    inputs.previousResultsReport ||
    inputs.insightsReport ||
    inputs.failRateReport ||
    inputs.flakyRateReport ||
    inputs.slowestReport
  )
}

/**
 * Checks if any skipped test reports are enabled
 *
 * @param inputs - The user-provided inputs
 * @returns Whether any skipped test reports are enabled
 */
export function isAnySkippedReportEnabled(inputs: Inputs): boolean {
  return inputs.skippedReport
}

/**
 * Checks if any reports are enabled
 *
 * @param inputs - The user-provided inputs
 * @returns Whether any reports are enabled
 */
export function isAnyReportEnabled(inputs: Inputs): boolean {
  return (
    inputs.summaryReport ||
    inputs.githubReport ||
    inputs.failedReport ||
    inputs.flakyReport ||
    inputs.flakyRateReport ||
    inputs.failedFoldedReport ||
    inputs.failRateReport ||
    inputs.previousResultsReport ||
    inputs.aiReport ||
    inputs.skippedReport ||
    inputs.testReport ||
    inputs.testListReport ||
    inputs.suiteFoldedReport ||
    inputs.suiteListReport ||
    inputs.pullRequestReport ||
    inputs.commitReport ||
    inputs.customReport ||
    inputs.communityReport ||
    inputs.insightsReport ||
    inputs.slowestReport ||
    inputs.fileReport
  )
}

export function numberOfReportsEnabled(inputs: Inputs): number {
  return (
    (inputs.summaryReport ? 1 : 0) +
    (inputs.githubReport ? 1 : 0) +
    (inputs.failedReport ? 1 : 0) +
    (inputs.flakyReport ? 1 : 0) +
    (inputs.flakyRateReport ? 1 : 0) +
    (inputs.failedFoldedReport ? 1 : 0) +
    (inputs.failRateReport ? 1 : 0) +
    (inputs.previousResultsReport ? 1 : 0) +
    (inputs.aiReport ? 1 : 0) +
    (inputs.skippedReport ? 1 : 0) +
    (inputs.testReport ? 1 : 0) +
    (inputs.testListReport ? 1 : 0) +
    (inputs.suiteFoldedReport ? 1 : 0) +
    (inputs.suiteListReport ? 1 : 0) +
    (inputs.pullRequestReport ? 1 : 0) +
    (inputs.commitReport ? 1 : 0) +
    (inputs.customReport ? 1 : 0) +
    (inputs.communityReport ? 1 : 0) +
    (inputs.insightsReport ? 1 : 0) +
    (inputs.slowestReport ? 1 : 0) +
    (inputs.fileReport ? 1 : 0)
  )
}
