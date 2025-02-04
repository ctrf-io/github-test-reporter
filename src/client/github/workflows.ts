import { createGitHubClient } from '.'
import { components } from '@octokit/openapi-types'

type WorkflowRun = components['schemas']['workflow-run']

/**
 * Fetches workflow run for a specific run.
 * @param owner - The owner of the repository.
 * @param repo - The name of the repository.
 * @param run_id - The ID of the workflow run.
 * @returns An array of workflow runs.
 */
export async function fetchWorkflowRun(
  owner: string,
  repo: string,
  run_id: number
): Promise<WorkflowRun> {
  const octokit = await createGitHubClient()
  const response = await octokit.actions.getWorkflowRun({
    owner,
    repo,
    run_id
  })

  return response.data
}

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
  perPage = 100,
  page = 1
): Promise<WorkflowRun[]> {
  const octokit = await createGitHubClient()
  const response = await octokit.actions.listWorkflowRunsForRepo({
    owner,
    repo,
    per_page: perPage,
    page
  })

  return response.data.workflow_runs
}
