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

  const flakyTestMapAll = new Map<string, any>()
  const flakyTestMapAdjusted = new Map<string, any>()

  const populateFlakyTestMap = (reportSubset: CtrfReport[], flakyTestMap: Map<string, any>) => {
    reportSubset.forEach((run) => {
      const { tests } = run.results
      tests.forEach((test) => {
        const testName = getTestName(test, useSuiteName)
        let data = flakyTestMap.get(testName)
        if (!data) {
          data = {
            testName,
            attempts: 0,
            pass: 0,
            fail: 0,
            flakes: 0,
            flakeRate: 0,
          }
          flakyTestMap.set(testName, data)
        }

        if (test.status === 'passed' || test.status === 'failed') {
          const testRuns = 1 + (test.retries || 0)
          data.attempts += testRuns
          let isFlaky = test.flaky || (test.retries && test.status === 'passed')
          if (isFlaky) data.flakes += test.retries || 0
          if (test.status === 'passed') data.pass += 1
          if (test.status === 'failed') data.fail += 1 + (test.retries || 0)
        }
      })
    })
  }

  populateFlakyTestMap(reports, flakyTestMapAll)
  populateFlakyTestMap(reports.slice(5), flakyTestMapAdjusted)

  const calculateOverallFlakeRate = (flakyTestMap: Map<string, any>) => {
    const flakyTestArray = Array.from(flakyTestMap.values())
    const totalAttempts = flakyTestArray.reduce((sum, data) => sum + data.attempts, 0)
    const totalFlakes = flakyTestArray.reduce((sum, data) => sum + data.flakes, 0)
    return totalAttempts > 0 ? (totalFlakes / totalAttempts) * 100 : 0
  }

  const overallFlakeRateAll = calculateOverallFlakeRate(flakyTestMapAll)
  const overallFlakeRateAdjusted = calculateOverallFlakeRate(flakyTestMapAdjusted)
  const flakeRateChange = overallFlakeRateAll - overallFlakeRateAdjusted

  const overallFlakeRateMessage = `**Overall Flaky Rate (All):** ${overallFlakeRateAll.toFixed(2)}%`
  const adjustedFlakeRateMessage = `**Adjusted Flaky Rate (Excluding Latest 5):** ${overallFlakeRateAdjusted.toFixed(2)}%`
  const flakeRateChangeMessage = `**Flake Rate Change:** ${flakeRateChange.toFixed(2)}%`

  const flakyTestArrayNonZero = Array.from(flakyTestMapAll.values()).filter(data => data.flakeRate > 0)

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
${adjustedFlakeRateMessage}
${flakeRateChangeMessage}

| Test 📝| Attempts 🎯| Pass ✅| Fail ❌| Flaky Rate 🍂|
| --- | --- | --- | --- | --- |
${limitedSummaryRows.join('\n')}

${totalRunsMessage}

[Github Test Reporter CTRF](https://github.com/ctrf-io/github-test-reporter-ctrf)
`
  core.summary.addRaw(summaryTable)
}
