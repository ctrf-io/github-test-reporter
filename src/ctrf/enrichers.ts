import { GitHubContext } from '../types'
import { Report } from 'ctrf'
import * as core from '@actions/core'

/**
 * Enriches the current CTRF report with details from the GitHub Actions context.
 *
 * @param report - The CTRF report to enrich.
 * @param run - The GitHub context details to use for enrichment.
 * @returns The updated CTRF report with enriched run details.
 */
export function enrichCurrentReportWithRunDetails(
  report: Report,
  run: GitHubContext
): Report {
  const extendedReport = report

  extendedReport.results.environment = extendedReport.results.environment ?? {}

  if (!extendedReport.results.environment.buildName) {
    extendedReport.results.environment.buildName = run.job
  }
  if (!extendedReport.results.environment.buildNumber) {
    extendedReport.results.environment.buildNumber = run.run_number.toString()
  }
  if (!extendedReport.results.environment.buildUrl) {
    extendedReport.results.environment.buildUrl = run.build_url
  }

  if (!extendedReport.results.environment.buildId) {
    extendedReport.results.environment.buildId = run.run_id.toString()
  }

  if (!extendedReport.results.environment.branchName) {
    extendedReport.results.environment.branchName =
      run.ref?.replace('refs/heads/', '') || ''
  }

  return extendedReport
}

/**
 * Enriches a CTRF report with details from a GitHub Actions workflow run.
 *
 * @param report - The CTRF report to enrich.
 * @param run - The GitHub Actions workflow run details.
 * @returns The updated CTRF report with enriched run details.
 */
export function enrichPreviousReportWithRunDetails(
  report: Report,
  run: import('@octokit/openapi-types').components['schemas']['workflow-run']
): Report {
  const extendedReport = report

  core.debug(`enriching ${run.id} / ${run.html_url}`)

  extendedReport.results.environment = extendedReport.results.environment ?? {}

  extendedReport.results.environment.buildId = run.id.toString()
  extendedReport.results.environment.buildNumber = run.run_number.toString()
  extendedReport.results.environment.buildUrl = run.html_url
  extendedReport.results.environment.buildName =
    run.name == null ? undefined : run.name

  return extendedReport
}

/**
 * Removes the test.extra.durations property from each test if it exists.
 *
 * @param report - The CTRF report to process.
 * @returns The updated CTRF report with durations removed from test extras.
 */
export function removeTestDurations(report: Report): Report {
  const updatedReport = { ...report }

  if (updatedReport.results.tests) {
    updatedReport.results.tests = updatedReport.results.tests.map(test => {
      const updatedTest = { ...test }

      if (updatedTest.insights?.extra?.durations) {
        delete updatedTest.insights.extra.durations
      }

      return updatedTest
    })
  }

  return updatedReport
}
