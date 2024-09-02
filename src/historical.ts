import { type CtrfReport } from '../types/ctrf'
import * as core from '@actions/core'
import { extractGithubProperties } from './common'
import https from 'https'
import AdmZip from 'adm-zip'

export async function generateHistoricSummary(
  report: CtrfReport,
  artifactName: string,
  rows: number
): Promise<void> {
  const token = process.env.GITHUB_TOKEN
  if (!token) {
    console.error(
      'GITHUB_TOKEN is not set. This is required for historical method'
    )
    return
  }

  const github = extractGithubProperties()
  const reports = await fetchArtifactsFromPreviousBuilds(github, artifactName)

  if (github?.runId && github.runNumber && github.buildUrl) {
    const extendedReport: CtrfReport & {
      runId: string
      runNumber: string
      buildUrl: string
    } = {
      ...report,
      runId: github.runId,
      runNumber: github.runNumber,
      buildUrl: github.buildUrl,
    }
    reports.unshift(extendedReport)
  }

  const workflowRun = reports as Array<
    CtrfReport & { runId: string; runNumber: string; buildUrl: string }
  >

  const summaryRows = workflowRun.map((run) => {
    const { results } = run
    const flakyCount = results.tests.filter((test) => test.flaky).length
    const duration = results.summary.stop - results.summary.start
    const durationFormatted = `${(duration / 1000).toFixed(2)} s`

    const testResult = results.summary.failed > 0 ? 'Fail ❌' : 'Pass ✅'

    return `| [#${run.runNumber}](${run.buildUrl}) | ${testResult} | ${results.summary.tests} | ${results.summary.passed} | ${results.summary.failed} | ${results.summary.skipped} | ${results.summary.pending} | ${results.summary.other} | ${flakyCount} | ${durationFormatted} |`
  })

  const limitedSummaryRows = summaryRows.slice(0, rows)

  const summaryTable = `
| Build 🏗️ | Result 🧪 | Tests 📝 | Passed ✅ | Failed ❌ | Skipped ⏭️ | Pending ⏳ | Other ❓ | Flaky 🍂 | Duration ⏱️ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
${limitedSummaryRows.join('\n')}

[Github Actions Test Reporter CTRF](https://github.com/ctrf-io/github-actions-test-reporter-ctrf)
`

  core.summary.addRaw(summaryTable).write()
}

async function fetchPreviousRuns(githubProperties: any) {
  const apiUrl = `${githubProperties.apiUrl}/repos/${githubProperties.repo}/actions/runs?per_page=100`
  const previousRuns = await makeHttpsRequest(apiUrl, 'GET', null)

  const relevantRun = previousRuns.workflow_runs.find(
    (run: any) => run.name === githubProperties.workflow
  )

  if (!relevantRun) {
    console.error(
      `No runs found for the workflow: ${githubProperties.workflow}`
    )
    return []
  }

  const workflowId = relevantRun.workflow_id

  const workflowRunsApiUrl = `${githubProperties?.apiUrl}/repos/${githubProperties?.repo}/actions/workflows/${workflowId}/runs?per_page=100`
  const workflowRuns = await makeHttpsRequest(workflowRunsApiUrl, 'GET', null)
  if (!workflowRuns.workflow_runs) {
    throw new Error('Invalid response: Missing workflow_runs')
  }

  const filteredRuns = await workflowRuns.workflow_runs.filter((run: any) => {
    const isBranchMatch =
      run.head_branch === githubProperties.branch && run.event === 'push'
    const isPRMatch =
      run.event === 'pull_request' &&
      run.pull_requests.some(
        (pr: any) => pr.number === githubProperties.pullRequestNumber
      )

    return isBranchMatch || isPRMatch
  })

  return filteredRuns
}

async function fetchArtifactInformation(artifactUrl: string) {
  return await makeHttpsRequest(artifactUrl, 'GET', null)
}

function unzipArtifact(artifactBuffer: Buffer): CtrfReport | null {
  const zip = new AdmZip(artifactBuffer)
  const zipEntries = zip.getEntries()
  let report: CtrfReport | null = null

  for (const zipEntry of zipEntries) {
    if (zipEntry.entryName.endsWith('.json')) {
      const jsonData = zipEntry.getData().toString('utf8')
      report = JSON.parse(jsonData)
      break
    }
  }

  return report
}

async function fetchArtifactsFromPreviousBuilds(
  githubProperties: any,
  artifactName: string
): Promise<
  Array<CtrfReport & { runId: string; runNumber: string; buildUrl: string }>
> {
  const previousRuns = await fetchPreviousRuns(githubProperties)

  const reports: Array<
    CtrfReport & {
      runId: string
      runNumber: string
      buildUrl: string
    }
  > = []

  for (const run of previousRuns) {
    const artifactsData = await fetchArtifactInformation(run.artifacts_url)

    for (const artifact of artifactsData.artifacts) {
      if (artifact.name === artifactName) {
        const artifactBuffer = await fetchArtifactRedirect(
          artifact.archive_download_url
        )

        const report = unzipArtifact(artifactBuffer)

        if (report) {
          const extendedReport = report as CtrfReport & {
            runId: string
            runNumber: string
            buildUrl: string
          }
          extendedReport.runId = run.id
          extendedReport.runNumber = run.run_number
          extendedReport.buildUrl = run.html_url
          reports.push(extendedReport)
        }
      }
    }
  }
  return reports
}

async function fetchArtifactRedirect(url: string): Promise<Buffer> {
  return await new Promise((resolve, reject) => {
    const token = process.env.GITHUB_TOKEN
    const options = {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'github-actions-test-reporter-ctrf',
      },
    }

    https
      .get(url, options, (res) => {
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          const redirectUrl = res.headers.location
          resolve(downloadArtifact(redirectUrl))
        } else if (
          res.statusCode &&
          res.statusCode >= 200 &&
          res.statusCode < 300
        ) {
          const data: Buffer[] = []
          res.on('data', (chunk) => {
            data.push(chunk)
          })
          res.on('end', () => {
            resolve(Buffer.concat(data))
          })
        } else {
          reject(new Error(`Failed with status code ${res.statusCode}`))
        }
      })
      .on('error', reject)
  })
}

async function downloadArtifact(url: string): Promise<Buffer> {
  return await new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode === 200) {
          const data: Buffer[] = []
          res.on('data', (chunk) => {
            data.push(chunk)
          })
          res.on('end', () => {
            resolve(Buffer.concat(data))
          })
        } else {
          let errorData = ''
          res.on('data', (chunk) => {
            errorData += chunk
          })
          res.on('end', () => {
            console.error(`Error downloading artifact: ${errorData}`)
            reject(
              new Error(
                `Failed to download artifact with status code ${res.statusCode}`
              )
            )
          })
        }
      })
      .on('error', reject)
  })
}

async function makeHttpsRequest(
  url: string,
  method: 'GET' | 'POST' = 'GET',
  data: any = null
): Promise<any> {
  const token = process.env.GITHUB_TOKEN
  return await new Promise((resolve, reject) => {
    const options = {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'github-actions-test-reporter-ctrf',
      },
    }

    const req = https.request(url, options, (res) => {
      let responseData = ''

      res.on('data', (chunk) => {
        responseData += chunk
      })

      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 400) {
          resolve(JSON.parse(responseData))
        } else {
          reject(
            new Error(
              `Request fail with status code ${res.statusCode}: ${responseData}`
            )
          )
        }
      })
    })

    req.on('error', (error) => {
      reject(error)
    })

    if (data) {
      req.write(JSON.stringify(data))
    }

    req.end()
  })
}
