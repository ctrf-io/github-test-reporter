process.env.RUN_MODE = 'action'

import { exitActionOnFail, getAllGitHubContext, handleError } from '../github'
import { getInputs } from './inputs'
import { prepareReport } from '../ctrf'
import { handleViewsAndComments, handleAnnotations } from '../github/handler'
import * as core from '@actions/core'
import { processIntegrations } from 'src/integrations/handler'
export async function runAction(): Promise<void> {
  try {
    const inputs = getInputs()
    const githubContext = getAllGitHubContext()

    const report = await prepareReport(inputs, githubContext)
    await processIntegrations(inputs.integrationsConfig, report)

    await handleViewsAndComments(inputs, report)
    handleAnnotations(inputs, report)

    if (inputs.exitOnFail) {
      exitActionOnFail(report)
    }
    core.startGroup(`🏁 Report completed`)
    core.endGroup()
    core.startGroup(
      `⭐ CTRF is open source and free to use, you can show your support by starring the repo at https://github.com/ctrf-io/github-test-reporter`
    )
    core.endGroup()
  } catch (error) {
    handleError(error)
  }
}
