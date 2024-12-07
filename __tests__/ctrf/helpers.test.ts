import { getEmoji } from '../../src/ctrf/helpers'
import { stripAnsi } from '../../src/ctrf/helpers'

describe('getEmoji', () => {
  it('returns the correct emoji for "passed"', () => {
    expect(getEmoji('passed')).toBe('✅')
  })

  it('returns the correct emoji for "failed"', () => {
    expect(getEmoji('failed')).toBe('❌')
  })

  it('returns the correct emoji for "skipped"', () => {
    expect(getEmoji('skipped')).toBe('⏭️')
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

