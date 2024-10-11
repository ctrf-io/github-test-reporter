import * as core from '@actions/core'
import { getTestName } from "../common"
import { getEmojiForStatus } from "./common"
import { CtrfTest } from '../../types/ctrf'

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
          { data: '🍂', header: false },
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