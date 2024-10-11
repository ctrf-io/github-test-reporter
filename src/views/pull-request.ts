import { CtrfReport } from "../../types/ctrf"
import { getTestName, stripAnsi } from "../common"
import fs from 'fs'
import https from 'https'

export function generatePullRequestComment(
    report: CtrfReport,
    summaryUrl: string,
    title: string,
    useSuiteName: boolean
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

  export function postPullRequestComment(
    report: CtrfReport,
    apiUrl: string,
    baseUrl: string,
    onFailOnly: boolean,
    title: string,
    useSuiteName: boolean,
    prCommentMessage?: string,    
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
  
    if (onFailOnly && report.results.summary.failed === 0) {
      console.log(
        'On fail only is set to true and no tests failed. Skipping comment'
      )
      return
    }
  
    const run_id = process.env.GITHUB_RUN_ID
  
    const summaryUrl = `${baseUrl}/${repo}/actions/runs/${run_id}#summary`
    const summaryMarkdown =
      prCommentMessage || generatePullRequestComment(report, summaryUrl, title, useSuiteName)
  
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
  
      res.on('data', (chunk: any) => {
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
  
    req.on('error', (error: any) => {
      console.error(`Failed to post comment: ${error.message}`)
    })
  
    req.write(data)
    req.end()
  }