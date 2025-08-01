import { Inputs } from '../../src/types'
import type { Report } from 'ctrf'

/**
 * Determines if test names in the CTRF report should be prefixed based on the inputs.
 *
 * @param inputs - The user-provided inputs.
 * @returns `true` if test names should be prefixed, otherwise `false`.
 */
export function shouldPrefixTestNames(inputs: Inputs): boolean {
  return (
    inputs.useSuiteName && !inputs.suiteFoldedReport && !inputs.suiteListReport
  )
}

/**
 * Adds a prefix to each test name in the CTRF report based on the suite or file path.
 *
 * @param report - The CTRF report containing the tests to prefix.
 * @returns The updated CTRF report with prefixed test names.
 */
export function prefixTestNames(report: Report): Report {
  const workspacePath = process.env.GITHUB_WORKSPACE || ''

  report.results.tests = report.results.tests.map(test => {
    let prefix = ''

    if (test.suite) {
      prefix = test.suite
    } else if (test.filePath) {
      prefix = test.filePath.startsWith(workspacePath)
        ? test.filePath.slice(workspacePath.length)
        : test.filePath
    }

    test.name = prefix ? `${prefix} - ${test.name}` : test.name

    return test
  })

  return report
}
