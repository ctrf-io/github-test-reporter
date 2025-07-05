import { processTestReliabilityMetrics } from '../../src/ctrf/metrics'
import { normalizeTestName } from '../../src/utils'
import { CtrfReport } from '../../src/types'

describe('normalizeTestName', () => {
  it('should remove suite prefix from test name', () => {
    expect(normalizeTestName('auth.test.ts - should login')).toBe(
      'should login'
    )
    expect(normalizeTestName('user.test.ts - should create user')).toBe(
      'should create user'
    )
    expect(normalizeTestName('api/users.test.ts - should fetch users')).toBe(
      'should fetch users'
    )
  })

  it('should handle test names without prefix', () => {
    expect(normalizeTestName('should login')).toBe('should login')
    expect(normalizeTestName('test without prefix')).toBe('test without prefix')
  })

  it('should handle edge cases', () => {
    expect(normalizeTestName('prefix - test - with - dashes')).toBe(
      'test - with - dashes'
    )
    expect(normalizeTestName('prefix-test')).toBe('prefix-test')
    expect(normalizeTestName('')).toBe('')
    expect(normalizeTestName('single-word')).toBe('single-word')
    expect(normalizeTestName('test - name')).toBe('name')
  })
})

describe('processTestReliabilityMetrics with use-suite-name', () => {
  const createMockReport = (
    testName: string,
    status: 'passed' | 'failed' = 'passed'
  ): CtrfReport => ({
    results: {
      tool: { name: 'jest' },
      summary: {
        tests: 1,
        passed: status === 'passed' ? 1 : 0,
        failed: status === 'failed' ? 1 : 0,
        skipped: 0,
        pending: 0,
        other: 0,
        start: 0,
        stop: 0
      },
      tests: [
        {
          name: testName,
          status,
          duration: 100
        }
      ]
    }
  })

  it('should match tests with and without suite prefixes', () => {
    const currentReport = createMockReport('auth.test.ts - should login')

    const historicalReport = createMockReport('should login', 'failed')

    const result = processTestReliabilityMetrics(currentReport, [
      historicalReport
    ])

    const currentTest = result.results.tests[0]
    expect(currentTest.extra).toBeDefined()
    expect(currentTest.extra?.totalAttempts).toBe(2)
    expect(currentTest.extra?.finalResults).toBe(2)
    expect(currentTest.extra?.finalFailures).toBe(1)
  })

  it('should handle multiple historical reports with mixed naming', () => {
    const currentReport = createMockReport('auth.test.ts - should login')

    const historicalReport1 = createMockReport('should login', 'failed')
    const historicalReport2 = createMockReport(
      'login.test.ts - should login',
      'passed'
    )
    const historicalReport3 = createMockReport('should login', 'passed')

    const result = processTestReliabilityMetrics(currentReport, [
      historicalReport1,
      historicalReport2,
      historicalReport3
    ])

    const currentTest = result.results.tests[0]
    expect(currentTest.extra).toBeDefined()
    expect(currentTest.extra?.totalAttempts).toBe(4)
    expect(currentTest.extra?.finalResults).toBe(4)
    expect(currentTest.extra?.finalFailures).toBe(1)
  })

  it('should work with different prefix patterns', () => {
    const currentReport = createMockReport(
      'src/components/Button.test.ts - should render correctly'
    )

    const historicalReport1 = createMockReport(
      'should render correctly',
      'passed'
    )
    const historicalReport2 = createMockReport(
      'Button.test.ts - should render correctly',
      'failed'
    )
    const historicalReport3 = createMockReport(
      'components/Button.test.ts - should render correctly',
      'passed'
    )

    const result = processTestReliabilityMetrics(currentReport, [
      historicalReport1,
      historicalReport2,
      historicalReport3
    ])

    const currentTest = result.results.tests[0]
    expect(currentTest.extra).toBeDefined()
    expect(currentTest.extra?.totalAttempts).toBe(4)
    expect(currentTest.extra?.finalResults).toBe(4)
    expect(currentTest.extra?.finalFailures).toBe(1)
  })

  it('should not match tests with completely different names', () => {
    const currentReport = createMockReport('auth.test.ts - should login')

    const historicalReport = createMockReport('should logout', 'failed')

    const result = processTestReliabilityMetrics(currentReport, [
      historicalReport
    ])

    const currentTest = result.results.tests[0]
    expect(currentTest.extra).toBeDefined()
    expect(currentTest.extra?.totalAttempts).toBe(1)
    expect(currentTest.extra?.finalResults).toBe(1)
    expect(currentTest.extra?.finalFailures).toBe(0)
  })
})
