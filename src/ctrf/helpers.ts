import type { Report, TestStatus } from 'ctrf'
import type { ReportExtra } from '../types/ctrf'

/**
 * Normalizes a test suite value, handling both legacy string format and new array format.
 * Joins array elements with ' > ' separator for backward compatibility.
 *
 * @param suite - The test suite value (string, array of strings, or undefined).
 * @param separator - The separator to use when joining array elements (default: ' > ').
 * @returns A normalized string representation of the suite, or undefined if suite is undefined.
 */
export function normalizeSuite(
  suite: string | string[] | undefined,
  separator = ' > '
): string | undefined {
  if (!suite) {
    return undefined
  }

  if (Array.isArray(suite)) {
    return suite.join(separator)
  }

  return suite
}

/**
 * Limits the number of previous reports included in the `results.extra.previousReports`
 * property of the CTRF report to a specified maximum.
 *
 * @param report - The CTRF report to modify.
 * @param maxPreviousReports - The maximum number of previous reports to include.
 * @returns The updated CTRF report with the limited number of previous reports.
 */
export function limitPreviousReports(
  report: Report,
  maxPreviousReports: number
): Report {
  if (!report.extra?.previousResults || maxPreviousReports <= 0) {
    return report
  }

  const extra = report.extra as ReportExtra
  extra.previousResults = extra.previousResults?.slice(
    0,
    maxPreviousReports - 1
  )

  return report
}

/**
 * Retrieves an emoji representation for a given test state or category.
 *
 * @param status - The test state or category to get an emoji for.
 * @returns The emoji corresponding to the test state or category.
 */
export function getEmoji(
  status:
    | TestStatus
    | 'flaky'
    | 'tests'
    | 'build'
    | 'duration'
    | 'result'
    | 'warning'
): string {
  switch (status) {
    case 'passed':
      return '✅'
    case 'failed':
      return '❌'
    case 'skipped':
      return '⏭️'
    case 'pending':
      return '⏳'
    case 'other':
      return '❓'
    case 'build':
      return '🏗️'
    case 'duration':
      return '⏱️'
    case 'flaky':
      return '🍂'
    case 'tests':
      return '📝'
    case 'result':
      return '🧪'
    case 'warning':
      return '⚠️'
    default:
      return '❓'
  }
}

/**
 * Strips ANSI escape codes from a given string.
 *
 * @param message - The string from which ANSI escape codes will be removed.
 * @returns The string with ANSI escape codes removed.
 * @throws {TypeError} If the input is not a string.
 */
export function stripAnsi(message: string): string {
  if (typeof message !== 'string') {
    throw new TypeError(`Expected a \`string\`, got \`${typeof message}\``)
  }

  return message.replace(ansiRegex(), '')
}

/**
 * Strips ANSI escape codes from the error messages and traces of all tests in a CTRF report.
 *
 * @param report - The CTRF report containing tests with error messages or traces.
 * @returns The updated CTRF report with ANSI codes removed from test messages and traces.
 */
export function stripAnsiFromErrors(report: Report): Report {
  if (!report?.results?.tests) {
    return report
  }

  report.results.tests.forEach(test => {
    if (test.message) {
      test.message = stripAnsi(test.message)
    }
    if (test.trace) {
      test.trace = stripAnsi(test.trace)
    }
  })

  return report
}

/**
 * Returns a regular expression for matching ANSI escape codes.
 *
 * @param options - An optional object specifying whether to match only the first occurrence.
 * @param options.onlyFirst - If true, matches only the first occurrence of an ANSI code.
 * @returns A regular expression for matching ANSI escape codes.
 */
export function ansiRegex({ onlyFirst = false } = {}): RegExp {
  const pattern = [
    '[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)',
    '(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))'
  ].join('|')

  return new RegExp(pattern, onlyFirst ? undefined : 'g')
}

/**
 * Retrieves a GitHub octicon URL for a given test state or category.
 *
 * @param status - The test state or category to get an octicon for.
 * @param color - Optional color for the icon (hex code without #).
 * @returns The GitHub octicon URL.
 */
export function getGitHubIcon(
  status:
    | TestStatus
    | 'flaky'
    | 'tests'
    | 'build'
    | 'duration'
    | 'result'
    | 'warning'
    | 'stats'
    | 'link'
    | 'report'
    | 'commit'
    | 'info'
    | 'git-pull-request'
    | 'beaker'
    | 'clock'
): string {
  const iconNames: Record<string, string> = {
    passed: 'check-circle',
    failed: 'stop',
    skipped: 'skip',
    pending: 'hourglass',
    other: 'question',
    build: 'workflow',
    duration: 'clock',
    flaky: 'alert',
    tests: 'checklist',
    result: 'beaker',
    warning: 'alert',
    stats: 'pulse',
    link: 'link-external',
    report: 'package',
    commit: 'git-pull-request',
    info: 'info'
  }

  const iconName = iconNames[status] || 'question'

  return `https://ctrf.io/assets/github/${iconName}.svg`
}
