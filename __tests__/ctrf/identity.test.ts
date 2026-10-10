import { describe, expect, it } from "vitest";
import type { CTRFReport } from "ctrf";
import { mergeReports } from "../../src/ctrf/core/src/methods/merge-reports.js";
import { enrichReportWithInsights } from "../../src/ctrf/core/src/methods/run-insights.js";
const identityReport = () => ({
	reportFormat: "CTRF",
	specVersion: "0.2.0",
	reportId: "11111111-1111-4111-8111-111111111111",
	runId: "run",
	results: {
		tool: { name: "fixture" },
		environment: { shardId: "one" },
		summary: {
			tests: 1,
			passed: 1,
			failed: 0,
			skipped: 0,
			pending: 0,
			other: 0,
			start: 1,
			stop: 2,
		},
		tests: [
			{
				name: "same",
				testId: "logical",
				executionId: "execution",
				attemptId: "final-attempt",
				status: "passed",
				duration: 1,
				retries: 1,
				flaky: true,
				retryAttempts: [
					{
						attempt: 1,
						attemptId: "attempt",
						status: "failed",
						attachments: [
							{
								name: "log",
								path: "prior.txt",
								contentType: "text/plain",
								attachmentId: "prior-ref",
							},
						],
					},
				],
				attachments: [
					{
						name: "log",
						path: "final.txt",
						contentType: "text/plain",
						attachmentId: "final-ref",
					},
				],
			},
		],
	},
});

describe("identity-aware consumers", () => {
	it("creates a new aggregate artifact and preserves a shared run without one source shard label", () => {
		const one = identityReport() as CTRFReport;
		const two = identityReport() as CTRFReport;
		two.results.environment!.shardId = "two";
		two.results.tests[0].executionId = "execution-two";
		const original = JSON.stringify(one);
		const merged = mergeReports([one, two]);
		expect(merged.reportId).not.toBe(one.reportId);
		expect(merged.runId).toBe("run");
		expect(merged.results.tests[0].attemptId).toBe("final-attempt");
		expect(merged.results.environment?.shardId).toBeUndefined();
		expect(merged.results.tests[0].retryAttempts?.[0].attemptId).toBe(
			"attempt",
		);
		expect(JSON.stringify(one)).toBe(original);
	});
	it("keeps same-name historical metrics separate by logical identity", () => {
		const current = identityReport() as CTRFReport;
		const other = {
			...current.results.tests[0],
			testId: "other",
			executionId: "other-execution",
			status: "failed" as const,
			retries: 0,
			flaky: false,
			retryAttempts: undefined,
		};
		current.results.tests.push(other);
		current.results.summary.tests = 2;
		current.results.summary.failed = 1;
		const output = enrichReportWithInsights(current, []);
		expect(output.results.tests[0].insights?.failRate?.current).toBe(0);
		expect(output.results.tests[1].insights?.failRate?.current).toBe(1);
	});
});
