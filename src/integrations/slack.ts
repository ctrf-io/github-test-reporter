import { CtrfReport } from 'src/types'
import { SlackConfig } from 'src/types/integrations'
import * as core from '@actions/core'
import {
  sendTestResultsToSlack,
  sendAISummaryToSlack,
  sendFailedResultsToSlack,
  sendFlakyResultsToSlack
} from 'slack-ctrf'

export async function handleSlackIntegration(
  config: SlackConfig,
  report: CtrfReport
): Promise<void> {
  core.startGroup('💬 Processing Slack Integration')
  core.info(`Processing action: ${config.action}`)
  core.debug(`Options provided: ${JSON.stringify(config.options)}`)
  switch (config.action) {
    case 'results': {
      await sendTestResultsToSlack(report, config.options)
      core.info('Sent results to Slack')
      break
    }
    case 'failed': {
      await sendFailedResultsToSlack(report, config.options)
      core.info('Sent failed results to Slack')
      break
    }
    case 'flaky': {
      await sendFlakyResultsToSlack(report, config.options)
      core.info('Sent flaky results to Slack')
      break
    }
    case 'ai': {
      await sendAISummaryToSlack(report, config.options)
      core.info('Sent AI summary to Slack')
      break
    }
    default:
      core.warning(
        `Unknown action type, valid actions are: results, failed, flaky, ai`
      )
      core.warning(
        `Please check your integrations-config input for any typos or missing integrations.`
      )
      core.warning(`Moving on without slack integration...`)
  }
  core.info(`Slack integration processed for action: ${config.action}`)
  core.endGroup()
}
