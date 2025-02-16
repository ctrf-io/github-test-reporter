import * as core from '@actions/core'
import { createCheckRun } from '../../src/client/github/checks'
import { createStatusCheck } from '../../src/github/handler'
import { CtrfReport, Inputs } from '../../src/types'

// Mock dependencies
jest.mock('@actions/core')
jest.mock('@actions/github', () => ({
  context: {
    repo: {
      owner: 'test-owner',
      repo: 'test-repo'
    },
    sha: 'test-sha'
  }
}))
jest.mock('../../src/client/github/checks', () => ({
  createCheckRun: jest.fn()
}))

describe('createStatusCheck', () => {
  const mockCore = jest.mocked(core)
  const mockCreateCheckRun = jest.mocked(createCheckRun)

  beforeEach(() => {
    jest.clearAllMocks()
    mockCore.summary.stringify.mockReturnValue('Test summary')
  })

  it('should create a successful check run when no tests failed', async () => {
    const inputs: Inputs = {
      statusCheckName: 'Test Status',
      statusCheck: true
    } as Inputs

    const report: CtrfReport = {
      results: {
        summary: {
          failed: 0
        }
      }
    } as CtrfReport

    await createStatusCheck(inputs, report)

    expect(mockCreateCheckRun).toHaveBeenCalledWith(
      'test-owner',
      'test-repo',
      'test-sha',
      'Test Status',
      'completed',
      'success',
      'Test Results',
      'Test summary'
    )
  })

  it('should create a failed check run when tests failed', async () => {
    const inputs: Inputs = {
      statusCheckName: 'Test Status',
      statusCheck: true
    } as Inputs

    const report: CtrfReport = {
      results: {
        summary: {
          failed: 1
        }
      }
    } as CtrfReport

    await createStatusCheck(inputs, report)

    expect(mockCreateCheckRun).toHaveBeenCalledWith(
      'test-owner',
      'test-repo',
      'test-sha',
      'Test Status',
      'completed',
      'failure',
      'Test Results',
      'Test summary'
    )
  })

  it('should truncate summary if it exceeds 65000 characters', async () => {
    const longSummary = 'a'.repeat(65001)
    mockCore.summary.stringify.mockReturnValue(longSummary)

    const inputs: Inputs = {
      statusCheckName: 'Test Status',
      statusCheck: true
    } as Inputs

    const report: CtrfReport = {
      results: {
        summary: {
          failed: 0
        }
      }
    } as CtrfReport

    await createStatusCheck(inputs, report)

    expect(mockCore.warning).toHaveBeenCalledWith(
      'Summary is too long to create a status check. Truncating...'
    )
    expect(mockCreateCheckRun).toHaveBeenCalledWith(
      'test-owner',
      'test-repo',
      'test-sha',
      'Test Status',
      'completed',
      'success',
      'Test Results',
      expect.stringMatching(/^a{65000}$/)
    )
  })
})
