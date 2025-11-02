import { Report } from '../../../types/ctrf'

/**
 * Sort order options for timestamp-based sorting.
 */
export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc'
}

/**
 * Sorts CTRF reports by their timestamp.
 * 
 * This function uses a fallback strategy for timestamp selection:
 * 1. First tries to use `report.timestamp` if available
 * 2. Falls back to `report.results.summary.stop` if `timestamp` is not available
 * 3. Reports without any timestamp are sorted to the end of the array
 * 
 * @param reports - Array of CTRF reports to sort
 * @param order - Sort order: SortOrder.DESC for newest first (default), SortOrder.ASC for oldest first
 * @returns A new array with reports sorted by timestamp
 * 
 * @example
 * ```typescript
 * const unsortedReports = [report1, report2, report3];
 * 
 * const newestFirst = sortReportsByTimestamp(unsortedReports);
 * // newestFirst[0] will be the most recent report
 * 
 * const oldestFirst = sortReportsByTimestamp(unsortedReports, SortOrder.ASC);
 * // oldestFirst[0] will be the oldest report
 * 
 
 * const newestFirst = sortReportsByTimestamp(unsortedReports, SortOrder.DESC);
 * ```
 * 
 */
export function sortReportsByTimestamp(
  reports: Report[],
  order: SortOrder = SortOrder.DESC
): Report[] {
  return [...reports].sort((a, b) => {
    const aTimestamp = a.timestamp || a.results?.summary?.stop
    const bTimestamp = b.timestamp || b.results?.summary?.stop

    if (!aTimestamp && !bTimestamp) return 0
    if (!aTimestamp) return 1
    if (!bTimestamp) return -1

    const timeDiff =
      new Date(bTimestamp).getTime() - new Date(aTimestamp).getTime()
    return order === SortOrder.ASC ? -timeDiff : timeDiff
  })
}
