import Handlebars from 'handlebars'

/**
 * Converts a given string to uppercase.
 *
 * @example
 * In Handlebars:
 * {{uppercase "hello world"}}
 * Returns: "HELLO WORLD"
 *
 * @param {string} str - The input string to be converted.
 * @returns {string} The uppercase version of the input string.
 */
export function uppercaseHelper(): void {
  Handlebars.registerHelper('uppercase', (str: string) => {
    return str.toUpperCase()
  })
}

/**
 * Escapes special Markdown characters in the given string.
 * This is useful to ensure that characters like `*`, `_`, `(`, `)`, etc.
 * don't inadvertently format the output as Markdown.
 *
 * @example
 * In Handlebars:
 * {{escapeMarkdown "Hello *world*"}}
 * Returns: "Hello \\*world\\*"
 *
 * @param {string} str - The input string containing Markdown characters.
 * @returns {string} The string with Markdown characters escaped.
 */
export function escapeMarkdownHelper(): void {
  Handlebars.registerHelper('escapeMarkdown', (str: string) => {
    return str.replace(/([\\*_{}[\]()#+\-.!])/g, '\\$1')
  })
}

/**
 * Splits the given text into an array of lines, omitting any empty lines.
 * Useful for processing multiline strings and iterating over each line in a template.
 *
 * @example
 * In Handlebars:
 * {{#each (splitLines "Line one\n\nLine two\nLine three")}}
 *   {{this}}
 * {{/each}}
 *
 * Returns an array: ["Line one", "Line two", "Line three"]
 *
 * @param {string} str - The input string containing one or more lines.
 * @returns {string[]} An array of non-empty lines.
 */
export function splitLinesHelper(): void {
  Handlebars.registerHelper('splitLines', (str: string) => {
    return str.split('\n').filter((line: string) => line.trim() !== '')
  })
}

/**
 * Extracts the text from one string and returns a new string
 *
 * @example
 * In Handlebars:
 * {{slice "d9a40a70dd26e3b309e9d106adaca2417d4ffb1e" 0 7}}
 * Returns: "d9a40a7"
 * 
 * @param {string} str - The input string containing one or more lines.
 * @param {number} start - The index of the first character to include in the returned substring.
 * @param {number} end - The index of the first character to exclude from the returned substring.

 * @returns {string[]} A new string containing the extracted section of the string.
 */
export function sliceHelper(): void {
  Handlebars.registerHelper(
    'convert',
    (str: string, start: number, end: number) => {
      return str.slice(start, end)
    }
  )
}

/**
 * Converts timestamp to a human-readable format with a short month.
 *
 * @example
 * convertTimestamp("2025-01-19T15:06:45Z") // "Jan 19, 25, 3:06 PM"
 *
 * @param {string} timestamp - The ISO 8601 timestamp to convert.
 * @returns {string} A human-readable string representation of the timestamp.
 */
export function convertTimestamp(): void {
  Handlebars.registerHelper('convertTimestamp', (timestamp: string) => {
    if (!timestamp) return ''

    const date = new Date(timestamp)

    const options: Intl.DateTimeFormatOptions = {
      year: '2-digit',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false
    }

    return date.toLocaleString('en-US', options)
  })
}
