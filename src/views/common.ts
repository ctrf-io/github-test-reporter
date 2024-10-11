import * as core from '@actions/core'
import { CtrfReport, CtrfTestState } from '../../types/ctrf'

export function write(): void {
    core.summary.write()
  }
  
  export function exitActionOnFail(report: CtrfReport): void {
    if (report.results.summary.failed > 0) {
    core.setFailed(`Github Test Reporter: ${report.results.summary.failed} failed tests found`)
    }
  }

  export function addHeading(title: string): void {
    try {
      core.summary.addHeading(`${title}`, 2)
    } catch (error) {
      if (error instanceof Error) {
        core.setFailed(`Failed to add title: ${error.message}`)
      } else {
        core.setFailed('An unknown error occurred')
      }
    }
  }
  
  export function getEmojiForStatus(status: CtrfTestState): string {
    switch (status) {
      case 'passed':
        return '✅'
      case 'failed':
        return '❌'
      case 'skipped':
        return '⏭️'
      case 'pending':
        return '⏳'
      default:
        return '❓'
    }
  }
  