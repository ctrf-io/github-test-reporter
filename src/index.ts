#!/usr/bin/env node
import yargs from 'yargs/yargs'
import Handlebars from 'handlebars'
import { hideBin } from 'yargs/helpers'
import fs from 'fs'
import https from 'https'
import * as core from '@actions/core'
import { type CtrfReport } from '../types/ctrf'
import {
  write,
  generateSummaryDetailsTable,
  generateTestDetailsTable,
  generateFailedTestsDetailsTable,
  generateSkippedTestsDetailsTable,
  generateFlakyTestsDetailsTable,
  annotateFailed,
  addHeading,
  generateAIFailedTestsSummaryTable,
} from './summary'
import path from 'path'
import { generateHistoricSummary } from './historical'
import { extractGithubProperties, getTestName, stripAnsi } from './common'
import Convert = require('ansi-to-html')

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

interface Arguments {
  _: Array<string | number>
  file?: string
  title?: string
  summary?: string
  annotate?: boolean
  rows?: number
  artifactName?: string
  prComment?: boolean
  prCommentMessage?: string
  onFailOnly?: boolean
  domain?: string
  useSuiteName?: boolean
}

const argv: Arguments = yargs(hideBin(process.argv))
  .command(
    ['$0 <file>', 'all <file>'],
    'Generate all tables from the specified CTRF file',
    (yargs) => {
      return yargs.positional('file', {
        describe: 'Path to the CTRF file',
        type: 'string',
        demandOption: true,
      })
    }
  )
  .command(
    'summary <file>',
    'Generate test summary from a CTRF report',
    (yargs) => {
      return yargs.positional('file', {
        describe: 'Path to the CTRF file',
        type: 'string',
      })
    }
  )
  .command(
    'tests <file>',
    'Generate test details from a CTRF report',
    (yargs) => {
      return yargs.positional('file', {
        describe: 'Path to the CTRF file',
        type: 'string',
      })
    }
  )
  .command(
    'failed <file>',
    'Generate fail test report from a CTRF report',
    (yargs) => {
      return yargs.positional('file', {
        describe: 'Path to the CTRF file',
        type: 'string',
      })
    }
  )
  .command(
    'skipped <file>',
    'Generate skipped or pending report from a CTRF report',
    (yargs) => {
      return yargs.positional('file', {
        describe: 'Path to the CTRF file',
        type: 'string',
      })
    }
  )
  .command(
    'ai <file>',
    'Generate AI failed test summary from a CTRF report',
    (yargs) => {
      return yargs.positional('file', {
        describe: 'Path to the CTRF file',
        type: 'string',
      })
    }
  )
  .command(
    'flaky <file>',
    'Generate flaky test report from a CTRF report',
    (yargs) => {
      return yargs.positional('file', {
        describe: 'Path to the CTRF file',
        type: 'string',
      })
    }
  )
  .command(
    'custom <file> <summary>',
    'Generate a custom summary from a CTRF report',
    (yargs) => {
      return yargs
        .positional('file', {
          describe: 'Path to the CTRF file',
          type: 'string',
        })
        .positional('summary', {
          describe:
            'Text for custom summary or path to a Handlebars (.hbs) template file',
          type: 'string',
        })
    }
  )
  .command(
    'historical <file>',
    'Generate historical test results table from a CTRF report',
    (yargs) => {
      return yargs.positional('file', {
        describe: 'Path to the CTRF file',
        type: 'string',
      })
    }
  )
  .command(
    'annotate <file>',
    'Annotate failed tests from a CTRF report',
    (yargs) => {
      return yargs.positional('file', {
        describe: 'Path to the CTRF file',
        type: 'string',
      })
    }
  )
  .option('title', {
    type: 'string',
    description: 'Title of the summary',
  })
  .option('annotate', {
    type: 'boolean',
    description: 'annotate failed tests',
    default: true,
  })
  .option('rows', {
    type: 'number',
    description: 'Number of historical test result rows to show',
    default: 10,
  })
  .option('artifact-name', {
    type: 'string',
    description: 'Name of artifact for CTRF Report',
    default: 'ctrf-report',
  })
  .option('pr-comment', {
    type: 'boolean',
    description: 'Post a Pull Request comment with the summary',
    default: false,
  })
  .option('pr-comment-message', {
    type: 'string',
    description:
      'Custom message for your Pull Request comment using a string or handlebars template file',
  })
  .option('on-fail-only', {
    type: 'boolean',
    description: 'Post a Pull Request comment only if there are failed tests',
    default: false,
  })
  .option('domain', {
    type: 'string',
    description: 'Base URL for GitHub Enterprise Server',
  })
  .options('use-suite-name', {
    type: 'boolean',
    description: 'Use suite name in the test name',
    default: false,
  }
  )
  .help()
  .alias('help', 'h')
  .parseSync()

const commandUsed = argv._[0] || ''
const apiUrl = argv.domain ? `${argv.domain}/api/v3` : 'https://api.github.com'
const baseUrl = argv.domain || 'https://github.com'
const annotate = argv.annotate ?? true
const file = argv.file || ''
const title = argv.title || 'Test Summary'
const rows = argv.rows || 10
const artifactName = argv.artifactName || 'ctrf-report'
const useSuiteName = argv.useSuiteName ?? false

let prCommentMessage = argv.prCommentMessage
if (prCommentMessage) {
  if (path.extname(prCommentMessage) === '.hbs') {
    try {
      const report = validateCtrfFile(file)
      const template = fs.readFileSync(prCommentMessage, 'utf8')
      if (report !== null) {
        const reportContext = { ctrf: report.results, github: extractGithubProperties() }
        prCommentMessage = renderHandlebarsTemplate(template, reportContext)
      }
    } catch (error) {
      console.error('Failed to read prCommentMessage file:', error)
      prCommentMessage = ''
    }
  } else {
    console.log('Using provided string as the PR comment message')
  }
}

if ((commandUsed === 'all' || commandUsed === '') && argv.file) {
  try {
    let report = validateCtrfFile(argv.file)
    report = stripAnsiFromErrors(report)
    if (report !== null) {
      addHeading(title)
      generateSummaryDetailsTable(report)
      generateFailedTestsDetailsTable(report.results.tests, useSuiteName)
      generateFlakyTestsDetailsTable(report.results.tests, useSuiteName)
      generateTestDetailsTable(report.results.tests, useSuiteName)
      if (annotate) annotateFailed(report, useSuiteName)
      write()
      if (argv.prComment) {
        postSummaryComment(report, apiUrl, prCommentMessage)
      }
    }
  } catch (error) {
    console.error('Failed to read file:', error)
  }
} else if (argv._.includes('summary') && argv.file) {
  try {
    let report = validateCtrfFile(argv.file)
    report = stripAnsiFromErrors(report)
    if (report !== null) {
      if (argv.title) {
        addHeading(title)
      }
      generateSummaryDetailsTable(report)
      write()
      if (argv.prComment) {
        postSummaryComment(report, apiUrl, prCommentMessage)
      }
    }
  } catch (error) {
    console.error('Failed to read file:', error)
  }
} else if (argv._.includes('tests') && argv.file) {
  try {
    let report = validateCtrfFile(argv.file)
    report = stripAnsiFromErrors(report)
    if (report !== null) {
      if (argv.title) {
        addHeading(title)
      }
      generateTestDetailsTable(report.results.tests, useSuiteName)
      write()
      if (argv.prComment) {
        postSummaryComment(report, apiUrl, prCommentMessage)
      }
    }
  } catch (error) {
    console.error('Failed to read file:', error)
  }
} else if (argv._.includes('failed') && argv.file) {
  try {
    let report = validateCtrfFile(argv.file)
    report = stripAnsiFromErrors(report)
    if (report !== null) {
      if (argv.title) {
        addHeading(title)
      }
      generateFailedTestsDetailsTable(report.results.tests, useSuiteName)
      write()
      if (argv.prComment) {
        postSummaryComment(report, apiUrl, prCommentMessage)
      }
    }
  } catch (error) {
    console.error('Failed to read file:', error)
  }
} else if (argv._.includes('skipped') && argv.file) {
  try {
    let report = validateCtrfFile(argv.file)
    report = stripAnsiFromErrors(report)
    if (report !== null) {
      if (argv.title) {
        addHeading(title)
      }
      generateSkippedTestsDetailsTable(report.results.tests, useSuiteName)
      write()
      if (argv.prComment) {
        postSummaryComment(report, apiUrl, prCommentMessage)
      }
    }
  } catch (error) {
    console.error('Failed to read file:', error)
  }
} else if (argv._.includes('ai') && argv.file) {
  try {
    let report = validateCtrfFile(argv.file)
    report = stripAnsiFromErrors(report)
    if (report !== null) {
      if (argv.title) {
        addHeading(title)
      }
      generateAIFailedTestsSummaryTable(report.results.tests, useSuiteName)
      write()
      if (argv.prComment) {
        postSummaryComment(report, apiUrl, prCommentMessage)
      }
    }
  } catch (error) {
    console.error('Failed to read file:', error)
  }
} else if (argv._.includes('flaky') && argv.file) {
  try {
    const data = fs.readFileSync(argv.file, 'utf8')
    let report = validateCtrfFile(argv.file)
    report = stripAnsiFromErrors(report)
    if (report !== null) {
      if (argv.title) {
        addHeading(title)
      }
      generateFlakyTestsDetailsTable(report.results.tests, useSuiteName)
      write()
      if (argv.prComment) {
        postSummaryComment(report, apiUrl, prCommentMessage)
      }
    }
  } catch (error) {
    console.error('Failed to read file:', error)
  }
} else if (argv._.includes('custom') && argv.file) {
  try {
    if (argv.summary) {
      if (path.extname(argv.summary) === '.hbs') {
        try {
          let report = validateCtrfFile(file)
          const template = fs.readFileSync(argv.summary, 'utf8')
          if (report !== null) {
            const reportContext = { ctrf: report.results, github: extractGithubProperties() }
            const customSummary = renderHandlebarsTemplate(
              template,
              reportContext
            )
            core.summary.addRaw(customSummary)
            write()
          }
        } catch (error) {
          console.error('Failed to read prCommentMessage file:', error)
          prCommentMessage = ''
        }
      } else {
        core.summary.addRaw(argv.summary)
        write()
      }
    }
  } catch (error) {
    console.error('Failed to read file:', error)
  }
} else if (argv._.includes('historical') && argv.file) {
  try {
    let report = validateCtrfFile(argv.file)
    report = stripAnsiFromErrors(report)
    if (report !== null) {
      if (argv.title) {
        addHeading(title)
      }
      generateHistoricSummary(report, artifactName, rows)
    }
  } catch (error) {
    console.error('Failed to read file:', error)
  }
} else if (argv._.includes('annotate') && argv.file) {
  try {
    let report = validateCtrfFile(argv.file)
    report = stripAnsiFromErrors(report)
    if (report !== null) {
      annotateFailed(report, useSuiteName)
      if (argv.prComment) {
        postSummaryComment(report, apiUrl, prCommentMessage)
      }
    }
  } catch (error) {
    console.error('Failed to read file:', error)
  }
}

function validateCtrfFile(filePath: string): CtrfReport | null {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8')
    const jsonData: CtrfReport = JSON.parse(fileContent)

    if (!jsonData.results?.summary || !jsonData.results.tests) {
      console.warn('Warning: The file does not contain valid CTRF data.')
      return null
    }
    return jsonData
  } catch (error) {
    console.error('Failed to read or process the file:', error)
    console.warn(
      'Unable to generate GitHub Actions Summary, moving on without...'
    )
  }
  return null
}

function postSummaryComment(
  report: CtrfReport,
  apiUrl: string,
  prCommentMessage?: string
) {
  const token = process.env.GITHUB_TOKEN
  if (!token) {
    console.error(
      'GITHUB_TOKEN is not set. This is required for post-comment argument'
    )
    return
  }

  const eventPath = process.env.GITHUB_EVENT_PATH
  if (!eventPath) {
    console.error(
      'GITHUB_EVENT_PATH is not set. This is required to determine context.'
    )
    return
  }

  let context
  try {
    const eventData = fs.readFileSync(eventPath, 'utf8')
    context = JSON.parse(eventData)
  } catch (error) {
    console.error('Failed to read or parse event data:', error)
    return
  }

  const repo = context.repository.full_name
  const pullRequest = context.pull_request?.number

  if (!pullRequest) {
    console.log(
      'Action is not running in a pull request context. Skipping comment.'
    )
    return
  }

  if (argv.onFailOnly && report.results.summary.failed === 0) {
    console.log(
      'On fail only is set to true and no tests failed. Skipping comment'
    )
    return
  }

  const run_id = process.env.GITHUB_RUN_ID

  const summaryUrl = `${baseUrl}/${repo}/actions/runs/${run_id}#summary`
  const summaryMarkdown =
    prCommentMessage || generateSummaryMarkdown(report, summaryUrl)

  const data = JSON.stringify({ body: summaryMarkdown.trim() })

  const apiPath = `/repos/${repo}/issues/${pullRequest}/comments`

  const options = {
    hostname: apiUrl.replace(/^https?:\/\//, '').split('/')[0],
    path: apiPath,
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'github-actions-ctrf',
    },
  }

  const req = https.request(options, (res) => {
    let responseBody = ''

    res.on('data', (chunk) => {
      responseBody += chunk
    })

    res.on('end', () => {
      if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
        console.log('Comment posted successfully.')
      } else if (res.statusCode === 403) {
        console.error(`Failed to post comment: 403 Forbidden - ${responseBody}`)
        console.error(
          `This may be due to insufficient permissions on the GitHub token.`
        )
        console.error(
          `Please check the permissions for the GITHUB_TOKEN and ensure it has the appropriate scopes.`
        )
        console.error(
          `For more information, visit: https://docs.github.com/en/actions/security-for-github-actions/security-guides/automatic-token-authentication#permissions-for-the-github_token`
        )
      } else {
        console.error(
          `Failed to post comment: ${res.statusCode} - ${responseBody}`
        )
      }
    })
  })

  req.on('error', (error) => {
    console.error(`Failed to post comment: ${error.message}`)
  })

  req.write(data)
  req.end()
}

export function generateSummaryMarkdown(
  report: CtrfReport,
  summaryUrl: string
): string {
  const durationInSeconds =
    (report.results.summary.stop - report.results.summary.start) / 1000
  const durationFormatted =
    durationInSeconds < 1
      ? '<1s'
      : new Date(durationInSeconds * 1000).toISOString().substr(11, 8)

  const runNumber = process.env.GITHUB_RUN_NUMBER

  const flakyCount = report.results.tests.filter((test) => test.flaky).length
  const failedTests = report.results.tests.filter(
    (test) => test.status === 'failed'
  )
  const statusLine =
    report.results.summary.failed > 0
      ? '❌ **Some tests failed!**'
      : '🎉 **All tests passed!**'

  let failedTestsTable = ''
  if (failedTests.length > 0) {
    const failedTestsRows = failedTests
      .slice(0, 5)
      .map(
        (test) => `
<tr>
<td>${getTestName(test, useSuiteName)}</td>
<td>failed ❌</td>
<td>${stripAnsi(test.message || '') || 'No failure message'}</td>
</tr>`
      )
      .join('')

    const moreTestsText =
      failedTests.length > 5
        ? `<p><a href="${summaryUrl}">See all failed tests here</a></p>`
        : ''

    failedTestsTable = `
<table>
  <thead>
    <tr>
      <th>Name</th>
      <th>Status</th>
      <th>Failure Message</th>
    </tr>
  </thead>
  <tbody>
    ${failedTestsRows}
  </tbody>
</table>
${moreTestsText}`
  }

  return `
### ${title} - [Run #${runNumber}](${summaryUrl})

| **Tests 📝** | **Passed ✅** | **Failed ❌** | **Skipped ⏭️** | **Pending ⏳** | **Other ❓** | **Flaky 🍂** | **Duration ⏱️** |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ${report.results.summary.tests} |  ${report.results.summary.passed} |  ${report.results.summary.failed} |  ${report.results.summary.skipped} |  ${report.results.summary.pending} |  ${report.results.summary.other} |  ${flakyCount} |  ${durationFormatted} |

### ${statusLine}
${failedTestsTable}

[Github Actions Test Reporter CTRF](https://github.com/ctrf-io/github-actions-test-reporter-ctrf)
`
}

export function renderHandlebarsTemplate(template: any, context: any) {
  try {
    const compiledTemplate = Handlebars.compile(template)
    return compiledTemplate(context)
  } catch (error) {
    console.error('Failed to render Handlebars template:', error)
    return ''
  }
}

function stripAnsiFromErrors(report: CtrfReport | null): any {
  if (!report?.results?.tests) {
    return report
  }

  report.results.tests.forEach((test) => {
    if (test.message) {
      test.message = stripAnsi(test.message)
    }
    if (test.trace) {
      test.trace = stripAnsi(test.trace)
    }
  })

  return report
}
