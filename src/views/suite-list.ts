import * as core from '@actions/core'
import { CtrfTest } from '../../types/ctrf'

export function generateSuiteListView(tests: CtrfTest[], useSuite: boolean): void {
  try {
    core.summary.addHeading(`Test Suite List`, 3)

    const workspacePath = process.env.GITHUB_WORKSPACE || ''

    const testResultsByGroup: Record<string, { tests: CtrfTest[], statusEmoji: string }> = {}

    // Group tests by suite or file path and determine suite status
    tests.forEach((test) => {
      const groupKey = useSuite ? test.suite || 'Unknown Suite' : (test.filePath || 'Unknown File').replace(workspacePath, '').replace(/^\//, '')

      if (!testResultsByGroup[groupKey]) {
        testResultsByGroup[groupKey] = { tests: [], statusEmoji: '✅' } // Default to "pass" status
      }

      testResultsByGroup[groupKey].tests.push(test)

      // Set statusEmoji to ❌ if any test in the suite fails
      if (test.status === 'failed') {
        testResultsByGroup[groupKey].statusEmoji = '❌'
      }
    })

    let viewHtml = ''

    // Function to escape HTML special characters
    function escapeHtml(text: string): string {
      return text.replace(/[&<>"']/g, function(match) {
        switch (match) {
          case '&':
            return '&amp;'
          case '<':
            return '&lt;'
          case '>':
            return '&gt;'
          case '"':
            return '&quot;'
          case "'":
            return '&#39;'
          default:
            return match
        }
      })
    }

    // Generate view for each group with status and list items
    Object.entries(testResultsByGroup).forEach(([groupKey, groupData]) => {
      // Display suite name with overall status emoji as h2
      viewHtml += `<h2>${groupData.statusEmoji} ${escapeHtml(groupKey)}</h2>`

      // Start unordered list
      viewHtml += `<ul style="list-style-type: none; padding-left: 0;">`

      groupData.tests.forEach((test) => {
        const statusEmoji = 
          test.status === 'passed' ? '✅' :
          test.status === 'failed' ? '❌' :
          test.status === 'skipped' ? '⏭️' :
          test.status === 'pending' ? '⏳' : '❓'

        // Escape test name
        const testName = escapeHtml(test.name || 'Unnamed Test')

        // Start list item
        viewHtml += `<li>${statusEmoji} ${testName}`

        // If the test failed, add the indented message
        if (test.status === 'failed' && test.message) {
          const message = test.message.replace(/\n{2,}/g, '\n') // Replace multiple newlines with single newline

          // Indent each line of the message
          const indentedMessage = message.split('\n').map(line => '&nbsp;&nbsp;&nbsp;&nbsp;' + escapeHtml(line)).join('<br>')

          // Add the indented message within a div
          viewHtml += `<div style="margin-left: 20px; color: #d32f2f;">${indentedMessage}</div>`
        }

        // Close list item
        viewHtml += `</li>`
      })

      // Close unordered list
      viewHtml += `</ul>`
    })

    // Add the generated HTML to the summary
    core.summary.addRaw(viewHtml)

    core.summary.addLink(
      'Github Test Reporter',
      'https://github.com/ctrf-io/github-test-reporter'
    )

  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(`Failed to display test suite list: ${error.message}`)
    } else {
      core.setFailed('An unknown error occurred')
    }
  }
}
