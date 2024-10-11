import * as core from '@actions/core'
import {
  type CtrfTest,
  type CtrfTestState,
  type CtrfReport,
} from '../../types/ctrf'
import { getTestName, stripAnsi } from '../common'
import Convert from 'ansi-to-html'

export function generateTestDetailsTable(tests: CtrfTest[], useSuiteName: boolean): void {
  try {
    core.summary.addHeading(`Detailed Test Results`, 3)

    const maxRows = 8000
    let limitedTests = tests

    if (tests.length > maxRows) {
      limitedTests = tests.slice(0, maxRows)
    }

    const headers = [
      { data: 'Name', header: true },
      { data: 'Status', header: true },
      { data: 'ms', header: true },
      { data: 'Flaky 🍂', header: true },
    ]

    const rows = limitedTests.map((test) => [
      { data: getTestName(test, useSuiteName), header: false },
      {
        data: `${test.status} ${getEmojiForStatus(test.status)}`,
        header: false,
      },
      { data: test.duration.toString(), header: false },
      { data: test.flaky ? 'Yes' : '', header: false },
    ])

    core.summary.addTable([headers, ...rows])

    if (tests.length > maxRows) {
      core.summary.addRaw(
        `Note: You have a lot of tests. We've limited the number shown in the detailed breakdown to ${maxRows}.`
      )
    }
    core.summary.addLink(
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

export function generateFlakyTestsDetailsTable(tests: CtrfTest[], useSuiteName: boolean): void {
  try {
    core.summary.addHeading(`Flaky Tests`, 3)

    const flakyTests = tests.filter((test) => test.flaky)

    if (flakyTests.length > 0) {
      const headers = [
        { data: 'Name', header: true },
        { data: 'Status', header: true },
        { data: 'Retries', header: true },
        { data: 'Flaky 🍂', header: true },
      ]

      const rows = flakyTests.map((test) => [
        { data: getTestName(test, useSuiteName), header: false },
        {
          data: test.status + ' ' + getEmojiForStatus(test.status),
          header: false,
        },
        { data: test.retries?.toString() || '0', header: false },
        { data: 'Yes', header: false },
      ])

      core.summary
        .addTable([headers, ...rows])
        .addLink(
          'Github Actions Test Reporter CTRF',
          'https://github.com/ctrf-io/github-actions-test-reporter-ctrf'
        )
    } else {
      core.summary.addRaw('No flaky tests detected. ✨')
    }
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(`Failed to display flaky test details: ${error.message}`)
    } else {
      core.setFailed('An unknown error occurred')
    }
  }
}

export function generateSkippedTestsDetailsTable(tests: CtrfTest[], useSuiteName: boolean): void {
  try {
    core.summary.addHeading(`Skipped and Pending Tests`, 3)

    const skippedTests = tests.filter(
      (test) => test.status === 'skipped' || test.status === 'pending'
    )

    if (skippedTests.length > 0) {
      const headers = [
        { data: 'Name', header: true },
        { data: 'Status', header: true },
      ]

      const rows = skippedTests.map((test) => [
        { data: getTestName(test, useSuiteName), header: false },
        {
          data: test.status + ' ' + getEmojiForStatus(test.status),
          header: false,
        },
      ])

      core.summary
        .addTable([headers, ...rows])
        .addLink(
          'Github Actions Test Reporter CTRF',
          'https://github.com/ctrf-io/github-actions-test-reporter-ctrf'
        )
    } else {
      core.summary.addRaw('No skipped or pending tests detected. ✨')
    }
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(`Failed to display skipped/pending test details: ${error.message}`)
    } else {
      core.setFailed('An unknown error occurred')
    }
  }
}


export function generateFailedTestsDetailsTable(tests: CtrfTest[], useSuiteName: boolean): void {
  try {
    core.summary.addHeading(`Failed Tests`, 3)
    const convert = new Convert()

    const failedTests = tests.filter((test) => test.status === 'failed')

    if (failedTests.length > 0) {
      let tableHtml = `
<table>
  <thead>
    <tr>
      <th>Name</th>
      <th>Status</th>
      <th>Failure Message</th>
    </tr>
  </thead>
  <tbody>`
      failedTests.forEach((test) => {
        tableHtml += `
    <tr>
      <td>${getTestName(test, useSuiteName)}</td>
      <td>${test.status} ❌</td>
      <td>${convert.toHtml(test.message || '') || 'No failure message'}</td>
    </tr>`
      })
      tableHtml += `
  </tbody>
</table>`
      core.summary.addRaw(tableHtml)
      core.summary.addLink(
        'Github Actions Test Reporter CTRF',
        'https://github.com/ctrf-io/github-actions-test-reporter-ctrf'
      )
    } else {
      core.summary.addRaw('<p>No failed tests ✨</p>')
    }
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(`Failed to display failed test details: ${error.message}`)
    } else {
      core.setFailed('An unknown error occurred')
    }
  }
}

export function generateAIFailedTestsSummaryTable(tests: CtrfTest[], useSuiteName: boolean) {
  try {
    core.summary.addHeading(`AI Summary`, 3)

    const failedTests = tests.filter((test) => test.status === 'failed')

    if (failedTests.length > 0) {
      core.summary
        .addTable([
          [
            { data: 'Failed Test ❌', header: true },
            { data: 'AI Summary ✨', header: true },
          ],
          ...failedTests.map((test) => [
            { data: `${getTestName(test, useSuiteName)}`, header: true },
            { data: `${test.ai || 'No summary'}`, header: false },
          ]),
        ])
        .addLink(
          'Github Actions Test Reporter CTRF',
          'https://github.com/ctrf-io/github-actions-test-reporter-ctrf'
        )
    } else {
      core.summary.addRaw('No failed tests ✨')
    }
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(`Failed to display failed test details: ${error.message}`)
    } else {
      core.setFailed('An unknown error occurred')
    }
  }
}

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

export function addHeading(title: string): void {
  try {
    core.summary.addHeading(`${title}`, 2)
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(`Failed to add title: ${error.message}`)
    } else {
      core.setFailed('An unknown error occurred')
    }
  }
}

export function annotateFailed(report: CtrfReport, useSuiteName: boolean): void {
  try {
    report.results.tests.forEach((test) => {
      if (test.status === 'failed') {
        const message = test.message
          ? stripAnsi(test.message || '')
          : 'No message provided'
        const trace = test.trace ? stripAnsi(test.trace) : 'No trace available'
        const annotation = `${getTestName(test, useSuiteName)}: ${stripAnsi(message)} - ${stripAnsi(trace)}`

        core.error(annotation, {
          title: `Failed Test: ${getTestName(test, useSuiteName)}`,
          file: test.filePath,
          startLine: 0,
          endLine: 0,
        })
      }
    })
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(`Failed to annotate failed tests: ${error.message}`)
    } else {
      core.setFailed('An unknown error occurred')
    }
  }
}

export function write(): void {
  core.summary.write()
}

export function exitOnFail(report: CtrfReport): void {
  if (report.results.summary.failed > 0) {
  core.setFailed(`Github Test Reporter: ${report.results.summary.failed} failed tests found`)
  }
}

function getEmojiForStatus(status: CtrfTestState): string {
  switch (status) {
    case 'passed':
      return '✅'
    case 'failed':
      return '❌'
    case 'skipped':
      return '⏭️'
    case 'pending':
      return '⏳'
    default:
      return '❓'
  }
}
