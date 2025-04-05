import { GITHUB_TOKEN, GITHUB_API_URL } from '../../config'

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function createGitHubClient() {
  const { Octokit } = await import('@octokit/rest')
  const { retry } = await import('@octokit/plugin-retry')

  const OctokitWithRetry = Octokit.plugin(retry)

  if (!GITHUB_TOKEN) {
    throw new Error('GitHub token is required to authenticate Octokit')
  }

  const options: {
    auth: string
    baseUrl?: string
    retry?: { enabled: boolean; retries?: number }
  } = {
    auth: GITHUB_TOKEN,
    retry: {
      enabled: true,
      retries: 3
    }
  }

  if (GITHUB_API_URL) {
    options.baseUrl = GITHUB_API_URL
  }

  return new OctokitWithRetry(options)
}
