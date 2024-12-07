import { createGitHubClient } from '.'

// TODO add tsdoc
export async function addCommentToPullRequest(
  owner: string,
  repo: string,
  issue_number: number,
  body: string
): Promise<any> {
  const octokit = await createGitHubClient()
  const response = await octokit.issues.createComment({
    owner,
    repo,
    issue_number,
    body
  })
  return response.data
}
