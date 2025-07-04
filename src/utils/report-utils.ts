import { Inputs, CtrfReport } from '../types'
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
    'slowestReport'
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
  report: CtrfReport,
  outputName = 'report'
): { reportJson: string; isSafeToOutput: boolean } {
  const reportJson = JSON.stringify(report)
  const reportSizeBytes = Buffer.byteLength(reportJson, 'utf8')
  const reportSizeMB = (reportSizeBytes / (1024 * 1024)).toFixed(2)

  if (reportSizeBytes > 1000000) {
    // 1MB limit
    core.warning(
      `${outputName} is ${reportSizeMB}MB, which exceeds GitHub's 1MB output limit. ` +
        `Skipping ${outputName} output. Consider using write-ctrf-to-file instead.`
    )
    return { reportJson, isSafeToOutput: false }
  } else {
    return { reportJson, isSafeToOutput: true }
  }
}
