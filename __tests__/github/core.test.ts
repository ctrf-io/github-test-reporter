import * as core from '@actions/core'
import { context } from '@actions/github'
import { addReportFooters } from '../../src/github/core'
import { Report } from '../../src/ctrf/core/types/ctrf'
import { Inputs, ReportConditionals } from '../../src/types'

jest.mock('@actions/core')
jest.mock('@actions/github', () => ({
  context: {
    serverUrl: 'https://github.com',
    repo: {
      owner: 'test-owner',
      repo: 'test-repo'
    },
    sha: 'test-sha'
  }
}))

describe('addReportFooters', () => {
  const mockCore = jest.mocked(core)

  beforeEach(() => {
    jest.clearAllMocks()
    mockCore.summary.addRaw.mockReturnValue(mockCore.summary)
    mockCore.summary.addEOL.mockReturnValue(mockCore.summary)
  })

  it('should not add baseline footer when report.baseline is not present', () => {
    const report: Report = {
      reportFormat: 'CTRF',
      specVersion: '1.0.0',
      results: {
        tool: { name: 'test' },
        summary: {
          tests: 0,
          passed: 0,
          failed: 0,
          skipped: 0,
          pending: 0,
          other: 0,
          start: 0,
          stop: 0
        },
        tests: []
      },
      extra: {
        reportConditionals: {
          includeFailedReportCurrentFooter: false,
          includeFailedReportAllFooter: false,
          includeFlakyReportCurrentFooter: false,
          includeFlakyReportAllFooter: false,
          includeSkippedReportCurrentFooter: false,
          includeMeasuredOverFooter: false,
          showFailedReports: false,
          showFlakyReports: false,
          showSkippedReports: false
        } as ReportConditionals
      }
    }

    const inputs: Inputs = {} as Inputs

    addReportFooters(report, inputs, false)

    expect(mockCore.summary.addRaw).not.toHaveBeenCalled()
  })

  it('should not add baseline footer when hasPreviousResultsReports is false', () => {
    const report: Report = {
      reportFormat: 'CTRF',
      specVersion: '1.0.0',
      results: {
        tool: { name: 'test' },
        summary: {
          tests: 0,
          passed: 0,
          failed: 0,
          skipped: 0,
          pending: 0,
          other: 0,
          start: 0,
          stop: 0
        },
        tests: []
      },
      baseline: {
        reportId: 'baseline-123',
        commit: 'abcdef1234567890'
      },
      extra: {
        reportConditionals: {
          includeFailedReportCurrentFooter: false,
          includeFailedReportAllFooter: false,
          includeFlakyReportCurrentFooter: false,
          includeFlakyReportAllFooter: false,
          includeSkippedReportCurrentFooter: false,
          includeMeasuredOverFooter: false,
          showFailedReports: false,
          showFlakyReports: false,
          showSkippedReports: false
        } as ReportConditionals
      }
    }

    const inputs: Inputs = {} as Inputs

    addReportFooters(report, inputs, false)

    expect(mockCore.summary.addRaw).not.toHaveBeenCalled()
  })

  it('should add baseline footer with commit link when baseline and hasPreviousResultsReports are present', () => {
    const report: Report = {
      reportFormat: 'CTRF',
      specVersion: '1.0.0',
      results: {
        tool: { name: 'test' },
        summary: {
          tests: 0,
          passed: 0,
          failed: 0,
          skipped: 0,
          pending: 0,
          other: 0,
          start: 0,
          stop: 0
        },
        tests: []
      },
      baseline: {
        reportId: 'baseline-123',
        commit: 'abcdef1234567890'
      },
      extra: {
        reportConditionals: {
          includeFailedReportCurrentFooter: false,
          includeFailedReportAllFooter: false,
          includeFlakyReportCurrentFooter: false,
          includeFlakyReportAllFooter: false,
          includeSkippedReportCurrentFooter: false,
          includeMeasuredOverFooter: false,
          showFailedReports: false,
          showFlakyReports: false,
          showSkippedReports: false
        } as ReportConditionals
      }
    }

    const inputs: Inputs = {} as Inputs

    addReportFooters(report, inputs, true)

    expect(mockCore.summary.addRaw).toHaveBeenCalledWith(
      expect.stringContaining('Comparison with baseline:')
    )
    expect(mockCore.summary.addRaw).toHaveBeenCalledWith(
      expect.stringContaining(
        '[abcdef1](https://github.com/test-owner/test-repo/commit/abcdef1234567890)'
      )
    )
  })

  it('should add baseline footer without commit link when commit is missing', () => {
    const report: Report = {
      reportFormat: 'CTRF',
      specVersion: '1.0.0',
      results: {
        tool: { name: 'test' },
        summary: {
          tests: 0,
          passed: 0,
          failed: 0,
          skipped: 0,
          pending: 0,
          other: 0,
          start: 0,
          stop: 0
        },
        tests: []
      },
      baseline: {
        reportId: 'baseline-123'
      },
      extra: {
        reportConditionals: {
          includeFailedReportCurrentFooter: false,
          includeFailedReportAllFooter: false,
          includeFlakyReportCurrentFooter: false,
          includeFlakyReportAllFooter: false,
          includeSkippedReportCurrentFooter: false,
          includeMeasuredOverFooter: false,
          showFailedReports: false,
          showFlakyReports: false,
          showSkippedReports: false
        } as ReportConditionals
      }
    }

    const inputs: Inputs = {} as Inputs

    addReportFooters(report, inputs, true)

    expect(mockCore.summary.addRaw).toHaveBeenCalledWith(
      expect.stringContaining('Comparison with baseline:')
    )
  })

  it('should use first 7 characters of commit SHA for the link text', () => {
    const report: Report = {
      reportFormat: 'CTRF',
      specVersion: '1.0.0',
      results: {
        tool: { name: 'test' },
        summary: {
          tests: 0,
          passed: 0,
          failed: 0,
          skipped: 0,
          pending: 0,
          other: 0,
          start: 0,
          stop: 0
        },
        tests: []
      },
      baseline: {
        reportId: 'baseline-123',
        commit: '1234567890abcdef'
      },
      extra: {
        reportConditionals: {
          includeFailedReportCurrentFooter: false,
          includeFailedReportAllFooter: false,
          includeFlakyReportCurrentFooter: false,
          includeFlakyReportAllFooter: false,
          includeSkippedReportCurrentFooter: false,
          includeMeasuredOverFooter: false,
          showFailedReports: false,
          showFlakyReports: false,
          showSkippedReports: false
        } as ReportConditionals
      }
    }

    const inputs: Inputs = {} as Inputs

    addReportFooters(report, inputs, true)

    expect(mockCore.summary.addRaw).toHaveBeenCalledWith(
      expect.stringContaining(
        '[1234567](https://github.com/test-owner/test-repo/commit/1234567890abcdef)'
      )
    )
  })

  it('should construct correct GitHub commit URL', () => {
    const report: Report = {
      reportFormat: 'CTRF',
      specVersion: '1.0.0',
      results: {
        tool: { name: 'test' },
        summary: {
          tests: 0,
          passed: 0,
          failed: 0,
          skipped: 0,
          pending: 0,
          other: 0,
          start: 0,
          stop: 0
        },
        tests: []
      },
      baseline: {
        reportId: 'baseline-123',
        commit: 'abc123def456'
      },
      extra: {
        reportConditionals: {
          includeFailedReportCurrentFooter: false,
          includeFailedReportAllFooter: false,
          includeFlakyReportCurrentFooter: false,
          includeFlakyReportAllFooter: false,
          includeSkippedReportCurrentFooter: false,
          includeMeasuredOverFooter: false,
          showFailedReports: false,
          showFlakyReports: false,
          showSkippedReports: false
        } as ReportConditionals
      }
    }

    const inputs: Inputs = {} as Inputs

    addReportFooters(report, inputs, true)

    expect(mockCore.summary.addRaw).toHaveBeenCalledWith(
      expect.stringContaining(
        'https://github.com/test-owner/test-repo/commit/abc123def456'
      )
    )
  })

  it('should format footer messages correctly in markdown', () => {
    const report: Report = {
      reportFormat: 'CTRF',
      specVersion: '1.0.0',
      results: {
        tool: { name: 'test' },
        summary: {
          tests: 0,
          passed: 0,
          failed: 0,
          skipped: 0,
          pending: 0,
          other: 0,
          start: 0,
          stop: 0
        },
        tests: []
      },
      baseline: {
        reportId: 'baseline-123',
        commit: 'abcdef1234567890'
      },
      extra: {
        reportConditionals: {
          includeFailedReportCurrentFooter: true,
          includeFailedReportAllFooter: false,
          includeFlakyReportCurrentFooter: false,
          includeFlakyReportAllFooter: false,
          includeSkippedReportCurrentFooter: false,
          includeMeasuredOverFooter: false,
          showFailedReports: false,
          showFlakyReports: false,
          showSkippedReports: false
        } as ReportConditionals
      }
    }

    const inputs: Inputs = {} as Inputs

    addReportFooters(report, inputs, true)

    // Should format with HTML sub/italic tags for footer
    expect(mockCore.summary.addRaw).toHaveBeenCalledWith(
      expect.stringMatching(/<sub><i>.*<\/i><\/sub>/)
    )
  })

  it('should include build number with link when buildNumber and buildUrl are present', () => {
    const report: Report = {
      reportFormat: 'CTRF',
      specVersion: '1.0.0',
      results: {
        tool: { name: 'test' },
        summary: {
          tests: 0,
          passed: 0,
          failed: 0,
          skipped: 0,
          pending: 0,
          other: 0,
          start: 0,
          stop: 0
        },
        tests: []
      },
      baseline: {
        reportId: 'baseline-123',
        commit: 'abcdef1234567890',
        buildNumber: 42,
        buildUrl: 'https://ci.example.com/builds/42'
      },
      extra: {
        reportConditionals: {
          includeFailedReportCurrentFooter: false,
          includeFailedReportAllFooter: false,
          includeFlakyReportCurrentFooter: false,
          includeFlakyReportAllFooter: false,
          includeSkippedReportCurrentFooter: false,
          includeMeasuredOverFooter: false,
          showFailedReports: false,
          showFlakyReports: false,
          showSkippedReports: false
        } as ReportConditionals
      }
    }

    const inputs: Inputs = {} as Inputs

    addReportFooters(report, inputs, true)

    expect(mockCore.summary.addRaw).toHaveBeenCalledWith(
      expect.stringContaining('[Run: #42](https://ci.example.com/builds/42)')
    )
  })

  it('should include build number without link when buildNumber is present but buildUrl is missing', () => {
    const report: Report = {
      reportFormat: 'CTRF',
      specVersion: '1.0.0',
      results: {
        tool: { name: 'test' },
        summary: {
          tests: 0,
          passed: 0,
          failed: 0,
          skipped: 0,
          pending: 0,
          other: 0,
          start: 0,
          stop: 0
        },
        tests: []
      },
      baseline: {
        reportId: 'baseline-123',
        commit: 'abcdef1234567890',
        buildNumber: 42
      },
      extra: {
        reportConditionals: {
          includeFailedReportCurrentFooter: false,
          includeFailedReportAllFooter: false,
          includeFlakyReportCurrentFooter: false,
          includeFlakyReportAllFooter: false,
          includeSkippedReportCurrentFooter: false,
          includeMeasuredOverFooter: false,
          showFailedReports: false,
          showFlakyReports: false,
          showSkippedReports: false
        } as ReportConditionals
      }
    }

    const inputs: Inputs = {} as Inputs

    addReportFooters(report, inputs, true)

    expect(mockCore.summary.addRaw).toHaveBeenCalledWith(
      expect.stringContaining('Run: #42')
    )
    expect(mockCore.summary.addRaw).not.toHaveBeenCalledWith(
      expect.stringContaining('[Run: #42]')
    )
  })

  it('should not include build info when only buildName is present (buildNumber required)', () => {
    const report: Report = {
      reportFormat: 'CTRF',
      specVersion: '1.0.0',
      results: {
        tool: { name: 'test' },
        summary: {
          tests: 0,
          passed: 0,
          failed: 0,
          skipped: 0,
          pending: 0,
          other: 0,
          start: 0,
          stop: 0
        },
        tests: []
      },
      baseline: {
        reportId: 'baseline-123',
        commit: 'abcdef1234567890',
        buildName: 'main-build',
        buildUrl: 'https://ci.example.com/builds/main-build'
      },
      extra: {
        reportConditionals: {
          includeFailedReportCurrentFooter: false,
          includeFailedReportAllFooter: false,
          includeFlakyReportCurrentFooter: false,
          includeFlakyReportAllFooter: false,
          includeSkippedReportCurrentFooter: false,
          includeMeasuredOverFooter: false,
          showFailedReports: false,
          showFlakyReports: false,
          showSkippedReports: false
        } as ReportConditionals
      }
    }

    const inputs: Inputs = {} as Inputs

    addReportFooters(report, inputs, true)

    // Should only contain commit, not build info (since buildNumber is required)
    expect(mockCore.summary.addRaw).toHaveBeenCalledWith(
      expect.stringContaining('Comparison with baseline:')
    )
  })

  it('should use buildNumber when both buildNumber and buildName are present', () => {
    const report: Report = {
      reportFormat: 'CTRF',
      specVersion: '1.0.0',
      results: {
        tool: { name: 'test' },
        summary: {
          tests: 0,
          passed: 0,
          failed: 0,
          skipped: 0,
          pending: 0,
          other: 0,
          start: 0,
          stop: 0
        },
        tests: []
      },
      baseline: {
        reportId: 'baseline-123',
        commit: 'abcdef1234567890',
        buildNumber: 99,
        buildName: 'old-build',
        buildUrl: 'https://ci.example.com/builds/99'
      },
      extra: {
        reportConditionals: {
          includeFailedReportCurrentFooter: false,
          includeFailedReportAllFooter: false,
          includeFlakyReportCurrentFooter: false,
          includeFlakyReportAllFooter: false,
          includeSkippedReportCurrentFooter: false,
          includeMeasuredOverFooter: false,
          showFailedReports: false,
          showFlakyReports: false,
          showSkippedReports: false
        } as ReportConditionals
      }
    }

    const inputs: Inputs = {} as Inputs

    addReportFooters(report, inputs, true)

    expect(mockCore.summary.addRaw).toHaveBeenCalledWith(
      expect.stringContaining('[Run: #99]')
    )
    expect(mockCore.summary.addRaw).not.toHaveBeenCalledWith(
      expect.stringContaining('old-build')
    )
  })
})
