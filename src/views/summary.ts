import * as core from '@actions/core'
import {
  type CtrfReport,
} from '../../types/ctrf'
import { formatDurationHumanReadable } from '../common'

export function generateSummaryDetailsTable(report: CtrfReport): void {
  try {
    const duration = report.results.summary.stop - report.results.summary.start
    const durationHumanReadable = formatDurationHumanReadable(duration)

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
          durationHumanReadable,
        ],
      ])
      .addLink(
        'Github Test Reporter CTRF',
        'https://github.com/ctrf-io/github-test-reporter'
      )
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(`Failed to append to job summary: ${error.message}`)
    } else {
      core.setFailed('An unknown error occurred')
    }
  }
}