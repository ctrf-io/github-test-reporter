import Handlebars from 'handlebars'
import { splitLinesHelper } from '../../src/handlebars/helpers/string'

describe('String Helpers', () => {
  beforeEach(() => {
    // Register the helper before each test
    splitLinesHelper()
  })

  describe('splitLines', () => {
    it('should split lines correctly for multiline strings', () => {
      const template = Handlebars.compile(
        '{{#each (splitLines text)}}{{this}}{{#unless @last}},{{/unless}}{{/each}}'
      )
      const result = template({ text: 'Line one\nLine two\nLine three' })
      expect(result).toBe('Line one,Line two,Line three')
    })

    it('should filter out empty lines', () => {
      const template = Handlebars.compile(
        '{{#each (splitLines text)}}{{this}}{{#unless @last}},{{/unless}}{{/each}}'
      )
      const result = template({ text: 'Line one\n\nLine two\n\nLine three' })
      expect(result).toBe('Line one,Line two,Line three')
    })

    it('should handle undefined values gracefully', () => {
      const template = Handlebars.compile(
        '{{#each (splitLines text)}}{{this}}{{#unless @last}},{{/unless}}{{/each}}'
      )
      const result = template({ text: undefined })
      expect(result).toBe('')
    })

    it('should handle null values gracefully', () => {
      const template = Handlebars.compile(
        '{{#each (splitLines text)}}{{this}}{{#unless @last}},{{/unless}}{{/each}}'
      )
      const result = template({ text: null })
      expect(result).toBe('')
    })

    it('should handle empty strings', () => {
      const template = Handlebars.compile(
        '{{#each (splitLines text)}}{{this}}{{#unless @last}},{{/unless}}{{/each}}'
      )
      const result = template({ text: '' })
      expect(result).toBe('')
    })

    it('should handle strings with only whitespace', () => {
      const template = Handlebars.compile(
        '{{#each (splitLines text)}}{{this}}{{#unless @last}},{{/unless}}{{/each}}'
      )
      const result = template({ text: '   \n  \n   ' })
      expect(result).toBe('')
    })

    it('should handle single line strings', () => {
      const template = Handlebars.compile(
        '{{#each (splitLines text)}}{{this}}{{#unless @last}},{{/unless}}{{/each}}'
      )
      const result = template({ text: 'Single line' })
      expect(result).toBe('Single line')
    })
  })
})
