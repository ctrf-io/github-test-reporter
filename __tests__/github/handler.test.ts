import * as core from '@actions/core'
import { context } from '@actions/github'
import { createCheckRun } from '../../src/client/github/checks'
import {
  createStatusCheck,
  findExistingMarkedComment,
  handleComment,
  handleViewsAndComments
} from '../../src/github/handler'
import { Inputs } from '../../src/types'
import { Report } from 'ctrf'
import * as githubClient from '../../src/client/github'
import { components } from '@octokit/openapi-types'
import Handlebars from 'handlebars'

type IssueComment = components['schemas']['issue-comment']

beforeAll(() => {
  Handlebars.registerHelper(
    'formatDurationFromTimes',
    function (start: number, stop: number) {
      return '0ms'
    }
  )

  Handlebars.registerHelper('getCtrfEmoji', (status: string) => {
    return '✅'
  })

  Handlebars.registerHelper('addAll', function (...args: any[]) {
    return 0
  })

  Handlebars.registerHelper('countFlaky', function (tests: any[]) {
    return 0
  })

  Handlebars.registerHelper(
    'formatDurationFromTimes',
    function (start: number, stop: number) {
      return '0ms'
    }
  )

  Handlebars.registerHelper('formatDurationMs', function (duration: number) {
    return '0ms'
  })

  Handlebars.registerHelper('escapeMarkdown', function (text: string) {
    return text || ''
  })

  Handlebars.registerHelper('gt', function (a: number, b: number) {
    return false
  })

  Handlebars.registerHelper('lt', function (a: number, b: number) {
    return false
  })

  Handlebars.registerHelper('eq', function (a: any, b: any) {
    return false
  })

  Handlebars.registerHelper(
    'toPercent',
    function (value: number, decimals: number = 2) {
      return '0%'
    }
  )

  Handlebars.registerHelper('uppercase', function (text: string) {
    return text || ''
  })

  Handlebars.registerHelper(
    'slice',
    function (array: any[], start: number, end: number) {
      return []
    }
  )

  Handlebars.registerHelper(
    'sliceString',
    function (str: string, _start: number, _end: number) {
      return str || ''
    }
  )

  Handlebars.registerHelper('countFlakyTests', function (tests: any[]) {
    return 0
  })
})

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
jest.mock('../../src/client/github')

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

    const report: Report = {
      results: {
        summary: {
          failed: 0
        }
      }
    } as Report

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

    const report: Report = {
      results: {
        summary: {
          failed: 1
        }
      }
    } as Report

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

    const report: Report = {
      results: {
        summary: {
          failed: 0
        }
      }
    } as Report

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
  const mockListComments = jest.mocked(githubClient.listComments)

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
  const mockAddComment = jest.fn()
  const mockUpdateComment = jest.fn()
  const mockListComments = jest.fn()

  beforeEach(() => {
    jest.resetAllMocks()
    ;(githubClient.addCommentToIssue as jest.Mock) = mockAddComment
    ;(githubClient.updateComment as jest.Mock) = mockUpdateComment
    ;(githubClient.listComments as jest.Mock) = mockListComments
  })

  describe('New PR - All flags disabled', () => {
    it('should create new comment when no comments exist', async () => {
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
  })

  describe('New PR - updateComment enabled', () => {
    it('should create new comment when no comment exists and updateComment enabled', async () => {
      mockListComments.mockResolvedValue([])

      await handleComment('owner', 'repo', 1, 'New comment', 'MARKER', {
        shouldUpdate: true,
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

    it('should create new comment when no comment exists and updateComment and alwaysLatest enabled', async () => {
      mockListComments.mockResolvedValue([])

      await handleComment('owner', 'repo', 1, 'New comment', 'MARKER', {
        shouldUpdate: true,
        shouldOverwrite: false,
        alwaysLatestComment: true
      })

      expect(mockAddComment).toHaveBeenCalledWith(
        'owner',
        'repo',
        1,
        'New comment\nMARKER'
      )
      expect(mockUpdateComment).not.toHaveBeenCalled()
    })
  })

  describe('New PR - overwriteComment enabled', () => {
    it('should create new comment when no comment exists and overwriteComment enabled', async () => {
      mockListComments.mockResolvedValue([])

      await handleComment('owner', 'repo', 1, 'New comment', 'MARKER', {
        shouldUpdate: false,
        shouldOverwrite: true,
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

    it('should create new comment when no comment exists and overwriteComment and alwaysLatest enabled', async () => {
      mockListComments.mockResolvedValue([])

      await handleComment('owner', 'repo', 1, 'New comment', 'MARKER', {
        shouldUpdate: false,
        shouldOverwrite: true,
        alwaysLatestComment: true
      })

      expect(mockAddComment).toHaveBeenCalledWith(
        'owner',
        'repo',
        1,
        'New comment\nMARKER'
      )
      expect(mockUpdateComment).not.toHaveBeenCalled()
    })
  })

  describe('Existing PR - All flags disabled', () => {
    it('should create new comment when comment found and no flags enabled', async () => {
      const existingComments = [
        {
          id: 1,
          node_id: 'node1',
          url: 'url1',
          html_url: 'html1',
          body: 'Existing comment with MARKER',
          user: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ] as IssueComment[]

      mockListComments.mockResolvedValue(existingComments)

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
  })

  describe('Existing PR - updateComment enabled', () => {
    it('should update existing comment when updateComment enabled', async () => {
      const existingComments = [
        {
          id: 1,
          node_id: 'node1',
          url: 'url1',
          html_url: 'html1',
          body: 'Existing comment with MARKER',
          user: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ] as IssueComment[]

      mockListComments.mockResolvedValue(existingComments)

      await handleComment('owner', 'repo', 1, 'Updated comment', 'MARKER', {
        shouldUpdate: true,
        shouldOverwrite: false,
        alwaysLatestComment: false
      })

      expect(mockUpdateComment).toHaveBeenCalled()
      expect(mockAddComment).not.toHaveBeenCalled()
    })

    it('should update existing comment when updateComment enabled and alwaysLatest enabled and comment is latest', async () => {
      const existingComments = [
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
          body: 'Latest comment with MARKER',
          user: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ] as IssueComment[]

      mockListComments.mockResolvedValue(existingComments)

      await handleComment('owner', 'repo', 1, 'Updated comment', 'MARKER', {
        shouldUpdate: true,
        shouldOverwrite: false,
        alwaysLatestComment: true
      })

      expect(mockUpdateComment).toHaveBeenCalled()
      expect(mockAddComment).not.toHaveBeenCalled()
    })

    it('should create new comment when updateComment enabled and alwaysLatest enabled and comment is not latest', async () => {
      const existingComments = [
        {
          id: 1,
          node_id: 'node1',
          url: 'url1',
          html_url: 'html1',
          body: 'Comment with MARKER',
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

      mockListComments.mockResolvedValue(existingComments)

      await handleComment('owner', 'repo', 1, 'New comment', 'MARKER', {
        shouldUpdate: true,
        shouldOverwrite: false,
        alwaysLatestComment: true
      })

      expect(mockAddComment).toHaveBeenCalledWith(
        'owner',
        'repo',
        1,
        'New comment\nMARKER'
      )
      expect(mockUpdateComment).not.toHaveBeenCalled()
    })
  })

  describe('Existing PR - overwriteComment enabled', () => {
    it('should overwrite existing comment when overwriteComment enabled', async () => {
      const existingComments = [
        {
          id: 1,
          node_id: 'node1',
          url: 'url1',
          html_url: 'html1',
          body: 'Existing comment with MARKER',
          user: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ] as IssueComment[]

      mockListComments.mockResolvedValue(existingComments)

      await handleComment('owner', 'repo', 1, 'Overwritten comment', 'MARKER', {
        shouldUpdate: false,
        shouldOverwrite: true,
        alwaysLatestComment: false
      })

      expect(mockUpdateComment).toHaveBeenCalled()
      expect(mockAddComment).not.toHaveBeenCalled()
    })

    it('should overwrite existing comment when overwriteComment enabled and alwaysLatest enabled and comment is latest', async () => {
      const existingComments = [
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
          body: 'Latest comment with MARKER',
          user: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ] as IssueComment[]

      mockListComments.mockResolvedValue(existingComments)

      await handleComment('owner', 'repo', 1, 'Overwritten comment', 'MARKER', {
        shouldUpdate: false,
        shouldOverwrite: true,
        alwaysLatestComment: true
      })

      expect(mockUpdateComment).toHaveBeenCalled()
      expect(mockAddComment).not.toHaveBeenCalled()
    })

    it('should create new comment when overwriteComment enabled and alwaysLatest enabled and comment is not latest', async () => {
      const existingComments = [
        {
          id: 1,
          node_id: 'node1',
          url: 'url1',
          html_url: 'html1',
          body: 'Comment with MARKER',
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

      mockListComments.mockResolvedValue(existingComments)

      await handleComment('owner', 'repo', 1, 'New comment', 'MARKER', {
        shouldUpdate: false,
        shouldOverwrite: true,
        alwaysLatestComment: true
      })

      expect(mockAddComment).toHaveBeenCalledWith(
        'owner',
        'repo',
        1,
        'New comment\nMARKER'
      )
      expect(mockUpdateComment).not.toHaveBeenCalled()
    })
  })
})

describe('handleViewsAndComments', () => {
  const mockCore = jest.mocked(core)
  beforeEach(() => {
    jest.clearAllMocks()
    context.payload ||= {}
    mockCore.summary.stringify.mockReturnValue('Test summary')
    mockCore.summary.addRaw.mockImplementation(
      jest
        .requireActual<typeof core>('@actions/core')
        .summary.addRaw.bind(core.summary)
    )
    mockCore.summary.addEOL.mockImplementation(
      jest
        .requireActual<typeof core>('@actions/core')
        .summary.addEOL.bind(core.summary)
    )
  })

  it('should create a check run with views and comments', async () => {
    const inputs: Inputs = {
      statusCheckName: 'Test Status',
      statusCheck: true
    } as Inputs

    const report = {
      results: {
        summary: {
          failed: 0
        },
        tests: []
      },
      extra: {
        reportConditionals: {
          includeFailedReportCurrentFooter: false
        }
      }
    } as unknown as Report
    await handleViewsAndComments(inputs, report)

    expect(mockCore.setOutput).toHaveBeenCalledTimes(2)
  })
})
