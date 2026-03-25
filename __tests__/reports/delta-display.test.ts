import Handlebars from 'handlebars'
import { registerAllHelpers } from '../../src/handlebars/helpers'
import * as fs from 'fs'
import * as path from 'path'

// Register project's own helpers (string, array, math, ansi helpers)
beforeAll(() => {
  registerAllHelpers()

  // Register real implementations of helpers that handlebars-helpers-ctrf
  // would normally provide (the package is mocked to no-op in Jest config)
  Handlebars.registerHelper('gt', (a: number, b: number) => a > b)
  Handlebars.registerHelper('lt', (a: number, b: number) => a < b)
  Handlebars.registerHelper('abs', (a: number) => Math.abs(a))
  Handlebars.registerHelper(
    'toPercent',
    (value: number, decimals: number = 2) => (value * 100).toFixed(decimals)
  )
  Handlebars.registerHelper('formatDuration', (d: number) => `${d}ms`)
  Handlebars.registerHelper(
    'formatDurationFromTimes',
    (start: number, stop: number) => `${stop - start}ms`
  )
  Handlebars.registerHelper('addAll', (...args: unknown[]) => {
    const values = args.slice(0, -1) as number[]
    return values.reduce((sum, v) => sum + (v ?? 0), 0)
  })
  Handlebars.registerHelper('add', (a: number, b: number) => a + b)
  Handlebars.registerHelper(
    'countFlakyTests',
    (tests: Array<{ flaky?: boolean }>) =>
      tests?.filter((t) => t.flaky).length ?? 0
  )
  Handlebars.registerHelper(
    'sortTestsByFailRate',
    (tests: Array<Record<string, unknown>>) => tests ?? []
  )
  Handlebars.registerHelper(
    'sortTestsByFlakyRate',
    (tests: Array<Record<string, unknown>>) => tests ?? []
  )
  Handlebars.registerHelper('getCtrfEmoji', () => '')
})

function compileTemplate(
  templatePath: string,
  context: Record<string, unknown>
): string {
  const source = fs.readFileSync(
    path.resolve(__dirname, '../../src/reports', templatePath),
    'utf-8'
  )
  const template = Handlebars.compile(source, { preventIndent: true })
  return template(context)
}

describe('summary-delta-table.hbs delta display', () => {
  function makeContext(change: number) {
    return {
      ctrf: {
        summary: {
          tests: 10,
          passed: 8,
          failed: 1,
          skipped: 1,
          pending: 0,
          other: 0,
          start: 0,
          stop: 1000
        },
        tests: []
      },
      report: {
        results: {
          summary: {
            tests: 10,
            passed: 8,
            failed: 1,
            skipped: 1,
            pending: 0,
            other: 0,
            start: 0,
            stop: 1000
          }
        },
        insights: {
          extra: {
            summary: {
              tests: { current: 10, baseline: 10 - change, change },
              passed: { current: 8, baseline: 8 - change, change },
              failed: { current: 1, baseline: 1, change: 0 },
              skipped: { current: 1, baseline: 1, change: 0 },
              other: { current: 0, baseline: 0, change: 0 },
              flaky: { current: 0, baseline: 0, change: 0 },
              duration: { current: 1000, baseline: 1000, change: 0 }
            }
          }
        }
      }
    }
  }

  it('should show ↑ for positive change', () => {
    const result = compileTemplate('summary-delta-table.hbs', makeContext(3))
    expect(result).toContain('↑3')
  })

  it('should show ↓ for negative change', () => {
    const result = compileTemplate('summary-delta-table.hbs', makeContext(-2))
    expect(result).toContain('↓2')
  })

  it('should not show ±0 for zero change', () => {
    const result = compileTemplate('summary-delta-table.hbs', makeContext(0))
    expect(result).not.toContain('±0')
    expect(result).not.toContain('↑')
    expect(result).not.toContain('↓')
  })
})

describe('github.hbs delta display', () => {
  function makeContext(change: number) {
    return {
      ctrf: {
        summary: {
          tests: 10,
          passed: 8,
          failed: 1,
          skipped: 1,
          pending: 0,
          other: 0,
          start: 0,
          stop: 1000
        },
        tests: []
      },
      report: {
        insights: {
          extra: {
            summary: {
              failed: { change },
              passed: { change },
              skipped: { change: 0 },
              pending: { change: 0 },
              other: { change: 0 },
              flaky: { change: 0 },
              tests: { change },
              duration: { change: 0 }
            }
          }
        }
      },
      github: {}
    }
  }

  it('should show ↑ for positive change', () => {
    const result = compileTemplate('github.hbs', makeContext(3))
    expect(result).toContain('↑3')
  })

  it('should show ↓ for negative change', () => {
    const result = compileTemplate('github.hbs', makeContext(-2))
    expect(result).toContain('↓2')
  })

  it('should not show ±0 for zero change', () => {
    const result = compileTemplate('github.hbs', makeContext(0))
    expect(result).not.toContain('±0')
  })
})

describe('fail-rate-table.hbs delta display', () => {
  function makeContext(change: number) {
    return {
      ctrf: {
        tests: [
          {
            name: 'test1',
            status: 'passed',
            insights: {
              failRate: { current: 0.1, change },
              extra: {
                totalResults: 10,
                totalResultsPassed: 9,
                totalResultsFailed: 1
              }
            }
          }
        ]
      },
      report: {
        insights: {
          failRate: { current: 0.1, change }
        }
      }
    }
  }

  it('should show ↑ for positive fail rate change', () => {
    const result = compileTemplate('fail-rate-table.hbs', makeContext(0.05))
    expect(result).toContain('↑')
  })

  it('should show ↓ for negative fail rate change', () => {
    const result = compileTemplate('fail-rate-table.hbs', makeContext(-0.05))
    expect(result).toContain('↓')
  })

  it('should not show ±0 for zero fail rate change', () => {
    const result = compileTemplate('fail-rate-table.hbs', makeContext(0))
    expect(result).not.toContain('±0')
  })
})

describe('flaky-rate-table.hbs delta display', () => {
  function makeContext(change: number) {
    return {
      ctrf: {
        tests: [
          {
            name: 'test1',
            status: 'passed',
            insights: {
              flakyRate: { current: 0.1, change },
              extra: { totalResults: 10, totalAttemptsFlaky: 1 }
            }
          }
        ]
      },
      report: {
        insights: {
          flakyRate: { current: 0.1, change }
        }
      }
    }
  }

  it('should show ↑ for positive flaky rate change', () => {
    const result = compileTemplate('flaky-rate-table.hbs', makeContext(0.05))
    expect(result).toContain('↑')
  })

  it('should show ↓ for negative flaky rate change', () => {
    const result = compileTemplate('flaky-rate-table.hbs', makeContext(-0.05))
    expect(result).toContain('↓')
  })

  it('should not show ±0 for zero flaky rate change', () => {
    const result = compileTemplate('flaky-rate-table.hbs', makeContext(0))
    expect(result).not.toContain('±0')
  })
})
