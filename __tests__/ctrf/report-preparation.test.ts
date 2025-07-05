import { CtrfReport, EnhancedSummaryExtra, Inputs } from '../../src/types'
import { addFooterDisplayFlags } from '../../src/ctrf/report-preparation'

describe('addFooterDisplayFlags', () => {
  const createBaseReport = (): CtrfReport => ({
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
      const report = createBaseReport()
      report.results.summary.failed = 0
      report.results.tests = [
        { name: 'test1', status: 'passed', duration: 100 }
      ]

      const result = addFooterDisplayFlags(
        report,
        createMultipleReportsInputs()
      )

      expect(
        result.results.summary.extra?.includeFailedReportCurrentFooter
      ).toBe(true)
      expect(
        result.results.summary.extra?.includeFlakyReportCurrentFooter
      ).toBe(true)
      expect(result.results.summary.extra?.includeMeasuredOverFooter).toBe(
        false
      )
      expect(result.results.summary.extra?.showFailedReports).toBe(false)
      expect(result.results.summary.extra?.showFlakyReports).toBe(false)
    })

    it('should NOT set includeFailedReportCurrentFooter when tests fail in current run', () => {
      const report = createBaseReport()
      report.results.summary.failed = 2
      report.results.tests = [
        { name: 'test1', status: 'failed', duration: 100 },
        { name: 'test2', status: 'passed', duration: 100 }
      ]

      const result = addFooterDisplayFlags(
        report,
        createMultipleReportsInputs()
      )

      expect(
        result.results.summary.extra?.includeFailedReportCurrentFooter
      ).toBe(false)
      expect(
        result.results.summary.extra?.includeFlakyReportCurrentFooter
      ).toBe(true)
      expect(result.results.summary.extra?.showFailedReports).toBe(true)
      expect(result.results.summary.extra?.showFlakyReports).toBe(false)
    })

    it('should NOT set includeFlakyReportCurrentFooter when flaky tests exist in current run', () => {
      const report = createBaseReport()
      report.results.summary.failed = 0
      report.results.tests = [
        { name: 'test1', status: 'passed', duration: 100, flaky: true },
        { name: 'test2', status: 'passed', duration: 100 }
      ]

      const result = addFooterDisplayFlags(
        report,
        createMultipleReportsInputs()
      )

      expect(
        result.results.summary.extra?.includeFailedReportCurrentFooter
      ).toBe(true)
      expect(
        result.results.summary.extra?.includeFlakyReportCurrentFooter
      ).toBe(false)
      expect(result.results.summary.extra?.showFailedReports).toBe(false)
      expect(result.results.summary.extra?.showFlakyReports).toBe(true)
    })

    it('should set includeFlakyReportCurrentFooter when no tests flaky in current run', () => {
      const report = createBaseReport()
      report.results.summary.failed = 0
      report.results.tests = [
        { name: 'test1', status: 'passed', duration: 100 },
        { name: 'test2', status: 'passed', duration: 100 }
      ]

      const result = addFooterDisplayFlags(
        report,
        createMultipleReportsInputs()
      )

      expect(
        result.results.summary.extra?.includeFlakyReportCurrentFooter
      ).toBe(true)
      expect(
        result.results.summary.extra?.includeFailedReportCurrentFooter
      ).toBe(true)
      expect(result.results.summary.extra?.showFailedReports).toBe(false)
      expect(result.results.summary.extra?.showFlakyReports).toBe(false)
    })

    it('should NOT set footer flags when both failed and flaky tests exist in current run', () => {
      const report = createBaseReport()
      report.results.summary.failed = 1
      report.results.tests = [
        { name: 'test1', status: 'failed', duration: 100 },
        { name: 'test2', status: 'passed', duration: 100, flaky: true }
      ]

      const result = addFooterDisplayFlags(
        report,
        createMultipleReportsInputs()
      )

      expect(
        result.results.summary.extra?.includeFailedReportCurrentFooter
      ).toBe(false)
      expect(
        result.results.summary.extra?.includeFlakyReportCurrentFooter
      ).toBe(false)
      expect(result.results.summary.extra?.showFailedReports).toBe(true)
      expect(result.results.summary.extra?.showFlakyReports).toBe(true)
    })
  })

  describe('Previous suite (with previous results)', () => {
    const createReportWithPreviousResults = (): CtrfReport => {
      const report = createBaseReport()
      report.results.extra = {
        previousReports: [
          {
            results: {
              tool: { name: 'test' },
              summary: {
                tests: 5,
                passed: 5,
                failed: 0,
                skipped: 0,
                pending: 0,
                other: 0,
                start: 0,
                stop: 0
              },
              tests: []
            }
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

        const result = addFooterDisplayFlags(
          report,
          createMultipleReportsInputs()
        )

        expect(result.results.summary.extra?.includeMeasuredOverFooter).toBe(
          true
        )
      })

      it('should set includeMeasuredOverFooter when flaky tests exist in current run', () => {
        const report = createReportWithPreviousResults()
        report.results.tests = [
          { name: 'test1', status: 'passed', duration: 100, flaky: true }
        ]

        const result = addFooterDisplayFlags(
          report,
          createMultipleReportsInputs()
        )

        expect(result.results.summary.extra?.includeMeasuredOverFooter).toBe(
          true
        )
      })

      it('should set includeMeasuredOverFooter when both failed and flaky tests exist in current run', () => {
        const report = createReportWithPreviousResults()
        report.results.summary.failed = 1
        report.results.tests = [
          { name: 'test1', status: 'failed', duration: 100 },
          { name: 'test2', status: 'passed', duration: 100, flaky: true }
        ]

        const result = addFooterDisplayFlags(
          report,
          createMultipleReportsInputs()
        )

        expect(result.results.summary.extra?.includeMeasuredOverFooter).toBe(
          true
        )
      })
    })

    describe('All runs scenarios', () => {
      it('should NOT set includeFailedReportAllFooter when tests failed across all runs', () => {
        const report = createReportWithPreviousResults()
        report.results.summary.extra = createDefaultExtra({
          finalFailures: 5
        })

        const result = addFooterDisplayFlags(
          report,
          createMultipleReportsInputs()
        )

        expect(result.results.summary.extra?.includeFailedReportAllFooter).toBe(
          false
        )
        expect(result.results.summary.extra?.includeFlakyReportAllFooter).toBe(
          true
        )
        expect(result.results.summary.extra?.showFailedReports).toBe(true)
        expect(result.results.summary.extra?.showFlakyReports).toBe(false)
      })

      it('should NOT set includeFlakyReportAllFooter when flaky tests exist across all runs', () => {
        const report = createReportWithPreviousResults()
        report.results.summary.extra = createDefaultExtra({
          totalFlakyTests: 3
        })

        const result = addFooterDisplayFlags(
          report,
          createMultipleReportsInputs()
        )

        expect(result.results.summary.extra?.includeFlakyReportAllFooter).toBe(
          false
        )
        expect(result.results.summary.extra?.includeFailedReportAllFooter).toBe(
          true
        )
        expect(result.results.summary.extra?.showFailedReports).toBe(false)
        expect(result.results.summary.extra?.showFlakyReports).toBe(true)
      })

      it('should set includeFailedReportAllFooter when no tests failed across all runs', () => {
        const report = createReportWithPreviousResults()
        report.results.summary.extra = createDefaultExtra()

        const result = addFooterDisplayFlags(
          report,
          createMultipleReportsInputs()
        )

        expect(result.results.summary.extra?.includeFailedReportAllFooter).toBe(
          true
        )
        expect(result.results.summary.extra?.showFailedReports).toBe(false)
      })

      it('should set includeFlakyReportAllFooter when no flaky tests across all runs', () => {
        const report = createReportWithPreviousResults()
        report.results.summary.extra = createDefaultExtra()

        const result = addFooterDisplayFlags(
          report,
          createMultipleReportsInputs()
        )

        expect(result.results.summary.extra?.includeFlakyReportAllFooter).toBe(
          true
        )
        expect(result.results.summary.extra?.showFlakyReports).toBe(false)
      })
    })

    describe('Combined scenarios', () => {
      it('should handle tests failing in current AND across all runs', () => {
        const report = createReportWithPreviousResults()
        report.results.summary.failed = 2
        report.results.summary.extra = createDefaultExtra({
          finalFailures: 8
        })
        report.results.tests = [
          { name: 'test1', status: 'failed', duration: 100 }
        ]

        const result = addFooterDisplayFlags(
          report,
          createMultipleReportsInputs()
        )

        expect(result.results.summary.extra?.includeFailedReportAllFooter).toBe(
          false
        )
        expect(result.results.summary.extra?.includeMeasuredOverFooter).toBe(
          true
        )
        expect(result.results.summary.extra?.showFailedReports).toBe(true)
      })

      it('should handle flaky tests in current AND across all runs', () => {
        const report = createReportWithPreviousResults()
        report.results.summary.extra = createDefaultExtra({
          totalFlakyTests: 4
        })
        report.results.tests = [
          { name: 'test1', status: 'passed', duration: 100, flaky: true }
        ]

        const result = addFooterDisplayFlags(
          report,
          createMultipleReportsInputs()
        )

        expect(result.results.summary.extra?.includeFlakyReportAllFooter).toBe(
          false
        )
        expect(result.results.summary.extra?.includeMeasuredOverFooter).toBe(
          true
        )
        expect(result.results.summary.extra?.showFlakyReports).toBe(true)
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

      const result = addFooterDisplayFlags(report, createSingleReportInputs())

      expect(result.results.summary.extra?.showFailedReports).toBe(true)
      expect(result.results.summary.extra?.showFlakyReports).toBe(true)
      expect(result.results.summary.extra?.showSkippedReports).toBe(true)
    })

    it('should hide reports when multiple reports enabled and no failures', () => {
      const report = createBaseReport()
      report.results.summary.failed = 0
      report.results.summary.skipped = 0
      report.results.tests = [
        { name: 'test1', status: 'passed', duration: 100 }
      ]

      const result = addFooterDisplayFlags(
        report,
        createMultipleReportsInputs()
      )

      expect(result.results.summary.extra?.showFailedReports).toBe(false)
      expect(result.results.summary.extra?.showFlakyReports).toBe(false)
      expect(result.results.summary.extra?.showSkippedReports).toBe(false)
    })

    it('should show failed reports when failures exist', () => {
      const report = createBaseReport()
      report.results.summary.failed = 2
      report.results.tests = [
        { name: 'test1', status: 'failed', duration: 100 }
      ]

      const result = addFooterDisplayFlags(
        report,
        createMultipleReportsInputs()
      )

      expect(result.results.summary.extra?.showFailedReports).toBe(true)
      expect(result.results.summary.extra?.showFlakyReports).toBe(false)
    })

    it('should show flaky reports when flaky tests exist', () => {
      const report = createBaseReport()
      report.results.summary.failed = 0
      report.results.tests = [
        { name: 'test1', status: 'passed', duration: 100, flaky: true }
      ]

      const result = addFooterDisplayFlags(
        report,
        createMultipleReportsInputs()
      )

      expect(result.results.summary.extra?.showFailedReports).toBe(false)
      expect(result.results.summary.extra?.showFlakyReports).toBe(true)
    })

    it('should show skipped reports when skipped tests exist', () => {
      const report = createBaseReport()
      report.results.summary.skipped = 1
      report.results.tests = [
        { name: 'test1', status: 'skipped', duration: 100 }
      ]

      const result = addFooterDisplayFlags(
        report,
        createMultipleReportsInputs()
      )

      expect(result.results.summary.extra?.showSkippedReports).toBe(true)
    })
  })

  describe('Measured Over Footer', () => {
    it('should set includeMeasuredOverFooter when previous reports exist', () => {
      const report = createBaseReport()
      report.results.extra = {
        previousReports: [
          {
            results: {
              tool: { name: 'test' },
              summary: {
                tests: 5,
                passed: 5,
                failed: 0,
                skipped: 0,
                pending: 0,
                other: 0,
                start: 0,
                stop: 0
              },
              tests: []
            }
          },
          {
            results: {
              tool: { name: 'test' },
              summary: {
                tests: 3,
                passed: 2,
                failed: 1,
                skipped: 0,
                pending: 0,
                other: 0,
                start: 0,
                stop: 0
              },
              tests: []
            }
          }
        ]
      }

      const result = addFooterDisplayFlags(
        report,
        createMultipleReportsInputs()
      )

      expect(result.results.summary.extra?.includeMeasuredOverFooter).toBe(true)
    })

    it('should NOT set includeMeasuredOverFooter when no previous reports exist', () => {
      const report = createBaseReport()

      const result = addFooterDisplayFlags(
        report,
        createMultipleReportsInputs()
      )

      expect(result.results.summary.extra?.includeMeasuredOverFooter).toBe(
        false
      )
    })

    it('should NOT set includeMeasuredOverFooter when previous reports array is empty', () => {
      const report = createBaseReport()
      report.results.extra = {
        previousReports: []
      }

      const result = addFooterDisplayFlags(
        report,
        createMultipleReportsInputs()
      )

      expect(result.results.summary.extra?.includeMeasuredOverFooter).toBe(
        false
      )
    })
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

function createDefaultExtra(overrides = {}): EnhancedSummaryExtra {
  return {
    previousReports: [
      {
        results: {
          tool: { name: 'test' },
          summary: {
            tests: 5,
            passed: 5,
            failed: 0,
            skipped: 0,
            pending: 0,
            other: 0,
            start: 0,
            stop: 0
          },
          tests: []
        }
      }
    ],
    flakyRate: 0,
    flakyRateChange: 0,
    failRate: 0,
    failRateChange: 0,
    finalResults: 0,
    finalFailures: 0,
    totalFlakyTests: 0,
    includeFailedReportCurrentFooter: false,
    includeFlakyReportCurrentFooter: false,
    includeFailedReportAllFooter: false,
    includeFlakyReportAllFooter: false,
    includeMeasuredOverFooter: false,
    ...overrides
  }
}

function createSingleReportInputs(): Inputs {
  return {
    ctrfPath: '/path/to/ctrf',
    summary: false,
    pullRequest: false,
    issue: '',
    summaryReport: true, // Only 1 report enabled
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
    skippedReport: false,
    suiteFoldedReport: false,
    suiteListReport: false,
    pullRequestReport: false,
    commitReport: false,
    customReport: false,
    insightsReport: false,
    slowestReport: false,
    communityReport: false,
    communityReportName: '',
    artifactName: '',
    annotate: false,
    title: '',
    onFailOnly: false,
    exitOnFail: false,
    useSuiteName: false,
    previousResultsMax: 0,
    metricsReportsMax: 0,
    maxWorkflowRunsToCheck: 0,
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
    statusCheck: false,
    statusCheckName: '',
    reportOrder: []
  }
}
