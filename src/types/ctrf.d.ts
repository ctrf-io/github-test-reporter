export interface CtrfReport {
  results: Results
}

export interface Results {
  tool: Tool
  summary: Summary
  tests: CtrfTest[]
  environment?: CtrfEnvironment
  extra?: Record<string, any>
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
  extra?: Record<string, any>
}

export interface CtrfTest {
  name: string
  status: CtrfTestState
  duration: number
  start?: number
  stop?: number
  suite?: string
  message?: string
  trace?: string
  line?: number
  ai?: string
  rawStatus?: string
  tags?: string[]
  type?: string
  filePath?: string
  retries?: number
  flaky?: boolean
  attempts?: CtrfTest[]
  browser?: string
  device?: string
  screenshot?: string
  parameters?: Record<string, any>
  steps?: Step[]
  extra?: Record<string, any>
}

export interface CtrfEnvironment {
  reportName?: string
  appName?: string
  appVersion?: string
  osPlatform?: string
  osRelease?: string
  osVersion?: string
  buildName?: string
  buildNumber?: string
  buildUrl?: string
  repositoryName?: string
  repositoryUrl?: string
  branchName?: string
  testEnvironment?: string
  extra?: Record<string, any>
}

export interface Tool {
  name: string
  version?: string
  extra?: Record<string, any>
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

export interface TestMetrics {
  totalAttempts: number
  flakyCount: number
  passedCount: number
  failedCount: number
  finalResults: number
  finalFailures: number
}

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
}

export interface EnhancedSummaryExtra {
  flakyRate: number
  flakyRateChange: number
  failRate: number
  failRateChange: number
  finalResults: number
  finalFailures: number
}
