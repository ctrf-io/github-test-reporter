import { Report } from '../ctrf/core/types/ctrf'

/**
 * Calculates the average number of tests per run across all reports.
 *
 * @param report - The current report
 * @param previousReports - Array of previous reports
 * @returns The average number of tests per run, rounded to the nearest integer
 */
export function calculateAverageTestsPerRun(
  report: Report,
  previousReports: Report[]
): Report {
  const totalTests =
    report.results.tests.length +
    previousReports.reduce((sum, r) => sum + r.results.summary.tests, 0)
  const averageTestsPerRun = Math.round(
    totalTests / (previousReports.length + 1)
  )
  if (!report.insights) {
    report.insights = {
      extra: {
        averageTestsPerRun
      }
    }
  } else {
    report.insights.extra = {
      ...report.insights.extra,
      averageTestsPerRun
    }
  }
  return report
}
