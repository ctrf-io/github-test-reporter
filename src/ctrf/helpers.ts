import { CtrfReport, CtrfTestState } from '../types'

export function limitPreviousReports(
  report: CtrfReport,
  maxPreviousReports: number
): CtrfReport {
  if (!report.results.extra?.previousReports || maxPreviousReports <= 0) {
    return report 
  }

  report.results.extra.previousReports =
    report.results.extra.previousReports.slice(0, maxPreviousReports - 1)

  return report
}

export function getEmoji(
  status: CtrfTestState | 'flaky' | 'tests' | 'build' | 'duration' | 'result'
): string {
  switch (status) {
    case 'passed':
      return '✅'
    case 'failed':
      return '❌'
    case 'skipped':
      return '⏭️'
    case 'pending':
      return '⏳'
    case 'other':
      return '❓'
    case 'build':
      return '🏗️'
    case 'duration':
      return '⏱️'
    case 'flaky':
      return '🍂'
    case 'tests':
      return '📝'
    case 'result':
      return '🧪'
  }
}

export function stripAnsi(message: string) {
  if (typeof message !== 'string') {
    throw new TypeError(`Expected a \`string\`, got \`${typeof message}\``)
  }

  return message.replace(ansiRegex(), '')
}

export function stripAnsiFromErrors(report: CtrfReport | null): any {
  if (!report?.results?.tests) {
    return report
  }

  report.results.tests.forEach(test => {
    if (test.message) {
      test.message = stripAnsi(test.message)
    }
    if (test.trace) {
      test.trace = stripAnsi(test.trace)
    }
  })

  return report
}

export function ansiRegex({ onlyFirst = false } = {}) {
  const pattern = [
    '[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)',
    '(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))'
  ].join('|')

  return new RegExp(pattern, onlyFirst ? undefined : 'g')
}
