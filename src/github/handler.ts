import * as core from '@actions/core'
import { context } from '@actions/github'
import { addCommentToPullRequest } from '../client/github'
import { CtrfReport, Inputs } from '../types'
import { generateViews, annotateFailed } from './core'

export async function handleViewsAndComments(
  inputs: Inputs,
  report: CtrfReport
): Promise<void> {
  await generateViews(inputs, report)

  if (inputs.summary) {
    core.summary.write()
  }

  if (shouldAddCommentToPullRequest(inputs, report)) {
    await addCommentToPullRequest(
      context.repo.owner,
      context.repo.repo,
      context.issue.number,
      core.summary.stringify()
    )
  }
}

export function shouldAddCommentToPullRequest(
  inputs: any,
  report: CtrfReport
): boolean {
  const shouldAddComment =
    (inputs.onFailOnly && report.results.summary.failed > 0) ||
    !inputs.onFailOnly

  return (
    inputs.pullRequest &&
    context.eventName === 'pull_request' &&
    shouldAddComment
  )
}

export function handleAnnotations(inputs: any, report: CtrfReport): void {
  if (inputs.annotate) {
    annotateFailed(report)
  }
}
