import type { CTRFReport } from "ctrf";
import type { Options } from "slack-ctrf";

// slack-ctrf 0.1.0 declares legacy string suites, but its renderers also accept
// current CTRF reports unchanged. Retain its original overloads for legacy input.
declare module "slack-ctrf" {
	export function sendTestResultsToSlack(
		report: CTRFReport,
		options?: Options,
		logs?: boolean,
	): Promise<void>;
	export function sendFailedResultsToSlack(
		report: CTRFReport,
		options?: Options,
		logs?: boolean,
	): Promise<void>;
	export function sendFlakyResultsToSlack(
		report: CTRFReport,
		options?: Options,
		logs?: boolean,
	): Promise<void>;
	export function sendAISummaryToSlack(
		report: CTRFReport,
		options?: Options,
		logs?: boolean,
	): Promise<void>;
}
