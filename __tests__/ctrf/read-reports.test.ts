import { join, resolve } from "node:path";
import { expect, it } from "vitest";
import { readReportsFromGlobPattern } from "../../src/ctrf/core/src/methods/read-reports.js";

const fixtureDirectory = "ctrf-reports";
const filePattern = "*.json";

it("reads reports using a forward-slash glob", () => {
	const reports = readReportsFromGlobPattern(
		`./${fixtureDirectory}/${filePattern}`,
	);

	expect(reports).toHaveLength(1);
	expect(reports[0].results.summary.tests).toBe(10);
});

it.runIf(process.platform === "win32").each([
	["relative", join(fixtureDirectory, filePattern)],
	["absolute", resolve(fixtureDirectory, filePattern)],
])("reads reports using the %s Windows glob", (_kind, pattern) => {
	const reports = readReportsFromGlobPattern(pattern);

	expect(reports).toHaveLength(1);
	expect(reports[0].results.summary.tests).toBe(10);
});
