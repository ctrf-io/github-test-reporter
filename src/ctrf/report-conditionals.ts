import {
  Inputs,
  ReportConditionals,
  PreviousResult,
  ReportInsightsExtra
} from '../../src/types'
import type { Report } from '../ctrf/core/types/ctrf'
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
export function addFooterDisplayFlags(report: Report, inputs: Inputs): Report {
  if (!report.extra) {
    report.extra = {} as Record<string, unknown>
  }

  if (!report.extra?.reportConditionals) {
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
    } as ReportConditionals
  } else {
    const conditionals = report.extra.reportConditionals as ReportConditionals
    conditionals.includeFailedReportCurrentFooter = false
    conditionals.includeFailedReportAllFooter = false
    conditionals.includeFlakyReportCurrentFooter = false
    conditionals.includeFlakyReportAllFooter = false
    conditionals.includeSkippedReportCurrentFooter = false
    conditionals.showSkippedReports = true
    conditionals.showFailedReports = true
    conditionals.showFlakyReports = true
  }

  const includesPreviousResults =
    ((report.extra?.previousResults as PreviousResult[])?.length ?? 0) > 0

  let numOfReportsEnabled = numberOfReportsEnabled(inputs)
  // If no reports are enabled, set to 5 to show default reports
  numOfReportsEnabled = numOfReportsEnabled === 0 ? 5 : numOfReportsEnabled

  const flakyThisRun = report.results.tests.some(test => test.flaky === true)
  const failsThisRun = report.results.summary.failed > 0

  const flakyAllRuns =
    ((report.insights?.extra as ReportInsightsExtra)?.totalAttemptsFlaky ?? 0) >
    0
  const failsAllRuns =
    ((report.insights?.extra as ReportInsightsExtra)?.totalResultsFailed ?? 0) >
    0

  const skippedThisRun = report.results.summary.skipped > 0
  const pendingThisRun = report.results.summary.pending > 0

  if (skippedThisRun === false && pendingThisRun === false) {
    const conditionals = report.extra.reportConditionals as ReportConditionals
    conditionals.includeSkippedReportCurrentFooter =
      isAnySkippedReportEnabled(inputs) && numOfReportsEnabled > 1
    if (numOfReportsEnabled > 1) {
      conditionals.showSkippedReports = false
    }
  }
  if (includesPreviousResults) {
    const conditionals = report.extra.reportConditionals as ReportConditionals
    conditionals.includeMeasuredOverFooter = true
    if (flakyAllRuns === false) {
      conditionals.includeFlakyReportAllFooter =
        isAnyFlakyOnlyReportEnabled(inputs) && numOfReportsEnabled > 1
      if (numOfReportsEnabled > 1) {
        conditionals.showFlakyReports = false
      }
    }
    if (failsAllRuns === false) {
      conditionals.includeFailedReportAllFooter =
        isAnyFailedOnlyReportEnabled(inputs) && numOfReportsEnabled > 1
      if (numOfReportsEnabled > 1) {
        conditionals.showFailedReports = false
      }
    }
    return report
  } else {
    if (flakyThisRun === false) {
      const conditionals = report.extra.reportConditionals as ReportConditionals
      conditionals.includeFlakyReportCurrentFooter =
        isAnyFlakyOnlyReportEnabled(inputs) && numOfReportsEnabled > 1
      if (numOfReportsEnabled > 1) {
        conditionals.showFlakyReports = false
      }
    }
    if (failsThisRun === false) {
      const conditionals = report.extra.reportConditionals as ReportConditionals
      conditionals.includeFailedReportCurrentFooter =
        isAnyFailedOnlyReportEnabled(inputs) && numOfReportsEnabled > 1
      if (numOfReportsEnabled > 1) {
        conditionals.showFailedReports = false
      }
    }
    return report
  }
}
