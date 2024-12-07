import { GITHUB_TOKEN } from '../../config'

export async function createGitHubClient() {
  const { Octokit } = await import('@octokit/rest')

  if (!GITHUB_TOKEN) {
    throw new Error('GitHub token is required to authenticate Octokit')
  }

  return new Octokit({ auth: GITHUB_TOKEN })
}
