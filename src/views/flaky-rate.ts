import { type CtrfReport } from '../../types/ctrf'
import * as core from '@actions/core'
import { extractGithubProperties, getTestName } from '../common'
import { fetchArtifactsFromPreviousBuilds } from '../api/fetch-previous-runs'

export async function generateFlakyRateSummary(
  report: CtrfReport,
  artifactName: string,
  rows: number,
  useSuiteName: boolean
): Promise<void> {
  const token = process.env.GITHUB_TOKEN
  if (!token) {
    console.error(
      'GITHUB_TOKEN is not set. This is required for flaky-rate method'
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

  const flakyTestMap = new Map<string, any>()
  const flakyTestAdjustedMap = new Map<string, any>()

  // Populate full data map
  reports.forEach((run) => {
    const { tests } = run.results
    tests.forEach((test) => {
      const testName = getTestName(test, useSuiteName)
      let data = flakyTestMap.get(testName)
      if (!data) {
        data = { testName, attempts: 0, pass: 0, fail: 0, flakes: 0, flakeRate: 0 }
        flakyTestMap.set(testName, data)
      }

      const testRuns = 1 + (test.retries || 0)
      data.attempts += testRuns

      if (test.flaky || (test.retries && test.status === 'passed')) {
        data.flakes += test.retries || 0
      }
      if (test.status === 'passed') {
        data.pass += 1
        data.fail += test.retries || 0
      } else if (test.status === 'failed') {
        data.fail += 1 + (test.retries || 0)
      }
    })
  })

  // Populate adjusted data map (excluding latest 5 runs)
  reports.slice(5).forEach((run) => {
    const { tests } = run.results
    tests.forEach((test) => {
      const testName = getTestName(test, useSuiteName)
      let data = flakyTestAdjustedMap.get(testName)
      if (!data) {
        data = { testName, attempts: 0, pass: 0, fail: 0, flakes: 0, flakeRate: 0 }
        flakyTestAdjustedMap.set(testName, data)
      }

      const testRuns = 1 + (test.retries || 0)
      data.attempts += testRuns

      if (test.flaky || (test.retries && test.status === 'passed')) {
        data.flakes += test.retries || 0
      }
      if (test.status === 'passed') {
        data.pass += 1
        data.fail += test.retries || 0
      } else if (test.status === 'failed') {
        data.fail += 1 + (test.retries || 0)
      }
    })
  })

  // Calculate flake rates for both maps
  const totalAttemptsAllTests = Array.from(flakyTestMap.values()).reduce(
    (sum, data) => sum + data.attempts,
    0
  )
  const totalFlakesAllTests = Array.from(flakyTestMap.values()).reduce(
    (sum, data) => sum + data.flakes,
    0
  )
  const overallFlakeRate = totalAttemptsAllTests > 0
    ? (totalFlakesAllTests / totalAttemptsAllTests) * 100
    : 0

  const totalAttemptsAdjustedTests = Array.from(flakyTestAdjustedMap.values()).reduce(
    (sum, data) => sum + data.attempts,
    0
  )
  const totalFlakesAdjustedTests = Array.from(flakyTestAdjustedMap.values()).reduce(
    (sum, data) => sum + data.flakes,
    0
  )
  const overallFlakeAdjustedRate = totalAttemptsAdjustedTests > 0
    ? (totalFlakesAdjustedTests / totalAttemptsAdjustedTests) * 100
    : 0

  const overallDifference = overallFlakeRate - overallFlakeAdjustedRate
  const overallFlakeRateMessage = `**Overall Flaky Rate (All):** ${overallFlakeRate.toFixed(2)}%`
  const overallFlakeAdjustedMessage = `**Adjusted Flaky Rate (Excluding Latest 5):** ${overallFlakeAdjustedRate.toFixed(2)}%`
  const overallDifferenceMessage = `**Flake Rate Change:** ${overallDifference.toFixed(2)}%`

  const flakyTestArrayNonZero = Array.from(flakyTestMap.values()).filter(
    (data) => data.flakeRate > 0
  )
  flakyTestArrayNonZero.sort((a, b) => b.flakeRate - a.flakeRate)

  const flakyRows = flakyTestArrayNonZero.map((data) => {
    const { testName, attempts, pass, fail, flakeRate } = data
    return `| ${testName} | ${attempts} | ${pass} | ${fail} | ${flakeRate.toFixed(
      2
    )}% |`
  })

  const limitedSummaryRows = flakyRows.slice(0, rows)
  const totalRunsMessage = `<sub><i>Measured over ${reports.length} runs.</i></sub>`

  const summaryTable = `
${overallFlakeRateMessage}
${overallFlakeAdjustedMessage}
${overallDifferenceMessage}

| Test 📝| Attempts 🎯| Pass ✅| Fail ❌| Flaky Rate 🍂|
| --- | --- | --- | --- | --- |
${limitedSummaryRows.join('\n')}

${totalRunsMessage}

[Github Test Reporter CTRF](https://github.com/ctrf-io/github-test-reporter-ctrf)
`
  core.summary.addRaw(summaryTable)
}
