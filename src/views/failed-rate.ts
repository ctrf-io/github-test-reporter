import { type CtrfReport } from '../../types/ctrf'
import * as core from '@actions/core'
import { extractGithubProperties, getTestName } from '../common'
import { fetchArtifactsFromPreviousBuilds } from '../api/fetch-previous-runs'

export async function generateFailedRateSummary(
  report: CtrfReport,
  artifactName: string,
  rows: number,
  useSuiteName: boolean
): Promise<void> {
  const token = process.env.GITHUB_TOKEN
  if (!token) {
    console.error(
      'GITHUB_TOKEN is not set. This is required for failed-rate method'
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

  const testFailMap = new Map<
    string,
    {
      testName: string
      totalRuns: number
      pass: number
      fail: number
      failRate: number
    }
  >()

  reports.forEach((run) => {
    const { tests } = run.results

    tests.forEach((test) => {
      const testName = getTestName(test, useSuiteName)

      let data = testFailMap.get(testName)
      if (!data) {
        data = {
          testName,
          totalRuns: 0,
          pass: 0,
          fail: 0,
          failRate: 0,
        }
        testFailMap.set(testName, data)
      }

      if (test.status === 'passed' || test.status === 'failed') {
        data.totalRuns += 1

        if (test.status === 'passed') {
          data.pass += 1
        } else if (test.status === 'failed') {
          data.fail += 1
        }
      }
    })
  })

  const testFailArray = Array.from(testFailMap.values())

  testFailArray.forEach((data) => {
    data.failRate =
      data.totalRuns > 0 ? (data.fail / data.totalRuns) * 100 : 0
  })

  const totalRunsAllTests = testFailArray.reduce(
    (sum, data) => sum + data.totalRuns,
    0
  )
  const totalFailsAllTests = testFailArray.reduce(
    (sum, data) => sum + data.fail,
    0
  )
  const overallFailRate =
    totalRunsAllTests > 0 ? (totalFailsAllTests / totalRunsAllTests) * 100 : 0
  const overallFailRateFormatted = overallFailRate.toFixed(2)
  const overallFailRateMessage = `**Overall Fail Rate:** ${overallFailRateFormatted}%`

  const testFailArrayNonZero = testFailArray.filter(
    (data) => data.failRate > 0
  )

  const totalRuns = reports.length
  const totalRunsMessage = `<sub><i>Measured over ${totalRuns} runs.</i></sub>`

  if (testFailArrayNonZero.length === 0) {
    const noFailMessage = `<sub><i>No failing tests detected over ${totalRuns} runs.</i></sub>`
    const summary = `
${overallFailRateMessage}

${noFailMessage}

[Github Actions Test Reporter CTRF](https://github.com/ctrf-io/github-actions-test-reporter-ctrf)
`
    core.summary.addRaw(summary).write()
    return
  }

  testFailArrayNonZero.sort((a, b) => b.failRate - a.failRate)

  const failRows = testFailArrayNonZero.map((data) => {
    const { testName, totalRuns, pass, fail, failRate } = data
    return `| ${testName} | ${totalRuns} | ${pass} | ${fail} | ${failRate.toFixed(
      2
    )}% |`
  })

  const limitedSummaryRows = failRows.slice(0, rows)

  const summaryTable = `
${overallFailRateMessage}

| Test 📝 | Total Runs 🎯 | Pass ✅ | Fail ❌ | Fail Rate 📉 |
| --- | --- | --- | --- | --- |
${limitedSummaryRows.join('\n')}

${totalRunsMessage}

[Github Actions Test Reporter CTRF](https://github.com/ctrf-io/github-actions-test-reporter-ctrf)
`

  core.summary.addRaw(summaryTable).write()
}
