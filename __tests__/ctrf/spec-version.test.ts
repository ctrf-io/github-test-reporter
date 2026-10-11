import { enrichReportWithInsights } from "../../src/ctrf/core/src/methods/run-insights.js";
import { describe, expect, it } from "vitest";
import { validateStrict } from "../../node_modules/ctrf/dist/index.js";
import type { CTRFReport } from "ctrf";
import { mergeReports } from "../../src/ctrf/core/src/methods/merge-reports.js";
import {
	groupTestsByFile,
	groupTestsBySuiteOrFilePath,
} from "../../src/ctrf/group-test-results.js";

const report = (name: string, specVersion = "0.2.0"): CTRFReport => ({
	reportFormat: "CTRF",
	specVersion,
	results: {
		tool: { name: "vitest" },
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
				name,
				status: "passed",
				duration: 1,
				suite: ["suite"],
				filePath: "test.ts",
			},
		],
	},
});

describe("generated report specification versions", () => {
	it("emits strict CTRF 0.2.0 when merging conforming reports", () => {
		const merged = mergeReports([report("first"), report("second")]);
		expect(merged.specVersion).toBe("0.2.0");
		expect(merged.results.summary.tests).toBe(2);
		expect(() =>
			validateStrict(merged, { specVersion: "0.2.0" }),
		).not.toThrow();
	});
	it.each(["suites", "files"])(
		"preserves the current version in grouped %s",
		(field) => {
			const grouped =
				field === "files"
					? groupTestsByFile(report("first"))
					: groupTestsBySuiteOrFilePath(report("first"), true);
			for (const child of grouped.results.extra?.[field] ?? []) {
				expect(child.specVersion).toBe("0.2.0");
				expect(() =>
					validateStrict(child, { specVersion: "0.2.0" }),
				).not.toThrow();
			}
			expect(grouped.results.extra?.[field]).toHaveLength(1);
		},
	);
	it("preserves legacy versions when grouping existing reports", () => {
		const grouped = groupTestsByFile(report("first", "0.0.3"));
		expect(grouped.specVersion).toBe("0.0.3");
		expect(grouped.results.extra?.files[0].specVersion).toBe("0.0.3");
	});
	it("does not claim 0.2.0 for merged legacy retries missing their history", () => {
		const legacy = report("first", "0.0.3");
		legacy.results.tests[0].retries = 2;
		const merged = mergeReports([legacy, report("second", "0.0.3")]);
		expect(merged.specVersion).toBe("0.0.3");
		expect(merged.results.tests[0].retries).toBe(2);
	});
	it("does not certify invalid input already labeled 0.2.0", () => {
		const invalid = report("first", "0.2.0");
		invalid.results.tests[0].retries = 2;
		expect(mergeReports([invalid, report("second")]).specVersion).toBe("0.0.0");
	});
});

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
		expect(merged.results.tests[0].executionId).toBe("execution");
		expect(merged.results.tests[1].executionId).toBe("execution-two");
		expect(merged.results.tests[0].attachments).toEqual(
			one.results.tests[0].attachments,
		);
		expect(merged.results.tests[0].retryAttempts).toEqual(
			one.results.tests[0].retryAttempts,
		);
		for (const group of [
			groupTestsByFile(merged).results.extra!.files[0],
			groupTestsBySuiteOrFilePath(merged, true).results.extra!.suites[0],
		]) {
			expect(group.reportId).not.toBe(merged.reportId);
			expect(group.runId).toBe("run");
			expect(group.results.tests).toEqual(merged.results.tests);
		}
		two.runId = "different-run";
		expect(mergeReports([one, two]).runId).toBeUndefined();
		delete one.runId;
		delete two.runId;
		expect(mergeReports([one, two]).runId).toBeUndefined();
	});
});

describe("historical name matching", () => {
	it.each([
		{
			scenario: "name-only reports",
			currentIdentity: {},
			previousIdentity: {},
		},
		{
			scenario: "a new test ID with name-only history",
			currentIdentity: { testId: "logical" },
			previousIdentity: {},
		},
		{
			scenario: "legacy ID to test ID migration",
			currentIdentity: { testId: "logical" },
			previousIdentity: { id: "logical" },
		},
		{
			scenario: "legacy IDs changing between runs",
			currentIdentity: { id: "current" },
			previousIdentity: { id: "previous" },
		},
		{
			scenario: "different logical IDs with the same name",
			currentIdentity: { testId: "current" },
			previousIdentity: { testId: "previous" },
		},
	])(
		"preserves existing comparisons for $scenario",
		({ currentIdentity, previousIdentity }) => {
			const current = report("same");
			Object.assign(current.results.tests[0], currentIdentity);
			current.results.summary.start = 200;
			current.results.summary.stop = 201;
			const previous = report("same", "0.0.3");
			Object.assign(previous.results.tests[0], previousIdentity, {
				status: "failed",
			});
			previous.results.summary.passed = 0;
			previous.results.summary.failed = 1;
			previous.results.summary.start = 100;
			previous.results.summary.stop = 101;

			const output = enrichReportWithInsights(current, [previous], previous);
			expect(output.results.tests[0].insights?.failRate).toEqual({
				current: 0.5,
				baseline: 1,
				change: -0.5,
			});
			expect(output.results.tests[0].insights?.executedInRuns).toBe(2);
			expect(output.insights?.extra?.testsAdded).toEqual([]);
			expect(output.insights?.extra?.testsRemoved).toEqual([]);
		},
	);
});
