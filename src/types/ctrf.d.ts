export interface SummaryExtra {
  duration?: number
}

export interface ReportInsightsExtra {
  totalFlakyTests?: number
  totalFailures?: number
  averageTestsPerRun?: number
}

export interface ReportExtra {
  reportConditionals?: ReportConditionals
  previousResults?: PreviousResult[]
}

export interface ExtraTestMetrics {
  totalAttempts: number
  flakyCount: number
  passedCount: number
  failedCount: number
  finalResults: number
  finalFailures: number
}

export interface ReportConditionals {
  includeFailedReportCurrentFooter: boolean
  includeFlakyReportCurrentFooter: boolean
  includeFailedReportAllFooter: boolean
  includeFlakyReportAllFooter: boolean
  includeMeasuredOverFooter: boolean
  includeSkippedReportCurrentFooter: boolean
  includeSkippedReportAllFooter: boolean
  showSkippedReports: boolean
  showFailedReports: boolean
  showFlakyReports: boolean
}

export interface PreviousResult {
  start: number
  stop: number
  buildId?: string
  buildName?: string
  buildNumber?: string
  buildUrl?: string
  result: string
  tests: number
  passed: number
  failed: number
  skipped: number
  flaky: number
  other: number
  duration: number
}

export interface SlowestTest {
  name: string
  totalResults: number
  totalResultsFailed: number
  totalResultsPassed: number
  averageTestDuration: number
  averageTestDurationChange: number
  p95TestDuration: number
  p95TestDurationChange: number
}

export interface ExtraBaseline {
  buildId?: string
  buildNumber?: string
  buildName?: string
}
