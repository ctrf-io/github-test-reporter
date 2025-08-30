import type { Report, Summary, InsightsMetric } from 'ctrf'

export function enrichReportWithSummaryInsights(
  report: Report,
  previousReports: Report[],
  baselineReport?: Report
): Report {
  if (!baselineReport || previousReports.length === 0) {
    return report
  }

  if (!report.insights) report.insights = {}
  if (!report.insights.extra) report.insights.extra = {}
  if (!report.insights.extra.summary) report.insights.extra.summary = {}

  const currentSummary: Summary = report.results.summary
  const baselineSummary: Summary = baselineReport.results.summary

  const insightsSummary: {
    passed: InsightsMetric
    failed: InsightsMetric
    skipped: InsightsMetric
    pending: InsightsMetric
    other: InsightsMetric
    tests: InsightsMetric
    suites: InsightsMetric
    duration: InsightsMetric
  } = {
    passed: {
      current: currentSummary.passed ?? 0,
      baseline: baselineSummary.passed ?? 0,
      change: (currentSummary.passed ?? 0) - (baselineSummary.passed ?? 0)
    },
    failed: {
      current: currentSummary.failed ?? 0,
      baseline: baselineSummary.failed ?? 0,
      change: (currentSummary.failed ?? 0) - (baselineSummary.failed ?? 0)
    },
    skipped: {
      current: currentSummary.skipped ?? 0,
      baseline: baselineSummary.skipped ?? 0,
      change: (currentSummary.skipped ?? 0) - (baselineSummary.skipped ?? 0)
    },
    pending: {
      current: currentSummary.pending ?? 0,
      baseline: baselineSummary.pending ?? 0,
      change: (currentSummary.pending ?? 0) - (baselineSummary.pending ?? 0)
    },
    other: {
      current: currentSummary.other ?? 0,
      baseline: baselineSummary.other ?? 0,
      change: (currentSummary.other ?? 0) - (baselineSummary.other ?? 0)
    },
    tests: {
      current: currentSummary.tests ?? 0,
      baseline: baselineSummary.tests ?? 0,
      change: (currentSummary.tests ?? 0) - (baselineSummary.tests ?? 0)
    },
    suites: {
      current: currentSummary.suites ?? 0,
      baseline: baselineSummary.suites ?? 0,
      change: (currentSummary.suites ?? 0) - (baselineSummary.suites ?? 0)
    },
    duration: {
      current: currentSummary.stop - currentSummary.start,
      baseline: baselineSummary.stop - baselineSummary.start,
      change:
        currentSummary.stop -
        currentSummary.start -
        (baselineSummary.stop - baselineSummary.start)
    }
  }

  report.insights.extra.summary = insightsSummary

  return report
}
