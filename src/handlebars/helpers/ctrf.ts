import Handlebars from 'handlebars'
import * as core from '@actions/core'
import { Test } from 'ctrf'

// this can be removed, reports should use handlebars helpers instead

/**
 * Determines if there are any skipped, pending, or "other" tests in the given array.
 *
 * @example
 * In Handlebars:
 * {{#if (anySkippedTests tests)}}Some tests were skipped{{else}}No skips{{/if}}
 *
 * @param {Test[]} tests - An array of Test objects.
 * @returns {boolean} True if any test is skipped/pending/other, false otherwise.
 */
export function anySkippedTestsHelper(): void {
  Handlebars.registerHelper('anySkippedTests', (tests: Test[]) => {
    return tests.some(
      test =>
        test.status === 'skipped' ||
        test.status === 'pending' ||
        test.status === 'other'
    )
  })
}

// this is a built-in helper for this reporter - we need to decide how this can work with markdown reportd

/**
 * Gets the collapse-large-reports input value from GitHub Actions.
 *
 * @example
 * In Handlebars:
 * {{#if (getCollapseLargeReports)}}
 *   <details><summary>Tests</summary>
 *     <!-- content -->
 *   </details>
 * {{else}}
 *   <!-- content -->
 * {{/if}}
 *
 * @returns {boolean} True if collapse-large-reports is enabled, false otherwise.
 */
export function getCollapseLargeReportsHelper(): void {
  Handlebars.registerHelper('getCollapseLargeReports', () => {
    const input = core.getInput('collapse-large-reports')
    return input ? input.toLowerCase() === 'true' : false
  })
}
