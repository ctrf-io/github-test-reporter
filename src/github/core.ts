import * as core from '@actions/core'
import { limitPreviousReports, stripAnsi } from '../ctrf'
import { generateMarkdown } from '../handlebars/core'
import { Inputs, CtrfReport } from '../types'
import { readTemplate } from '../utils'
import { BuiltInReports } from '../reports/core'

export async function generateViews(
  inputs: Inputs,
  report: CtrfReport
): Promise<void> {
  if (inputs.title) {
    core.summary.addHeading(inputs.title, 2).addEOL().addEOL()
  }

  const isAnyReportEnabled =
    inputs.summaryReport ||
    inputs.failedReport ||
    inputs.flakyReport ||
    inputs.flakyRateReport ||
    inputs.failedFoldedReport ||
    inputs.failRateReport ||
    inputs.previousResultsReport ||
    inputs.aiReport ||
    inputs.skipedReport ||
    inputs.testReport ||
    inputs.testListReport ||
    inputs.suiteFoldedReport ||
    inputs.suiteListReport ||
    inputs.pullRequestReport ||
    inputs.customReport

  if (!isAnyReportEnabled) {
    core.info(
      'No specific report selected. Generating default reports: summary, failed, flaky, skipped, and tests.'
    )

    addViewToSummary('### Summary', BuiltInReports.SummaryTable, report)
    addViewToSummary('### Failed Tests', BuiltInReports.FailedTable, report)
    addViewToSummary('### Flaky Tests', BuiltInReports.FlakyTable, report)
    addViewToSummary('### Skipped', BuiltInReports.SkippedTable, report)
    addViewToSummary('### Tests', BuiltInReports.TestTable, report)
  }

  if (inputs.summaryReport) {
    addViewToSummary('### Summary', BuiltInReports.SummaryTable, report)
  }

  if (inputs.previousResultsReport) {
    addViewToSummary(
      '### Previous Results',
      BuiltInReports.PreviousResultsTable,
      limitPreviousReports(report, inputs.previousResultsMax)
    )
  }

  if (inputs.failedReport) {
    addViewToSummary('### Failed Tests', BuiltInReports.FailedTable, report)
  }
  if (inputs.failRateReport) {
    addViewToSummary('### Failed Rate', BuiltInReports.FailRateTable, report)
  }
  if (inputs.failedFoldedReport) {
    addViewToSummary('### Failed Tests', BuiltInReports.FailedFolded, report)
  }
  if (inputs.flakyReport) {
    addViewToSummary('### Flaky Tests', BuiltInReports.FlakyTable, report)
  }

  if (inputs.flakyRateReport) {
    addViewToSummary('### Flaky Rate', BuiltInReports.FlakyRateTable, report)
  }

  if (inputs.skipedReport) {
    addViewToSummary('### Skipped', BuiltInReports.SkippedTable, report)
  }

  if (inputs.aiReport) {
    addViewToSummary('### AI Analysis', BuiltInReports.AiTable, report)
  }

  if (inputs.pullRequestReport) {
    addViewToSummary('', BuiltInReports.PullRequest, report)
  }

  if (inputs.customReport && inputs.templatePath) {
    const customTemplate = readTemplate(inputs.templatePath)
    const customMarkdown = generateMarkdown(customTemplate, report)
    core.summary.addRaw(customMarkdown).addEOL().addEOL()
  }

  if (inputs.testReport) {
    addViewToSummary('### Tests', BuiltInReports.TestTable, report)
  }

  if (inputs.testListReport) {
    addViewToSummary('### Tests', BuiltInReports.TestList, report)
  }

  if (inputs.suiteFoldedReport) {
    addViewToSummary('### Suites', BuiltInReports.SuiteFolded, report)
  }

  if (inputs.suiteListReport) {
    addViewToSummary('### Suites', BuiltInReports.SuiteList, report)
  }

  core.summary.addLink(
    'Github Test Reporter',
    'https://github.com/ctrf-io/github-test-reporter'
  )
}

function addViewToSummary(
  title: string,
  viewTemplate: string,
  report: CtrfReport
): void {
  core.summary
    .addRaw(title)
    .addEOL()
    .addEOL()
    .addRaw(generateMarkdown(readTemplate(viewTemplate), report))
    .addEOL()
    .addEOL()
}

export function annotateFailed(report: CtrfReport): void {
  report.results.tests.forEach(test => {
    if (test.status === 'failed') {
      const message = test.message
        ? stripAnsi(test.message || '')
        : 'No message provided'
      const trace = test.trace ? stripAnsi(test.trace) : 'No trace available'
      const annotation = `${test.name}: ${stripAnsi(message)} - ${stripAnsi(trace)}`

      core.error(annotation, {
        title: `Failed Test: ${test.name}`,
        file: test.filePath,
        startLine: test.line || 0,
        endLine: test.line || 0
      })
    }
  })
}

export function exitActionOnFail(report: CtrfReport): void {
  if (report.results.summary.failed > 0) {
    core.setFailed(
      `Github Test Reporter: ${report.results.summary.failed} failed tests found`
    )
  }
}

export function handleError(error: unknown): void {
  if (error instanceof Error) {
    core.setFailed(`Action failed with error: ${error.message}`)
  } else {
    core.setFailed('Action failed with an unknown error')
  }
}
