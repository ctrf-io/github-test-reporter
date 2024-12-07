import { CtrfReport } from '../types'
import { readCtrfReport } from '../utils'
import {
  enrichCurrentReportWithRunDetails,
  groupTestsBySuiteOrFilePath,
  prefixTestNames
} from './enrichers'
import { stripAnsiFromErrors } from './helpers'
import { processPreviousResultsAndMetrics } from './metrics'

// Function to prepare the report
export async function prepareReport(
  inputs: any,
  githubContext: any
): Promise<CtrfReport> {
  let report: CtrfReport = readCtrfReport(inputs.ctrfPath)
  report = stripAnsiFromErrors(report)
  report = enrichCurrentReportWithRunDetails(report, githubContext)

  if (shouldGroupTests(inputs)) {
    report = groupTestsBySuiteOrFilePath(report, inputs.useSuiteName)
  }

  if (shouldPrefixTestNames(inputs)) {
    report = prefixTestNames(report)
  }

  if (shouldProcessPreviousResults(inputs)) {
    report = await processPreviousResultsAndMetrics(
      inputs,
      report,
      githubContext
    )
  }

  return report
}

function shouldGroupTests(inputs: any): boolean {
  return (
    inputs.alwaysGroupBy || inputs.suiteFoldedReport || inputs.suiteListReport
  )
}

function shouldPrefixTestNames(inputs: any): boolean {
  return (
    inputs.useSuiteName && !inputs.suiteFoldedReport && !inputs.suiteListReport
  )
}

function shouldProcessPreviousResults(inputs: any): boolean {
  return (
    inputs.previousResultsReport ||
    inputs.flakyRateReport ||
    inputs.failRateReport ||
    inputs.fetchPreviousResults
  )
}
