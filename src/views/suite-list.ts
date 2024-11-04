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

    // Generate view for each group with status and code block
    Object.entries(testResultsByGroup).forEach(([groupKey, groupData]) => {
      // Display suite name with overall status emoji as h2
      viewHtml += `<h2>${groupData.statusEmoji} ${groupKey}</h2>`

      // Start code block for the tests
      viewHtml += `<pre style="background-color: #f5f5f5; padding: 10px; border-radius: 5px;">`

      groupData.tests.forEach((test) => {
        const statusEmoji = 
          test.status === 'passed' ? '✅' :
          test.status === 'failed' ? '❌' :
          test.status === 'skipped' ? '⏭️' :
          test.status === 'pending' ? '⏳' : '❓'

        // Display each test with status emoji
        viewHtml += `    ${statusEmoji} ${test.name || 'Unnamed Test'}\n`

        // If the test failed, add the indented message
        if (test.status === 'failed' && test.message) {
          const message = test.message.replace(/\n{2,}/g, '\n') // Replace multiple newlines with single newline

          // Indent each line of the message
          const indentedMessage = message.split('\n').map(line => '        ' + line).join('\n')

          // Escape HTML characters
          const escapedMessage = escapeHtml(indentedMessage)

          // Add the escaped, indented message
          viewHtml += escapedMessage + '\n'
        }
      })

      viewHtml += '</pre><br>' // Close code block and add space after each suite
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
