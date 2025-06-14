import * as core from '@actions/core'
import { createCheckRun } from '../../src/client/github/checks'
import {
  createStatusCheck,
  findExistingMarkedComment
} from '../../src/github/handler'
import { CtrfReport, Inputs } from '../../src/types'
import { listComments } from '../../src/client/github'
import { components } from '@octokit/openapi-types'

type IssueComment = components['schemas']['issue-comment']

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
jest.mock('../../src/client/github', () => ({
  listComments: jest.fn()
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

describe('findExistingMarkedComment', () => {
  const mockListComments = jest.mocked(listComments)

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return undefined when no comments exist', async () => {
    mockListComments.mockResolvedValue([])

    const result = await findExistingMarkedComment(
      'owner',
      'repo',
      1,
      '<!-- MARKER -->'
    )

    expect(result.comment).toBeUndefined()
    expect(result.isLatest).toBeFalsy()
  })

  it('should return undefined when no comment with marker exists', async () => {
    const comments = [
      {
        id: 1,
        node_id: 'node1',
        url: 'url1',
        html_url: 'html1',
        body: 'Comment without marker',
        user: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 2,
        node_id: 'node2',
        url: 'url2',
        html_url: 'html2',
        body: 'Another comment without marker',
        user: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ] as IssueComment[]

    mockListComments.mockResolvedValue(comments)

    const result = await findExistingMarkedComment(
      'owner',
      'repo',
      1,
      '<!-- MARKER -->'
    )

    expect(result.comment).toBeUndefined()
    expect(result.isLatest).toBeFalsy()
  })

  it('should find marked comment and identify it is not latest', async () => {
    const comments = [
      {
        id: 1,
        node_id: 'node1',
        url: 'url1',
        html_url: 'html1',
        body: 'Comment with marker <!-- MARKER -->',
        user: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 2,
        node_id: 'node2',
        url: 'url2',
        html_url: 'html2',
        body: 'Latest comment without marker',
        user: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ] as IssueComment[]

    mockListComments.mockResolvedValue(comments)

    const result = await findExistingMarkedComment(
      'owner',
      'repo',
      1,
      '<!-- MARKER -->'
    )

    expect(result.comment).toEqual(comments[0])
    expect(result.isLatest).toBeFalsy()
  })

  it('should find marked comment and identify it is latest', async () => {
    const comments = [
      {
        id: 1,
        node_id: 'node1',
        url: 'url1',
        html_url: 'html1',
        body: 'First comment without marker',
        user: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 2,
        node_id: 'node2',
        url: 'url2',
        html_url: 'html2',
        body: 'Comment with marker <!-- MARKER -->',
        user: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ] as IssueComment[]

    mockListComments.mockResolvedValue(comments)

    const result = await findExistingMarkedComment(
      'owner',
      'repo',
      1,
      '<!-- MARKER -->'
    )

    expect(result.comment).toEqual(comments[1])
    expect(result.isLatest).toBeTruthy()
  })

  it('should find the latest marked comment when multiple exist', async () => {
    const comments = [
      {
        id: 1,
        node_id: 'node1',
        url: 'url1',
        html_url: 'html1',
        body: 'Old comment with marker <!-- MARKER -->',
        user: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 2,
        node_id: 'node2',
        url: 'url2',
        html_url: 'html2',
        body: 'Latest comment with marker <!-- MARKER -->',
        user: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ] as IssueComment[]

    mockListComments.mockResolvedValue(comments)

    const result = await findExistingMarkedComment(
      'owner',
      'repo',
      1,
      '<!-- MARKER -->'
    )

    expect(result.comment).toEqual(comments[1])
    expect(result.isLatest).toBeTruthy()
  })
})
