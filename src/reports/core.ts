import { join } from 'path';

export const BuiltInReports = {
  SummaryTable: join(__dirname, 'summary-table.hbs'),
  TestTable: join(__dirname, 'test-table.hbs'),
  TestList: join(__dirname, 'test-list.hbs'),
  FailedTable: join(__dirname, 'failed-table.hbs'),
  FailedFolded: join(__dirname, 'failed-folded.hbs'),
  FailRateTable: join(__dirname, 'fail-rate-table.hbs'),
  SkippedTable: join(__dirname, 'skipped-table.hbs'),
  FlakyTable: join(__dirname, 'flaky-table.hbs'),
  FlakyRateTable: join(__dirname, 'flaky-rate-table.hbs'),
  AiTable: join(__dirname, 'ai-table.hbs'),
  PreviousResultsTable: join(__dirname, 'previous-results-table.hbs'),
  PullRequest: join(__dirname, 'pull-request.hbs'),
  SuiteFolded: join(__dirname, 'suite-folded.hbs'),
  SuiteList: join(__dirname, 'suite-list.hbs')
} as const;