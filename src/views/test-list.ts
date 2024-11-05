import * as core from '@actions/core'
import { CtrfTest } from '../../types/ctrf'
import { getTestName, stripAnsi } from '../common'

export function generateTestListView(tests: CtrfTest[], useSuiteName: boolean): void {
    try {
        let markdown = `\n`

        function escapeMarkdown(text: string): string {
            return text.replace(/([\\*_{}[\]()#+\-.!])/g, '\\$1')
        }

        tests.forEach((test) => {
            const statusEmoji =
                test.status === 'passed' ? '✅' :
                    test.status === 'failed' ? '❌' :
                        test.status === 'skipped' ? '⏭️' :
                            test.status === 'pending' ? '⏳' : '❓'

            const testName = escapeMarkdown(getTestName(test, useSuiteName))

            markdown += `**${statusEmoji} ${testName}**\n`

            if (test.status === 'failed') {
                let message = stripAnsi(test.message || "No failure message")
                message = message.replace(/\n{2,}/g, '\n').trim()

                const escapedMessage = escapeMarkdown(message)

                const indentedMessage = escapedMessage
                    .split('\n')
                    .filter(line => line.trim() !== '')
                    .map(line => `&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${line}`)
                    .join('\n')

                markdown += `${indentedMessage}\n`
            }
        })

        markdown += `\n[Github Test Reporter](https://github.com/ctrf-io/github-test-reporter)`

        core.summary.addRaw(markdown)

    } catch (error) {
        if (error instanceof Error) {
            core.setFailed(`Failed to display test list: ${error.message}`)
        } else {
            core.setFailed('An unknown error occurred')
        }
    }
}
