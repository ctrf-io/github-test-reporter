import * as core from '@actions/core'
import { context } from '@actions/github'
import {
  addCommentToPullRequest,
  updateComment,
  listComments
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
  generateViews(inputs, report)

  if (shouldAddCommentToPullRequest(inputs, report)) {
    const INVISIBLE_MARKER = inputs.commentTag
      ? `<!-- CTRF PR COMMENT TAG: ${inputs.commentTag} -->`
      : `<!-- CTRF PR COMMENT TAG: DEFAULT -->`

    await postOrUpdatePRComment(inputs, INVISIBLE_MARKER)
  }

  if (inputs.summary && !inputs.pullRequestReport) {
    await core.summary.write()
  }
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
    context.eventName === 'pull_request' &&
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
    annotateFailed(report)
  }
}

/**
 * Posts or updates the PR comment containing the CTRF report.
 *
 * If a comment with the specified marker exists and `updateComment` is set (but not `overwriteComment`),
 * it will append new data to the existing comment. If `overwriteComment` is set, it will overwrite
 * the entire comment. Otherwise, it will create a new comment.
 *
 * @param inputs - The user-provided inputs for configuring the comment behavior.
 * @param marker - The unique marker used to find and identify the existing comment.
 */
async function postOrUpdatePRComment(
  inputs: Inputs,
  marker: string
): Promise<void> {
  let newSummary = core.summary.stringify()

  if (!newSummary.includes(marker)) {
    core.summary.addRaw(marker)
    newSummary = core.summary.stringify()
  }

  const owner = context.repo.owner
  const repo = context.repo.repo
  const issue_number = context.issue.number

  const existingComment = await findExistingMarkedComment(
    owner,
    repo,
    issue_number,
    marker
  )

  let finalBody = newSummary

  if (existingComment) {
    if (inputs.updateComment && !inputs.overwriteComment) {
      finalBody = `${existingComment.body}\n\n---\n\n${newSummary}`
    } else if (inputs.overwriteComment) {
      finalBody = `${newSummary}\n\n${UPDATE_EMOJI} This comment has been updated`
    }
  }

  if (existingComment && (inputs.updateComment || inputs.overwriteComment)) {
    await updateComment(
      existingComment.id,
      owner,
      repo,
      issue_number,
      finalBody
    )
  } else {
    await addCommentToPullRequest(owner, repo, issue_number, finalBody)
  }
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
