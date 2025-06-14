import * as core from '@actions/core'
import { createCheckRun } from '../../src/client/github/checks'
import {
  createStatusCheck,
  findExistingMarkedComment,
  handleComment
} from '../../src/github/handler'
import { CtrfReport, Inputs } from '../../src/types'
import {
  listComments,
  addCommentToIssue,
  updateComment
} from '../../src/client/github'
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
  listComments: jest.fn(),
  addCommentToIssue: jest.fn(),
  updateComment: jest.fn()
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

describe('handleComment', () => {
  const mockListComments = jest.mocked(listComments)
  const mockAddComment = jest.mocked(addCommentToIssue)
  const mockUpdateComment = jest.mocked(updateComment)

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should create new comment when no existing comment exists', async () => {
    mockListComments.mockResolvedValue([])

    await handleComment('owner', 'repo', 1, 'New comment', 'MARKER', {
      shouldUpdate: false,
      shouldOverwrite: false,
      alwaysLatestComment: false
    })

    expect(mockAddComment).toHaveBeenCalledWith(
      'owner',
      'repo',
      1,
      'New comment\nMARKER'
    )
    expect(mockUpdateComment).not.toHaveBeenCalled()
  })

  it('should append to existing comment when shouldUpdate is true and shouldOverwrite is false', async () => {
    const existingComment = {
      id: 1,
      node_id: 'node1',
      url: 'url1',
      html_url: 'html1',
      body: 'Existing content\nMARKER',
      user: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as IssueComment
    mockListComments.mockResolvedValue([existingComment])

    await handleComment('owner', 'repo', 1, 'New content', 'MARKER', {
      shouldUpdate: true,
      shouldOverwrite: false,
      alwaysLatestComment: false
    })

    expect(mockUpdateComment).toHaveBeenCalledWith(
      1,
      'owner',
      'repo',
      1,
      'Existing content\nMARKER\n\n---\n\nNew content\nMARKER'
    )
    expect(mockAddComment).not.toHaveBeenCalled()
  })

  it('should overwrite existing comment when shouldUpdate and shouldOverwrite are true', async () => {
    const existingComment = {
      id: 1,
      node_id: 'node1',
      url: 'url1',
      html_url: 'html1',
      body: 'Old content\nMARKER',
      user: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as IssueComment
    mockListComments.mockResolvedValue([existingComment])

    await handleComment('owner', 'repo', 1, 'New content', 'MARKER', {
      shouldUpdate: true,
      shouldOverwrite: true,
      alwaysLatestComment: false
    })

    expect(mockUpdateComment).toHaveBeenCalledWith(
      1,
      'owner',
      'repo',
      1,
      'New content\n\n🔄 This comment has been updated\nMARKER'
    )
    expect(mockAddComment).not.toHaveBeenCalled()
  })

  it('should create new comment when alwaysLatestComment is true and existing comment is not latest', async () => {
    const comments = [
      {
        id: 1,
        node_id: 'node1',
        url: 'url1',
        html_url: 'html1',
        body: 'Tagged comment\nMARKER',
        user: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 2,
        node_id: 'node2',
        url: 'url2',
        html_url: 'html2',
        body: 'Latest comment',
        user: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ] as IssueComment[]
    mockListComments.mockResolvedValue(comments)

    await handleComment('owner', 'repo', 1, 'New content', 'MARKER', {
      shouldUpdate: false,
      shouldOverwrite: false,
      alwaysLatestComment: true
    })

    expect(mockAddComment).toHaveBeenCalledWith(
      'owner',
      'repo',
      1,
      'New content\nMARKER'
    )
    expect(mockUpdateComment).not.toHaveBeenCalled()
  })

  it('should update existing comment when alwaysLatestComment is true but comment is already latest', async () => {
    const comments = [
      {
        id: 1,
        node_id: 'node1',
        url: 'url1',
        html_url: 'html1',
        body: 'First comment',
        user: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 2,
        node_id: 'node2',
        url: 'url2',
        html_url: 'html2',
        body: 'Tagged comment\nMARKER',
        user: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ] as IssueComment[]
    mockListComments.mockResolvedValue(comments)

    await handleComment('owner', 'repo', 1, 'New content', 'MARKER', {
      shouldUpdate: true,
      shouldOverwrite: false,
      alwaysLatestComment: true
    })

    expect(mockUpdateComment).toHaveBeenCalledWith(
      2,
      'owner',
      'repo',
      1,
      'Tagged comment\nMARKER\n\n---\n\nNew content\nMARKER'
    )
    expect(mockAddComment).not.toHaveBeenCalled()
  })

  it('should update existing comment when alwaysLatestComment and shouldUpdate are true, even if not latest', async () => {
    const comments = [
      {
        id: 1,
        node_id: 'node1',
        url: 'url1',
        html_url: 'html1',
        body: 'Tagged comment\nMARKER',
        user: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 2,
        node_id: 'node2',
        url: 'url2',
        html_url: 'html2',
        body: 'Latest comment',
        user: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ] as IssueComment[]
    mockListComments.mockResolvedValue(comments)

    await handleComment('owner', 'repo', 1, 'New content', 'MARKER', {
      shouldUpdate: true,
      shouldOverwrite: false,
      alwaysLatestComment: true
    })

    expect(mockUpdateComment).toHaveBeenCalledWith(
      1,
      'owner',
      'repo',
      1,
      'Tagged comment\nMARKER\n\n---\n\nNew content\nMARKER'
    )
    expect(mockAddComment).not.toHaveBeenCalled()
  })
})
