import { getEmoji, normalizeSuite, stripAnsi } from '../../src/ctrf/helpers'

describe('getEmoji', () => {
  it('returns the correct emoji for "passed"', () => {
    expect(getEmoji('passed')).toBe('✅')
  })

  it('returns the correct emoji fokr "failed"', () => {
    expect(getEmoji('failed')).toBe('❌')
  })

  it('returns the correct emoji for "pending"', () => {
    expect(getEmoji('pending')).toBe('⏳')
  })

  it('returns the correct emoji for "other"', () => {
    expect(getEmoji('other')).toBe('❓')
  })

  it('returns the correct emoji for "build"', () => {
    expect(getEmoji('build')).toBe('🏗️')
  })

  it('returns the correct emoji for "duration"', () => {
    expect(getEmoji('duration')).toBe('⏱️')
  })

  it('returns the correct emoji for "flaky"', () => {
    expect(getEmoji('flaky')).toBe('🍂')
  })

  it('returns the correct emoji for "tests"', () => {
    expect(getEmoji('tests')).toBe('📝')
  })

  it('returns the correct emoji for "result"', () => {
    expect(getEmoji('result')).toBe('🧪')
  })
})

describe('normalizeSuite', () => {
  it('handles array format (new CTRF format) with default separator', () => {
    const suiteArray = ['string.test.ts', 'String Helpers', 'splitLines']
    const result = normalizeSuite(suiteArray)
    expect(result).toBe('string.test.ts > String Helpers > splitLines')
  })

  it('handles array format with custom separator', () => {
    const suiteArray = ['suite1', 'suite2', 'suite3']
    const result = normalizeSuite(suiteArray, ' / ')
    expect(result).toBe('suite1 / suite2 / suite3')
  })

  it('handles string format (legacy CTRF format)', () => {
    const suiteString = 'string.test.ts > String Helpers > splitLines'
    const result = normalizeSuite(suiteString)
    expect(result).toBe('string.test.ts > String Helpers > splitLines')
  })

  it('returns undefined when suite is undefined', () => {
    const result = normalizeSuite(undefined)
    expect(result).toBeUndefined()
  })

  it('handles empty array', () => {
    const result = normalizeSuite([])
    expect(result).toBe('')
  })

  it('handles single element array', () => {
    const result = normalizeSuite(['suite1'])
    expect(result).toBe('suite1')
  })

  it('handles empty string', () => {
    const result = normalizeSuite('')
    expect(result).toBeUndefined()
  })
})

describe('stripAnsi', () => {
  it('removes ANSI escape codes from a string', () => {
    const ansiString = '\u001b[31mHello\u001b[39m'
    const result = stripAnsi(ansiString)
    expect(result).toBe('Hello')
  })

  it('returns the same string if no ANSI codes are present', () => {
    const normalString = 'Just a normal string'
    const result = stripAnsi(normalString)
    expect(result).toBe(normalString)
  })

  it('handles empty strings correctly', () => {
    const emptyString = ''
    const result = stripAnsi(emptyString)
    expect(result).toBe('')
  })

  it('throws a TypeError if the input is not a string', () => {
    // @ts-expect-error Testing runtime error
    expect(() => stripAnsi(123)).toThrow(TypeError)
    // @ts-expect-error Testing runtime error
    expect(() => stripAnsi(null)).toThrow(TypeError)
    // @ts-expect-error Testing runtime error
    expect(() => stripAnsi(undefined)).toThrow(TypeError)
    // @ts-expect-error Testing runtime error
    expect(() => stripAnsi({})).toThrow(TypeError)
  })
})
