import * as core from '@actions/core'
import { CtrfTest } from '../../types/ctrf'
import { getTestName } from '../common'

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