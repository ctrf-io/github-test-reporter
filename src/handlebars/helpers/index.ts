import { anySkippedTestsHelper, getCollapseLargeReportsHelper } from './ctrf'
export function registerAllHelpers(): void {
  anySkippedTestsHelper()
  getCollapseLargeReportsHelper()
}
