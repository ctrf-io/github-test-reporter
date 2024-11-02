import * as core from '@actions/core'
import { getTestName } from "../common"
import Convert from 'ansi-to-html'
import { CtrfTest } from '../../types/ctrf'

export function generateFailedFoldedTable(tests: CtrfTest[], useSuiteName: boolean): void {
  try {
    core.summary.addHeading(`Failed Tests`, 3)
    const convert = new Convert()
  
    const failedTests = tests.filter((test) => test.status === 'failed')
  
    if (failedTests.length > 0) {
      let tableHtml = `
  <table>
    <thead>
      <tr>
        <th>Failed Tests</th>
      </tr>
    </thead>
    <tbody>`
      failedTests.forEach((test) => {
        const testName = getTestName(test, useSuiteName)
        const messageHtml = convert.toHtml((test.message || 'No message available').replace(/\n{2,}/g, '\n'))
        const traceHtml = convert.toHtml((test.trace || 'No trace available').replace(/\n{2,}/g, '\n'))   
        
        tableHtml += `
      <tr>
        <td>
          <details>
            <summary>❌ ${testName}</summary>
            <pre><code>${messageHtml}</code></pre>
            <p><strong>Trace:</strong></p>
            <pre><code>${traceHtml}</code></pre>
          </details>
        </td>
      </tr>`
      })
      tableHtml += `</tbody>
  </table>`

      core.summary.addRaw(tableHtml)
      core.summary.addLink(
        'Github Test Reporter CTRF',
        'https://github.com/ctrf-io/github-test-reporter'
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
