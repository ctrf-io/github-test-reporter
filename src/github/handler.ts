import * as core from '@actions/core'
import { context } from '@actions/github'
import {
  updateComment,
  listComments,
  addCommentToIssue
} from '../client/github'
import { CtrfReport, Inputs } from '../types'
import { generateViews, annotateFailed } from './core'
import { components } from '@octokit/openapi-types'

type IssueComment = components['schemas']['issue-comment']
const UPDATE_EMOJI = '🔄'

/**
 * Handles the generation of views and comments for a CTRF report.
 *
 * - Generates various views of the CTRF report and adds them to the GitHub Actions summary.
 * - Adds or updates a comment on the pull request if conditions are met.
 * - Writes the summary to the GitHub Actions output if requested.
 *
 * @param inputs - The user-provided inputs for configuring views and comments.
 * @param report - The CTRF report containing test results.
 * @returns A promise that resolves when the operations are completed.
 */
export async function handleViewsAndComments(
  inputs: Inputs,
  report: CtrfReport
): Promise<void> {
  core.startGroup(`📝 Generating reports`)
  const INVISIBLE_MARKER = inputs.commentTag
    ? `<!-- CTRF PR COMMENT TAG: ${inputs.commentTag} -->`
    : `<!-- CTRF PR COMMENT TAG: DEFAULT -->`

  generateViews(inputs, report)

  if (shouldAddCommentToPullRequest(inputs, report)) {
    await postOrUpdatePRComment(inputs, INVISIBLE_MARKER)
  }

  if (inputs.issue) {
    await postOrUpdateIssueComment(inputs, INVISIBLE_MARKER)
  }

  if (inputs.summary && !inputs.pullRequestReport) {
    await core.summary.write()
  }
  core.endGroup()
}

/**
 * Determines if a comment should be added to the pull request based on inputs and report data.
 *
 * @param inputs - The user-provided inputs for configuring pull request comments.
 * @param report - The CTRF report containing test results.
 * @returns `true` if a comment should be added, otherwise `false`.
 */
export function shouldAddCommentToPullRequest(
  inputs: Inputs,
  report: CtrfReport
): boolean {
  const shouldAddComment =
    (inputs.onFailOnly && report.results.summary.failed > 0) ||
    !inputs.onFailOnly

  return (
    (inputs.pullRequestReport || inputs.pullRequest) &&
    (context.eventName === 'pull_request' ||
      context.eventName === 'pull_request_target') &&
    shouldAddComment
  )
}

/**
 * Handles the annotation of failed tests in the CTRF report.
 *
 * - Annotates all failed tests in the GitHub Actions log if annotation is enabled in inputs.
 *
 * @param inputs - The user-provided inputs for configuring annotations.
 * @param report - The CTRF report containing test results.
 */
export function handleAnnotations(inputs: Inputs, report: CtrfReport): void {
  if (inputs.annotate) {
    core.startGroup(`🔍 Annotating failed tests`)
    core.info('Annotating failed tests')
    annotateFailed(report)
    core.endGroup()
  }
}

/**
 * Posts or updates a comment on either a PR or Issue.
 *
 * @param owner - The owner of the repository
 * @param repo - The repository name
 * @param issue_number - The PR or issue number
 * @param body - The comment body to post
 * @param marker - The unique marker to identify existing comments
 * @param updateConfig - Configuration for update behavior
 */
async function handleComment(
  owner: string,
  repo: string,
  issue_number: number,
  body: string,
  marker: string,
  updateConfig: {
    shouldUpdate: boolean
    shouldOverwrite: boolean
  }
): Promise<void> {
  let finalBody = body
  if (!finalBody.includes(marker)) {
    finalBody = `${finalBody}\n${marker}`
  }

  const existingComment = await findExistingMarkedComment(
    owner,
    repo,
    issue_number,
    marker
  )

  if (existingComment) {
    if (updateConfig.shouldUpdate && !updateConfig.shouldOverwrite) {
      finalBody = `${existingComment.body}\n\n---\n\n${body}`
    } else if (updateConfig.shouldOverwrite) {
      finalBody = `${body}\n\n${UPDATE_EMOJI} This comment has been updated`
    }
  }

  if (
    existingComment &&
    (updateConfig.shouldUpdate || updateConfig.shouldOverwrite)
  ) {
    await updateComment(
      existingComment.id,
      owner,
      repo,
      issue_number,
      finalBody
    )
  } else {
    await addCommentToIssue(owner, repo, issue_number, finalBody)
  }
}

/**
 * Posts or updates a comment on a pull request.
 *
 * @param inputs - The user-provided inputs for configuring the comment behavior.
 * @param marker - The unique marker used to identify existing comments.
 * @returns A promise that resolves when the comment operation is completed.
 */
async function postOrUpdatePRComment(
  inputs: Inputs,
  marker: string
): Promise<void> {
  core.info('Posting or updating PR comment')
  const newSummary = core.summary.stringify()

  try {
    await handleComment(
      context.repo.owner,
      context.repo.repo,
      context.issue.number,
      newSummary,
      marker,
      {
        shouldUpdate: inputs.updateComment,
        shouldOverwrite: inputs.overwriteComment
      }
    )
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('Resource not accessible by integration')
    ) {
      core.warning(
        'Unable to post PR comment - this is expected for pull_request events on fork PRs'
      )
      core.warning(
        'The comment must be posted by the pull_request_target workflow instead'
      )
    }
  }
}

/**
 * Posts or updates a comment on an issue.
 *
 * @param inputs - The user-provided inputs for configuring the comment behavior.
 * @param marker - The unique marker used to identify existing comments.
 * @returns A promise that resolves when the comment operation is completed.
 */
async function postOrUpdateIssueComment(
  inputs: Inputs,
  marker: string
): Promise<void> {
  core.info('Posting or updating issue comment')
  const newSummary = core.summary.stringify()

  await handleComment(
    context.repo.owner,
    context.repo.repo,
    parseInt(inputs.issue),
    newSummary,
    marker,
    {
      shouldUpdate: inputs.updateComment,
      shouldOverwrite: inputs.overwriteComment
    }
  )
}

/**
 * Searches for an existing PR comment containing a given marker.
 *
 * @param owner - The owner of the repository.
 * @param repo - The repository name.
 * @param issue_number - The pull request number.
 * @param marker - The unique marker used to identify the comment.
 * @returns The comment object if found, otherwise undefined.
 */
async function findExistingMarkedComment(
  owner: string,
  repo: string,
  issue_number: number,
  marker: string
): Promise<IssueComment | undefined> {
  const comments = await listComments(owner, repo, issue_number)
  return comments.find(comment => comment.body && comment.body.includes(marker))
}
