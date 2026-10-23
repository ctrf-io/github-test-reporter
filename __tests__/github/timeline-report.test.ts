import * as core from "@actions/core";
import type { CTRFReport } from "ctrf";
import { generateViews } from "../../src/github/core.js";
import { DEFAULT_REPORT_ORDER } from "../../src/reports/constants.js";
import type { Inputs, ReportConditionals } from "../../src/types/index.js";
import {
	isAnyReportEnabled,
	numberOfReportsEnabled,
	reportTypeToInputKey,
} from "../../src/utils/report-utils.js";

vi.mock("@actions/core");
vi.mock("@actions/github", () => ({
	context: {
		serverUrl: "https://github.com",
		repo: { owner: "test-owner", repo: "test-repo" },
		sha: "abc123",
		payload: {},
	},
}));

const T0 = 1_792_570_616_000;

function inputs(overrides: Partial<Inputs> = {}): Inputs {
	return {
		ctrfPath: "ctrf/*.json",
		summary: true,
		pullRequest: false,
		issue: "",
		issueRepo: "",
		collapseLargeReports: false,
		summaryReport: false,
		summaryDeltaReport: false,
		testsChangedReport: false,
		githubReport: false,
		testReport: false,
		testListReport: false,
		failedReport: false,
		failRateReport: false,
		flakyReport: false,
		flakyRateReport: false,
		failedFoldedReport: false,
		previousResultsReport: false,
		aiReport: false,
		aiSummaryReport: false,
		skippedReport: false,
		suiteFoldedReport: false,
		suiteListReport: false,
		pullRequestReport: false,
		commitReport: false,
		customReport: false,
		insightsReport: false,
		slowestReport: false,
		communityReport: false,
		communityReportName: "",
		fileReport: false,
		timelineReport: false,
		artifactName: "ctrf-report",
		annotate: false,
		title: "",
		onFailOnly: false,
		exitOnNoFiles: false,
		exitOnEmpty: false,
		exitOnFail: false,
		useSuiteName: false,
		previousResultsMax: 10,
		flakyRateReportMax: -1,
		failRateReportMax: -1,
		metricsReportsMax: 100,
		maxWorkflowRunsToCheck: 400,
		maxPreviousRunsToFetch: 100,
		fetchPreviousResults: false,
		updateComment: false,
		overwriteComment: false,
		alwaysLatestComment: false,
		commentTag: "",
		writeCtrfToFile: "",
		uploadArtifact: false,
		groupBy: "filePath",
		alwaysGroupBy: false,
		integrationsConfig: {},
		ai: {},
		statusCheck: false,
		statusCheckName: "Test Reporter Results",
		reportOrder: [],
		...overrides,
	};
}

function report(): CTRFReport {
	return {
		reportFormat: "CTRF",
		specVersion: "0.2.0",
		results: {
			tool: { name: "jest" },
			summary: {
				tests: 1,
				passed: 1,
				failed: 0,
				skipped: 0,
				pending: 0,
				other: 0,
				start: T0,
				stop: T0 + 1000,
			},
			tests: [
				{
					name: "a",
					status: "passed",
					duration: 1000,
					start: T0,
					stop: T0 + 1000,
					threadId: "w1",
				},
			],
		},
		extra: {
			reportConditionals: {
				includeFailedReportCurrentFooter: false,
				includeFailedReportAllFooter: false,
				includeFlakyReportCurrentFooter: false,
				includeFlakyReportAllFooter: false,
				includeSkippedReportCurrentFooter: false,
				includeMeasuredOverFooter: false,
				showFailedReports: false,
				showFlakyReports: false,
				showSkippedReports: false,
			} as ReportConditionals,
		},
	};
}

describe("timeline-report", () => {
	const mockCore = vi.mocked(core);

	beforeEach(() => {
		vi.clearAllMocks();
		mockCore.summary.addRaw.mockReturnValue(mockCore.summary);
		mockCore.summary.addEOL.mockReturnValue(mockCore.summary);
	});

	it("maps the report type to its input", () => {
		expect(reportTypeToInputKey("timeline-report")).toBe("timelineReport");
	});

	it("counts as an enabled report", () => {
		expect(isAnyReportEnabled(inputs({ timelineReport: true }))).toBe(true);
		expect(numberOfReportsEnabled(inputs({ timelineReport: true }))).toBe(1);
	});

	it("is ordered after the slowest tests report by default", () => {
		expect(DEFAULT_REPORT_ORDER.indexOf("timeline-report")).toBe(
			DEFAULT_REPORT_ORDER.indexOf("slowest-report") + 1,
		);
	});

	it("adds a Timeline section to the summary", () => {
		generateViews(inputs({ timelineReport: true }), report());

		const raw = mockCore.summary.addRaw.mock.calls.map(([text]) => text);
		const heading = raw.indexOf("### Timeline");
		expect(heading).toBeGreaterThanOrEqual(0);
		expect(raw[heading + 1]).toContain("```mermaid");
		expect(raw[heading + 1]).toContain("section \u200bw1");
	});
});
