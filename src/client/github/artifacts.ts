import { context } from '@actions/github'
import AdmZip from 'adm-zip'
import { components } from '@octokit/openapi-types'
import { createGitHubClient } from '.'
import { Report } from 'ctrf'
import { DefaultArtifactClient } from '@actions/artifact'
import fs from 'fs'
import path from 'path'

type Artifact = components['schemas']['artifact']

/**
 * Upload CTRF report as artifact for a specific workflow run.
 * @param artifactName - The name of the artifact.
 * @param report - The CTRF report.
 */
export async function uploadArtifact(
  artifactName: string,
  report: Report,
  tempDir = './temp'
): Promise<void> {
  const filePath = path.join(tempDir, `ctrf-report.json`)

  try {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }
    fs.writeFileSync(filePath, JSON.stringify(report, null, 2))

    const files = [filePath]
    const rootDirectory = tempDir

    const artifactClient = new DefaultArtifactClient()

    await artifactClient.uploadArtifact(artifactName, files, rootDirectory)
  } catch (error) {
    console.error('Failed to upload artifact:', error)
    throw error
  } finally {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
    } catch (unlinkError) {
      console.error(`Failed to delete temporary file: ${filePath}`, unlinkError)
    }
  }
}

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
    responseType: 'arraybuffer',
    request: {
      options: {
        timeout: 60000
      }
    }
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
export async function processArtifactsFromRun(
  workflowRun: import('@octokit/openapi-types').components['schemas']['workflow-run'],
  artifactName: string
): Promise<Report[]> {
  const reports: Report[] = []
  const artifacts = await fetchArtifacts(
    context.repo.owner,
    context.repo.repo,
    workflowRun.id
  )
  for (const artifact of artifacts) {
    if (artifact.name === artifactName) {
      const artifactBuffer = await downloadArtifact(
        artifact.archive_download_url
      )
      const report = unzipArtifact(artifactBuffer)
      if (report !== null) {
        reports.push(report)
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
export function unzipArtifact(artifactBuffer: Buffer): Report | null {
  const zip = new AdmZip(artifactBuffer)
  const zipEntries = zip.getEntries()
  let report: Report | null = null

  for (const zipEntry of zipEntries) {
    if (zipEntry.entryName.endsWith('.json')) {
      const jsonData = zipEntry.getData().toString('utf8')
      report = JSON.parse(jsonData) as Report
      break
    }
  }
  return report
}
