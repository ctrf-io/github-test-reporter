import * as core from '@actions/core'
import { CtrfReport } from "../../types/ctrf"
import { getTestName, stripAnsi } from "../common"

export function annotateFailed(report: CtrfReport, useSuiteName: boolean): void {
    try {
      report.results.tests.forEach((test) => {
        if (test.status === 'failed') {
          const message = test.message
            ? stripAnsi(test.message || '')
            : 'No message provided'
          const trace = test.trace ? stripAnsi(test.trace) : 'No trace available'
          const annotation = `${getTestName(test, useSuiteName)}: ${stripAnsi(message)} - ${stripAnsi(trace)}`
  
          core.error(annotation, {
            title: `Failed Test: ${getTestName(test, useSuiteName)}`,
            file: test.filePath,
            startLine: 0,
            endLine: 0,
          })
        }
      })
    } catch (error) {
      if (error instanceof Error) {
        core.setFailed(`Failed to annotate failed tests: ${error.message}`)
      } else {
        core.setFailed('An unknown error occurred')
      }
    }
  }