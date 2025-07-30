import { CtrfReport, GitHubContext } from '../types'

// /**
//  * Calculates the average number of tests per run across all reports.
//  *
//  * @param currentTests - The number of tests in the current report
//  * @param previousReports - Array of previous reports
//  * @param reportsUsed - Number of historical reports used
//  * @returns The average number of tests per run, rounded to the nearest integer
//  */
// function calculateAverageTestsPerRun(
//   currentTests: number,
//   previousReports: CtrfReport[],
//   reportsUsed: number
// ): number {
//   const totalTests =
//     currentTests +
//     previousReports.reduce((sum, r) => sum + r.results.summary.tests, 0)
//   return Math.round(totalTests / (reportsUsed + 1))
// }

// // TODO remove this function
// /**
//  * Enriches a CTRF report with details from a GitHub Actions workflow run.
//  *
//  * @param report - The CTRF report to enrich.
//  * @param run - The GitHub Actions workflow run details.
//  * @returns The updated CTRF report with enriched run details.
//  */
// export function enrichReportWithRunDetails(report: CtrfReport): CtrfReport {
//   const extendedReport = report

//   extendedReport.results.environment = extendedReport.results.environment ?? {}

//   return extendedReport
// }

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
