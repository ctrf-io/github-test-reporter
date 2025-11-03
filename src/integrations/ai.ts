import * as core from '@actions/core'
import { Report } from '../ctrf/core/types/ctrf'
import { AIConfig, AIStandaloneConfig } from '../types/integrations'
import {
  openAIFailedTestSummary,
  claudeFailedTestSummary,
  azureOpenAIFailedTestSummary,
  grokFailedTestSummary,
  deepseekFailedTestSummary,
  Arguments,
  mistralFailedTestSummary,
  perplexityFailedTestSummary,
  geminiFailedTestSummary,
  openRouterFailedTestSummary,
  bedrockFailedTestSummary
} from 'ai-ctrf'

export async function handleAIIntegration(
  config: AIConfig,
  report: Report
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
        await azureOpenAIFailedTestSummary(report, config.options as Arguments)
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
      case 'bedrock': {
        await bedrockFailedTestSummary(report, config.options as Arguments)
        core.info('Generated Bedrock summary')
        break
      }
      default:
        core.warning(
          `Unknown AI provider, valid providers are: openai, claude, azure-openai, grok, deepseek, mistral, gemini, perplexity, openrouter, bedrock`
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

export async function handleStandaloneAIIntegration(
  config: AIStandaloneConfig | object,
  report: Report
): Promise<void> {
  if (!config || Object.keys(config).length === 0) {
    return
  }

  const aiConfig = config as AIStandaloneConfig

  if (!aiConfig.provider) {
    core.warning('AI config provided but no provider specified')
    return
  }

  core.startGroup('🤖 Processing AI Configuration')
  core.info(`Processing AI for provider: ${aiConfig.provider}`)
  core.debug(`Configuration: ${JSON.stringify(aiConfig)}`)

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { provider: _provider, ...rest } = aiConfig
  const options = {
    log: false,
    consolidate: true,
    ...rest
  }

  try {
    switch (aiConfig.provider) {
      case 'openai': {
        await openAIFailedTestSummary(report, options as Arguments)
        core.info('Generated OpenAI summary')
        break
      }
      case 'claude': {
        await claudeFailedTestSummary(report, options as Arguments)
        core.info('Generated Claude summary')
        break
      }
      case 'azure-openai': {
        await azureOpenAIFailedTestSummary(report, options as Arguments)
        core.info('Generated Azure OpenAI summary')
        break
      }
      case 'grok': {
        await grokFailedTestSummary(report, options as Arguments)
        core.info('Generated Grok summary')
        break
      }
      case 'deepseek': {
        await deepseekFailedTestSummary(report, options as Arguments)
        core.info('Generated Deepseek summary')
        break
      }
      case 'mistral': {
        await mistralFailedTestSummary(report, options as Arguments)
        core.info('Generated Mistral summary')
        break
      }
      case 'gemini': {
        await geminiFailedTestSummary(report, options as Arguments)
        core.info('Generated Gemini summary')
        break
      }
      case 'perplexity': {
        await perplexityFailedTestSummary(report, options as Arguments)
        core.info('Generated Perplexity summary')
        break
      }
      case 'openrouter': {
        await openRouterFailedTestSummary(report, options as Arguments)
        core.info('Generated OpenRouter summary')
        break
      }
      case 'bedrock': {
        await bedrockFailedTestSummary(report, options as Arguments)
        core.info('Generated Bedrock summary')
        break
      }
      default:
        core.warning(
          `Unknown AI provider: ${String(aiConfig.provider)}. Valid providers are: openai, claude, azure-openai, grok, deepseek, mistral, gemini, perplexity, openrouter, bedrock`
        )
        core.warning(`Moving on without AI integration...`)
    }
  } catch (error) {
    core.error(`Error processing AI configuration: ${error as string}`)
  }

  core.info(`AI configuration processed for provider: ${aiConfig.provider}`)
  core.endGroup()
}
