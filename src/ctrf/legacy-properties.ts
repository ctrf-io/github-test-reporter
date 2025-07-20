// TO BE REMOVED WHEN FULLY COMPATIBLE WITH CTRF LIBRARY

import { CtrfReport, CtrfTest } from 'src/types/ctrf'

export function enrichReportSummaryWithLegacyProperties(
  report: CtrfReport
): CtrfReport {
  report.results.summary.extra = {
    ...report.results.summary.extra,
    flakyRate: report.insights?.flakyRate?.current ?? 0,
    flakyRateChange: report.insights?.flakyRate?.current ?? 0,
    failRate: report.insights?.failRate?.current ?? 0,
    failRateChange: report.insights?.failRate?.change ?? 0,
    finalResults: (report.insights?.extra?.totalResults as number) ?? 0,
    finalFailures: (report.insights?.extra?.totalResultsFailed as number) ?? 0,
    result: report.results.summary.failed ? 'failed' : 'passed',
    reportsUsed: report.insights?.reportsAnalyzed ?? 0,
    averageTestsPerRun: Math.round(
      ((report.insights?.extra?.totalResults as number) ?? 0) /
        (report.insights?.reportsAnalyzed ?? 0)
    ),
    totalFlakyTests: (report.insights?.extra?.totalResultsFlaky as number) ?? 0,
    totalFailures: (report.insights?.extra?.totalResultsFailed as number) ?? 0,
    slowestTest:
      findSlowestTestByP95DurationLegacy(report.results.tests) ?? undefined
  }

  return report
}

function findSlowestTestByP95DurationLegacy(
  tests: CtrfTest[]
): { name: string; duration: number } | undefined {
  if (!tests.length) return undefined

  const testGroups = tests.reduce(
    (groups, test) => {
      const name = test.name
      if (!groups[name]) {
        groups[name] = []
      }
      groups[name].push(test.duration || 0)
      return groups
    },
    {} as Record<string, number[]>
  )

  const testP95Durations = Object.entries(testGroups).map(
    ([name, durations]) => ({
      name,
      duration: calculateP95Duration(durations)
    })
  )

  return testP95Durations.reduce((slowest, current) => {
    return current.duration > slowest.duration ? current : slowest
  }, testP95Durations[0])
}

function calculateP95Duration(durations: number[]): number {
  if (durations.length === 0) return 0
  const sortedDurations = [...durations].sort((a, b) => a - b)
  const p95Index = Math.ceil(durations.length * 0.95) - 1
  return sortedDurations[p95Index]
}
