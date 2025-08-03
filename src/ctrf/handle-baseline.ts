import { readReportFromFile } from 'ctrf'
import * as core from '@actions/core'
import type { Report } from 'ctrf'
import { Inputs } from '../types'

/**
 * Handles baseline report functionality by reading a baseline report and
 * adding it to the current report for comparison purposes.
 *
 * @param inputs - The user-provided inputs containing baseline configuration
 * @param report - The current CTRF report to be modified
 * @param previousReports - Array of previous reports (optional, used when baseline is number or string)
 * @returns Object containing the modified report with baseline information and the baseline report
 */
export function handleBaseline(
  inputs: Inputs,
  report: Report,
  previousReports?: Report[]
): { report: Report; baselineReport: Report | null } {
  let baselineReport: Report | null = null

  if (
    inputs.baselineReportPath !== '' &&
    inputs.baselineReportPath !== undefined
  ) {
    try {
      baselineReport = readReportFromFile(inputs.baselineReportPath)

      if (!baselineReport) {
        core.warning(
          `Baseline report not found at: ${inputs.baselineReportPath}, skipping baseline comparison`
        )
        baselineReport = null
      } else {
        report.baseline = {
          reportId: baselineReport.reportId ?? '',
          source: inputs.baselineReportPath,
          timestamp: baselineReport.timestamp ?? ''
        }
      }
    } catch (error) {
      core.warning(
        `Failed to read baseline report from ${inputs.baselineReportPath}: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      baselineReport = null
    }
  }

  if (
    inputs.baseline !== undefined &&
    inputs.baseline !== '' &&
    previousReports
  ) {
    baselineReport = findBaselineReport(previousReports, inputs.baseline)

    if (baselineReport) {
      report.baseline = {
        reportId: baselineReport.reportId ?? '',
        timestamp: baselineReport.timestamp ?? ''
      }
    }
  }

  return { report, baselineReport }
}

/**
 * Helper function to find the baseline report based on the baseline parameter.
 *
 * @param reports - Array of previous reports
 * @param baseline - Baseline specification (undefined, number, or string)
 * @returns The baseline report to use for comparison, or null if not found
 */
export function findBaselineReport(
  reports: Report[],
  baseline?: number | string
): Report | null {
  if (baseline === undefined) {
    return reports[0] || null
  }

  if (typeof baseline === 'number') {
    // If number is larger than available reports, use the last available report
    const maxIndex = reports.length - 1
    const targetIndex = Math.min(baseline, maxIndex)

    if (targetIndex >= 0 && targetIndex < reports.length) {
      return reports[targetIndex]
    }

    core.info(
      `Baseline index ${baseline} is out of range. Available previous reports: ${reports.length}`
    )
    return null
  }

  if (typeof baseline === 'string') {
    const report = reports.find(report => report.reportId === baseline)
    if (!report) {
      core.warning(`No report found with reportId: ${baseline}`)
      return null
    }
    return report
  }

  return null
}
