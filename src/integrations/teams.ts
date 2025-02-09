import { CtrfReport } from 'src/types'
import { TeamsConfig } from 'src/types/integrations'
import * as core from '@actions/core'
import {
  sendTestResultsToTeams,
  sendFlakyResultsToTeams,
  sendAISummaryToTeams
} from 'teams-ctrf'

export async function handleTeamsIntegration(
  config: TeamsConfig,
  report: CtrfReport
): Promise<void> {
  core.startGroup('💬 Processing Teams Integration')
  core.info(`Processing Teams integration for action: ${config.action}`)
  switch (config.action) {
    case 'results': {
      await sendTestResultsToTeams(report, config, false)
      core.info('sent results to Teams')
      break
    }
    case 'flaky': {
      await sendFlakyResultsToTeams(report, config, false)
      core.info('sent flaky results to Teams')
      break
    }
    case 'ai': {
      await sendAISummaryToTeams(report, config, false)
      core.info('sent AI summary to Teams')
      break
    }
    default:
      core.warning(`Unknown action type, valid actions are: results, flaky, ai`)
      core.warning(
        `Please check your integrations-config input for any typos or missing integrations.`
      )
      core.warning(`Moving on without teams integration...`)
  }
  core.info(`Teams integration processed for action: ${config.action}`)
  core.endGroup()
}
