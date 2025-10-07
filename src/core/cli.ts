#!/usr/bin/env node
process.env.RUN_MODE = 'cli'

import yargs from 'yargs/yargs'
import { hideBin } from 'yargs/helpers'
import {
  exitActionOnFail,
  exitActionOnEmpty,
  getAllGitHubContext,
  handleError
} from '../github'
import { prepareReport } from '../ctrf'
import { handleViewsAndComments, handleAnnotations } from '../github/handler'
import { getCliInputs } from '../core/inputs'
import { context } from '@actions/github'
import { addCommentToIssue } from '../client/github'
import { generateMarkdown } from '../handlebars/core'
import { readTemplate } from '../utils'
import { BuiltInReports } from '../reports/core'
import path from 'path'
import { Inputs } from '../types'
import { Report } from 'ctrf'

export interface Arguments {
  _: (string | number)[]
  file?: string
  title?: string
  summary?: string
  communityReportName?: string
  annotate?: boolean
  rows?: number
  artifactName?: string
  pullRequest: boolean
  prComment?: boolean
  prCommentMessage?: string
  onFailOnly?: boolean
  domain?: string
  useSuite?: boolean
  useSuiteName?: boolean
  updateComment?: boolean
  overwriteComment?: boolean
  alwaysLatestComment?: boolean
  commentTag?: string
  results?: number
  exitOnNoFiles?: boolean
  exitOnFail?: boolean
  exitOnEmpty?: boolean
  fetchPreviousResults?: boolean
  reportOrder?: string
  maxWorkflowRunsToCheck?: number
  maxPreviousRunsToFetch?: number
  baseline?: number | string
  baselineReportPath?: string
}

async function main(): Promise<void> {
  const argv: Arguments = yargs(hideBin(process.argv))
    .command(
      ['$0 <file>', 'all <file>'],
      'Generate all tables from the specified CTRF file',
      yargs => {
        return yargs.positional('file', {
          describe: 'Path to the CTRF file',
          type: 'string',
          demandOption: true
        })
      }
    )
    .command(
      'summary <file>',
      'Generate test summary from a CTRF report',
      yargs => {
        return yargs.positional('file', {
          describe: 'Path to the CTRF file',
          type: 'string'
        })
      }
    )
    .command(
      'tests <file>',
      'Generate test details from a CTRF report',
      yargs => {
        return yargs.positional('file', {
          describe: 'Path to the CTRF file',
          type: 'string'
        })
      }
    )
    .command(
      'test-list <file>',
      'Generate test list from a CTRF report',
      yargs => {
        return yargs.positional('file', {
          describe: 'Path to the CTRF file',
          type: 'string'
        })
      }
    )
    .command(
      'failed <file>',
      'Generate fail test report from a CTRF report',
      yargs => {
        return yargs.positional('file', {
          describe: 'Path to the CTRF file',
          type: 'string'
        })
      }
    )
    .command(
      'failed-folded <file>',
      'Generate fail folded test report from a CTRF report',
      yargs => {
        return yargs.positional('file', {
          describe: 'Path to the CTRF file',
          type: 'string'
        })
      }
    )
    .command(
      'failed-rate <file>',
      'Generate a fail rate statistics test report from a CTRF report',
      yargs => {
        return yargs
          .positional('file', {
            describe: 'Path to the CTRF file',
            type: 'string'
          })
          .option('results', {
            type: 'number',
            description: 'Number of test results use for calculations',
            default: 100
          })
      }
    )
    .command(
      'skipped <file>',
      'Generate skipped or pending report from a CTRF report',
      yargs => {
        return yargs.positional('file', {
          describe: 'Path to the CTRF file',
          type: 'string'
        })
      }
    )
    .command(
      'ai <file>',
      'Generate AI failed test summary from a CTRF report',
      yargs => {
        return yargs.positional('file', {
          describe: 'Path to the CTRF file',
          type: 'string'
        })
      }
    )
    .command(
      'flaky <file>',
      'Generate flaky test report from a CTRF report',
      yargs => {
        return yargs.positional('file', {
          describe: 'Path to the CTRF file',
          type: 'string'
        })
      }
    )
    .command(
      'flaky-rate <file>',
      'Generate a flaky rate statistics test report from a CTRF report',
      yargs => {
        return yargs
          .positional('file', {
            describe: 'Path to the CTRF file',
            type: 'string'
          })
          .option('results', {
            type: 'number',
            description: 'Number of test results use for calculations',
            default: 100
          })
      }
    )
    .command(
      'suite-folded <file>',
      'Generate a test summary grouped by suite with tests folded',
      yargs => {
        return yargs
          .positional('file', {
            describe: 'Path to the CTRF file',
            type: 'string'
          })
          .option('useSuite', {
            type: 'boolean',
            description: 'Use suite property, default is filePath'
          })
      }
    )
    .command(
      'suite-list <file>',
      'Generate a test summary grouped by suite',
      yargs => {
        return yargs
          .positional('file', {
            describe: 'Path to the CTRF file',
            type: 'string'
          })
          .option('useSuite', {
            type: 'boolean',
            description: 'Use suite property, default is filePath'
          })
      }
    )
    .command(
      'file <file>',
      'Generate a test summary grouped by file path',
      yargs => {
        return yargs.positional('file', {
          describe: 'Path to the CTRF file',
          type: 'string'
        })
      }
    )
    .command(
      'custom <file> <summary>',
      'Generate a custom summary from a CTRF report',
      yargs => {
        return yargs
          .positional('file', {
            describe: 'Path to the CTRF file',
            type: 'string'
          })
          .positional('summary', {
            describe:
              'Text for custom summary or path to a Handlebars (.hbs) template file',
            type: 'string'
          })
      }
    )
    .command(
      'community <file> <community-report-name>',
      'Generate a community built report from a CTRF report',
      yargs => {
        return yargs
          .positional('file', {
            describe: 'Path to the CTRF file',
            type: 'string'
          })
          .positional('community-report-name', {
            describe: 'Name of community report to use',
            type: 'string'
          })
      }
    )
    .command(
      'historical <file>',
      'Generate historical test results table from a CTRF report',
      yargs => {
        return yargs.positional('file', {
          describe: 'Path to the CTRF file',
          type: 'string'
        })
      }
    )
    .command('pull-request <file>', 'Post a pull request comment', yargs => {
      return yargs.positional('file', {
        describe: 'Path to the CTRF file',
        type: 'string'
      })
    })
    .command(
      'annotate <file>',
      'Annotate failed tests from a CTRF report',
      yargs => {
        return yargs.positional('file', {
          describe: 'Path to the CTRF file',
          type: 'string'
        })
      }
    )
    .option('title', {
      type: 'string',
      description: 'Title of the summary'
    })
    .option('annotate', {
      type: 'boolean',
      description: 'annotate failed tests',
      default: true
    })
    .option('rows', {
      type: 'number',
      description: 'Number of historical test result rows to show',
      default: 10
    })
    .option('artifact-name', {
      type: 'string',
      description: 'Name of artifact for CTRF Report',
      default: 'ctrf-report'
    })
    .option('pull-request', {
      type: 'boolean',
      description: 'Post view to pull request comment',
      default: false
    })
    .option('pr-comment', {
      type: 'boolean',
      description: 'Post a Pull Request comment with the summary',
      default: false
    })
    .option('pr-comment-message', {
      type: 'string',
      description:
        'Custom message for your Pull Request comment using a string or handlebars template file'
    })
    .option('on-fail-only', {
      type: 'boolean',
      description: 'Post a Pull Request comment only if there are failed tests',
      default: false
    })
    .option('domain', {
      type: 'string',
      description: 'Base URL for GitHub Enterprise Server'
    })
    .options('use-suite-name', {
      type: 'boolean',
      description: 'Use suite name in the test name',
      default: false
    })
    .options('exit-on-no-files', {
      type: 'boolean',
      description: 'Fail action when if no test files are found',
      default: false
    })
    .options('exit-on-fail', {
      type: 'boolean',
      description: 'Fail action when if tests fail',
      default: false
    })
    .options('exit-on-empty', {
      type: 'boolean',
      description: 'Fail action when if no tests are found',
      default: false
    })
    .options('update-comment', {
      type: 'boolean',
      description: 'Updates existing Pull Request comment',
      default: false
    })
    .options('overwrite-comment', {
      type: 'boolean',
      description: 'Overwrites existing Pull Request comment',
      default: false
    })
    .options('comment-tag', {
      type: 'string',
      description: 'Tag to use to match Pull Request comments with'
    })
    .options('fetch-previous-results', {
      type: 'boolean',
      description:
        'Always fetch previous workflow runs when using custom templates.'
    })
    .options('report-order', {
      type: 'string',
      description:
        'Comma-separated list of report types to specify the order in which reports should be displayed'
    })
    .options('max-workflow-runs-to-check', {
      type: 'number',
      description:
        'Maximum number of workflow runs to check for previous reports (default: 2000)'
    })
    .options('max-previous-runs-to-fetch', {
      type: 'number',
      description:
        'Maximum number of previous runs to fetch and process for metrics and reports (default: 100)'
    })
    .option('baseline', {
      type: 'string',
      description:
        'Baseline for metrics comparison (number = previous n reports, string = reportId)'
    })
    .option('baseline-report-path', {
      type: 'string',
      description: 'Path to a specific CTRF report to use as a baseline'
    })
    .help()
    .alias('help', 'h')
    .parseSync()

  try {
    const inputs = getCliInputs(argv)
    const githubContext = getAllGitHubContext()

    const report = await prepareReport(inputs, githubContext)

    await handleViewsAndComments(inputs, report)
    handleAnnotations(inputs, report)

    await processPrComment(argv, report, inputs)

    if (inputs.exitOnEmpty) {
      exitActionOnEmpty(report)
    }
    if (inputs.exitOnFail) {
      exitActionOnFail(report)
    }
  } catch (error) {
    handleError(error)
    process.exit(1)
  }
}

main().catch(err => {
  console.error('Unexpected error:', err)
  process.exit(1)
})

async function processPrComment(
  args: Arguments,
  report: Report,
  inputs: Inputs
): Promise<void> {
  let prCommentMessage

  if (args.prComment) {
    if (args.prCommentMessage) {
      if (path.extname(args.prCommentMessage) === '.hbs') {
        try {
          const template = readTemplate(args.prCommentMessage)
          if (report !== null) {
            prCommentMessage = generateMarkdown(template, report)
          }
        } catch (error) {
          console.error('Failed to read prCommentMessage file:', error)
          prCommentMessage = ''
        }
      } else {
        console.log('Using provided string as the PR comment message')
      }
    }

    let shouldAddComment =
      (inputs.onFailOnly && report.results.summary.failed > 0) ||
      !inputs.onFailOnly

    shouldAddComment =
      (inputs.pullRequest || args.prComment) &&
      context.eventName === 'pull_request' &&
      shouldAddComment

    if (shouldAddComment) {
      await addCommentToIssue(
        context.repo.owner,
        context.repo.repo,
        context.issue.number,
        prCommentMessage
          ? prCommentMessage
          : generateMarkdown(readTemplate(BuiltInReports.PullRequest), report)
      )
    }
  }
}
