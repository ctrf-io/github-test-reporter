import Handlebars from 'handlebars'
import { registerAllHelpers } from './helpers'
import { getAllGitHubContext } from '../github/context'
import { loadHelpers } from 'handlebars-helpers-ctrf'
import { Report } from 'ctrf'

/**
 * Generates markdown content from a Handlebars template and provided data.
 *
 * @param templateSource - The source string of the Handlebars template.
 * @param data - The data to populate the template with.
 * @returns The generated markdown string.
 */
export function generateMarkdown(
  templateSource: string,
  report: Report
): string {
  return compileTemplate(templateSource, report)
}

/**
 * Compiles a Handlebars template with the provided data.
 *
 * - Registers all necessary Handlebars helpers before compiling.
 * - Combines CTRF report data and GitHub context into a single context object.
 * - Uses the provided template source to generate markdown output.
 *
 * @param templateSource - The source string of the Handlebars template.
 * @param data - The `TemplateData` object containing the data for the template.
 * @returns The compiled markdown string based on the template and data.
 */
export function compileTemplate(templateSource: string, data: Report): string {
  registerAllHelpers()
  loadHelpers(Handlebars)
  // when full ctrf library is compatible, use ctrf: data
  const context = {
    ctrf: data.results,
    report: data,
    github: getAllGitHubContext()
  }
  const template = Handlebars.compile(templateSource, {
    preventIndent: true
  })

  return template(context)
}
