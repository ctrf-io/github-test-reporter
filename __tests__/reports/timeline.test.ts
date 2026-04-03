import Handlebars from 'handlebars'
import { registerAllHelpers } from '../../src/handlebars/helpers'
import { generateMarkdown } from '../../src/handlebars/core'
import { readTemplate } from '../../src/utils'
import { BuiltInReports } from '../../src/reports/core'
import { Report } from '../../src/ctrf/core/types/ctrf'

jest.mock('@actions/core')
jest.mock('@actions/github', () => ({
  context: {
    serverUrl: 'https://github.com',
    repo: { owner: 'test-owner', repo: 'test-repo' },
    sha: 'abc123',
    ref: 'refs/heads/main',
    workflow: 'test',
    job: 'test-job',
    runNumber: 1,
    runId: 12345,
    apiUrl: 'https://api.github.com',
    action: 'test-action',
    actor: 'test-actor',
    eventName: 'push',
    payload: {}
  }
}))

beforeAll(() => {
  registerAllHelpers()
})

function makeReport(tests: Record<string, unknown>[]): Report {
  return {
    reportFormat: 'CTRF',
    specVersion: '0.0.0',
    results: {
      tool: { name: 'jest' },
      summary: {
        tests: tests.length,
        passed: tests.filter((t) => t.status === 'passed').length,
        failed: tests.filter((t) => t.status === 'failed').length,
        skipped: 0,
        pending: 0,
        other: 0,
        start: 1000,
        stop: 5000
      },
      tests: tests as unknown as Report['results']['tests']
    }
  }
}

describe('sanitizeMermaid', () => {
  it('replaces colons with dashes', () => {
    const template = Handlebars.compile('{{sanitizeMermaid name}}')
    expect(template({ name: 'DataFlow: BURL event test' })).toBe(
      'DataFlow - BURL event test'
    )
  })

  it('replaces semicolons with commas', () => {
    const template = Handlebars.compile('{{sanitizeMermaid name}}')
    expect(template({ name: 'Test; part two' })).toBe('Test, part two')
  })

  it('removes hash characters', () => {
    const template = Handlebars.compile('{{sanitizeMermaid name}}')
    expect(template({ name: 'Test #1 name' })).toBe('Test 1 name')
  })

  it('handles names with no special characters', () => {
    const template = Handlebars.compile('{{sanitizeMermaid name}}')
    expect(template({ name: 'Simple test name' })).toBe('Simple test name')
  })

  it('handles multiple special characters in one name', () => {
    const template = Handlebars.compile('{{sanitizeMermaid name}}')
    expect(template({ name: 'Billing: PMP #2; check' })).toBe(
      'Billing - PMP 2, check'
    )
  })
})

describe('mermaidStatus', () => {
  it('maps passed to active', () => {
    const template = Handlebars.compile('{{mermaidStatus status}}')
    expect(template({ status: 'passed' })).toBe('active')
  })

  it('maps failed to crit', () => {
    const template = Handlebars.compile('{{mermaidStatus status}}')
    expect(template({ status: 'failed' })).toBe('crit')
  })

  it('maps skipped to done', () => {
    const template = Handlebars.compile('{{mermaidStatus status}}')
    expect(template({ status: 'skipped' })).toBe('done')
  })

  it('maps pending to done', () => {
    const template = Handlebars.compile('{{mermaidStatus status}}')
    expect(template({ status: 'pending' })).toBe('done')
  })

  it('maps other to done', () => {
    const template = Handlebars.compile('{{mermaidStatus status}}')
    expect(template({ status: 'other' })).toBe('done')
  })
})

describe('hasTimelineData', () => {
  it('returns true when tests have start and stop', () => {
    const template = Handlebars.compile(
      '{{#if (hasTimelineData tests)}}yes{{else}}no{{/if}}'
    )
    const result = template({
      tests: [
        {
          name: 'A',
          status: 'passed',
          duration: 100,
          start: 1000,
          stop: 1100
        }
      ]
    })
    expect(result).toBe('yes')
  })

  it('returns false when no tests have timestamps', () => {
    const template = Handlebars.compile(
      '{{#if (hasTimelineData tests)}}yes{{else}}no{{/if}}'
    )
    const result = template({
      tests: [{ name: 'A', status: 'passed', duration: 100 }]
    })
    expect(result).toBe('no')
  })

  it('returns false for empty array', () => {
    const template = Handlebars.compile(
      '{{#if (hasTimelineData tests)}}yes{{else}}no{{/if}}'
    )
    expect(template({ tests: [] })).toBe('no')
  })

  it('returns false when start and stop are zero', () => {
    const template = Handlebars.compile(
      '{{#if (hasTimelineData tests)}}yes{{else}}no{{/if}}'
    )
    const result = template({
      tests: [
        {
          name: 'A',
          status: 'passed',
          duration: 100,
          start: 0,
          stop: 0
        }
      ]
    })
    expect(result).toBe('no')
  })
})

describe('groupTestsForTimeline', () => {
  it('groups by threadId when available', () => {
    const template = Handlebars.compile(
      '{{#each (groupTestsForTimeline tests)}}[{{this.groupName}}:{{this.tests.length}}]{{/each}}'
    )
    const result = template({
      tests: [
        {
          name: 'A',
          status: 'passed',
          duration: 100,
          start: 1000,
          stop: 1100,
          threadId: 'worker-1'
        },
        {
          name: 'B',
          status: 'passed',
          duration: 200,
          start: 1000,
          stop: 1200,
          threadId: 'worker-2'
        },
        {
          name: 'C',
          status: 'passed',
          duration: 150,
          start: 1100,
          stop: 1250,
          threadId: 'worker-1'
        }
      ]
    })
    expect(result).toBe('[worker-1:2][worker-2:1]')
  })

  it('falls back to filePath when no threadId', () => {
    const template = Handlebars.compile(
      '{{#each (groupTestsForTimeline tests)}}[{{this.groupName}}]{{/each}}'
    )
    const result = template({
      tests: [
        {
          name: 'A',
          status: 'passed',
          duration: 100,
          start: 1000,
          stop: 1100,
          filePath: 'com.example.SuiteA'
        },
        {
          name: 'B',
          status: 'passed',
          duration: 200,
          start: 1000,
          stop: 1200,
          filePath: 'com.example.SuiteB'
        }
      ]
    })
    expect(result).toBe('[com.example.SuiteA][com.example.SuiteB]')
  })

  it('falls back to "Tests" when no threadId or filePath', () => {
    const template = Handlebars.compile(
      '{{#each (groupTestsForTimeline tests)}}[{{this.groupName}}]{{/each}}'
    )
    const result = template({
      tests: [
        {
          name: 'A',
          status: 'passed',
          duration: 100,
          start: 1000,
          stop: 1100
        },
        {
          name: 'B',
          status: 'passed',
          duration: 200,
          start: 1000,
          stop: 1200
        }
      ]
    })
    expect(result).toBe('[Tests]')
  })

  it('excludes tests missing start or stop', () => {
    const template = Handlebars.compile(
      '{{#each (groupTestsForTimeline tests)}}{{this.tests.length}}{{/each}}'
    )
    const result = template({
      tests: [
        {
          name: 'A',
          status: 'passed',
          duration: 100,
          start: 1000,
          stop: 1100,
          threadId: 'w1'
        },
        {
          name: 'B',
          status: 'passed',
          duration: 200,
          threadId: 'w1'
        },
        {
          name: 'C',
          status: 'passed',
          duration: 150,
          start: 0,
          stop: 0,
          threadId: 'w1'
        }
      ]
    })
    expect(result).toBe('1')
  })

  it('excludes skipped and pending tests', () => {
    const template = Handlebars.compile(
      '{{#each (groupTestsForTimeline tests)}}{{this.tests.length}}{{/each}}'
    )
    const result = template({
      tests: [
        {
          name: 'A',
          status: 'passed',
          duration: 100,
          start: 1000,
          stop: 1100,
          threadId: 'w1'
        },
        {
          name: 'B',
          status: 'skipped',
          duration: 50,
          start: 1000,
          stop: 1050,
          threadId: 'w1'
        },
        {
          name: 'C',
          status: 'pending',
          duration: 50,
          start: 1000,
          stop: 1050,
          threadId: 'w1'
        }
      ]
    })
    expect(result).toBe('1')
  })

  it('sorts tests within groups by start time', () => {
    const template = Handlebars.compile(
      '{{#each (groupTestsForTimeline tests)}}{{#each this.tests}}{{this.name}}{{/each}}{{/each}}'
    )
    const result = template({
      tests: [
        {
          name: 'B',
          status: 'passed',
          duration: 100,
          start: 2000,
          stop: 2100,
          threadId: 'w1'
        },
        {
          name: 'A',
          status: 'passed',
          duration: 100,
          start: 1000,
          stop: 1100,
          threadId: 'w1'
        }
      ]
    })
    expect(result).toBe('AB')
  })
})

describe('groupAllTestsForTimeline', () => {
  it('includes skipped and pending tests', () => {
    const template = Handlebars.compile(
      '{{#each (groupAllTestsForTimeline tests)}}{{this.tests.length}}{{/each}}'
    )
    const result = template({
      tests: [
        {
          name: 'A',
          status: 'passed',
          duration: 100,
          start: 1000,
          stop: 1100,
          threadId: 'w1'
        },
        {
          name: 'B',
          status: 'skipped',
          duration: 50,
          start: 1000,
          stop: 1050,
          threadId: 'w1'
        }
      ]
    })
    expect(result).toBe('2')
  })
})

describe('formatTimestampMs', () => {
  it('formats epoch ms to HH:mm:ss.SSS', () => {
    const template = Handlebars.compile('{{formatTimestampMs ts}}')
    const result = template({ ts: 1775132360047 })
    expect(result).toBe('12:19:20.047')
  })

  it('returns N/A for zero', () => {
    const template = Handlebars.compile('{{formatTimestampMs ts}}')
    expect(template({ ts: 0 })).toBe('N/A')
  })

  it('returns N/A for undefined', () => {
    const template = Handlebars.compile('{{formatTimestampMs ts}}')
    expect(template({})).toBe('N/A')
  })
})

describe('timelineGroupCount', () => {
  it('returns correct count of unique groups', () => {
    const template = Handlebars.compile('{{timelineGroupCount tests}}')
    const result = template({
      tests: [
        {
          name: 'A',
          status: 'passed',
          duration: 100,
          start: 1000,
          stop: 1100,
          threadId: 'w1'
        },
        {
          name: 'B',
          status: 'passed',
          duration: 200,
          start: 1000,
          stop: 1200,
          threadId: 'w2'
        },
        {
          name: 'C',
          status: 'passed',
          duration: 150,
          start: 1100,
          stop: 1250,
          threadId: 'w1'
        }
      ]
    })
    expect(result).toBe('2')
  })

  it('returns 0 when no tests have timeline data', () => {
    const template = Handlebars.compile('{{timelineGroupCount tests}}')
    const result = template({
      tests: [{ name: 'A', status: 'passed', duration: 100 }]
    })
    expect(result).toBe('0')
  })
})

describe('timeline template integration', () => {
  it('renders Mermaid gantt block with correct structure', () => {
    const report = makeReport([
      {
        name: 'Test A',
        status: 'passed',
        duration: 500,
        start: 1000,
        stop: 1500,
        threadId: 'worker-1'
      },
      {
        name: 'Test B',
        status: 'passed',
        duration: 1000,
        start: 1000,
        stop: 2000,
        threadId: 'worker-2'
      },
      {
        name: 'Test C',
        status: 'passed',
        duration: 500,
        start: 1500,
        stop: 2000,
        threadId: 'worker-1'
      }
    ])
    const template = readTemplate(BuiltInReports.Timeline)
    const result = generateMarkdown(template, report)

    expect(result).toContain('```mermaid')
    expect(result).toContain('gantt')
    expect(result).toContain('dateFormat x')
    expect(result).toContain('section worker-1')
    expect(result).toContain('section worker-2')
    expect(result).toContain('Test A')
    expect(result).toContain(':active, 1000, 1500')
  })

  it('renders correct Mermaid status keywords for passed and failed', () => {
    const report = makeReport([
      {
        name: 'Pass',
        status: 'passed',
        duration: 100,
        start: 1000,
        stop: 1100,
        threadId: 'w1'
      },
      {
        name: 'Fail',
        status: 'failed',
        duration: 100,
        start: 1100,
        stop: 1200,
        threadId: 'w1'
      }
    ])
    const template = readTemplate(BuiltInReports.Timeline)
    const result = generateMarkdown(template, report)

    expect(result).toContain(':active, 1000, 1100')
    expect(result).toContain(':crit, 1100, 1200')
  })

  it('excludes skipped tests from Mermaid chart but shows them in details table', () => {
    const report = makeReport([
      {
        name: 'Pass',
        status: 'passed',
        duration: 1000,
        start: 1000,
        stop: 2000,
        threadId: 'w1'
      },
      {
        name: 'Skip',
        status: 'skipped',
        duration: 100,
        start: 1200,
        stop: 1300,
        threadId: 'w1'
      }
    ])
    const template = readTemplate(BuiltInReports.Timeline)
    const result = generateMarkdown(template, report)

    const mermaidBlock = result.split('```')[1]
    expect(mermaidBlock).not.toContain('Skip')
    expect(result).toContain('| w1 | Skip | skipped |')
  })

  it('renders fallback message when no tests have timestamps', () => {
    const report = makeReport([
      { name: 'Test A', status: 'passed', duration: 100 }
    ])
    const template = readTemplate(BuiltInReports.Timeline)
    const result = generateMarkdown(template, report)

    expect(result).toContain('No eligible tests found')
    expect(result).not.toContain('```mermaid')
  })

  it('renders details table with correct columns', () => {
    const report = makeReport([
      {
        name: 'Test A',
        status: 'passed',
        duration: 500,
        start: 1000,
        stop: 1500,
        threadId: 'worker-1'
      }
    ])
    const template = readTemplate(BuiltInReports.Timeline)
    const result = generateMarkdown(template, report)

    expect(result).toContain('Timeline Details')
    expect(result).toContain(
      '| Thread | Test | Status | Start | Stop | Duration |'
    )
    expect(result).toContain('worker-1')
  })

  it('sanitizes test names with colons in Mermaid output', () => {
    const report = makeReport([
      {
        name: 'DataFlow: BURL event',
        status: 'passed',
        duration: 100,
        start: 1000,
        stop: 1100,
        threadId: 'w1'
      }
    ])
    const template = readTemplate(BuiltInReports.Timeline)
    const result = generateMarkdown(template, report)

    expect(result).toContain('DataFlow - BURL event')
  })
})
