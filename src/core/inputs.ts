import * as core from '@actions/core'
import { Inputs } from '../types/reporter'
import { Arguments } from './cli'

export function getCliInputs(args: Arguments): Inputs {
  const groupBy: 'suite' | 'filePath' =
    args.useSuite === true ? 'suite' : 'filePath'

  return {
    ctrfPath: args.file || '',
    templatePath: args.summary || '',
    summary: true,
    pullRequest: args.pullRequest || false,
    summaryReport: args._.includes('summary'),
    testReport: args._.includes('tests'),
    testListReport: args._.includes('test-list'),
    failedReport: args._.includes('failed'),
    failRateReport: args._.includes('failed-rate'),
    flakyReport: args._.includes('flaky'),
    flakyRateReport: args._.includes('flaky-rate'),
    failedFoldedReport: args._.includes('failed-folded'),
    previousResultsReport: args._.includes('historical'),
    aiReport: args._.includes('ai'),
    skipedReport: args._.includes('skipped'),
    suiteFoldedReport: args._.includes('suite-folded'),
    suiteListReport: args._.includes('suite-list'),
    pullRequestReport: args._.includes('pull-request'),
    gitReport: args._.includes('git'),
    customReport: args._.includes('custom'),
    communityReport: args._.includes('community'),
    communityReportName: args.communityReportName || '',
    artifactName: args.artifactName || 'ctrf-report',
    annotate: args.annotate !== false,
    title: args.title || '',
    onFailOnly: args.onFailOnly || false,
    exitOnFail: args.exitOnFail || false,
    useSuiteName: args.useSuiteName || false,
    previousResultsMax: args.rows || 10,
    metricsReportsMax: args.results || 100,
    fetchPreviousResults: args.fetchPreviousResults || false,
    updateComment: args.updateComment || false,
    overwriteComment: args.overwriteComment || false,
    commentTag: args.commentTag || '',
    groupBy: groupBy,
    alwaysGroupBy: false,
    debug: args._.includes('debug')
  }
}

export function getInputs(): Inputs {
  const groupByInput = core.getInput('group-by') || 'filePath'

  const groupBy: 'suite' | 'filePath' =
    groupByInput === 'suite' ? 'suite' : 'filePath'
  return {
    ctrfPath: core.getInput('report-path', { required: true }),
    templatePath: core.getInput('template-path'),
    summary: core.getInput('summary').toLowerCase() === 'true',
    pullRequest: core.getInput('pull-request').toLowerCase() === 'true',
    summaryReport: core.getInput('summary-report').toLowerCase() === 'true',
    testReport: core.getInput('test-report').toLowerCase() === 'true',
    testListReport: core.getInput('test-list-report').toLowerCase() === 'true',
    failedReport: core.getInput('failed-report').toLowerCase() === 'true',
    failRateReport: core.getInput('fail-rate-report').toLowerCase() === 'true',
    flakyReport: core.getInput('flaky-report').toLowerCase() === 'true',
    flakyRateReport:
      core.getInput('flaky-rate-report').toLowerCase() === 'true',
    failedFoldedReport:
      core.getInput('failed-folded-report').toLowerCase() === 'true',
    previousResultsReport:
      core.getInput('previous-results-report').toLowerCase() === 'true',
    aiReport: core.getInput('ai-report').toLowerCase() === 'true',
    skipedReport: core.getInput('skipped-report').toLowerCase() === 'true',
    suiteFoldedReport:
      core.getInput('suite-folded-report').toLowerCase() === 'true',
    suiteListReport:
      core.getInput('suite-list-report').toLowerCase() === 'true',
    pullRequestReport:
      core.getInput('pull-request-report').toLowerCase() === 'true',
    gitReport: core.getInput('git-report').toLowerCase() === 'true',

    customReport: core.getInput('custom-report').toLowerCase() === 'true',
    communityReport: core.getInput('community-report').toLowerCase() === 'true',
    communityReportName: core.getInput('community-report-name'),
    artifactName: core.getInput('artifact-name') || 'ctrf-report',
    annotate: core.getInput('annotate').toLowerCase() === 'true',
    title: core.getInput('title') || '',
    onFailOnly: core.getInput('on-fail-only').toLowerCase() === 'true',
    exitOnFail: core.getInput('exit-on-fail').toLowerCase() === 'true',
    useSuiteName: core.getInput('use-suite-name').toLowerCase() === 'true',
    previousResultsMax: parseInt(
      core.getInput('previous-results-max') || '10',
      10
    ),
    metricsReportsMax: parseInt(
      core.getInput('metrics-reports-max') || '100',
      10
    ),
    fetchPreviousResults:
      core.getInput('fetch-previous-results').toLowerCase() === 'true',
    updateComment: core.getInput('update-comment').toLowerCase() === 'true',
    overwriteComment:
      core.getInput('overwrite-comment').toLowerCase() === 'true',
    commentTag: core.getInput('comment-tag') || '',
    groupBy: groupBy,
    alwaysGroupBy: core.getInput('always-group-by').toLowerCase() === 'true',
    debug: core.getInput('debug').toLowerCase() === 'true'
  }
}
