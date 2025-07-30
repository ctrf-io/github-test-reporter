import { CtrfReport, Inputs } from '../../src/types'
import {
  numberOfReportsEnabled,
  isAnySkippedReportEnabled,
  isAnyFlakyOnlyReportEnabled,
  isAnyFailedOnlyReportEnabled
} from '../../src/utils'

/**
 * Adds boolean flags to determine what to display for failed, flaky and skipped test reports.
 *
 * @param report - The CTRF report to enhance.
 * @param inputs - The user-provided inputs.
 * @returns The enhanced CTRF report with display flags.
 */
export function addFooterDisplayFlags(
  report: CtrfReport,
  inputs: Inputs
): CtrfReport {
  if (!report.extra) {
    report.extra = {}
  }

  if (!report.extra.reportConditionals) {
    report.extra.reportConditionals = {
      includeFailedReportCurrentFooter: false,
      includeFlakyReportCurrentFooter: false,
      includeFailedReportAllFooter: false,
      includeFlakyReportAllFooter: false,
      includeMeasuredOverFooter: false,
      includeSkippedReportCurrentFooter: false,
      includeSkippedReportAllFooter: false,
      showSkippedReports: true,
      showFailedReports: true,
      showFlakyReports: true
    }
  } else {
    report.extra.reportConditionals.includeFailedReportCurrentFooter = false
    report.extra.reportConditionals.includeFailedReportAllFooter = false
    report.extra.reportConditionals.includeFlakyReportCurrentFooter = false
    report.extra.reportConditionals.includeFlakyReportAllFooter = false
    report.extra.reportConditionals.includeSkippedReportCurrentFooter = false
    report.extra.reportConditionals.showSkippedReports = true
    report.extra.reportConditionals.showFailedReports = true
    report.extra.reportConditionals.showFlakyReports = true
  }

  const includesPreviousResults =
    (report.extra?.previousResults?.length ?? 0) > 0

  let numOfReportsEnabled = numberOfReportsEnabled(inputs)
  // If no reports are enabled, set to 5 to show default reports
  numOfReportsEnabled = numOfReportsEnabled === 0 ? 5 : numOfReportsEnabled

  const flakyThisRun = report.results.tests.some(test => test.flaky === true)
  const failsThisRun = report.results.summary.failed > 0

  const flakyAllRuns = (report.insights?.extra?.totalFlakyTests ?? 0) > 0
  const failsAllRuns = (report.insights?.extra?.totalFailures ?? 0) > 0

  const skippedThisRun = report.results.summary.skipped > 0

  if (skippedThisRun === false) {
    report.extra.reportConditionals.includeSkippedReportCurrentFooter =
      isAnySkippedReportEnabled(inputs) && numOfReportsEnabled > 1
    if (numOfReportsEnabled > 1) {
      report.extra.reportConditionals.showSkippedReports = false
    }
  }
  if (includesPreviousResults) {
    report.extra.reportConditionals.includeMeasuredOverFooter = true
    if (flakyAllRuns === false) {
      report.extra.reportConditionals.includeFlakyReportAllFooter =
        isAnyFlakyOnlyReportEnabled(inputs) && numOfReportsEnabled > 1
      if (numOfReportsEnabled > 1) {
        report.extra.reportConditionals.showFlakyReports = false
      }
    }
    if (failsAllRuns === false) {
      report.extra.reportConditionals.includeFailedReportAllFooter =
        isAnyFailedOnlyReportEnabled(inputs) && numOfReportsEnabled > 1
      if (numOfReportsEnabled > 1) {
        report.extra.reportConditionals.showFailedReports = false
      }
    }
    return report
  } else {
    if (flakyThisRun === false) {
      report.extra.reportConditionals.includeFlakyReportCurrentFooter =
        isAnyFlakyOnlyReportEnabled(inputs) && numOfReportsEnabled > 1
      if (numOfReportsEnabled > 1) {
        report.extra.reportConditionals.showFlakyReports = false
      }
    }
    if (failsThisRun === false) {
      report.extra.reportConditionals.includeFailedReportCurrentFooter =
        isAnyFailedOnlyReportEnabled(inputs) && numOfReportsEnabled > 1
      if (numOfReportsEnabled > 1) {
        report.extra.reportConditionals.showFailedReports = false
      }
    }
    return report
  }
}
