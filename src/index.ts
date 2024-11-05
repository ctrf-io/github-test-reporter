#!/usr/bin/env node
import yargs from 'yargs/yargs'
import { hideBin } from 'yargs/helpers'
import fs from 'fs'
import * as core from '@actions/core'
import {
  generateSummaryDetailsTable,
} from './views/summary'
import path from 'path'
import { generateHistoricSummary } from './views/historical'
import { extractGithubProperties, stripAnsiFromErrors, validateCtrfFile } from './common'
import { generateFlakyRateSummary } from './views/flaky-rate'
import { generateFailedRateSummary } from './views/failed-rate'
import { renderHandlebarsTemplate } from './handlebars'
import { postPullRequestComment } from './views/pull-request'
import { exitActionOnFail, write, addHeading } from './views/common'
import { annotateFailed } from './views/annotate'
import { generateAIFailedTestsSummaryTable } from './views/ai'
import { generateTestDetailsTable } from './views/detailed'
import { generateFailedTestsDetailsTable } from './views/failed'
import { generateFlakyTestsDetailsTable } from './views/flaky'
import { generateSkippedTestsDetailsTable } from './views/skipped'
import { generateFailedFoldedTable } from './views/failed-folded'
import { generateTestSuiteFoldedTable } from './views/suite-folded'
import { generateSuiteListView } from './views/suite-list'

interface Arguments {
  _: Array<string | number>
  file?: string
  title?: string
  summary?: string
  annotate?: boolean
  rows?: number
  artifactName?: string
  pullRequest: boolean,
  prComment?: boolean
  prCommentMessage?: string
  onFailOnly?: boolean
  domain?: string
  useSuite?: boolean
  useSuiteName?: boolean
  results?: number
  exitOnFail?: boolean
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
    'failed-folded <file>',
    'Generate fail folded test report from a CTRF report',
    (yargs) => {
      return yargs.positional('file', {
        describe: 'Path to the CTRF file',
        type: 'string',
      })
    }
  )
  .command(
    'failed-rate <file>',
    'Generate a fail rate statistics test report from a CTRF report',
    (yargs) => {
      return yargs.positional('file', {
        describe: 'Path to the CTRF file',
        type: 'string',
      })
        .option('results', {
          type: 'number',
          description: 'Number of test results use for calculations',
          default: 100,
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
    'flaky-rate <file>',
    'Generate a flaky rate statistics test report from a CTRF report',
    (yargs) => {
      return yargs.positional('file', {
        describe: 'Path to the CTRF file',
        type: 'string',
      })
        .option('results', {
          type: 'number',
          description: 'Number of test results use for calculations',
          default: 100,
        })
    }
  )
  .command(
    'suite-folded <file>',
    'Generate a test summary grouped by suite with tests folded',
    (yargs) => {
      return yargs.positional('file', {
        describe: 'Path to the CTRF file',
        type: 'string',
      })
      .option('useSuite', {
        type: 'boolean',
        description: 'Use suite property, default is filePath',
        })
    }
  )
  .command(
    'suite-list <file>',
    'Generate a test summary grouped by suite',
    (yargs) => {
      return yargs.positional('file', {
        describe: 'Path to the CTRF file',
        type: 'string',
      })
      .option('useSuite', {
        type: 'boolean',
        description: 'Use suite property, default is filePath',
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
    'pull-request <file>',
    'Post a pull request comment',
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
  .option('pull-request', {
    type: 'boolean',
    description: 'Post view to pull request comment',
    default: false,
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
  })
  .options('exit-on-fail', {
    type: 'boolean',
    description: 'Fail action when if tests fail',
    default: false,
  })
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
const results = argv.results || 100
const artifactName = argv.artifactName || 'ctrf-report'
const onFailOnly = argv.onFailOnly ?? false
const exitOnFail = argv.exitOnFail ?? false
const useSuiteName = argv.useSuiteName ?? false
const pullRequest = argv.pullRequest ?? false
const useSuite = argv.useSuite ?? false

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
        postPullRequestComment(report, apiUrl, baseUrl, onFailOnly, title, useSuiteName, prCommentMessage)
      }
      if (pullRequest) {
        postPullRequestComment(report, apiUrl, baseUrl, onFailOnly, title, useSuiteName, core.summary.stringify())
      }
      if (exitOnFail) {
        exitActionOnFail(report)
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
        postPullRequestComment(report, apiUrl, baseUrl, onFailOnly, title, useSuiteName, prCommentMessage)
      }
      if (pullRequest) {
        postPullRequestComment(report, apiUrl, baseUrl, onFailOnly, title, useSuiteName, core.summary.stringify())
      }
      if (exitOnFail) {
        exitActionOnFail(report)
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
        postPullRequestComment(report, apiUrl, baseUrl, onFailOnly, title, useSuiteName, prCommentMessage)
      }
      if (pullRequest) {
        postPullRequestComment(report, apiUrl, baseUrl, onFailOnly, title, useSuiteName, core.summary.stringify())
      }
      if (exitOnFail) {
        exitActionOnFail(report)
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
        postPullRequestComment(report, apiUrl, baseUrl, onFailOnly, title, useSuiteName, prCommentMessage)
      }
      if (pullRequest) {
        postPullRequestComment(report, apiUrl, baseUrl, onFailOnly, title, useSuiteName, core.summary.stringify())
      }
      if (exitOnFail) {
        exitActionOnFail(report)
      }
    }
  } catch (error) {
    console.error('Failed to read file:', error)
  }
} else if (argv._.includes('failed-folded') && argv.file) {
  try {
    let report = validateCtrfFile(argv.file)
    report = stripAnsiFromErrors(report)
    if (report !== null) {
      if (argv.title) {
        addHeading(title)
      }
      generateFailedFoldedTable(report.results.tests, useSuiteName)
      write()
      if (argv.prComment) {
        postPullRequestComment(report, apiUrl, baseUrl, onFailOnly, title, useSuiteName, prCommentMessage)
      }
      if (pullRequest) {
        postPullRequestComment(report, apiUrl, baseUrl, onFailOnly, title, useSuiteName, core.summary.stringify())
      }
      if (exitOnFail) {
        exitActionOnFail(report)
      }
    }
  } catch (error) {
    console.error('Failed to read file:', error)
  }
} else if (argv._.includes('failed-rate') && argv.file) {
  try {
    let report = validateCtrfFile(argv.file)
    report = stripAnsiFromErrors(report)
    if (report !== null) {
      if (argv.title) {
        addHeading(title)
      }
      generateFailedRateSummary(report, artifactName, results, useSuiteName).then(() => {
        write()
        if (argv.prComment) {
          postPullRequestComment(report, apiUrl, baseUrl, onFailOnly, title, useSuiteName, prCommentMessage)
        }
        if (pullRequest) {
          postPullRequestComment(report, apiUrl, baseUrl, onFailOnly, title, useSuiteName, core.summary.stringify())
        }
        if (exitOnFail) {
          exitActionOnFail(report)
        }
      })
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
        postPullRequestComment(report, apiUrl, baseUrl, onFailOnly, title, useSuiteName, prCommentMessage)
      }
      if (pullRequest) {
        postPullRequestComment(report, apiUrl, baseUrl, onFailOnly, title, useSuiteName, core.summary.stringify())
      }
      if (exitOnFail) {
        exitActionOnFail(report)
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
        postPullRequestComment(report, apiUrl, baseUrl, onFailOnly, title, useSuiteName, prCommentMessage)
      }
      if (pullRequest) {
        postPullRequestComment(report, apiUrl, baseUrl, onFailOnly, title, useSuiteName, core.summary.stringify())
      }
      if (exitOnFail) {
        exitActionOnFail(report)
      }
    }
  } catch (error) {
    console.error('Failed to read file:', error)
  }
} else if (argv._.includes('flaky') && argv.file) {
  try {
    let report = validateCtrfFile(argv.file)
    report = stripAnsiFromErrors(report)
    if (report !== null) {
      if (argv.title) {
        addHeading(title)
      }
      generateFlakyTestsDetailsTable(report.results.tests, useSuiteName)
      write()
      if (argv.prComment) {
        postPullRequestComment(report, apiUrl, baseUrl, onFailOnly, title, useSuiteName, prCommentMessage)
      }
      if (pullRequest) {
        postPullRequestComment(report, apiUrl, baseUrl, onFailOnly, title, useSuiteName, core.summary.stringify())
      }
      if (exitOnFail) {
        exitActionOnFail(report)
      }
    }
  } catch (error) {
    console.error('Failed to read file:', error)
  }
} else if (argv._.includes('flaky-rate') && argv.file) {
  try {
    let report = validateCtrfFile(argv.file)
    report = stripAnsiFromErrors(report)
    if (report !== null) {
      if (argv.title) {
        addHeading(title)
      }
      generateFlakyRateSummary(report, artifactName, results, useSuiteName).then(() => {
        write()
        if (argv.prComment) {
          postPullRequestComment(report, apiUrl, baseUrl, onFailOnly, title, useSuiteName, prCommentMessage)
        }
        if (pullRequest) {
          postPullRequestComment(report, apiUrl, baseUrl, onFailOnly, title, useSuiteName, core.summary.stringify())
        }
        if (exitOnFail) {
          exitActionOnFail(report)
        }
      })
    }
  } catch (error) {
    console.error('Failed to read file:', error)
  }
} else if (argv._.includes('suite-folded') && argv.file) {
  try {
    let report = validateCtrfFile(argv.file)
    report = stripAnsiFromErrors(report)
    if (report !== null) {
      if (argv.title) {
        addHeading(title)
      }
      generateTestSuiteFoldedTable(report.results.tests, useSuite)
      write()
      if (argv.prComment) {
        postPullRequestComment(report, apiUrl, baseUrl, onFailOnly, title, useSuiteName, prCommentMessage)
      }
      if (pullRequest) {
        postPullRequestComment(report, apiUrl, baseUrl, onFailOnly, title, useSuiteName, core.summary.stringify())
      }
      if (exitOnFail) {
        exitActionOnFail(report)
      }
    }
  } catch (error) {
    console.error('Failed to read file:', error)
  }
} else if (argv._.includes('suite-list') && argv.file) {
  try {
    let report = validateCtrfFile(argv.file)
    report = stripAnsiFromErrors(report)
    if (report !== null) {
      if (argv.title) {
        addHeading(title)
      }
      generateSuiteListView(report.results.tests, useSuite)
      write()
      if (argv.prComment) {
        postPullRequestComment(report, apiUrl, baseUrl, onFailOnly, title, useSuiteName, prCommentMessage)
      }
      if (pullRequest) {
        postPullRequestComment(report, apiUrl, baseUrl, onFailOnly, title, useSuiteName, core.summary.stringify())
      }
      if (exitOnFail) {
        exitActionOnFail(report)
      }
    }
  } catch (error) {
    console.error('Failed to read file:', error)
  }
}
 else if (argv._.includes('custom') && argv.file) {
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
            if (argv.prComment) {
              postPullRequestComment(report, apiUrl, baseUrl, onFailOnly, title, useSuiteName, prCommentMessage)
            }
            if (pullRequest) {
              postPullRequestComment(report, apiUrl, baseUrl, onFailOnly, title, useSuiteName, core.summary.stringify())
            }
            if (exitOnFail) {
              exitActionOnFail(report)
            }
          }
        } catch (error) {
          console.error('Failed to read prCommentMessage file:', error)
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
      generateHistoricSummary(report, artifactName, rows, exitOnFail).then(() => {
        write()
        if (argv.prComment) {
          postPullRequestComment(report, apiUrl, baseUrl, onFailOnly, title, useSuiteName, prCommentMessage)
        }
        if (pullRequest) {
          postPullRequestComment(report, apiUrl, baseUrl, onFailOnly, title, useSuiteName, core.summary.stringify())
        }
        if (exitOnFail) {
          exitActionOnFail(report)
        }
      })
    }
  } catch (error) {
    console.error('Failed to read file:', error)
  }
} else if (argv._.includes('pull-request') && argv.file) {
  try {
    let report = validateCtrfFile(argv.file)
    report = stripAnsiFromErrors(report)
    if (report !== null) {
      if (argv.title) {
        addHeading(title)
      }
      postPullRequestComment(report, apiUrl, baseUrl, onFailOnly, title, useSuiteName)
    }
  } catch (error) {
    console.error('Failed to read file:', error)
  }
}
else if (argv._.includes('annotate') && argv.file) {
  try {
    let report = validateCtrfFile(argv.file)
    report = stripAnsiFromErrors(report)
    if (report !== null) {
      annotateFailed(report, useSuiteName)
      if (argv.prComment) {
        postPullRequestComment(report, apiUrl, baseUrl, onFailOnly, title, useSuiteName, prCommentMessage)
      }
    }
  } catch (error) {
    console.error('Failed to read file:', error)
  }
}