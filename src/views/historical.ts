import { type CtrfReport } from '../../types/ctrf'
import * as core from '@actions/core'
import { extractGithubProperties } from '../common'
import { fetchArtifactsFromPreviousBuilds } from '../api/fetch-previous-runs'

export async function generateHistoricSummary(
  report: CtrfReport,
  artifactName: string,
  rows: number,
  exitOnFail: boolean
): Promise<void> {
  const token = process.env.GITHUB_TOKEN
  if (!token) {
    console.error(
      'GITHUB_TOKEN is not set. This is required for historical method'
    )
    return
  }

  const github = extractGithubProperties()
  const reports = await fetchArtifactsFromPreviousBuilds(
    github,
    artifactName,
    rows
  )

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
  core.summary.addHeading(`Previous Results`, 3)

  core.summary.addRaw(summaryTable)
}