import Handlebars from 'handlebars'
import * as core from '@actions/core'

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
