import { describe, expect, it } from "vitest";
import { validateStrict } from "../../node_modules/ctrf/dist/index.js";
import type { CTRFReport } from "ctrf";
import { mergeReports } from "../../src/ctrf/core/src/methods/merge-reports.js";
import {
	groupTestsByFile,
	groupTestsBySuiteOrFilePath,
} from "../../src/ctrf/group-test-results.js";

const report = (name: string, specVersion = "0.1.0"): CTRFReport => ({
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
	it("emits strict CTRF 0.1.0 when merging conforming reports", () => {
		const merged = mergeReports([report("first"), report("second")]);
		expect(merged.specVersion).toBe("0.1.0");
		expect(merged.results.summary.tests).toBe(2);
		expect(() =>
			validateStrict(merged, { specVersion: "0.1.0" }),
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
				expect(child.specVersion).toBe("0.1.0");
				expect(() =>
					validateStrict(child, { specVersion: "0.1.0" }),
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
	it("does not claim 0.1.0 for merged legacy retries missing their history", () => {
		const legacy = report("first", "0.0.3");
		legacy.results.tests[0].retries = 2;
		const merged = mergeReports([legacy, report("second", "0.0.3")]);
		expect(merged.specVersion).toBe("0.0.3");
		expect(merged.results.tests[0].retries).toBe(2);
	});
	it("does not certify invalid input already labeled 0.1.0", () => {
		const invalid = report("first");
		invalid.results.tests[0].retries = 2;
		expect(mergeReports([invalid, report("second")]).specVersion).toBe("0.0.0");
	});
});
