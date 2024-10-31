import * as core from '@actions/core'
import { CtrfTest } from '../../types/ctrf'
import { formatDurationHumanReadable } from '../common'

export function generateTestSuiteFoldedTable(tests: CtrfTest[], useSuite: boolean): void {
  try {
    core.summary.addHeading(`Test Suite Summary`, 3)
    
    const workspacePath = process.env.GITHUB_WORKSPACE || ''
    
    let totalPassed = 0
    let totalFailed = 0
    let totalSkippedPendingOther = { skipped: 0, pending: 0, other: 0 }

    const testResultsByGroup: Record<string, { passed: number, failed: number, skippedPendingOtherCount: number, skippedPendingOtherEmoji: string, duration: number, tests: CtrfTest[], statusEmoji: string }> = {}
    
    tests.forEach((test) => {
      const groupKey = useSuite ? test.suite || 'Unknown Suite' : (test.filePath || 'Unknown File').replace(workspacePath, '').replace(/^\//, '')

      if (!testResultsByGroup[groupKey]) {
        testResultsByGroup[groupKey] = { passed: 0, failed: 0, skippedPendingOtherCount: 0, skippedPendingOtherEmoji: '', duration: 0, tests: [], statusEmoji: '✅' }
      }

      testResultsByGroup[groupKey].tests.push(test)

      if (test.status === 'passed') {
        testResultsByGroup[groupKey].passed += 1
        totalPassed += 1
      } else if (test.status === 'failed') {
        testResultsByGroup[groupKey].failed += 1
        testResultsByGroup[groupKey].statusEmoji = '❌' 
        totalFailed += 1
      } else if (test.status === 'skipped') {
        testResultsByGroup[groupKey].skippedPendingOtherEmoji = '⏭️'
        testResultsByGroup[groupKey].skippedPendingOtherCount += 1
        totalSkippedPendingOther.skipped += 1
      } else if (test.status === 'pending') {
        testResultsByGroup[groupKey].skippedPendingOtherEmoji = '⏳'
        testResultsByGroup[groupKey].skippedPendingOtherCount += 1
        totalSkippedPendingOther.pending += 1
      } else if (test.status === 'other') {
        testResultsByGroup[groupKey].skippedPendingOtherEmoji = '❓'
        testResultsByGroup[groupKey].skippedPendingOtherCount += 1
        totalSkippedPendingOther.other += 1
      }
      
      testResultsByGroup[groupKey].duration += test.duration || 0
    })

    core.summary.addRaw(`<p><strong>${totalPassed} passed</strong>, <strong>${totalFailed} failed</strong>, and <strong>${totalSkippedPendingOther.skipped + totalSkippedPendingOther.pending + totalSkippedPendingOther.other} skipped/pending/other</strong></p>`)

    let tableHtml = `
  <table>
    <thead>
      <tr>
        <th>${useSuite ? 'Test Suite' : 'File'}</th>
        <th>Passed</th>
        <th>Failed</th>
        <th>Skipped</th>
        <th>Duration</th>
      </tr>
    </thead>
    <tbody>`

    Object.entries(testResultsByGroup).forEach(([groupKey, result]) => {
      tableHtml += `
      <tr>
        <td>
          <details>
            <summary>${result.statusEmoji} ${groupKey}</summary>`

      result.tests.forEach((test) => {
        const statusEmoji = 
          test.status === 'passed' ? '✅' :
          test.status === 'failed' ? '❌' :
          test.status === 'skipped' ? '⏭️' :
          test.status === 'pending' ? '⏳' : '❓'
        
        tableHtml += `<div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${statusEmoji} ${test.name || 'Unnamed Test'}</div>`
      })

      tableHtml += `
          </details>
        </td>
        <td>${result.passed > 0 ? `✅ ${result.passed}` : ''}</td>
        <td>${result.failed > 0 ? `❌ ${result.failed}` : ''}</td>
        <td>${result.skippedPendingOtherEmoji} ${result.skippedPendingOtherCount > 0 ? result.skippedPendingOtherCount : ''}</td>
        <td>${result.duration > 0 ? formatDurationHumanReadable(result.duration) : '1ms'}</td>
      </tr>`
    })

    tableHtml += `
    </tbody>
  </table>`

    core.summary.addRaw(tableHtml)

    core.summary
    .addLink(
      'Github Test Reporter',
      'https://github.com/ctrf-io/github-test-reporter'
    )
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(`Failed to display test suite summary: ${error.message}`)
    } else {
      core.setFailed('An unknown error occurred')
    }
  }
}
