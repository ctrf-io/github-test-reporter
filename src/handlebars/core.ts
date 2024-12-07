import * as handlebars from 'handlebars'
import { registerAllHelpers } from './helpers'
import { getAllGitHubContext } from '../github/context'

export function generateMarkdown(templateSource: string, data: any): string {
  return compileTemplate(templateSource, data)
}

export function compileTemplate(templateSource: string, data: any): string {
  registerAllHelpers()
  const context = { ctrf: data.results, github: getAllGitHubContext() }
  const template = handlebars.compile(templateSource, {
    preventIndent: true
  })

  return template(context)
}
