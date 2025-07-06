import { join } from 'path';
import { existsSync } from 'fs';

const basePath = getBasePath('reports');

export const BuiltInReports = {
  SummaryTable: join(basePath, 'summary-table.hbs'),
  TestTable: join(basePath, 'test-table.hbs'),
  TestList: join(basePath, 'test-list.hbs'),
  FailedTable: join(basePath, 'failed-table.hbs'),
  FailedFolded: join(basePath, 'failed-folded.hbs'),
  FailRateTable: join(basePath, 'fail-rate-table.hbs'),
  SkippedTable: join(basePath, 'skipped-table.hbs'),
  FlakyTable: join(basePath, 'flaky-table.hbs'),
  FlakyRateTable: join(basePath, 'flaky-rate-table.hbs'),
  AiTable: join(basePath, 'ai-table.hbs'),
  PreviousResultsTable: join(basePath, 'previous-results-table.hbs'),
  PullRequest: join(basePath, 'pull-request.hbs'),
  SuiteFolded: join(basePath, 'suite-folded.hbs'),
  SuiteList: join(basePath, 'suite-list.hbs'),
  CommitTable: join(basePath, 'commit-table.hbs'),
  InsightsTable: join(basePath, 'insights-table.hbs'),
  SlowestTable: join(basePath, 'slowest-table.hbs'),
  GitHub: join(basePath, 'github.hbs'),
  FileTable: join(basePath, 'file-table.hbs')
} as const;

export function getBasePath(report: 'reports'|'community-reports'): string {
  const runMode = process.env.RUN_MODE || 'cli';

  if (runMode === 'cli') {
    return __dirname;
  }

  const actionPath = join(__dirname, report);
  if (existsSync(actionPath)) {
    return actionPath;
  }

  throw new Error(`Invalid RUN_MODE: ${runMode}. Could not resolve the base path.`);
}
