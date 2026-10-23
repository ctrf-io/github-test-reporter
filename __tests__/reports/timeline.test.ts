import type { CTRFReport, Test } from "ctrf";
import { generateMarkdown } from "../../src/handlebars/core.js";
import { BuiltInReports } from "../../src/reports/core.js";
import { readTemplate } from "../../src/utils/index.js";

vi.mock("@actions/core");
vi.mock("@actions/github", () => ({
	context: {
		serverUrl: "https://github.com",
		repo: { owner: "test-owner", repo: "test-repo" },
		sha: "abc123",
		ref: "refs/heads/main",
		workflow: "test",
		job: "test-job",
		runNumber: 1,
		runId: 12345,
		apiUrl: "https://api.github.com",
		action: "test-action",
		actor: "test-actor",
		eventName: "push",
		payload: {},
	},
}));

const T0 = 1_792_570_616_000;

function makeReport(tests: Test[]): CTRFReport {
	return {
		reportFormat: "CTRF",
		specVersion: "0.2.0",
		results: {
			tool: { name: "jest" },
			summary: {
				tests: tests.length,
				passed: tests.filter((t) => t.status === "passed").length,
				failed: tests.filter((t) => t.status === "failed").length,
				skipped: 0,
				pending: 0,
				other: 0,
				start: T0,
				stop: T0 + 10_000,
			},
			tests,
		},
	};
}

function makeTest(
	name: string,
	start: number,
	duration: number,
	extra: Partial<Test> = {},
): Test {
	return {
		name,
		status: "passed",
		duration,
		start: T0 + start,
		stop: T0 + start + duration,
		...extra,
	};
}

function render(tests: Test[]): string {
	return generateMarkdown(
		readTemplate(BuiltInReports.Timeline),
		makeReport(tests),
	);
}

describe("timeline.hbs", () => {
	it("renders the headline, the chart, the lane table and the timings", () => {
		const markdown = render([
			makeTest("Login", 0, 6000, { threadId: "worker-1" }),
			makeTest("Logout", 6000, 4000, { threadId: "worker-1" }),
			makeTest("Search", 0, 4000, { threadId: "worker-2", status: "failed" }),
		]);

		expect(markdown).toContain(
			"**3** tests on **2** threads in **10.0s** · busy **70%** of the time · up to **2** at once<br>Slowest: `Login` (6.0s on `worker-1`) · Last to finish: `Logout` at 0:10.000 on `worker-1`\n\n```mermaid\n---\nconfig:\n",
		);
		expect(markdown).toMatch(
			/\ntodayMarker off\nsection \u200bworker-1\n[^`]*\n```\n\n<sub>/,
		);
		expect(markdown).toContain(
			"<sub>🟩 passed · 🟥 failed · 0:00 = 2026-10-21 08:16:56.000 UTC</sub>",
		);
		expect(markdown).toContain(
			"| Thread | Tests | Failed | Busy | Idle | Utilization |\n| :--- | ---: | ---: | ---: | ---: | ---: |\n| worker-1 | 2 | 0 | 10.0s | 0ms | 100% |\n| worker-2 | 1 | 1 | 4.0s | 6.0s | 40% |\n",
		);
		expect(markdown).toContain(
			"<details>\n<summary>Test timings (3)</summary>\n\n| Start | Duration | Thread | Test | Status |\n| ---: | ---: | :--- | :--- | :--- |\n| 0:00.000 | 6.0s | worker-1 | Login | ✅ passed |\n| 0:06.000 | 4.0s | worker-1 | Logout | ✅ passed |\n| 0:00.000 | 4.0s | worker-2 | Search | ❌ failed |\n\n</details>",
		);
	});

	it("adds a column for runs before a retry when tests were retried", () => {
		const markdown = render([
			makeTest("Flaky", 3000, 2000, {
				threadId: "w1",
				retryAttempts: [
					{ attempt: 1, status: "failed", start: T0, stop: T0 + 2500 },
				],
			}),
			makeTest("Other", 0, 5000, { threadId: "w2" }),
		]);
		expect(markdown).toContain(
			"| Thread | Tests | Runs before a retry | Failed | Busy | Idle | Utilization |",
		);
		expect(markdown).toContain("| w1 | 1 | 1 | 0 | 4.5s | 500ms | 90% |");
		expect(markdown).toContain(
			"| 0:00.000 | 2.5s | w1 | Flaky (attempt 1) | ❌ failed |",
		);
		expect(markdown).toContain("🟨 failed, then retried (dashed)");
	});

	it("puts each note on its own line", () => {
		const markdown = render([
			makeTest("timed", 0, 1000),
			{ name: "untimed", status: "passed", duration: 10 },
		]);
		expect(markdown).toContain(
			"</sub>\n<br><sub>1 test without start and stop times is not shown.</sub>\n<br><sub>The report has no thread IDs (<code>threadId</code>), so lanes are inferred from start and stop times.</sub>\n",
		);
	});

	it("leaves out the lane table for a single lane", () => {
		const markdown = render([makeTest("only", 0, 1000, { threadId: "main" })]);
		expect(markdown).not.toContain("| Thread | Tests |");
		expect(markdown).toContain("<summary>Test timings (1)</summary>");
	});

	it("explains the missing data instead of drawing an empty chart", () => {
		const markdown = render([
			{ name: "a", status: "passed", duration: 10 },
			{ name: "b", status: "failed", duration: 20 },
		]);
		expect(markdown).not.toContain("```mermaid");
		expect(markdown.trim()).toBe(
			"No test in this report has start and stop times, so there is no timeline. Reporters that record <code>start</code> and <code>stop</code> for each test (and <code>threadId</code> for parallel workers) enable this report.",
		);
	});

	it("keeps test names from breaking out of the chart or the tables", () => {
		const markdown = render([
			makeTest("evil ``` | <img src=x> name\nnext", 0, 60_000, {
				threadId: "w|1",
			}),
		]);
		const fences = markdown.match(/```/g) ?? [];
		expect(fences).toHaveLength(2);
		expect(markdown).toContain(
			"| w\\|1 | evil \\`\\`\\` \\| &lt;img src=x&gt; name next | ✅ passed |",
		);
	});

	it("adds a # column for the numbers on bars too narrow for a name", () => {
		const tests: Test[] = [];
		for (let fork = 0; fork < 2; fork++) {
			let cursor = fork * 37;
			for (let index = 0; index < 30; index++) {
				const length = 200 + ((index * 97 + fork * 31) % 1500);
				tests.push(
					makeTest(`fork${fork} Test${index}`, cursor, length, {
						threadId: "Test worker",
					}),
				);
				cursor += length + 3;
			}
		}
		const markdown = render(tests);
		expect(markdown).toContain(
			"| # | Start | Duration | Thread | Test | Status |\n| ---: | ---: | ---: | :--- | :--- | :--- |\n|  | 0:00.000 | 200ms | Test worker | fork0 Test0 | ✅ passed |\n",
		);
		expect(markdown).toContain(
			"| 1 | 0:01.394 | 588ms | Test worker | fork0 Test4 | ✅ passed |",
		);
		expect(markdown).toContain(`\n\u200b1 :16 00:00:01.394, 588ms\n`);
		expect(markdown).toContain(
			"<br><sub>A number on a bar is the row with that number (#) in the test timings below.</sub>",
		);
	});

	it("keeps the timings table near its size budget, whatever the names hold", () => {
		const tests = Array.from({ length: 400 }, (_, index) =>
			makeTest(`t${index}[${"\"='".repeat(60)}] <a & b>`, index * 10, 5, {
				threadId: `w${index % 40}="${"'".repeat(20)}`,
				status: index % 2 ? "failed" : "passed",
			}),
		);
		const markdown = render(tests);
		const table = markdown.slice(markdown.indexOf("<details>"));
		expect(table.length).toBeLessThan(11_000);
		expect(markdown.length).toBeLessThan(40_000);
	});

	it("names the slowest test and the last to finish as code, after the headline", () => {
		const markdown = render([
			makeTest("[link](https://example.com) @octocat", 0, 6000, {
				threadId: "w1",
			}),
			makeTest("b", 0, 1000, { threadId: "w2" }),
		]);
		expect(markdown).toContain(
			"<br>Slowest and last to finish: `[link](https://example.com) @octocat` (6.0s on `w1`, until 0:06.000)\n",
		);
	});
});
