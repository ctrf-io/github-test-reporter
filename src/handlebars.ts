import Convert from "ansi-to-html"
import { stripAnsi } from "./common"
import Handlebars from "handlebars"

export function renderHandlebarsTemplate(template: any, context: any) {
    try {
      const compiledTemplate = Handlebars.compile(template)
      return compiledTemplate(context)
    } catch (error) {
      console.error('Failed to render Handlebars template:', error)
      return ''
    }
  }  

Handlebars.registerHelper('countFlaky', function (tests) {
    return tests.filter((test: { flaky: boolean }) => test.flaky).length
  })
  
  Handlebars.registerHelper('formatDuration', function (start, stop) {
    const durationInSeconds = (stop - start) / 1000
    const durationFormatted =
      durationInSeconds < 1
        ? '<1s'
        : `${new Date(durationInSeconds * 1000).toISOString().substr(11, 8)}`
  
    return `${durationFormatted}`
  })
  
  Handlebars.registerHelper('eq', function (arg1, arg2) {
    return arg1 === arg2
  })
  
  Handlebars.registerHelper('stripAnsi', function (message) {
    return stripAnsi(message)
  })
  
  Handlebars.registerHelper('ansiToHtml', function (message) {
    const convert = new Convert()
    return convert.toHtml(message)
  })