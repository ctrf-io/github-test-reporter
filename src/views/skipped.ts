import * as core from '@actions/core'
import { CtrfTest } from "../../types/ctrf"
import { getTestName } from "../common"
import { getEmojiForStatus } from "./common"

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