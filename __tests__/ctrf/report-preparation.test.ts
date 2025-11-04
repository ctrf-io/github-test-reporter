import { Inputs, ReportConditionals } from '../../src/types'
import { Report } from '../../src/ctrf/core/types/ctrf'
import { addFooterDisplayFlags } from '../../src/ctrf/report-conditionals'

describe('addFooterDisplayFlags', () => {
  const createBaseReport = (): Report => ({
    reportFormat: 'CTRF',
    specVersion: '1.0.0',
    results: {
      tool: { name: 'test' },
      summary: {
        tests: 10,
        passed: 8,
        failed: 0,
        skipped: 0,
        pending: 0,
        other: 0,
        start: Date.now(),
        stop: Date.now()
      },
      tests: []
    }
  })

  describe('Current suite (no previous results)', () => {
    it('should set includeFailedReportCurrentFooter when no tests fail in current run', () => {
      let report = createBaseReport()
      report.results.summary.failed = 0
      report.results.tests = [
        { name: 'test1', status: 'passed', duration: 100 }
      ]

      report = addFooterDisplayFlags(report, createMultipleReportsInputs())
      const reportConditionals = report.extra
        ?.reportConditionals as ReportConditionals

      expect(reportConditionals.includeFailedReportCurrentFooter).toBe(true)
      expect(reportConditionals.includeFlakyReportCurrentFooter).toBe(true)
      expect(reportConditionals.includeMeasuredOverFooter).toBe(false)
      expect(reportConditionals.showFailedReports).toBe(false)
      expect(reportConditionals.showFlakyReports).toBe(false)
    })

    it('should NOT set includeFailedReportCurrentFooter when tests fail in current run', () => {
      const report = createBaseReport()
      report.results.summary.failed = 2
      report.results.tests = [
        { name: 'test1', status: 'failed', duration: 100 },
        { name: 'test2', status: 'passed', duration: 100 }
      ]

      addFooterDisplayFlags(report, createMultipleReportsInputs())
      const reportConditionals = report.extra
        ?.reportConditionals as ReportConditionals

      expect(reportConditionals.includeFailedReportCurrentFooter).toBe(false)
      expect(reportConditionals.includeFlakyReportCurrentFooter).toBe(true)
      expect(reportConditionals.showFailedReports).toBe(true)
      expect(reportConditionals.showFlakyReports).toBe(false)
    })

    it('should NOT set includeFlakyReportCurrentFooter when flaky tests exist in current run', () => {
      const report = createBaseReport()
      report.results.summary.failed = 0
      report.results.tests = [
        { name: 'test1', status: 'passed', duration: 100, flaky: true },
        { name: 'test2', status: 'passed', duration: 100 }
      ]

      addFooterDisplayFlags(report, createMultipleReportsInputs())
      const reportConditionals = report.extra
        ?.reportConditionals as ReportConditionals

      expect(reportConditionals.includeFailedReportCurrentFooter).toBe(true)
      expect(reportConditionals.includeFlakyReportCurrentFooter).toBe(false)
      expect(reportConditionals.showFailedReports).toBe(false)
      expect(reportConditionals.showFlakyReports).toBe(true)
    })

    it('should set includeFlakyReportCurrentFooter when no tests flaky in current run', () => {
      const report = createBaseReport()
      report.results.summary.failed = 0
      report.results.tests = [
        { name: 'test1', status: 'passed', duration: 100 },
        { name: 'test2', status: 'passed', duration: 100 }
      ]

      addFooterDisplayFlags(report, createMultipleReportsInputs())
      const reportConditionals = report.extra
        ?.reportConditionals as ReportConditionals

      expect(reportConditionals.includeFlakyReportCurrentFooter).toBe(true)
      expect(reportConditionals.includeFailedReportCurrentFooter).toBe(true)
      expect(reportConditionals.showFailedReports).toBe(false)
      expect(reportConditionals.showFlakyReports).toBe(false)
    })

    it('should NOT set footer flags when both failed and flaky tests exist in current run', () => {
      const report = createBaseReport()
      report.results.summary.failed = 1
      report.results.tests = [
        { name: 'test1', status: 'failed', duration: 100 },
        { name: 'test2', status: 'passed', duration: 100, flaky: true }
      ]

      addFooterDisplayFlags(report, createMultipleReportsInputs())
      const reportConditionals = report.extra
        ?.reportConditionals as ReportConditionals

      expect(reportConditionals.includeFailedReportCurrentFooter).toBe(false)
      expect(reportConditionals.includeFlakyReportCurrentFooter).toBe(false)
      expect(reportConditionals.showFailedReports).toBe(true)
      expect(reportConditionals.showFlakyReports).toBe(true)
    })
  })

  describe('Previous suite (with previous results)', () => {
    const createReportWithPreviousResults = (): Report => {
      const report = createBaseReport()
      report.extra = {
        previousResults: [
          {
            start: 0,
            stop: 0,
            result: 'passed',
            tests: 5,
            passed: 5,
            failed: 0,
            skipped: 0,
            flaky: 0,
            other: 0,
            duration: 0
          }
        ]
      }
      return report
    }

    describe('Current run scenarios', () => {
      it('should set includeMeasuredOverFooter when tests fail in current run', () => {
        const report = createReportWithPreviousResults()
        report.results.summary.failed = 2
        report.results.tests = [
          { name: 'test1', status: 'failed', duration: 100 }
        ]

        addFooterDisplayFlags(report, createMultipleReportsInputs())
        const reportConditionals = report.extra
          ?.reportConditionals as ReportConditionals

        expect(reportConditionals.includeMeasuredOverFooter).toBe(true)
      })

      it('should set includeMeasuredOverFooter when flaky tests exist in current run', () => {
        const report = createReportWithPreviousResults()
        report.results.tests = [
          { name: 'test1', status: 'passed', duration: 100, flaky: true }
        ]

        addFooterDisplayFlags(report, createMultipleReportsInputs())
        const reportConditionals = report.extra
          ?.reportConditionals as ReportConditionals

        expect(reportConditionals.includeMeasuredOverFooter).toBe(true)
      })

      it('should set includeMeasuredOverFooter when both failed and flaky tests exist in current run', () => {
        const report = createReportWithPreviousResults()
        report.results.summary.failed = 1
        report.results.tests = [
          { name: 'test1', status: 'failed', duration: 100 },
          { name: 'test2', status: 'passed', duration: 100, flaky: true }
        ]

        addFooterDisplayFlags(report, createMultipleReportsInputs())
        const reportConditionals = report.extra
          ?.reportConditionals as ReportConditionals

        expect(reportConditionals.includeMeasuredOverFooter).toBe(true)
      })
    })

    describe('All runs scenarios', () => {
      it('should NOT set includeFailedReportAllFooter when tests failed across all runs', () => {
        let report = createReportWithPreviousResults()
        report.insights = {
          flakyRate: { current: 0, baseline: 0, change: 0 },
          failRate: { current: 0, baseline: 0, change: 0 },
          averageTestDuration: { current: 0, baseline: 0, change: 0 },
          averageRunDuration: { current: 0, baseline: 0, change: 0 },
          runsAnalyzed: 0,
          extra: {
            totalResultsFailed: 5,
            totalAttemptsFlaky: 0
          }
        }

        report = addFooterDisplayFlags(report, createMultipleReportsInputs())
        const reportConditionals = report.extra
          ?.reportConditionals as ReportConditionals

        expect(reportConditionals.includeFailedReportAllFooter).toBe(false)
        expect(reportConditionals.includeFlakyReportAllFooter).toBe(true)
        expect(reportConditionals.showFailedReports).toBe(true)
        expect(reportConditionals.showFlakyReports).toBe(false)
      })

      it('should NOT set includeFlakyReportAllFooter when flaky tests exist across all runs', () => {
        let report = createReportWithPreviousResults()
        report.insights = {
          flakyRate: { current: 0, baseline: 0, change: 0 },
          failRate: { current: 0, baseline: 0, change: 0 },
          averageTestDuration: { current: 0, baseline: 0, change: 0 },
          averageRunDuration: { current: 0, baseline: 0, change: 0 },
          runsAnalyzed: 0,
          extra: {
            totalResultsFailed: 0,
            totalAttemptsFlaky: 3
          }
        }

        report = addFooterDisplayFlags(report, createMultipleReportsInputs())
        const reportConditionals = report.extra
          ?.reportConditionals as ReportConditionals
        expect(reportConditionals.includeFlakyReportAllFooter).toBe(false)
        expect(reportConditionals.includeFailedReportAllFooter).toBe(true)
        expect(reportConditionals.showFailedReports).toBe(false)
        expect(reportConditionals.showFlakyReports).toBe(true)
      })

      it('should set includeFailedReportAllFooter when no tests failed across all runs', () => {
        const report = createReportWithPreviousResults()

        addFooterDisplayFlags(report, createMultipleReportsInputs())
        const reportConditionals = report.extra
          ?.reportConditionals as ReportConditionals
        expect(reportConditionals.includeFailedReportAllFooter).toBe(true)
        expect(reportConditionals.showFailedReports).toBe(false)
      })

      it('should set includeFlakyReportAllFooter when no flaky tests across all runs', () => {
        let report = createReportWithPreviousResults()

        report = addFooterDisplayFlags(report, createMultipleReportsInputs())
        const reportConditionals = report.extra
          ?.reportConditionals as ReportConditionals
        expect(reportConditionals.includeFlakyReportAllFooter).toBe(true)
        expect(reportConditionals.showFlakyReports).toBe(false)
      })
    })

    describe('Combined scenarios', () => {
      it('should handle tests failing in current AND across all runs', () => {
        let report = createReportWithPreviousResults()
        report.results.summary.failed = 2
        report.insights = {
          flakyRate: { current: 0, baseline: 0, change: 0 },
          failRate: { current: 0, baseline: 0, change: 0 },
          averageTestDuration: { current: 0, baseline: 0, change: 0 },
          averageRunDuration: { current: 0, baseline: 0, change: 0 },
          runsAnalyzed: 0,
          extra: {
            totalResultsFailed: 8,
            totalAttemptsFlaky: 0
          }
        }
        report.results.tests = [
          { name: 'test1', status: 'failed', duration: 100 }
        ]

        report = addFooterDisplayFlags(report, createMultipleReportsInputs())
        const reportConditionals = report.extra
          ?.reportConditionals as ReportConditionals

        expect(reportConditionals.includeFailedReportAllFooter).toBe(false)
        expect(reportConditionals.includeMeasuredOverFooter).toBe(true)
        expect(reportConditionals.showFailedReports).toBe(true)
      })

      it('should handle flaky tests in current AND across all runs', () => {
        let report = createReportWithPreviousResults()
        report.insights = {
          flakyRate: { current: 0, baseline: 0, change: 0 },
          failRate: { current: 0, baseline: 0, change: 0 },
          averageTestDuration: { current: 0, baseline: 0, change: 0 },
          averageRunDuration: { current: 0, baseline: 0, change: 0 },
          runsAnalyzed: 0,
          extra: {
            totalResultsFailed: 0,
            totalAttemptsFlaky: 4
          }
        }
        report.results.tests = [
          { name: 'test1', status: 'passed', duration: 100, flaky: true }
        ]

        report = addFooterDisplayFlags(report, createMultipleReportsInputs())
        const reportConditionals = report.extra
          ?.reportConditionals as ReportConditionals

        expect(reportConditionals.includeFlakyReportAllFooter).toBe(false)
        expect(reportConditionals.includeMeasuredOverFooter).toBe(true)
        expect(reportConditionals.showFlakyReports).toBe(true)
      })
    })
  })

  describe('Show reports flags', () => {
    it('should always show reports when only one report enabled', () => {
      const report = createBaseReport()
      report.results.summary.failed = 0
      report.results.tests = [
        { name: 'test1', status: 'passed', duration: 100 }
      ]

      addFooterDisplayFlags(report, createSingleReportInputs())

      const reportConditionals = report.extra
        ?.reportConditionals as ReportConditionals
      expect(reportConditionals.showFailedReports).toBe(true)
      expect(reportConditionals.showFlakyReports).toBe(true)
      expect(reportConditionals.showSkippedReports).toBe(true)
    })

    it('should hide reports when multiple reports enabled and no failures', () => {
      const report = createBaseReport()
      report.results.summary.failed = 0
      report.results.summary.skipped = 0
      report.results.tests = [
        { name: 'test1', status: 'passed', duration: 100 }
      ]

      addFooterDisplayFlags(report, createMultipleReportsInputs())

      const reportConditionals = report.extra
        ?.reportConditionals as ReportConditionals
      expect(reportConditionals.showFailedReports).toBe(false)
      expect(reportConditionals.showFlakyReports).toBe(false)
      expect(reportConditionals.showSkippedReports).toBe(false)
    })

    it('should show failed reports when failures exist', () => {
      const report = createBaseReport()
      report.results.summary.failed = 2
      report.results.tests = [
        { name: 'test1', status: 'failed', duration: 100 }
      ]

      addFooterDisplayFlags(report, createMultipleReportsInputs())

      const reportConditionals = report.extra
        ?.reportConditionals as ReportConditionals
      expect(reportConditionals.showFailedReports).toBe(true)
      expect(reportConditionals.showFlakyReports).toBe(false)
    })

    it('should show flaky reports when flaky tests exist', () => {
      const report = createBaseReport()
      report.results.summary.failed = 0
      report.results.tests = [
        { name: 'test1', status: 'passed', duration: 100, flaky: true }
      ]

      addFooterDisplayFlags(report, createMultipleReportsInputs())

      const reportConditionals = report.extra
        ?.reportConditionals as ReportConditionals
      expect(reportConditionals.showFailedReports).toBe(false)
      expect(reportConditionals.showFlakyReports).toBe(true)
    })

    it('should show skipped reports when skipped tests exist', () => {
      const report = createBaseReport()
      report.results.summary.skipped = 1
      report.results.tests = [
        { name: 'test1', status: 'skipped', duration: 100 }
      ]

      addFooterDisplayFlags(report, createMultipleReportsInputs())

      const reportConditionals = report.extra
        ?.reportConditionals as ReportConditionals
      expect(reportConditionals.showSkippedReports).toBe(true)
    })

    it('should show skipped reports when pending tests exist', () => {
      const report = createBaseReport()
      report.results.summary.pending = 1
      report.results.tests = [
        { name: 'test1', status: 'pending', duration: 100 }
      ]

      addFooterDisplayFlags(report, createMultipleReportsInputs())

      const reportConditionals = report.extra
        ?.reportConditionals as ReportConditionals
      expect(reportConditionals.showSkippedReports).toBe(true)
    })
  })

  describe('Measured Over Footer', () => {
    it('should set includeMeasuredOverFooter when previous reports exist', () => {
      const report = createBaseReport()
      report.extra = {
        previousResults: [
          {
            start: 0,
            stop: 0,
            result: 'passed',
            tests: 5,
            passed: 5,
            failed: 0,
            skipped: 0,
            flaky: 0,
            other: 0,
            duration: 0
          },
          {
            start: 0,
            stop: 0,
            result: 'failed',
            tests: 3,
            passed: 2,
            failed: 1,
            skipped: 0,
            flaky: 0,
            other: 0,
            duration: 0
          }
        ]
      }

      addFooterDisplayFlags(report, createMultipleReportsInputs())

      const reportConditionals = report.extra
        ?.reportConditionals as ReportConditionals
      expect(reportConditionals.includeMeasuredOverFooter).toBe(true)
    })

    it('should NOT set includeMeasuredOverFooter when no previous reports exist', () => {
      const report = createBaseReport()

      addFooterDisplayFlags(report, createMultipleReportsInputs())

      const reportConditionals = report.extra
        ?.reportConditionals as ReportConditionals
      expect(reportConditionals.includeMeasuredOverFooter).toBe(false)
    })

    it('should NOT set includeMeasuredOverFooter when previous reports array is empty', () => {
      const report = createBaseReport()
      report.extra = {
        previousResults: []
      }

      addFooterDisplayFlags(report, createMultipleReportsInputs())

      const reportConditionals = report.extra
        ?.reportConditionals as ReportConditionals
      expect(reportConditionals.includeMeasuredOverFooter).toBe(false)
    })
  })
})

describe('Inputs with maxPreviousRunsToFetch', () => {
  it('should handle maxPreviousRunsToFetch parameter correctly', () => {
    const inputs = createSingleReportInputs()
    inputs.maxPreviousRunsToFetch = 50

    expect(inputs.maxPreviousRunsToFetch).toBe(50)
  })
})

function createMultipleReportsInputs(): Inputs {
  return {
    ...createSingleReportInputs(),
    summaryReport: true,
    failedReport: true,
    flakyReport: true,
    skippedReport: true,
    testReport: true // 5 reports enabled
  }
}

function createSingleReportInputs(): Inputs {
  return {
    ctrfPath: '/path/to/ctrf',
    summary: false,
    pullRequest: false,
    issue: '',
    collapseLargeReports: false,
    summaryReport: true, // Only 1 report enabled
    summaryDeltaReport: false,
    testsChangedReport: false,
    githubReport: false,
    testReport: false,
    testListReport: false,
    failedReport: false,
    failRateReport: false,
    flakyReport: false,
    flakyRateReport: false,
    failedFoldedReport: false,
    previousResultsReport: false,
    aiReport: false,
    aiSummaryReport: false,
    skippedReport: false,
    suiteFoldedReport: false,
    suiteListReport: false,
    pullRequestReport: false,
    commitReport: false,
    customReport: false,
    insightsReport: false,
    slowestReport: false,
    fileReport: false,
    communityReport: false,
    communityReportName: '',
    artifactName: '',
    annotate: false,
    title: '',
    onFailOnly: false,
    exitOnNoFiles: false,
    exitOnFail: false,
    exitOnEmpty: false,
    useSuiteName: false,
    previousResultsMax: 0,
    metricsReportsMax: 0,
    maxWorkflowRunsToCheck: 0,
    maxPreviousRunsToFetch: 0,
    fetchPreviousResults: false,
    updateComment: false,
    overwriteComment: false,
    alwaysLatestComment: false,
    commentTag: '',
    writeCtrfToFile: '',
    uploadArtifact: false,
    groupBy: 'suite',
    alwaysGroupBy: false,
    integrationsConfig: {},
    ai: {},
    statusCheck: false,
    statusCheckName: '',
    reportOrder: []
  }
}
