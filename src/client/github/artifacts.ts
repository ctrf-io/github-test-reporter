import { context } from '@actions/github'
import AdmZip from 'adm-zip'
import { components } from '@octokit/openapi-types'
import { createGitHubClient } from '.'
import { CtrfReport } from '../../types'
import { enrichReportWithRunDetails } from '../../ctrf'

type Artifact = components['schemas']['artifact']

/**
 * Fetches artifacts for a specific workflow run.
 * @param owner - The owner of the repository.
 * @param repo - The name of the repository.
 * @param runId - The ID of the workflow run.
 * @returns An array of artifacts.
 */
export async function fetchArtifacts(
  owner: string,
  repo: string,
  runId: number
): Promise<Artifact[]> {
  const octokit = await createGitHubClient()
  const response = await octokit.actions.listWorkflowRunArtifacts({
    owner,
    repo,
    run_id: runId
  })

  return response.data.artifacts
}

/**
 * Downloads an artifact given its download URL.
 * @param downloadUrl - The URL to download the artifact.
 * @returns A buffer containing the artifact data.
 */
export async function downloadArtifact(downloadUrl: string): Promise<Buffer> {
  const octokit = await createGitHubClient()
  const artifactResponse = await octokit.request({
    method: 'GET',
    url: downloadUrl,
    responseType: 'arraybuffer'
  })

  return Buffer.from(artifactResponse.data as ArrayBuffer)
}

/**
 * Processes artifacts to return CTRF reports.
 * @param workflowRuns - The workflow runs to process
 * @param artifactName - The name of the artifact with the CTRF report
 * @param githubContext - The GitHub context
 * @returns An array of CTRF reports.
 */
export async function processArtifactsFromRuns(
  workflowRuns: import('@octokit/openapi-types').components['schemas']['workflow-run'][],
  artifactName: string
): Promise<CtrfReport[]> {
  const reports: CtrfReport[] = []
  for (const run of workflowRuns) {
    const artifacts = await fetchArtifacts(
      context.repo.owner,
      context.repo.repo,
      run.id
    )

    for (const artifact of artifacts) {
      if (artifact.name === artifactName) {
        const artifactBuffer = await downloadArtifact(
          artifact.archive_download_url
        )
        let report = unzipArtifact(artifactBuffer)
        if (report !== null) {
          report = enrichReportWithRunDetails(report, run)
          reports.push(report)
        }
      }
    }
  }
  return reports
}

/**
 * Unzips an artifact buffer and extracts a CTRF report.
 * @param artifactBuffer - The buffer containing the zipped artifact.
 * @returns A CTRF report object or null if not found.
 */
export function unzipArtifact(artifactBuffer: Buffer): CtrfReport | null {
  const zip = new AdmZip(artifactBuffer)
  const zipEntries = zip.getEntries()
  let report: CtrfReport | null = null

  for (const zipEntry of zipEntries) {
    if (zipEntry.entryName.endsWith('.json')) {
      const jsonData = zipEntry.getData().toString('utf8')
      report = JSON.parse(jsonData) as CtrfReport
      break
    }
  }
  return report
}
