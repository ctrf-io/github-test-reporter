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
