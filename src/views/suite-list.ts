import * as core from '@actions/core'
import { CtrfTest } from '../../types/ctrf'

export function generateSuiteListView(tests: CtrfTest[], useSuite: boolean): void {
  try {
    // Initialize an empty markdown variable
    let markdown = ``

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

    // Generate Markdown for each group with status and test items
    Object.entries(testResultsByGroup).forEach(([groupKey, groupData]) => {
      // Add group header with status emoji
      markdown += `## ${groupData.statusEmoji} ${escapeMarkdown(groupKey)}\n\n`

      groupData.tests.forEach((test) => {
        const statusEmoji =
          test.status === 'passed' ? '✅' :
          test.status === 'failed' ? '❌' :
          test.status === 'skipped' ? '⏭️' :
          test.status === 'pending' ? '⏳' : '❓'

        // Escape test name
        const testName = escapeMarkdown(test.name || 'Unnamed Test')

        // Add test item with indentation (6 non-breaking spaces) and bold formatting
        markdown += `&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;**${statusEmoji} ${testName}**\n`

        // If the test failed, add the indented message
        if (test.status === 'failed' && test.message) {
          const message = test.message.replace(/\n{2,}/g, '\n').trim() // Replace multiple newlines with single newline and trim

          // Escape Markdown characters in the message
          const escapedMessage = escapeMarkdown(message)

          // Split the message into lines, filter out empty lines, and indent each line with 14 non-breaking spaces
          const indentedMessage = escapedMessage
            .split('\n')
            .filter(line => line.trim() !== '') // Remove empty lines
            .map(line => `&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${line}`)
            .join('\n')

          // Add the indented message
          markdown += `${indentedMessage}\n`
        }
      })

      // Add a blank line after each group for spacing
      markdown += `\n`
    })

    // Add a link at the end
    markdown += `[Github Test Reporter](https://github.com/ctrf-io/github-test-reporter)`

    // Add the generated Markdown to the summary
    core.summary.addRaw(markdown)

  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(`Failed to display test suite list: ${error.message}`)
    } else {
      core.setFailed('An unknown error occurred')
    }
  }
}
