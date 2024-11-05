import * as core from '@actions/core'
import { CtrfTest } from '../../types/ctrf'

export function generateSuiteListView(tests: CtrfTest[], useSuite: boolean): void {
  try {
    const workspacePath = process.env.GITHUB_WORKSPACE || ''

    const testResultsByGroup: Record<string, { tests: CtrfTest[], statusEmoji: string }> = {}

    // Group tests by suite or file path and determine suite status
    tests.forEach((test) => {
      const groupKey = useSuite
        ? test.suite || 'Unknown Suite'
        : (test.filePath || 'Unknown File').replace(workspacePath, '').replace(/^\//, '')

      if (!testResultsByGroup[groupKey]) {
        testResultsByGroup[groupKey] = { tests: [], statusEmoji: '✅' } // Default to "pass" status
      }

      testResultsByGroup[groupKey].tests.push(test)

      // Set statusEmoji to ❌ if any test in the suite fails
      if (test.status === 'failed') {
        testResultsByGroup[groupKey].statusEmoji = '❌'
      }
    })

    // Function to escape Markdown special characters
    function escapeMarkdown(text: string): string {
      return text.replace(/([\\*_{}[\]()#+\-.!])/g, '\\$1')
    }

    // Generate Markdown for each group and add it directly to the summary
    Object.entries(testResultsByGroup).forEach(([groupKey, groupData]) => {
      // Add group header with status emoji
      core.summary.addHeading(`${groupData.statusEmoji} ${escapeMarkdown(groupKey)}`, 2)

      groupData.tests.forEach((test) => {
        const statusEmoji =
          test.status === 'passed' ? '✅' :
          test.status === 'failed' ? '❌' :
          test.status === 'skipped' ? '⏭️' :
          test.status === 'pending' ? '⏳' : '❓'

        // Escape test name and add as a list item
        const testName = escapeMarkdown(test.name || 'Unnamed Test')
        core.summary.addRaw(`&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;**${statusEmoji} ${testName}**  \n`)

        // If the test failed, add the indented message below it
        if (test.status === 'failed' && test.message) {
          const message = test.message.replace(/\n{2,}/g, '\n').trim() // Replace multiple newlines with single newline and trim

          // Escape Markdown characters in the message
          const escapedMessage = escapeMarkdown(message)

          // Split the message into lines, filter out empty lines, and indent each line
          const indentedMessage = escapedMessage
            .split('\n')
            .filter(line => line.trim() !== '') // Remove empty lines
            .map(line => `&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${line}`)
            .join('\n')

          // Add the indented message
          core.summary.addRaw(`${indentedMessage}\n`)
        }
      })

      // Add a blank line for spacing between groups
      core.summary.addRaw('\n')
    })

    // Add the link at the end
    core.summary.addRaw(`[Github Test Reporter](https://github.com/ctrf-io/github-test-reporter)\n`)

    // Write the summary to display it in the GitHub Action
    core.summary.write()

  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(`Failed to display test suite list: ${error.message}`)
    } else {
      core.setFailed('An unknown error occurred')
    }
  }
}
