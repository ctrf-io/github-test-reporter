/**
 * Default order for reports when no custom order is specified.
 * This determines the sequence in which reports are displayed in the GitHub Actions summary.
 */
export const DEFAULT_REPORT_ORDER: string[] = [
  'summary-report',
  'github-report',
  'summary-delta-report',
  'previous-results-report',
  'insights-report',
  'failed-report',
  'fail-rate-report',
  'failed-folded-report',
  'flaky-report',
  'flaky-rate-report',
  'skipped-report',
  'ai-report',
  'pull-request-report',
  'commit-report',
  'slowest-report',
  'custom-report',
  'community-report',
  'test-report',
  'test-list-report',
  'suite-folded-report',
  'suite-list-report',
  'file-report'
] 