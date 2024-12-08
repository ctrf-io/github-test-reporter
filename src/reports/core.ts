import { join } from 'path';

export const BuiltInReports = {
  SummaryTable: join(__dirname, 'reports', 'summary-table.hbs'),
  TestTable: join(__dirname, 'reports', 'test-table.hbs'),
  TestList: join(__dirname, 'reports', 'test-list.hbs'),
  FailedTable: join(__dirname, 'reports', 'failed-table.hbs'),
  FailedFolded: join(__dirname, 'reports', 'failed-folded.hbs'),
  FailRateTable: join(__dirname, 'reports', 'fail-rate-table.hbs'),
  SkippedTable: join(__dirname, 'reports', 'skipped-table.hbs'),
  FlakyTable: join(__dirname, 'reports', 'flaky-table.hbs'),
  FlakyRateTable: join(__dirname, 'reports', 'flaky-rate-table.hbs'),
  AiTable: join(__dirname, 'reports', 'ai-table.hbs'),
  PreviousResultsTable: join(__dirname, 'reports', 'previous-results-table.hbs'),
  PullRequest: join(__dirname, 'reports', 'pull-request.hbs'),
  SuiteFolded: join(__dirname, 'reports', 'suite-folded.hbs'),
  SuiteList: join(__dirname, 'reports', 'suite-list.hbs')
} as const;
