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
      previousFlakyRates: number[]
      flakyRateChange?: number
    }
  >()

  const numRunsForAverage = 5  

  reports.forEach((run, index) => {
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
          previousFlakyRates: []
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

      if (index > 0) {
        if (data.previousFlakyRates.length >= numRunsForAverage) {
          data.previousFlakyRates.shift()  
        }
        data.previousFlakyRates.push(data.flakeRate)
      }
    })
  })

  const flakyTestArray = Array.from(flakyTestMap.values())

  flakyTestArray.forEach((data) => {
    data.flakeRate = data.attempts > 0 ? (data.flakes / data.attempts) * 100 : 0

    const averageFlakeRate =
      data.previousFlakyRates.length > 0
        ? data.previousFlakyRates.reduce((sum, rate) => sum + rate, 0) / data.previousFlakyRates.length
        : 0

    data.flakyRateChange = data.flakeRate - averageFlakeRate
  })

  const totalAttemptsAllTests = flakyTestArray.reduce(
    (sum, data) => sum + data.attempts,
    0
  )
  const totalFlakesAllTests = flakyTestArray.reduce(
    (sum, data) => sum + data.flakes,
    0
  )
  const overallFlakeRate =
    totalAttemptsAllTests > 0 ? (totalFlakesAllTests / totalAttemptsAllTests) * 100 : 0
  const overallFlakeRateFormatted = overallFlakeRate.toFixed(2)
  const overallFlakeRateMessage = `**Overall Flaky Rate:** ${overallFlakeRateFormatted}%`

  const flakyTestArrayNonZero = flakyTestArray.filter(
    (data) => data.flakeRate > 0
  )

  const totalRuns = reports.length
  const totalRunsMessage = `<sub><i>Measured over ${totalRuns} runs.</i></sub>`

  if (flakyTestArrayNonZero.length === 0) {
    const noFlakyMessage = `<sub><i>No flaky tests detected over ${totalRuns} runs.</i></sub>`
    const summary = `
${overallFlakeRateMessage}

${noFlakyMessage}

[Github Test Reporter CTRF](https://github.com/ctrf-io/github-test-reporter)
`
    core.summary.addRaw(summary)
    return
  }

  flakyTestArrayNonZero.sort((a, b) => b.flakeRate - a.flakeRate)

  const flakyRowsWithSmoothedChange = flakyTestArrayNonZero.map((data) => {
    const { testName, attempts, pass, fail, flakeRate, flakyRateChange } = data
    const rateChange = flakyRateChange
      ? flakyRateChange > 0
        ? `⬆️ +${flakyRateChange.toFixed(2)}%`
        : `⬇️ ${flakyRateChange.toFixed(2)}%`
      : '-'

    return `| ${testName} | ${attempts} | ${pass} | ${fail} | ${flakeRate.toFixed(
      2
    )}% | ${rateChange} |`
  })

  const limitedSummaryRows = flakyRowsWithSmoothedChange.slice(0, rows)

  const summaryTableWithSmoothedChange = `
${overallFlakeRateMessage}

| Test 📝 | Attempts 🎯 | Pass ✅ | Fail ❌ | Flaky Rate 🍂 | Change 🔄 |
| --- | --- | --- | --- | --- | --- |
${limitedSummaryRows.join('\n')}

${totalRunsMessage}

[Github Test Reporter CTRF](https://github.com/ctrf-io/github-test-reporter)
`
  core.summary.addRaw(summaryTableWithSmoothedChange)
}
