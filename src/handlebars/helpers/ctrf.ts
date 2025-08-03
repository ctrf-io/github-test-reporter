import Handlebars from 'handlebars'
import { getEmoji, getGitHubIcon } from '../../ctrf/helpers'
import * as core from '@actions/core'
import { Test, TestStatus } from 'ctrf'

/**
 * Filters an array of tests to only those that have failed, then limits the result to a specified number.
 *
 * @example
 * In Handlebars:
 * {{#each (limitFailedTests tests 5)}}{{this.name}}{{/each}}
 *
 * This will loop through up to 5 failed tests.
 *
 * @param {Test[]} tests - An array of Test objects.
 * @param {number} limit - The maximum number of failed tests to return.
 * @returns {Test[]} An array of failed tests up to the specified limit.
 */
export function LimitFailedTests(): void {
  Handlebars.registerHelper(
    'limitFailedTests',
    (tests: Test[], limit: number) => {
      return tests.filter(test => test.status === 'failed').slice(0, limit)
    }
  )
}

/**
 * Checks if a number `a` is greater than number `b`.
 *
 * @example
 * In Handlebars:
 * {{#if (moreThan 10 5)}}Greater{{else}}Not Greater{{/if}}
 *
 * @param {number} a - The first number.
 * @param {number} b - The second number.
 * @returns {boolean} True if `a` > `b`, false otherwise.
 */
export function moreThanHelper(): void {
  Handlebars.registerHelper('moreThan', (a: number, b: number) => a > b)
}

/**
 * Counts how many tests are flaky.
 *
 * @example
 * In Handlebars:
 * Flaky tests count: {{countFlaky tests}}
 *
 * @param {Test[]} tests - An array of Test objects.
 * @returns {number} The number of flaky tests.
 */
export function countFlakyHelper(): void {
  Handlebars.registerHelper('countFlaky', tests => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return tests.filter((test: { flaky: boolean }) => test.flaky).length
  })
}

/**
 * Determines if there are any flaky tests in the given array.
 *
 * @example
 * In Handlebars:
 * {{#if (anyFlakyTests tests)}}Some tests are flaky{{else}}No flaky tests{{/if}}
 *
 * @param {Test[]} tests - An array of Test objects.
 * @returns {boolean} True if any test is flaky, false otherwise.
 */
export function anyFlakyTestsHelper(): void {
  Handlebars.registerHelper('anyFlakyTests', (tests: Test[]) => {
    return tests.some(test => test.flaky)
  })
}

/**
 * Determines if there are any failed tests in the given array.
 *
 * @example
 * In Handlebars:
 * {{#if (anyFailedTests tests)}}Some tests failed{{else}}No failures{{/if}}
 *
 * @param {Test[]} tests - An array of Test objects.
 * @returns {boolean} True if any test has failed, false otherwise.
 */
export function anyFailedTestsHelper(): void {
  Handlebars.registerHelper('anyFailedTests', (tests: Test[]) => {
    return tests.some(test => test.status === 'failed')
  })
}

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

/**
 * Formats a test duration given a start and stop time (in milliseconds) into a human-readable format.
 * Returns values like "1ms", "250ms", "1.2s", or "1m30s".
 *
 * @example
 * In Handlebars:
 * Duration: {{formatDuration test.startTime test.endTime}}
 *
 * @param {number} start - The start time in milliseconds.
 * @param {number} stop - The stop time in milliseconds.
 * @returns {string} A formatted duration string.
 */
export function formatDurationStartStopToHumanHelper(): void {
  Handlebars.registerHelper('formatDuration', (start: number, stop: number) => {
    if (start === 0 && stop === 0) {
      return 'not captured'
    }

    if (isNaN(start) || isNaN(stop)) {
      return 'not captured'
    }

    const durationMs = stop - start
    if (durationMs < 1) {
      return `1ms`
    } else if (durationMs < 1000) {
      return `${Math.floor(durationMs)}ms`
    } else if (durationMs < 60000) {
      return `${(durationMs / 1000).toFixed(1)}s`
    } else if (durationMs < 3600000) {
      const minutes = Math.floor(durationMs / 60000)
      const seconds = Math.floor((durationMs % 60000) / 1000)
      return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`
    } else {
      const hours = Math.floor(durationMs / 3600000)
      const minutes = Math.floor((durationMs % 3600000) / 60000)
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
    }
  })
}

/**
 * Formats a duration given in milliseconds into a human-readable format.
 * Similar to `formatDuration` but takes only one parameter.
 *
 * @example
 * In Handlebars:
 * {{formatDurationMs testDuration}}
 *
 * @param {number} duration - The duration in milliseconds.
 * @returns {string} A formatted duration string.
 */
export function formatDurationMsToHumanHelper(): void {
  Handlebars.registerHelper('formatDurationMs', (duration: number) => {
    if (isNaN(duration)) {
      return 'not captured'
    }

    if (duration < 1) {
      return `1ms`
    } else if (duration < 1000) {
      return `${Math.floor(duration)}ms`
    } else if (duration < 60000) {
      return `${(duration / 1000).toFixed(1)}s`
    } else {
      const minutes = Math.floor(duration / 60000)
      const seconds = Math.floor((duration % 60000) / 1000)
      return `${minutes}m${seconds}s`
    }
  })
}

/**
 * Checks if two values are equal.
 *
 * @example
 * In Handlebars:
 * {{#if (eq test.status "failed")}}This test failed{{/if}}
 *
 * @param {unknown} arg1 - The first value to compare.
 * @param {unknown} arg2 - The second value to compare.
 * @returns {boolean} True if values are strictly equal, false otherwise.
 */
export function equalsHelper(): void {
  Handlebars.registerHelper('eq', (arg1: unknown, arg2: unknown) => {
    return arg1 === arg2
  })
}

/**
 * Retrieves an emoji based on a given CTRF test state or other keywords like 'flaky', 'tests', 'build', 'duration', 'result'.
 *
 * @example
 * In Handlebars:
 * {{getCtrfEmoji "failed"}} might return a red cross emoji.
 *
 * @param {TestStatus | 'flaky' | 'tests' | 'build' | 'duration' | 'result'} emoji - The state or keyword.
 * @returns {string} An emoji character corresponding to the provided state.
 */
export function getEmojiHelper(): void {
  Handlebars.registerHelper(
    'getCtrfEmoji',
    (
      emoji: TestStatus | 'flaky' | 'tests' | 'build' | 'duration' | 'result'
    ) => {
      return getEmoji(emoji)
    }
  )
}

/**
 * Sorts tests by their flaky rate in descending order.
 *
 * @example
 * In Handlebars:
 * {{#each (sortTestsByFlakyRate tests)}}{{this.name}} - Flaky Rate: {{this.extra.flakyRate}}{{/each}}
 *
 * @param {Test[]} tests - An array of Test objects.
 * @returns {Test[]} A sorted array of tests that have a flaky rate, from highest to lowest.
 */
export function sortTestsByFlakyRateHelper(): void {
  Handlebars.registerHelper('sortTestsByFlakyRate', (tests: Test[]) => {
    const testsCopy = tests.slice()

    const flakyTests = testsCopy.filter(
      test =>
        test.insights &&
        typeof test.insights.flakyRate?.current === 'number' &&
        test.insights.flakyRate?.current > 0
    )

    flakyTests.sort(
      (a, b) =>
        (b.insights?.flakyRate?.current ?? 0) -
        (a.insights?.flakyRate?.current ?? 0)
    )

    return flakyTests
  })
}

/**
 * Sorts tests by their fail rate in descending order.
 *
 * @example
 * In Handlebars:
 * {{#each (sortTestsByFailRate tests)}}{{this.name}} - Fail Rate: {{this.extra.failRate}}{{/each}}
 *
 * @param {Test[]} tests - An array of Test objects.
 * @returns {Test[]} A sorted array of tests that have a fail rate, from highest to lowest.
 */
export function sortTestsByFailRateHelper(): void {
  Handlebars.registerHelper('sortTestsByFailRate', (tests: Test[]) => {
    const testsCopy = tests.slice()

    const failedTests = testsCopy.filter(
      test =>
        test.insights &&
        typeof test.insights.failRate?.current === 'number' &&
        test.insights.failRate?.current > 0
    )

    failedTests.sort(
      (a, b) =>
        (b.insights?.failRate?.current ?? 0) -
        (a.insights?.failRate?.current ?? 0)
    )

    return failedTests
  })
}

/**
 * Formats a numeric rate (e.g. fail rate, flaky rate) to a fixed number of decimal places.
 *
 * @example
 * In Handlebars:
 * {{formatRate 0.12345 2}} -> "0.12"
 *
 * @param {number} rate - The numeric rate to format.
 * @param {number} fractionDigits - The number of decimal places.
 * @returns {string} The formatted rate as a string.
 */
export function formatRateHelper(): void {
  Handlebars.registerHelper(
    'formatRate',
    (rate: number, fractionDigits: number) => {
      return rate.toFixed(fractionDigits)
    }
  )
}

/**
 * Retrieves a GitHub octicon for a given CTRF test state or other keywords.
 *
 * @example
 * In Handlebars:
 * {{getGitHubIcon "failed"}} might return a GitHub octicon for failed state.
 *
 * @param {TestStatus | 'flaky' | 'tests' | 'build' | 'duration' | 'result' | 'stats' | 'link' | 'report' | 'commit' | 'info'} icon - The state or keyword.
 * @param {string} color - Optional color for the icon (hex code without #).
 * @returns {string} A GitHub octicon HTML corresponding to the provided state.
 */
export function getGitHubIconHelper(): void {
  Handlebars.registerHelper(
    'getGitHubIcon',
    (
      icon:
        | TestStatus
        | 'flaky'
        | 'tests'
        | 'build'
        | 'duration'
        | 'result'
        | 'stats'
        | 'link'
        | 'report'
        | 'commit'
        | 'info'
    ) => {
      return new Handlebars.SafeString(getGitHubIcon(icon))
    }
  )
}

/**
 * Formats a test path by replacing spaces and ">" with GitHub arrow-right octoicon.
 * This makes test paths more readable in markdown.
 *
 * @example
 * In Handlebars:
 * {{formatTestPath "filename.ts > suiteone > suitetwo" "test name"}}
 * {{formatTestPath suite name}}
 *
 * @param {string} suite - The test suite path (may contain spaces or ">" as separators).
 * @param {string} name - The test name.
 * @returns {string} A formatted string with GitHub arrow-right icons between path segments.
 */
export function formatTestPathHelper(): void {
  Handlebars.registerHelper('formatTestPath', (suite: string, name: string) => {
    if (!suite) {
      return name
    }

    const normalizedPath = suite
      .replace(/\s*>\s*/g, '|')
      .replace(/\s*&gt;\s*/g, '|')
      .replace(/\s+/g, '|')

    const parts = normalizedPath.split('|').filter(Boolean)

    const formattedPath = parts
      .map(part => part.trim())
      .filter(Boolean)
      .join(' ![arrow-right](https://ctrf.io/assets/github/arrow-right.svg) ')

    return new Handlebars.SafeString(
      `${formattedPath} ![arrow-right](https://ctrf.io/assets/github/arrow-right.svg) ${name}`
    )
  })
}

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

/**
 * Formats a decimal rate (0-1) as a percentage to a fixed number of decimal places.
 * This is specifically for rates from the CTRF insights that are calculated as decimals.
 *
 * @example
 * In Handlebars:
 * {{formatDecimalRate 0.001 2}} -> "0.10" (for 0.1%)
 * {{formatDecimalRate 0.0525 2}} -> "5.25" (for 5.25%)
 *
 * @param {number} rate - The numeric rate as a decimal (0-1).
 * @param {number} fractionDigits - The number of decimal places.
 * @returns {string} The formatted rate as a string.
 */
export function formatDecimalRateHelper(): void {
  Handlebars.registerHelper(
    'formatDecimalRate',
    (rate: number, fractionDigits: number) => {
      return (rate * 100).toFixed(fractionDigits)
    }
  )
}
