import * as core from '@actions/core'
import { CtrfReport } from '../types'
import { AIConfig } from '../types/integrations'
import {
  openAIFailedTestSummary,
  claudeFailedTestSummary,
  azureFailedTestSummary,
  grokFailedTestSummary,
  deepseekFailedTestSummary,
  Arguments,
  mistralFailedTestSummary,
  perplexityFailedTestSummary,
  geminiFailedTestSummary,
  openRouterFailedTestSummary
} from 'ai-ctrf'

export async function handleAIIntegration(
  config: AIConfig,
  report: CtrfReport
): Promise<void> {
  core.startGroup('🤖 Processing AI Integration')
  core.info(`Processing AI integration for provider: ${config.action}`)
  core.debug(`Options provided: ${JSON.stringify(config.options)}`)

  config.options = {
    log: false,
    consolidate: true,
    ...config.options
  }

  try {
    switch (config.action) {
      case 'openai': {
        await openAIFailedTestSummary(report, config.options as Arguments)
        core.info('Generated OpenAI summary')
        break
      }
      case 'claude': {
        await claudeFailedTestSummary(report, config.options as Arguments)
        core.info('Generated Claude summary')
        break
      }
      case 'azure-openai': {
        await azureFailedTestSummary(report, config.options as Arguments)
        core.info('Generated Azure OpenAI summary')
        break
      }
      case 'grok': {
        await grokFailedTestSummary(report, config.options as Arguments)
        core.info('Generated Grok summary')
        break
      }
      case 'deepseek': {
        await deepseekFailedTestSummary(report, config.options as Arguments)
        core.info('Generated Deepseek summary')
        break
      }
      case 'mistral': {
        await mistralFailedTestSummary(report, config.options as Arguments)
        core.info('Generated Mistral summary')
        break
      }
      case 'gemini': {
        await geminiFailedTestSummary(report, config.options as Arguments)
        core.info('Generated Gemini summary')
        break
      }
      case 'perplexity': {
        await perplexityFailedTestSummary(report, config.options as Arguments)
        core.info('Generated Perplexity summary')
        break
      }
      case 'openrouter': {
        await openRouterFailedTestSummary(report, config.options as Arguments)
        core.info('Generated OpenRouter summary')
        break
      }
      default:
        core.warning(
          `Unknown AI provider, valid providers are: openai, claude, azure-openai, grok, deepseek, mistral, gemini, perplexity, openrouter`
        )
        core.warning(
          `Please check your integrations-config input for any typos or missing integrations.`
        )
        core.warning(`Moving on without AI integration...`)
    }
  } catch (error) {
    core.error(`Error processing AI integration: ${error as string}`)
  }

  core.info(`AI integration processed for provider: ${config.action}`)
  core.endGroup()
}
