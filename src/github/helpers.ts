import fs from 'fs'
import { CtrfReport, GitHubContext } from '../types'
import { components } from '@octokit/openapi-types'
type WorkflowRun = components['schemas']['workflow-run']

/**
 * Validates and parses a CTRF file to ensure it contains valid CTRF report data.
 *
 * @param filePath - The file path to the CTRF report JSON file.
 * @returns A `CtrfReport` object if the file is valid, or `null` if invalid or an error occurs.
 */
export function validateCtrfFile(filePath: string): CtrfReport | null {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8')
    const jsonData: CtrfReport = JSON.parse(fileContent) as CtrfReport

    if (!jsonData.results?.summary || !jsonData.results.tests) {
      console.warn('Warning: The file does not contain valid CTRF data.')
      return null
    }
    return jsonData
  } catch (error) {
    console.error('Failed to read or process the file:', error)
    console.warn(
      'Unable to generate GitHub Actions Summary, moving on without...'
    )
  }
  return null
}

/**
 * Checks if a single workflow run matches specified GitHub properties, such as branch, pull request,
 * and workflow name.
 *
 * @param run - The `WorkflowRun` object to check.
 * @param githubProperties - An object containing GitHub-related properties (e.g., branchName, pullRequest).
 * @param currentRun - The current workflow run to compare against.
 * @returns A boolean indicating whether the workflow run matches the specified criteria.
 */
export function isMatchingWorkflowRun(
  run: WorkflowRun,
  githubProperties: GitHubContext,
  currentRun: WorkflowRun
): boolean {
  const isBranchMatch =
    run.head_branch === githubProperties.branchName &&
    (run.event === 'push' ||
      run.event === 'schedule' ||
      run.event === 'workflow_dispatch')

  const isPRMatch =
    (run.event === 'pull_request' &&
      run.pull_requests?.some(
        pr => pr.number === githubProperties.pullRequest.number
      )) ||
    false

  const isWorkflowMatch = run.workflow_id === currentRun.workflow_id

  return (isBranchMatch || isPRMatch) && isWorkflowMatch
}
