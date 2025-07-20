export interface CtrfReport {
  results: Results
  insights?: Insights
  extra?: Record<string, unknown>
}

export interface Results {
  tool: Tool
  summary: Summary
  tests: CtrfTest[]
  environment?: CtrfEnvironment
  extra?: EnhancedResultsExtra & Record<string, unknown>
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
  extra?: EnhancedSummaryExtra & Record<string, unknown>
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
  extra?: EnhancedTestExtra & Record<string, unknown>
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
  extra?: Record<string, unknown>
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
 * Enhanced extra fields for tests.
 * This extends the basic `extra` fields with additional metrics.
 */
export interface EnhancedTestExtra {
  totalAttempts: number
  flakyRate: number
  flakyRateChange: number
  passedCount: number
  failedCount: number
  failRate: number
  failRateChange: number
  finalResults: number
  finalFailures: number
  avgDuration?: number
}

/**
 * Enhanced extra fields for summary.
 */
export interface EnhancedSummaryExtra extends Record<string, unknown> {
  flakyRate: number
  flakyRateChange: number
  failRate: number
  failRateChange: number
  finalResults: number
  finalFailures: number
  duration?: number
  result?: string
  averageTestsPerRun?: number
  totalFlakyTests?: number
  totalFailures?: number
  reportsUsed?: number
  slowestTest?: {
    name: string
    duration: number
  }
  slowestTests?: CtrfTest[]
  includeFailedReportCurrentFooter?: boolean
  includeFlakyReportCurrentFooter?: boolean
  includeFailedReportAllFooter?: boolean
  includeFlakyReportAllFooter?: boolean
  includeMeasuredOverFooter?: boolean
  includeSkippedReportCurrentFooter?: boolean
  includeSkippedReportAllFooter?: boolean
  showSkippedReports?: boolean
  showFailedReports?: boolean
  showFlakyReports?: boolean
}

/**
 * Enhanced results extra fields.
 */
export interface EnhancedResultsExtra {
  previousReports: EnhancedCtrfReport[]
}

/**
 * An enhanced CTRF report, which could be used for referencing previous reports.
 */
export interface EnhancedCtrfReport {
  results: Results
}
