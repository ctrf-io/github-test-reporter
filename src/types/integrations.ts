export interface IntegrationsConfig {
  slack?: SlackConfig
  teams?: TeamsConfig
  ai?: AIConfig
  [key: string]: IntegrationConfig | undefined
}

interface IntegrationConfig {
  enabled: boolean
}

export interface SlackConfig extends IntegrationConfig {
  action: 'results' | 'ai' | 'failed' | 'flaky'
  token?: string
  options?: SlackOptions
}

export interface SlackOptions {
  title?: string
  prefix?: string
  suffix?: string
  consolidated?: boolean
  onFailOnly?: boolean
}

export interface TeamsConfig extends IntegrationConfig {
  action: 'results' | 'flaky' | 'ai'
  token?: string
  options?: TeamsOptions
}

export interface TeamsOptions {
  title?: string
  onFailOnly?: boolean
}

export interface AIConfig extends IntegrationConfig {
  action:
    | 'openai'
    | 'claude'
    | 'azure-openai'
    | 'grok'
    | 'deepseek'
    | 'mistral'
    | 'gemini'
    | 'perplexity'
    | 'openrouter'
    | 'bedrock'
  options?: AIOptions
}

export interface AIOptions {
  model?: string
  systemPrompt?: string
  additionalPromptContext?: string
  additionalSystemPromptContext?: string
  frequencyPenalty?: number
  maxTokens?: number
  presencePenalty?: number
  temperature?: number
  topP?: number
  log?: boolean
  maxMessages?: number
  consolidate?: boolean
  deploymentId?: string
}

export interface AIStandaloneConfig {
  provider:
    | 'openai'
    | 'claude'
    | 'azure-openai'
    | 'grok'
    | 'deepseek'
    | 'mistral'
    | 'gemini'
    | 'perplexity'
    | 'openrouter'
    | 'bedrock'
  model?: string
  systemPrompt?: string
  additionalPromptContext?: string
  additionalSystemPromptContext?: string
  frequencyPenalty?: number
  maxTokens?: number
  presencePenalty?: number
  temperature?: number
  topP?: number
  log?: boolean
  maxMessages?: number
  consolidate?: boolean
  deploymentId?: string
}

export interface JUnitConfig extends IntegrationConfig {
  action: 'convert'
  options?: JUnitOptions
}

export interface JUnitOptions {
  output?: string
  toolname?: string
  useSuiteName?: boolean
  env?: Record<string, string>
}
