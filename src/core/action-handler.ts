process.env.RUN_MODE = 'action'

import {
  exitActionOnFail,
  exitActionOnEmpty,
  getAllGitHubContext,
  handleError
} from '../github'
import { getInputs } from './inputs'
import { prepareReport } from '../ctrf'
import { handleViewsAndComments, handleAnnotations } from '../github/handler'
import * as core from '@actions/core'
import { processIntegrations } from 'src/integrations/handler'
import {
  handleStandaloneAIIntegration,
  generateAISummary
} from 'src/integrations/ai'
export async function runAction(): Promise<void> {
  try {
    const inputs = getInputs()
    const githubContext = getAllGitHubContext()

    const report = await prepareReport(inputs, githubContext)

    await handleStandaloneAIIntegration(inputs.ai, report)
    await processIntegrations(inputs.integrationsConfig, report)

    if (inputs.aiSummaryReport) {
      await generateAISummary(inputs.ai, report)
    }

    await handleViewsAndComments(inputs, report)
    handleAnnotations(inputs, report)

    if (inputs.exitOnEmpty) {
      exitActionOnEmpty(report)
    }
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
