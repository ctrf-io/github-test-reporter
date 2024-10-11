import * as core from '@actions/core'
import { getTestName } from "../common"
import Convert from 'ansi-to-html'
import { CtrfTest } from '../../types/ctrf'

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