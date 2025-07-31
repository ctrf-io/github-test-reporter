import { CtrfReport, GitHubContext } from '../types'

/**
 * Enriches the current CTRF report with details from the GitHub Actions context.
 *
 * @param report - The CTRF report to enrich.
 * @param run - The GitHub context details to use for enrichment.
 * @returns The updated CTRF report with enriched run details.
 */
export function enrichCurrentReportWithRunDetails(
  report: CtrfReport,
  run: GitHubContext
): CtrfReport {
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
