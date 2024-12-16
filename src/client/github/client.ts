import { GITHUB_TOKEN, GITHUB_API_URL } from '../../config'

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function createGitHubClient() {
  const { Octokit } = await import('@octokit/rest')

  if (!GITHUB_TOKEN) {
    throw new Error('GitHub token is required to authenticate Octokit')
  }

  const options: { auth: string; baseUrl?: string } = {
    auth: GITHUB_TOKEN
  }

  if (GITHUB_API_URL) {
    options.baseUrl = GITHUB_API_URL
  }

  return new Octokit(options)
}
