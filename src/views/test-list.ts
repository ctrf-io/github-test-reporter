import * as core from '@actions/core'
import { CtrfTest } from '../../types/ctrf'
import { getTestName } from '../common'

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
                const message = test.message
                    ? test.message.replace(/\n{2,}/g, '\n').trim()
                    : "No failure message"

                const escapedMessage = escapeMarkdown(message)

                const indentedMessage = escapedMessage
                    .split('\n')
                    .filter(line => line.trim() !== '')
                    .map(line => `&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${line}`)
                    .join('\n')

                markdown += `${indentedMessage}\n`
            }
        })

        core.summary.addRaw(markdown)

        core.summary
            .addLink(
                'Github Test Reporter CTRF',
                'https://github.com/ctrf-io/github-test-reporter'
            )

    } catch (error) {
        if (error instanceof Error) {
            core.setFailed(`Failed to display test list: ${error.message}`)
        } else {
            core.setFailed('An unknown error occurred')
        }
    }
}
