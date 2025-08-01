import * as core from '@actions/core'
import { limitPreviousReports, stripAnsi, getEmoji } from '../ctrf'
import { generateMarkdown } from '../handlebars/core'
import { Inputs, ReportConditionals } from '../types'
import { Report } from 'ctrf'
import { readTemplate, reportTypeToInputKey } from '../utils'
import { BuiltInReports, getBasePath } from '../reports/core'
import { COMMUNITY_REPORTS_PATH } from '../config'
import { DEFAULT_REPORT_ORDER } from '../reports/constants'
import { join } from 'path'
import { isAnyReportEnabled } from '../utils/report-utils'

/**
 * Generates various views of the CTRF report and adds them to the GitHub Actions summary.
 *
 * @param inputs - The user-provided inputs containing options for generating reports.
 * @param report - The CTRF report to generate views from.
 */
export function generateViews(inputs: Inputs, report: Report): void {
  if (inputs.title) {
    core.summary.addHeading(inputs.title, 2).addEOL().addEOL()
  }
  const reportConditionals = report.extra
    ?.reportConditionals as ReportConditionals

  if (!isAnyReportEnabled(inputs)) {
    core.info(
      'No specific report selected. Generating default reports: summary, failed, flaky, skipped, and tests.'
    )

    addViewToSummary('### Summary', BuiltInReports.SummaryTable, report)
    if (reportConditionals?.showFailedReports) {
      addViewToSummary('### Failed Tests', BuiltInReports.FailedTable, report)
    } else {
      core.info('No failed tests to display, skipping failed-report')
    }
    if (reportConditionals?.showFlakyReports) {
      addViewToSummary('### Flaky Tests', BuiltInReports.FlakyTable, report)
    } else {
      core.info('No flaky tests to display, skipping flaky-report')
    }
    if (reportConditionals?.showSkippedReports) {
      addViewToSummary('### Skipped', BuiltInReports.SkippedTable, report)
    } else {
      core.info('No skipped tests to display, skipping skipped-report')
    }
    addViewToSummary('### Tests', BuiltInReports.TestTable, report)

    addReportFooters(report, inputs, false)
    addFooter()
    return
  }

  const reportOrder =
    inputs.reportOrder && inputs.reportOrder.length > 0
      ? inputs.reportOrder
      : DEFAULT_REPORT_ORDER

  if (inputs.reportOrder && inputs.reportOrder.length > 0) {
    core.info(`Using custom report order: ${inputs.reportOrder.join(', ')}`)
  }

  const processedReports = new Set<string>()
  let hasPreviousResultsReports = false

  const previousResultsReportTypes = new Set([
    'insights-report',
    'fail-rate-report',
    'flaky-rate-report',
    'slowest-report'
  ])

  for (const reportType of reportOrder) {
    const inputKey = reportTypeToInputKey(reportType)

    if (!inputKey) {
      if (inputs.reportOrder && inputs.reportOrder.length > 0) {
        core.warning(`Unknown report type in report-order: ${reportType}`)
      }
      continue
    }

    if (!inputs[inputKey]) {
      continue
    }

    generateReportByType(reportType, inputs, report)
    processedReports.add(reportType)

    if (previousResultsReportTypes.has(reportType)) {
      hasPreviousResultsReports = true
    }
  }

  for (const reportType of DEFAULT_REPORT_ORDER) {
    if (processedReports.has(reportType)) {
      continue
    }

    const inputKey = reportTypeToInputKey(reportType)
    if (!inputKey || !inputs[inputKey]) {
      continue
    }

    core.info(
      `Adding ${reportType} which was enabled but not included in report-order`
    )
    generateReportByType(reportType, inputs, report)

    if (previousResultsReportTypes.has(reportType)) {
      hasPreviousResultsReports = true
    }
  }
  addReportFooters(report, inputs, hasPreviousResultsReports)
  addFooter()
}

/**
 * Helper function to add the footer to the summary
 */
function addFooter(): void {
  core.summary.addRaw(
    '[Github Test Reporter](https://github.com/ctrf-io/github-test-reporter) by [CTRF](https://ctrf.io) 💚'
  )
}

/**
 * Adds appropriate footers based on the report's footer display flags
 */
function addReportFooters(
  report: Report,
  inputs: Inputs,
  hasPreviousResultsReports: boolean
): void {
  const reportConditionals = report.extra
    ?.reportConditionals as ReportConditionals
  const footerMessages: string[] = []

  if (reportConditionals.includeFailedReportCurrentFooter) {
    footerMessages.push(`🎉 No failed tests in this run.`)
  }
  if (reportConditionals.includeFailedReportAllFooter) {
    footerMessages.push(`🎉 No failed tests detected across all runs.`)
  }
  if (reportConditionals.includeFlakyReportCurrentFooter) {
    footerMessages.push(`${getEmoji('flaky')} No flaky tests in this run.`)
  }
  if (reportConditionals.includeFlakyReportAllFooter) {
    footerMessages.push(
      `${getEmoji('flaky')} No flaky tests detected across all runs.`
    )
  }
  if (reportConditionals.includeSkippedReportCurrentFooter) {
    footerMessages.push(`${getEmoji('skipped')} No skipped tests in this run.`)
  }

  if (
    reportConditionals.includeMeasuredOverFooter &&
    report.insights?.runsAnalyzed &&
    hasPreviousResultsReports
  ) {
    footerMessages.push(
      `${getEmoji('duration')} Measured over ${report.insights?.runsAnalyzed} runs.`
    )
  }

  if (footerMessages.length > 0) {
    core.summary
      .addRaw(`<sub><i>${footerMessages.join(' | ')}</i></sub>`)
      .addEOL()
      .addEOL()
  }
}

/**
 * Generates a specific report based on the report type
 *
 * @param reportType - The type of report to generate
 * @param inputs - The user-provided inputs containing options for generating reports
 * @param report - The CTRF report to generate the view from
 */
function generateReportByType(
  reportType: string,
  inputs: Inputs,
  report: Report
): void {
  const reportConditionals = report.extra
    ?.reportConditionals as ReportConditionals
  switch (reportType) {
    case 'summary-report':
      core.info('Adding summary report to summary')
      addViewToSummary('### Summary', BuiltInReports.SummaryTable, report)
      break
    case 'github-report':
      core.info('Adding GitHub report to summary')
      addViewToSummary('### Test Results', BuiltInReports.GitHub, report)
      break
    case 'previous-results-report':
      core.info('Adding previous results report to summary')
      addViewToSummary(
        '### Previous Results',
        BuiltInReports.PreviousResultsTable,
        limitPreviousReports(report, inputs.previousResultsMax)
      )
      break
    case 'insights-report':
      core.info('Adding insights report to summary')
      addViewToSummary('### Insights', BuiltInReports.InsightsTable, report)
      break
    case 'failed-report':
      if (reportConditionals?.showFailedReports) {
        core.info('Adding failed tests report to summary')
        addViewToSummary('### Failed Tests', BuiltInReports.FailedTable, report)
      } else {
        core.info('No failed tests to display, skipping failed-report')
      }
      break
    case 'fail-rate-report':
      if (reportConditionals?.showFailedReports) {
        core.info('Adding fail rate report to summary')
        addViewToSummary('### Fail Rate', BuiltInReports.FailRateTable, report)
      } else {
        core.info('No failed tests to display, skipping fail-rate-report')
      }
      break
    case 'failed-folded-report':
      if (reportConditionals?.showFailedReports) {
        core.info('Adding failed tests folded report to summary')
        addViewToSummary(
          '### Failed Tests',
          BuiltInReports.FailedFolded,
          report
        )
      } else {
        core.info('No failed tests to display, skipping failed-folded-report')
      }
      break
    case 'flaky-report':
      if (reportConditionals?.showFlakyReports) {
        core.info('Adding flaky tests report to summary')
        addViewToSummary('### Flaky Tests', BuiltInReports.FlakyTable, report)
      } else {
        core.info('No flaky tests to display, skipping flaky-report')
      }
      break
    case 'flaky-rate-report':
      if (reportConditionals?.showFlakyReports) {
        core.info('Adding flaky rate report to summary')
        addViewToSummary(
          '### Flaky Rate',
          BuiltInReports.FlakyRateTable,
          report
        )
      } else {
        core.info('No flaky tests to display, skipping flaky-rate-report')
      }
      break
    case 'skipped-report':
      if (reportConditionals?.showSkippedReports) {
        core.info('Adding skipped report to summary')
        addViewToSummary('### Skipped', BuiltInReports.SkippedTable, report)
      } else {
        core.info('No skipped tests to display, skipping skipped-report')
      }
      break
    case 'ai-report':
      if (reportConditionals?.showFailedReports) {
        core.info('Adding AI analysis report to summary')
        addViewToSummary('### AI Analysis', BuiltInReports.AiTable, report)
      } else {
        core.info('No AI analysis to display, skipping ai-report')
      }
      break
    case 'pull-request-report':
      core.info('Adding pull request report to summary')
      addViewToSummary('', BuiltInReports.PullRequest, report)
      break
    case 'commit-report':
      core.info('Adding commit report to summary')
      addViewToSummary('### Commits', BuiltInReports.CommitTable, report)
      break
    case 'slowest-report':
      core.info('Adding slowest tests report to summary')
      addViewToSummary('### Slowest Tests', BuiltInReports.SlowestTable, report)
      break
    case 'custom-report':
      if (inputs.templatePath) {
        core.info('Adding custom report to summary')
        const customTemplate = readTemplate(inputs.templatePath)
        const customMarkdown = generateMarkdown(customTemplate, report)
        core.summary.addRaw(customMarkdown).addEOL().addEOL()
      }
      break
    case 'community-report':
      if (inputs.communityReportName) {
        core.info('Adding community report to summary')
        const basePath = getBasePath(COMMUNITY_REPORTS_PATH)
        const customTemplate = readTemplate(
          join(basePath, `${inputs.communityReportName}.hbs`)
        )
        const customMarkdown = generateMarkdown(customTemplate, report)
        core.summary.addRaw(customMarkdown).addEOL().addEOL()
      }
      break
    case 'test-report':
      core.info('Adding tests report to summary')
      addViewToSummary('### Tests', BuiltInReports.TestTable, report)
      break
    case 'test-list-report':
      core.info('Adding tests list report to summary')
      addViewToSummary('### Tests', BuiltInReports.TestList, report)
      break
    case 'suite-folded-report':
      core.info('Adding suites folded report to summary')
      addViewToSummary('### Suites', BuiltInReports.SuiteFolded, report)
      break
    case 'suite-list-report':
      core.info('Adding suites list report to summary')
      addViewToSummary('### Suites', BuiltInReports.SuiteList, report)
      break
    case 'file-report':
      core.info('Adding file report to summary')
      addViewToSummary('### Files', BuiltInReports.FileTable, report)
      break
    default:
      core.warning(`Unknown report type: ${reportType}`)
  }
}

/**
 * Adds a specific view to the GitHub Actions summary using a title and a template.
 *
 * @param title - The title for the view to be displayed in the summary.
 * @param viewTemplate - The template path or name for rendering the view.
 * @param report - The CTRF report to use for generating the view.
 */
function addViewToSummary(
  title: string,
  viewTemplate: string,
  report: Report
): void {
  core.summary
    .addRaw(title)
    .addEOL()
    .addEOL()
    .addRaw(generateMarkdown(readTemplate(viewTemplate), report))
    .addEOL()
    .addEOL()
}

/**
 * Annotates all failed tests from the CTRF report in the GitHub Actions log.
 *
 * @param report - The CTRF report containing test results.
 */
export function annotateFailed(report: Report): void {
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

/**
 * Exits the GitHub Action with a failure status if the CTRF report contains any failed tests.
 *
 * @param report - The CTRF report containing the summary of test results.
 */
export function exitActionOnFail(report: Report): void {
  if (report.results.summary.failed > 0) {
    core.setFailed(
      `Github Test Reporter: ${report.results.summary.failed} failed tests found`
    )
  }
}

/**
 * Handles errors that occur during the action, setting the GitHub Action status to failed.
 *
 * @param error - The error to handle, which can be an instance of `Error` or an unknown type.
 */
export function handleError(error: unknown): void {
  if (error instanceof Error) {
    core.setFailed(`Action failed with error: ${error.message}`)
  } else {
    core.setFailed('Action failed with an unknown error')
  }
}
