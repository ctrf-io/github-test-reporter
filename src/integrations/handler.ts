import {
  IntegrationsConfig,
  SlackConfig,
  TeamsConfig,
  AIConfig
} from '../types/integrations'
import { Report } from 'ctrf'
import * as core from '@actions/core'
import { handleSlackIntegration } from './slack'
import { handleTeamsIntegration } from './teams'
import { handleAIIntegration } from './ai'

export async function processIntegration(
  name: string,
  cfg: IntegrationsConfig | undefined,
  report: Report
): Promise<void> {
  core.debug(`Processing ${name} integration`)

  switch (name) {
    case 'slack':
      await handleSlackIntegration(cfg as unknown as SlackConfig, report)
      break
    case 'teams':
      await handleTeamsIntegration(cfg as unknown as TeamsConfig, report)
      break
    case 'ai':
      await handleAIIntegration(cfg as unknown as AIConfig, report)
      break
    case 'junit-to-ctrf':
      break
    default:
      core.warning(`Unknown integration: ${name}`)
      core.warning(
        `Please check your integrations-config.json file for any typos or missing integrations.`
      )
      core.warning(`Available integrations are: slack, teams, ai`)
      core.warning(`Moving on without ${name} integration...`)
  }
}

export async function processIntegrations(
  config: IntegrationsConfig | object,
  report: Report
): Promise<void> {
  if (!config) return

  try {
    const enabledIntegrations = getEnabledIntegrations(config)
    const sortedIntegrations = sortIntegrations(enabledIntegrations)

    for (const [name, cfg] of sortedIntegrations) {
      await processIntegration(name, cfg, report)
    }
  } catch (error) {
    core.error(`Error processing integrations: ${error as string}`)
  }
}

export function sortIntegrations(
  entries: [string, IntegrationsConfig | undefined][]
): [string, IntegrationsConfig | undefined][] {
  return entries.sort(([nameA], [nameB]) => {
    if (nameA === 'ai') return -1
    if (nameB === 'ai') return 1
    return 0
  })
}

export function getEnabledIntegrations(
  config: IntegrationsConfig | object
): [string, IntegrationsConfig | undefined][] {
  if (!config) return []
  const entries = Object.entries(config) as [
    string,
    IntegrationsConfig | undefined
  ][]
  return entries.filter(([, integration]) => integration?.enabled)
}
