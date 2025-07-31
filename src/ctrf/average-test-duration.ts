import { CtrfReport } from "src/types"

/**
 * Calculates the average number of tests per run across all reports.
 *
 * @param report - The current report
 * @param currentTests - The number of tests in the current report
 * @param previousReports - Array of previous reports
 * @param reportsUsed - Number of historical reports used
 * @returns The average number of tests per run, rounded to the nearest integer
 */
function calculateAverageTestsPerRun(
    report: CtrfReport,
  currentTests: number,
  previousReports: CtrfReport[],
  reportsUsed: number
): CtrfReport {
  const totalTests =
    currentTests +
    previousReports.reduce((sum, r) => sum + r.results.summary.tests, 0)
  const averageTestsPerRun = Math.round(totalTests / (reportsUsed + 1))
  report.insights?.extra?.averageTestsPerRun ?? averageTestsPerRun
  return report
}