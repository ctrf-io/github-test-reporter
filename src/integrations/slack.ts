import type { CTRFReport } from "ctrf";
import type { SlackConfig } from "src/types/integrations.js";
import * as core from "@actions/core";
import {
	sendTestResultsToSlack,
	sendAISummaryToSlack,
	sendFailedResultsToSlack,
	sendFlakyResultsToSlack,
} from "slack-ctrf";

export async function handleSlackIntegration(
	config: SlackConfig,
	report: CTRFReport,
): Promise<void> {
	core.startGroup("💬 Processing Slack Integration");
	core.info(`Processing action: ${config.action}`);
	const options = { ...config.options };
	// Newer Slack reporters dispatch only when credentials are explicit options.
	if (!options.webhookUrl && !(options.oauthToken && options.channelId)) {
		options.webhookUrl = options.token || process.env.SLACK_WEBHOOK_URL;
	}
	if (!options.webhookUrl && !(options.oauthToken && options.channelId)) {
		core.endGroup();
		throw new Error(
			"Slack credentials missing: set SLACK_WEBHOOK_URL, options.webhookUrl, or options.oauthToken and options.channelId.",
		);
	}
	switch (config.action) {
		case "results": {
			await sendTestResultsToSlack(report, options);
			core.info("Processed Slack results notification");
			break;
		}
		case "failed": {
			await sendFailedResultsToSlack(report, options);
			core.info("Processed Slack failed results notification");
			break;
		}
		case "flaky": {
			await sendFlakyResultsToSlack(report, options);
			core.info("Processed Slack flaky results notification");
			break;
		}
		case "ai": {
			await sendAISummaryToSlack(report, options);
			core.info("Processed Slack AI summary notification");
			break;
		}
		default:
			core.warning(
				`Unknown action type, valid actions are: results, failed, flaky, ai`,
			);
			core.warning(
				`Please check your integrations-config input for any typos or missing integrations.`,
			);
			core.warning(`Moving on without slack integration...`);
	}
	core.info(`Slack integration processed for action: ${config.action}`);
	core.endGroup();
}
