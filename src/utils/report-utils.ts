import { Inputs } from '../types'

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
