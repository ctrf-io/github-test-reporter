import * as core from "@actions/core";
import type { Inputs } from "../types/reporter.js";
import type {
	IntegrationsConfig,
	AIStandaloneConfig,
} from "src/types/integrations.js";

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
		summary: core.getBooleanInput("summary"),
		githubReport: core.getBooleanInput("github-report"),
		pullRequest: core.getBooleanInput("pull-request"),
		issue: core.getInput("issue").toLowerCase() || "",
		issueRepo: core.getInput("issue-repo") || "",
		collapseLargeReports: core.getBooleanInput("collapse-large-reports"),
		summaryReport: core.getBooleanInput("summary-report"),
		summaryDeltaReport: core.getBooleanInput("summary-delta-report"),
		testsChangedReport: core.getBooleanInput("tests-changed-report"),
		testReport: core.getBooleanInput("test-report"),
		testListReport: core.getBooleanInput("test-list-report"),
		failedReport: core.getBooleanInput("failed-report"),
		failRateReport: core.getBooleanInput("fail-rate-report"),
		flakyReport: core.getBooleanInput("flaky-report"),
		flakyRateReport: core.getBooleanInput("flaky-rate-report"),
		failedFoldedReport: core.getBooleanInput("failed-folded-report"),
		previousResultsReport: core.getBooleanInput("previous-results-report"),
		aiReport: core.getBooleanInput("ai-report"),
		aiSummaryReport: core.getBooleanInput("ai-summary-report"),
		skippedReport: core.getBooleanInput("skipped-report"),
		suiteFoldedReport: core.getBooleanInput("suite-folded-report"),
		suiteListReport: core.getBooleanInput("suite-list-report"),
		pullRequestReport: core.getBooleanInput("pull-request-report"),
		commitReport: core.getBooleanInput("commit-report"),
		insightsReport: core.getBooleanInput("insights-report"),
		slowestReport: core.getBooleanInput("slowest-report"),
		customReport: core.getBooleanInput("custom-report"),
		communityReport: core.getBooleanInput("community-report"),
		communityReportName: core.getInput("community-report-name"),
		fileReport: core.getBooleanInput("file-report"),
		timelineReport: core.getBooleanInput("timeline-report"),
		artifactName: core.getInput("artifact-name") || "ctrf-report",
		annotate: core.getBooleanInput("annotate"),
		title: core.getInput("title") || "",
		onFailOnly: core.getBooleanInput("on-fail-only"),
		exitOnNoFiles: core.getBooleanInput("exit-on-no-files"),
		exitOnFail: core.getBooleanInput("exit-on-fail"),
		exitOnEmpty: core.getBooleanInput("exit-on-empty"),
		useSuiteName: core.getBooleanInput("use-suite-name"),
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
		fetchPreviousResults: core.getBooleanInput("fetch-previous-results"),
		updateComment: core.getBooleanInput("update-comment"),
		overwriteComment: core.getBooleanInput("overwrite-comment"),
		alwaysLatestComment: core.getBooleanInput("always-latest-comment"),
		commentTag: core.getInput("comment-tag") || "",
		writeCtrfToFile: core.getInput("write-ctrf-to-file") || "",
		uploadArtifact: core.getBooleanInput("upload-artifact"),
		groupBy: groupBy,
		alwaysGroupBy: core.getBooleanInput("always-group-by"),
		integrationsConfig: JSON.parse(
			core.getInput("integrations-config") || "{}",
		) as IntegrationsConfig,
		ai: JSON.parse(core.getInput("ai") || "{}") as AIStandaloneConfig,
		statusCheck: core.getBooleanInput("status-check"),
		statusCheckName:
			core.getInput("status-check-name") || "Test Reporter Results",
		reportOrder,
		baseline: baseline,
		baselineReportPath: core.getInput("baseline-report-path") || "",
	};
}
