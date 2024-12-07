import { createGitHubClient } from '.'

/**
 * Adds a comment to a specified pull request on GitHub.
 * 
 * @param owner - The owner of the repository (organization or user).
 * @param repo - The name of the repository.
 * @param issue_number - The pull request number to which the comment will be added.
 * @param body - The content of the comment to be added.
 * 
 * @returns {Promise<any>} A promise that resolves to the response data from GitHub's API.
 * 
 * @throws {Error} If the GitHub client fails to authenticate or the API request fails.
 */
export async function addCommentToPullRequest(
  owner: string,
  repo: string,
  issue_number: number,
  body: string
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
