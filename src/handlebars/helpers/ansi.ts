import Convert from 'ansi-to-html'
import Handlebars from 'handlebars'
import { stripAnsi } from '../../ctrf'

/**
 * Strips ANSI escape codes from the given message.
 *
 * @example
 * In Handlebars:
 * {{stripAnsi "Hello \u001b[31mRed\u001b[0m"}}
 * Returns: "Hello Red"
 *
 * @param {string} message - The string potentially containing ANSI escape codes.
 * @returns {string} The string with all ANSI escape codes removed.
 */
export function stripAnsiHelper(): void {
  Handlebars.registerHelper('stripAnsi', (message: string) => {
    return stripAnsi(message)
  })
}

/**
 * Converts ANSI escape codes in the given message to HTML.
 * This is useful for displaying colorized console output in a browser.
 *
 * @example
 * In Handlebars:
 * {{ansiToHtml "Hello \u001b[31mRed\u001b[0m"}}
 * Returns: "Hello <span style=\"color:#A00\">Red</span>"
 *
 * @param {string} message - The ANSI-colored string.
 * @returns {string} An HTML-formatted string reflecting the original ANSI colors.
 */
export function ansiToHtmlHelper(): void {
  Handlebars.registerHelper('ansiToHtml', (message: string) => {
    const convert = new Convert()
    return convert.toHtml(message)
  })
}

/**
 * Converts ANSI-formatted text into HTML, strips ANSI codes, and replaces newlines with `<br>`.
 * Ideal for rendering multi-line console messages in a human-friendly HTML format.
 *
 * @example
 * In Handlebars:
 * {{formatMessage "Line1\nLine2"}}
 * Returns HTML with each line separated by a <br>.
 *
 * @param {string} text - The text to format, possibly containing ANSI codes.
 * @returns {string} An HTML-formatted string, with ANSI codes removed and line breaks replaced.
 */
export function formatMessageHelper(): void {
  Handlebars.registerHelper('formatMessage', (text: string) => {
    const message = stripAnsi(text || 'No message available')
    const convert = new Convert()
    return convert
      .toHtml(message)
      .replace(/\n/g, '<br>')
      .replace(/\n{2,}/g, '\n')
  })
}

/**
 * Similar to `formatMessageHelper`, but designed to preserve code formatting more closely.
 * Converts ANSI to HTML and reduces consecutive newlines, but does not replace them with `<br>` tags.
 *
 * @example
 * In Handlebars:
 * {{formatMessagePreCode "Code block:\n  line1\n\n  line2"}}
 *
 * Returns an HTML-formatted string with ANSI removed and minimal whitespace adjustments.
 *
 * @param {string} text - The text to format, possibly containing ANSI codes.
 * @returns {string} An HTML-formatted string, with ANSI codes removed and minimized extra newlines.
 */
export function formatMessagePreCodeHelper(): void {
  Handlebars.registerHelper('formatMessagePreCode', (text: string) => {
    const message = stripAnsi(text || 'No message available')
    const convert = new Convert()
    return convert.toHtml(message).replace(/\n{2,}/g, '\n')
  })
}
