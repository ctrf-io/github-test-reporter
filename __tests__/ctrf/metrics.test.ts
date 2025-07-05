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
    expect(normalizeTestName('prefix-test')).toBe('prefix-test') // No spaces around dash
    expect(normalizeTestName('')).toBe('')
    expect(normalizeTestName('single-word')).toBe('single-word')
    expect(normalizeTestName('test - name')).toBe('name') // Simple prefix case
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
    // Current report with prefixed test names (as would happen with use-suite-name)
    const currentReport = createMockReport('auth.test.ts - should login')

    // Historical report without prefixed test names (as would happen in previous runs)
    const historicalReport = createMockReport('should login', 'failed')

    // Process the metrics
    const result = processTestReliabilityMetrics(currentReport, [
      historicalReport
    ])

    // The current test should now have historical metrics
    const currentTest = result.results.tests[0]
    expect(currentTest.extra).toBeDefined()
    expect(currentTest.extra?.totalAttempts).toBe(2) // Current + historical
    expect(currentTest.extra?.finalResults).toBe(2) // Current + historical
    expect(currentTest.extra?.finalFailures).toBe(1) // Only historical failed
  })

  it('should handle multiple historical reports with mixed naming', () => {
    // Current report with prefixed test names
    const currentReport = createMockReport('auth.test.ts - should login')

    // Historical reports with different naming patterns
    const historicalReport1 = createMockReport('should login', 'failed')
    const historicalReport2 = createMockReport(
      'login.test.ts - should login',
      'passed'
    )
    const historicalReport3 = createMockReport('should login', 'passed')

    // Process the metrics
    const result = processTestReliabilityMetrics(currentReport, [
      historicalReport1,
      historicalReport2,
      historicalReport3
    ])

    // The current test should have accumulated metrics from all historical reports
    const currentTest = result.results.tests[0]
    expect(currentTest.extra).toBeDefined()
    expect(currentTest.extra?.totalAttempts).toBe(4) // Current + 3 historical
    expect(currentTest.extra?.finalResults).toBe(4) // Current + 3 historical
    expect(currentTest.extra?.finalFailures).toBe(1) // Only one historical failed
  })

  it('should work with different prefix patterns', () => {
    // Current report with file path prefix
    const currentReport = createMockReport(
      'src/components/Button.test.ts - should render correctly'
    )

    // Historical reports with different prefix patterns
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

    // Process the metrics
    const result = processTestReliabilityMetrics(currentReport, [
      historicalReport1,
      historicalReport2,
      historicalReport3
    ])

    // The current test should have accumulated metrics from all historical reports
    const currentTest = result.results.tests[0]
    expect(currentTest.extra).toBeDefined()
    expect(currentTest.extra?.totalAttempts).toBe(4) // Current + 3 historical
    expect(currentTest.extra?.finalResults).toBe(4) // Current + 3 historical
    expect(currentTest.extra?.finalFailures).toBe(1) // Only one historical failed
  })

  it('should not match tests with completely different names', () => {
    // Current report with one test
    const currentReport = createMockReport('auth.test.ts - should login')

    // Historical report with completely different test
    const historicalReport = createMockReport('should logout', 'failed')

    // Process the metrics
    const result = processTestReliabilityMetrics(currentReport, [
      historicalReport
    ])

    // The current test should only have current metrics (no historical match)
    const currentTest = result.results.tests[0]
    expect(currentTest.extra).toBeDefined()
    expect(currentTest.extra?.totalAttempts).toBe(1) // Only current
    expect(currentTest.extra?.finalResults).toBe(1) // Only current
    expect(currentTest.extra?.finalFailures).toBe(0) // Current passed
  })
})
