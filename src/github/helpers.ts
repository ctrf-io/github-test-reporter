import fs from 'fs'
import { CtrfReport } from '../types'
import * as github from '@actions/github'
import { components } from '@octokit/openapi-types'
type WorkflowRun = components['schemas']['workflow-run']
const context = github.context

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
