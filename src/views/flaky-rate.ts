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

  const flakyTestMap = new Map<
    string,
    {
      testName: string
      attempts: number
      pass: number
      fail: number
      flakes: number
      flakeRate: number
    }
  >()

  const calculateFlakeRate = (reportSubset: CtrfReport[]) => {
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

          let isFlaky = false

          if (test.flaky) {
            isFlaky = true
          } else if (test.retries && test.retries > 0 && test.status === 'passed') {
            isFlaky = true
          }

          if (isFlaky) {
            data.flakes += test.retries || 0
          }

          if (test.status === 'passed') {
            data.pass += 1
            data.fail += test.retries || 0
          } else if (test.status === 'failed') {
            data.fail += 1 + (test.retries || 0)
          }
        }
      })
    })

    return Array.from(flakyTestMap.values()).reduce(
      (sum, data) => (data.attempts > 0 ? sum + data.flakes / data.attempts : sum),
      0
    ) * 100
  }

  // Normal flake rate using all test results
  const overallFlakeRate = calculateFlakeRate(reports)

  // Adjusted flake rate by excluding the latest 5 test results
  const adjustedReports = reports.slice(5)
  const adjustedFlakeRate = calculateFlakeRate(adjustedReports)

  // Calculate flake rate change
  const flakeRateChange = overallFlakeRate - adjustedFlakeRate
  const flakeRateChangeMessage = `**Flake Rate Change:** ${flakeRateChange.toFixed(
    2
  )}%`

  const overallFlakeRateMessage = `**Overall Flaky Rate:** ${overallFlakeRate.toFixed(2)}%`
  const adjustedFlakeRateMessage = `**Adjusted Flaky Rate:** ${adjustedFlakeRate.toFixed(2)}%`

  const summary = `
${overallFlakeRateMessage}
${adjustedFlakeRateMessage}
${flakeRateChangeMessage}

[Github Test Reporter CTRF](https://github.com/ctrf-io/github-test-reporter-ctrf)
`
  core.summary.addRaw(summary)
}
