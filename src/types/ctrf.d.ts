export interface CtrfReport {
  results: Results
  insights?: Insights
  extra?: ReportExtra
}

export interface Results {
  tool: Tool
  summary: Summary
  tests: CtrfTest[]
  environment?: CtrfEnvironment
  extra?: Record<string, unknown>
}

export interface Summary {
  tests: number
  passed: number
  failed: number
  skipped: number
  pending: number
  other: number
  suites?: number
  start: number
  stop: number
  extra?: Record<string, unknown>
}

export interface CtrfTest {
  id?: string
  name: string
  status: CtrfTestState
  duration: number
  start?: number
  stop?: number
  suite?: string
  message?: string
  trace?: string
  snippet?: string
  line?: number
  ai?: string
  rawStatus?: string
  tags?: string[]
  type?: string
  filePath?: string
  retries?: number
  flaky?: boolean
  stdout?: string[]
  stderr?: string[]
  threadId?: string
  attachments?: Attachment[]
  retryAttempts?: RetryAttempts[]
  browser?: string
  device?: string
  screenshot?: string
  parameters?: Record<string, unknown>
  steps?: Step[]
  insights?: TestInsights
  extra?: Record<string, unknown>
}

export interface CtrfEnvironment {
  reportName?: string
  appName?: string
  appVersion?: string
  osPlatform?: string
  osRelease?: string
  osVersion?: string
  buildId?: string
  buildName?: string
  buildNumber?: string
  buildUrl?: string
  repositoryName?: string
  repositoryUrl?: string
  commit?: string
  branchName?: string
  testEnvironment?: string
  extra?: Record<string, unknown>
}

export interface Tool {
  name: string
  version?: string
  extra?: Record<string, unknown>
}

export interface Attachment {
  name: string
  contentType: string
  path: string
}

export interface RetryAttempts {
  retry: number
  status: TestState
  rawStatus?: string
  duration?: number
  message?: string
  trace?: string
  snippet?: string
  line?: number
  stdout?: string[]
  stderr?: string[]
  start?: number
  stop?: number
  attachments?: Attachment[]
  extra?: Record<string, unknown>
}

export interface Insights {
  flakyRate: InsightsMetric
  failRate: InsightsMetric
  skippedRate: InsightsMetric
  averageTestDuration: InsightsMetric
  averageRunDuration: InsightsMetric
  reportsAnalyzed: number
  extra?: ReportInsightsExtra & Record<string, unknown>
}

export interface TestInsights {
  flakyRate: InsightsMetric
  failRate: InsightsMetric
  skippedRate: InsightsMetric
  averageTestDuration: InsightsMetric
  p95Duration: InsightsMetric
  appearsInRuns: number
  extra?: Record<string, unknown>
}

export interface InsightsMetric {
  current: number
  previous: number
  change: number
}

export interface Step {
  name: string
  status: CtrfTestState
}

export type CtrfTestState =
  | 'passed'
  | 'failed'
  | 'skipped'
  | 'pending'
  | 'other'

/**
 * Metrics interfaces
 */
export interface TestMetrics {
  totalAttempts: number
  flakyCount: number
  passedCount: number
  failedCount: number
  finalResults: number
  finalFailures: number
}

/**
 * An enhanced CTRF report, which could be used for referencing previous reports.
 */
export interface EnhancedCtrfReport {
  results: Results
}

export interface ReportInsightsExtra {
  totalFlakyTests: number
  totalFailures: number
}

/**
 * Report extra fields.
 */
export interface ReportExtra {
  reportConditionals?: ReportConditionals
  previousResults?: PreviousResult[]
}

/**
 * Interface for a previous result entry stored in the current report
 */
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

/**
 * Report conditionals used for rendering logic.
 */
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

/**
 * Interface for a slowest test entry stored in the current report
 */
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
