import * as core from "@actions/core";
import type { CTRFReport } from "ctrf";
import type { AIConfig, AIStandaloneConfig } from "../types/integrations.js";
import {
	openAIFailedTestSummary,
	claudeFailedTestSummary,
	azureOpenAIFailedTestSummary,
	grokFailedTestSummary,
	deepseekFailedTestSummary,
	type Arguments,
	mistralFailedTestSummary,
	perplexityFailedTestSummary,
	geminiFailedTestSummary,
	openRouterFailedTestSummary,
	bedrockFailedTestSummary,
	generateJsonSummary,
} from "ai-ctrf";

export async function handleAIIntegration(
	config: AIConfig,
	report: CTRFReport,
): Promise<void> {
	// The integration accepts reports unchanged; its declarations retain legacy suite types.
	const integrationReport = report as unknown as Parameters<
		typeof openAIFailedTestSummary
	>[0];
	core.startGroup("🤖 Processing AI Integration");
	core.info(`Processing AI integration for provider: ${config.action}`);
	core.debug(`Options provided: ${JSON.stringify(config.options)}`);

	config.options = {
		log: false,
		consolidate: true,
		...config.options,
	};

	try {
		switch (config.action) {
			case "openai": {
				await openAIFailedTestSummary(
					integrationReport,
					config.options as Arguments,
				);
				core.info("Generated OpenAI summary");
				break;
			}
			case "claude": {
				await claudeFailedTestSummary(
					integrationReport,
					config.options as Arguments,
				);
				core.info("Generated Claude summary");
				break;
			}
			case "azure-openai": {
				await azureOpenAIFailedTestSummary(
					integrationReport,
					config.options as Arguments,
				);
				core.info("Generated Azure OpenAI summary");
				break;
			}
			case "grok": {
				await grokFailedTestSummary(
					integrationReport,
					config.options as Arguments,
				);
				core.info("Generated Grok summary");
				break;
			}
			case "deepseek": {
				await deepseekFailedTestSummary(
					integrationReport,
					config.options as Arguments,
				);
				core.info("Generated Deepseek summary");
				break;
			}
			case "mistral": {
				await mistralFailedTestSummary(
					integrationReport,
					config.options as Arguments,
				);
				core.info("Generated Mistral summary");
				break;
			}
			case "gemini": {
				await geminiFailedTestSummary(
					integrationReport,
					config.options as Arguments,
				);
				core.info("Generated Gemini summary");
				break;
			}
			case "perplexity": {
				await perplexityFailedTestSummary(
					integrationReport,
					config.options as Arguments,
				);
				core.info("Generated Perplexity summary");
				break;
			}
			case "openrouter": {
				await openRouterFailedTestSummary(
					integrationReport,
					config.options as Arguments,
				);
				core.info("Generated OpenRouter summary");
				break;
			}
			case "bedrock": {
				await bedrockFailedTestSummary(
					integrationReport,
					config.options as Arguments,
				);
				core.info("Generated Bedrock summary");
				break;
			}
			default:
				core.warning(
					`Unknown AI provider, valid providers are: openai, claude, azure-openai, grok, deepseek, mistral, gemini, perplexity, openrouter, bedrock`,
				);
				core.warning(
					`Please check your integrations-config input for any typos or missing integrations.`,
				);
				core.warning(`Moving on without AI integration...`);
		}
	} catch (error) {
		core.error(`Error processing AI integration: ${error as string}`);
	}

	core.info(`AI integration processed for provider: ${config.action}`);
	core.endGroup();
}

export async function handleStandaloneAIIntegration(
	config: AIStandaloneConfig | object,
	report: CTRFReport,
): Promise<void> {
	// The integration accepts reports unchanged; its declarations retain legacy suite types.
	const integrationReport = report as unknown as Parameters<
		typeof openAIFailedTestSummary
	>[0];
	if (!config || Object.keys(config).length === 0) {
		return;
	}

	const aiConfig = config as AIStandaloneConfig;

	if (!aiConfig.provider) {
		core.warning("AI config provided but no provider specified");
		return;
	}

	core.startGroup("🤖 Processing AI Configuration");
	core.info(`Processing AI for provider: ${aiConfig.provider}`);
	core.debug(`Configuration: ${JSON.stringify(aiConfig)}`);

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const { provider: _provider, ...rest } = aiConfig;
	const options = {
		log: false,
		consolidate: true,
		...rest,
	};

	try {
		switch (aiConfig.provider) {
			case "openai": {
				await openAIFailedTestSummary(integrationReport, options as Arguments);
				core.info("Generated OpenAI summary");
				break;
			}
			case "claude": {
				await claudeFailedTestSummary(integrationReport, options as Arguments);
				core.info("Generated Claude summary");
				break;
			}
			case "azure-openai": {
				await azureOpenAIFailedTestSummary(
					integrationReport,
					options as Arguments,
				);
				core.info("Generated Azure OpenAI summary");
				break;
			}
			case "grok": {
				await grokFailedTestSummary(integrationReport, options as Arguments);
				core.info("Generated Grok summary");
				break;
			}
			case "deepseek": {
				await deepseekFailedTestSummary(
					integrationReport,
					options as Arguments,
				);
				core.info("Generated Deepseek summary");
				break;
			}
			case "mistral": {
				await mistralFailedTestSummary(integrationReport, options as Arguments);
				core.info("Generated Mistral summary");
				break;
			}
			case "gemini": {
				await geminiFailedTestSummary(integrationReport, options as Arguments);
				core.info("Generated Gemini summary");
				break;
			}
			case "perplexity": {
				await perplexityFailedTestSummary(
					integrationReport,
					options as Arguments,
				);
				core.info("Generated Perplexity summary");
				break;
			}
			case "openrouter": {
				await openRouterFailedTestSummary(
					integrationReport,
					options as Arguments,
				);
				core.info("Generated OpenRouter summary");
				break;
			}
			case "bedrock": {
				await bedrockFailedTestSummary(integrationReport, options as Arguments);
				core.info("Generated Bedrock summary");
				break;
			}
			default:
				core.warning(
					`Unknown AI provider: ${String(aiConfig.provider)}. Valid providers are: openai, claude, azure-openai, grok, deepseek, mistral, gemini, perplexity, openrouter, bedrock`,
				);
				core.warning(`Moving on without AI integration...`);
		}
	} catch (error) {
		core.error(`Error processing AI configuration: ${error as string}`);
	}

	core.info(`AI configuration processed for provider: ${aiConfig.provider}`);
	core.endGroup();
}

export async function generateAISummary(
	config: AIStandaloneConfig | object,
	report: CTRFReport,
): Promise<void> {
	// The integration accepts reports unchanged; its declarations retain legacy suite types.
	const integrationReport = report as unknown as Parameters<
		typeof openAIFailedTestSummary
	>[0];
	if (!config || Object.keys(config).length === 0) {
		core.warning("AI config required for ai-summary-report but not provided");
		return;
	}

	const aiConfig = config as AIStandaloneConfig;

	if (!aiConfig.provider) {
		core.warning(
			"AI config provided but no provider specified for ai-summary-report",
		);
		return;
	}

	core.startGroup("🤖 Generating AI Summary CTRFReport");
	core.info(`Generating AI Summary for provider: ${aiConfig.provider}`);

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const { provider: _provider, ...rest } = aiConfig;

	const options = {
		log: false,
		consolidate: true,
		...rest,
	};

	try {
		const aiSummaryData = await generateJsonSummary(
			integrationReport,
			aiConfig.provider,
			options as Arguments,
		);

		if (aiSummaryData) {
			report.results.extra = report.extra || {};
			report.results.extra.aiSummary = aiSummaryData;

			core.info("AI Summary CTRFReport generated successfully");
		} else {
			core.warning("Failed to generate AI summary");
		}
	} catch (error) {
		core.error(`Error generating AI summary report: ${error as string}`);
	}

	core.endGroup();
}
