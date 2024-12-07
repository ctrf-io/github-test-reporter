import fs from 'fs'
import { CtrfReport } from '../types'
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
    const jsonData: CtrfReport = JSON.parse(fileContent)

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
 * Filters a list of workflow runs based on GitHub properties, such as branch, pull request,
 * and workflow name.
 *
 * @param runs - An array of `WorkflowRun` objects to filter.
 * @param githubProperties - An object containing GitHub-related properties (e.g., branchName, pullRequest).
 * @returns An array of `WorkflowRun` objects that match the specified GitHub properties.
 */
export function filterWorkflowRuns(
  runs: WorkflowRun[],
  // TODO: use GitHub properties
  githubProperties: any
): WorkflowRun[] {
  return runs.filter(run => {
    const isBranchMatch =
      run.head_branch === githubProperties.branchName &&
      (run.event === 'push' || run.event === 'schedule')

    const isPRMatch =
      run.event === 'pull_request' &&
      run.pull_requests?.some(
        pr => pr.number === githubProperties.pullRequest.number
      )

    const isWorkflowNameMatch = run.name === githubProperties.workflow

    if ((isBranchMatch || isPRMatch) && isWorkflowNameMatch) {
      console.debug(
        `Match found for workflow ${run.name} with run number ${run.run_number}`
      )
    } else {
      console.debug(
        `Match not found for workflow ${run.name} with run number ${run.run_number}`
      )
    }

    return (isBranchMatch || isPRMatch) && isWorkflowNameMatch
  })
}
