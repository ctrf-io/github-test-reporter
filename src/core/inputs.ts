import * as core from "@actions/core";
import type { Inputs } from "../types/reporter.js";
import type {
	IntegrationsConfig,
	AIStandaloneConfig,
} from "src/types/integrations.js";

/** Treat empty input as false (unset env vars); otherwise use YAML boolean parsing. */
export function getBooleanInputAllowEmpty(name: string): boolean {
	if (core.getInput(name) === "") {
		return false;
	}
	return core.getBooleanInput(name);
}

export function getInputs(): Inputs {
	const groupByInput = core.getInput("group-by") || "filePath";

	const groupBy: "suite" | "filePath" =
		groupByInput === "suite" ? "suite" : "filePath";

	const reportOrderInput = core.getInput("report-order");
	const reportOrder = reportOrderInput
		? reportOrderInput.split(",").map((s: string) => s.trim())
		: [];

	const baselineInput = core.getInput("baseline");
	const baseline =
		baselineInput !== "" && !Number.isNaN(Number(baselineInput))
			? Number(baselineInput)
			: baselineInput;

	return {
		ctrfPath: core.getInput("report-path", { required: true }),
		templatePath: core.getInput("template-path"),
		summary: getBooleanInputAllowEmpty("summary"),
		githubReport: getBooleanInputAllowEmpty("github-report"),
		pullRequest: getBooleanInputAllowEmpty("pull-request"),
		issue: core.getInput("issue").toLowerCase() || "",
		issueRepo: core.getInput("issue-repo") || "",
		collapseLargeReports: getBooleanInputAllowEmpty("collapse-large-reports"),
		summaryReport: getBooleanInputAllowEmpty("summary-report"),
		summaryDeltaReport: getBooleanInputAllowEmpty("summary-delta-report"),
		testsChangedReport: getBooleanInputAllowEmpty("tests-changed-report"),
		testReport: getBooleanInputAllowEmpty("test-report"),
		testListReport: getBooleanInputAllowEmpty("test-list-report"),
		failedReport: getBooleanInputAllowEmpty("failed-report"),
		failRateReport: getBooleanInputAllowEmpty("fail-rate-report"),
		flakyReport: getBooleanInputAllowEmpty("flaky-report"),
		flakyRateReport: getBooleanInputAllowEmpty("flaky-rate-report"),
		failedFoldedReport: getBooleanInputAllowEmpty("failed-folded-report"),
		previousResultsReport: getBooleanInputAllowEmpty("previous-results-report"),
		aiReport: getBooleanInputAllowEmpty("ai-report"),
		aiSummaryReport: getBooleanInputAllowEmpty("ai-summary-report"),
		skippedReport: getBooleanInputAllowEmpty("skipped-report"),
		suiteFoldedReport: getBooleanInputAllowEmpty("suite-folded-report"),
		suiteListReport: getBooleanInputAllowEmpty("suite-list-report"),
		pullRequestReport: getBooleanInputAllowEmpty("pull-request-report"),
		commitReport: getBooleanInputAllowEmpty("commit-report"),
		insightsReport: getBooleanInputAllowEmpty("insights-report"),
		slowestReport: getBooleanInputAllowEmpty("slowest-report"),
		customReport: getBooleanInputAllowEmpty("custom-report"),
		communityReport: getBooleanInputAllowEmpty("community-report"),
		communityReportName: core.getInput("community-report-name"),
		fileReport: getBooleanInputAllowEmpty("file-report"),
		timelineReport: getBooleanInputAllowEmpty("timeline-report"),
		artifactName: core.getInput("artifact-name") || "ctrf-report",
		annotate: getBooleanInputAllowEmpty("annotate"),
		title: core.getInput("title") || "",
		onFailOnly: getBooleanInputAllowEmpty("on-fail-only"),
		exitOnNoFiles: getBooleanInputAllowEmpty("exit-on-no-files"),
		exitOnFail: getBooleanInputAllowEmpty("exit-on-fail"),
		exitOnEmpty: getBooleanInputAllowEmpty("exit-on-empty"),
		useSuiteName: getBooleanInputAllowEmpty("use-suite-name"),
		previousResultsMax: parseInt(
			core.getInput("previous-results-max") || "10",
			10,
		),
		flakyRateReportMax: parseInt(
			core.getInput("flaky-rate-report-max") || "-1",
			10,
		),
		failRateReportMax: parseInt(
			core.getInput("fail-rate-report-max") || "-1",
			10,
		),
		metricsReportsMax: parseInt(
			core.getInput("metrics-reports-max") || "100",
			10,
		),
		maxWorkflowRunsToCheck: parseInt(
			core.getInput("max-workflow-runs-to-check") || "400",
			10,
		),
		maxPreviousRunsToFetch: parseInt(
			core.getInput("max-previous-runs-to-fetch") || "100",
			10,
		),
		fetchPreviousResults: getBooleanInputAllowEmpty("fetch-previous-results"),
		updateComment: getBooleanInputAllowEmpty("update-comment"),
		overwriteComment: getBooleanInputAllowEmpty("overwrite-comment"),
		alwaysLatestComment: getBooleanInputAllowEmpty("always-latest-comment"),
		commentTag: core.getInput("comment-tag") || "",
		writeCtrfToFile: core.getInput("write-ctrf-to-file") || "",
		uploadArtifact: getBooleanInputAllowEmpty("upload-artifact"),
		groupBy: groupBy,
		alwaysGroupBy: getBooleanInputAllowEmpty("always-group-by"),
		integrationsConfig: JSON.parse(
			core.getInput("integrations-config") || "{}",
		) as IntegrationsConfig,
		ai: JSON.parse(core.getInput("ai") || "{}") as AIStandaloneConfig,
		statusCheck: getBooleanInputAllowEmpty("status-check"),
		statusCheckName:
			core.getInput("status-check-name") || "Test Reporter Results",
		reportOrder,
		baseline: baseline,
		baselineReportPath: core.getInput("baseline-report-path") || "",
	};
}
