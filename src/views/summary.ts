import * as core from '@actions/core'
import {
  type CtrfReport,
} from '../../types/ctrf'

export function generateSummaryDetailsTable(report: CtrfReport): void {
  try {
    const durationInSeconds =
      (report.results.summary.stop - report.results.summary.start) / 1000
    const durationFormatted =
      durationInSeconds < 1
        ? '<1s'
        : `${new Date(durationInSeconds * 1000).toISOString().substr(11, 8)}`

    const flakyCount = report.results.tests.filter((test) => test.flaky).length

    core.summary
      .addTable([
        [
          'Tests 📝',
          'Passed ✅',
          'Failed ❌',
          'Skipped ⏭️',
          'Pending ⏳',
          'Other ❓',
          'Flaky 🍂',
          'Duration ⏱️',
        ],
        [
          report.results.summary.tests.toString(),
          report.results.summary.passed.toString(),
          report.results.summary.failed.toString(),
          report.results.summary.skipped.toString(),
          report.results.summary.pending.toString(),
          report.results.summary.other.toString(),
          flakyCount.toString(),
          durationFormatted,
        ],
      ])
      .addLink(
        'Github Actions Test Reporter CTRF',
        'https://github.com/ctrf-io/github-actions-test-reporter-ctrf'
      )
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(`Failed to append to job summary: ${error.message}`)
    } else {
      core.setFailed('An unknown error occurred')
    }
  }
}