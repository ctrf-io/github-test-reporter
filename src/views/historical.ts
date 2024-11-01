import { type CtrfReport } from '../../types/ctrf'
import * as core from '@actions/core'
import { extractGithubProperties, formatDurationHumanReadable } from '../common'
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
    const duration = report.results.summary.stop - report.results.summary.start
    const durationHumanReadable = formatDurationHumanReadable(duration)

    const testResult = results.summary.failed > 0 ? 'Fail ❌' : 'Pass ✅'

    return `| [#${run.runNumber}](${run.buildUrl}) | ${testResult} | ${results.summary.tests} | ${results.summary.passed} | ${results.summary.failed} | ${results.summary.skipped} | ${results.summary.pending} | ${results.summary.other} | ${flakyCount} | ${durationHumanReadable} |`
  })

  const limitedSummaryRows = summaryRows.slice(0, rows)

  const summaryTable = `
| Build 🏗️ | Result 🧪 | Tests 📝 | Passed ✅ | Failed ❌ | Skipped ⏭️ | Pending ⏳ | Other ❓ | Flaky 🍂 | Duration ⏱️ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
${limitedSummaryRows.join('\n')}

[Github Test Reporter CTRF](https://github.com/ctrf-io/github-test-reporter)
`
  core.summary.addHeading(`Previous Results`, 3)

  core.summary.addRaw(summaryTable)
}