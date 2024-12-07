import { createGitHubClient } from '.'

/**
 * Fetches workflow runs for a specific repo.
 * @param owner - The owner of the repository.
 * @param repo - The name of the repository.
 * @param runId - The ID of the workflow run.
 * @param perPage - The number of runs per page
 * @param page - The page number
 * @returns An array of workflow runs.
 */
export async function fetchWorkflowRuns(
  owner: string,
  repo: string,
  perPage: number = 100,
  page: number = 1
) {
  const octokit = await createGitHubClient()
  const response = await octokit.actions.listWorkflowRunsForRepo({
    owner,
    repo,
    per_page: perPage,
    page
  })

  return response.data.workflow_runs
}

/**
 * Fetches all workflow runs for a specific repo.
 * @param owner - The owner of the repository.
 * @param repo - The name of the repository.
 * @param limit - The maximum number of runs
 * @returns An array of workflow runs.
 */
export async function fetchAllWorkflowRuns(
  owner: string,
  repo: string,
  limit: number = 1000
): Promise<
  import('@octokit/openapi-types').components['schemas']['workflow-run'][]
> {
  const octokit = await createGitHubClient()
  const perPage = 100
  let page = 1
  let totalRunsFetched = 0
  let allRuns: import('@octokit/openapi-types').components['schemas']['workflow-run'][] =
    []

  while (totalRunsFetched < limit) {
    const response = await octokit.actions.listWorkflowRunsForRepo({
      owner,
      repo,
      per_page: perPage,
      page
    })

    const runs = response.data.workflow_runs
    allRuns = allRuns.concat(runs)
    totalRunsFetched += runs.length

    if (runs.length < perPage) {
      break
    }

    page++
  }

  if (allRuns.length > limit) {
    allRuns = allRuns.slice(0, limit)
  }

  return allRuns
}
