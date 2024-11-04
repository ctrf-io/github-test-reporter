import { type CtrfReport } from '../../types/ctrf'
import * as core from '@actions/core'
import { extractGithubProperties, getTestName } from '../common'
import { fetchArtifactsFromPreviousBuilds } from '../api/fetch-previous-runs'

type TestData = {
  testName: string
  attempts: number
  pass: number
  fail: number
  flakes: number
  flakeRate: number
}

async function generateFlakyRateSummary(
  report: CtrfReport,
  artifactName: string,
  rows: number,
  useSuiteName: boolean
): Promise<void> {
  const token = process.env.GITHUB_TOKEN
  if (!token) {
    console.error('GITHUB_TOKEN is not set. This is required for flaky-rate method')
    return
  }

  const github = extractGithubProperties()
  const reports = await fetchArtifactsFromPreviousBuilds(github, artifactName, rows)

  if (github?.runId && github.runNumber && github.buildUrl) {
    const extendedReport: CtrfReport & {
      runId: string
      runNumber: string
      buildUrl: string
    } = { ...report, runId: github.runId, runNumber: github.runNumber, buildUrl: github.buildUrl }
    reports.unshift(extendedReport)
  }

  const flakyTestMap = new Map<string, TestData>()
  const flakyTestAdjustedMap = new Map<string, TestData>()

  // Helper function to populate flaky test map
  const populateFlakyTestMap = (map: Map<string, TestData>, testRuns: CtrfReport[]) => {
    testRuns.forEach((run) => {
      const { tests } = run.results
      tests.forEach((test) => {
        const testName = getTestName(test, useSuiteName)
        let data = map.get(testName)
        if (!data) {
          data = { testName, attempts: 0, pass: 0, fail: 0, flakes: 0, flakeRate: 0 }
          map.set(testName, data)
        }
        const testAttempts = 1 + (test.retries || 0)
        data.attempts += testAttempts

        const isFlaky = test.flaky || (test.retries && test.status === 'passed')
        if (isFlaky) data.flakes += test.retries || 0

        if (test.status === 'passed') {
          data.pass += 1
          data.fail += test.retries || 0
        } else if (test.status === 'failed') {
          data.fail += 1 + (test.retries || 0)
        }
      })
    })
  }

  // Populate the full and adjusted flaky test maps
  populateFlakyTestMap(flakyTestMap, reports)
  populateFlakyTestMap(flakyTestAdjustedMap, reports.slice(5))

  // Calculate flaky rates for both full and adjusted data
  const calculateFlakyRate = (dataArray: TestData[]) => {
    const totalAttempts = dataArray.reduce((sum, data) => sum + data.attempts, 0)
    const totalFlakes = dataArray.reduce((sum, data) => sum + data.flakes, 0)
    return totalAttempts > 0 ? (totalFlakes / totalAttempts) * 100 : 0
  }

  const overallFlakeRate = calculateFlakyRate(Array.from(flakyTestMap.values()))
  const overallFlakeAdjustedRate = calculateFlakyRate(Array.from(flakyTestAdjustedMap.values()))
  const overallDifference = overallFlakeRate - overallFlakeAdjustedRate
  const trendEmoji = overallDifference > 0 ? '⬆️' : overallDifference < 0 ? '⬇️' : '⚖️'

  const overallFlakeRateMessage = `**Overall Flaky Rate (All):** ${overallFlakeRate.toFixed(2)}%`
  const overallFlakeAdjustedMessage = `**Adjusted Flaky Rate (Excluding Latest 5):** ${overallFlakeAdjustedRate.toFixed(2)}%`
  const overallDifferenceMessage = `**Flake Rate Change:** ${overallDifference.toFixed(2)}% ${trendEmoji}`

  // Filter non-zero flaky tests and prepare summary rows
  const flakyTestArrayNonZero = Array.from(flakyTestMap.values()).filter(data => data.flakeRate > 0)
  flakyTestArrayNonZero.sort((a, b) => b.flakeRate - a.flakeRate)

  const flakyRows = flakyTestArrayNonZero.map((data) => {
    const { testName, attempts, pass, fail, flakeRate } = data
    return `| ${testName} | ${attempts} | ${pass} | ${fail} | ${flakeRate.toFixed(2)}% |`
  })

  const limitedSummaryRows = flakyRows.slice(0, rows)
  const totalRuns = reports.length
  const totalRunsMessage = `<sub><i>Measured over ${totalRuns} runs.</i></sub>`

  // Prepare final summary table
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
