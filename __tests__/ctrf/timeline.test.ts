import * as core from "@actions/core";
import type { Test } from "ctrf";
import {
	buildTimelineReport,
	collectTimeline,
	renderTimelineGantt,
} from "../../src/ctrf/timeline/index.js";
import {
	codeSpan,
	escapeCell,
	fitMiddle,
	fitText,
	formatDuration,
	sanitizeMermaidText,
	textWidth,
} from "../../src/ctrf/timeline/text.js";

vi.mock("@actions/core");

const ZWSP = "\u200b";
const T0 = 1_792_570_616_000;
const HOUR = 3_600_000;

function makeTest(
	name: string,
	start: number | undefined,
	duration: number,
	extra: Partial<Test> = {},
): Test {
	return {
		name,
		status: "passed",
		duration,
		...(start === undefined
			? {}
			: { start: T0 + start, stop: T0 + start + duration }),
		...extra,
	};
}

/**
 * Task lines of the bars and markers: without the empty tasks that keep the
 * axis on the whole run, and without the lines that mark cuts.
 */
function taskLines(text: string): string[] {
	return text
		.split("\n")
		.filter(
			(line) =>
				line.startsWith(ZWSP) && !/^\u200b :(vert, )?[^,]*, 0ms$/.test(line),
		);
}

function sections(text: string): string[] {
	return text
		.split("\n")
		.filter((line) => line.startsWith(`section ${ZWSP}`))
		.map((line) => line.slice(`section ${ZWSP}`.length));
}

/** Splits the Gantt into lanes of [start offset ms, duration ms] pairs. */
function laneSpans(text: string): Array<Array<[number, number]>> {
	const lanes: Array<Array<[number, number]>> = [];
	for (const line of text.split("\n")) {
		if (line.startsWith("section ")) {
			lanes.push([]);
			continue;
		}
		const match = line.match(
			/[ :](\d+) (\d\d):(\d\d):(\d\d)\.(\d{3}), (\d+)ms$/,
		);
		if (match && line.startsWith(ZWSP) && !line.includes(":vert,")) {
			const [, , h, m, s, ms, length] = match.map(Number);
			lanes[lanes.length - 1].push([
				((h * 60 + m) * 60 + s) * 1000 + ms,
				length,
			]);
		}
	}
	return lanes;
}

function gantt(tests: Test[], limits = {}) {
	return renderTimelineGantt(collectTimeline(tests, limits), limits);
}

function seeded(seed: number) {
	return () => {
		seed = (seed * 16807) % 2147483647;
		return seed / 2147483647;
	};
}

/** 10,000 tests on 16 threads, back to back, each failed with the given chance. */
function bigRun(failureRate: number, random = seeded(3)) {
	const tests: Test[] = [];
	for (let lane = 0; lane < 16; lane++) {
		let cursor = 0;
		for (let index = 0; index < 625; index++) {
			const length = 50 + Math.floor(random() * 400);
			tests.push(
				makeTest(`t${lane}-${index}`, cursor, length, {
					threadId: `worker-${lane + 1}`,
					status: random() < failureRate ? "failed" : "passed",
				}),
			);
			cursor += length + Math.floor(random() * 5);
		}
	}
	return tests;
}

describe("collectTimeline", () => {
	it("uses the start and stop of each test", () => {
		const data = collectTimeline([makeTest("a", 100, 400, { threadId: "w1" })]);
		expect(data.lanes).toHaveLength(1);
		expect(data.lanes[0]).toMatchObject({ name: "w1", origin: "thread" });
		expect(data.lanes[0].executions[0]).toMatchObject({
			name: "a",
			label: "a",
			kind: "passed",
			start: T0 + 100,
			stop: T0 + 500,
		});
		expect(data.start).toBe(T0 + 100);
		expect(data.stop).toBe(T0 + 500);
		expect(data.threads).toBe(1);
	});

	it("derives a missing stop from the start and the duration", () => {
		const data = collectTimeline([
			{ name: "a", status: "passed", duration: 250, start: T0 },
		]);
		expect(data.lanes[0].executions[0].stop).toBe(T0 + 250);
	});

	it("derives a missing start from the stop and the duration", () => {
		const data = collectTimeline([
			{ name: "a", status: "failed", duration: 250, stop: T0 + 1000 },
		]);
		expect(data.lanes[0].executions[0]).toMatchObject({
			start: T0 + 750,
			stop: T0 + 1000,
			kind: "failed",
		});
	});

	it("counts tests without timing instead of drawing them", () => {
		const data = collectTimeline([
			makeTest("timed", 0, 10),
			makeTest("no timing", undefined, 10),
			{ name: "zeroes", status: "passed", duration: 10, start: 0, stop: 0 },
		]);
		expect(data.tests).toBe(1);
		expect(data.untimed).toBe(2);
	});

	it("rejects a stop before the start unless the duration can repair it", () => {
		const data = collectTimeline([
			{
				name: "broken",
				status: "passed",
				duration: Number.NaN,
				start: T0 + 500,
				stop: T0 + 100,
			},
			{
				name: "repaired",
				status: "passed",
				duration: 40,
				start: T0 + 500,
				stop: T0 + 100,
			},
		]);
		expect(data.invalid).toBe(1);
		expect(data.lanes[0].executions[0]).toMatchObject({
			name: "repaired",
			start: T0 + 500,
			stop: T0 + 540,
		});
	});

	it("rejects durations that would put a test centuries away", () => {
		const data = collectTimeline([
			makeTest("fine", 0, 10),
			{ name: "no start", status: "passed", duration: 1e16, stop: T0 },
			{ name: "no stop", status: "failed", duration: 1e300, start: T0 },
		]);
		expect(data.tests).toBe(1);
		expect(data.invalid).toBe(2);
	});

	it("accepts timestamps written as numeric strings and rounds fractions", () => {
		const data = collectTimeline([
			{
				name: "a",
				status: "passed",
				duration: 1.4,
				start: `${T0 + 0.4}` as unknown as number,
				stop: T0 + 1.6,
			},
		]);
		expect(data.lanes[0].executions[0]).toMatchObject({
			start: T0,
			stop: T0 + 2,
		});
	});

	it("does not draw skipped and pending tests", () => {
		const data = collectTimeline([
			makeTest("ran", 0, 10),
			makeTest("skipped", 0, 0, { status: "skipped" }),
			makeTest("pending", 0, 0, { status: "pending" }),
		]);
		expect(data.notRun).toBe(2);
		expect(data.lanes.flatMap((lane) => lane.executions)).toHaveLength(1);
	});

	it("draws runs before a retry in the lane of their test", () => {
		const data = collectTimeline([
			makeTest("flaky", 2000, 500, {
				threadId: "w1",
				retries: 2,
				retryAttempts: [
					{ attempt: 1, status: "failed", start: T0, stop: T0 + 800 },
					{ attempt: 2, status: "failed", start: T0 + 900, stop: T0 + 1900 },
					{ attempt: 3, status: "failed" },
				],
			}),
		]);
		expect(data.tests).toBe(1);
		expect(data.attempts).toBe(2);
		expect(data.lanes).toHaveLength(1);
		expect(
			data.lanes[0].executions.map((e) => [e.kind, e.attempt ?? null]),
		).toEqual([
			["retry", 1],
			["retry", 2],
			["passed", null],
		]);
	});

	it("orders thread lanes naturally", () => {
		const data = collectTimeline(
			["worker-10", "worker-2", "worker-1"].map((threadId, index) =>
				makeTest(`t${index}`, index * 10, 5, { threadId }),
			),
		);
		expect(data.lanes.map((lane) => lane.name)).toEqual([
			"worker-1",
			"worker-2",
			"worker-10",
		]);
		expect(data.inferredLanes).toBe(false);
		expect(data.threads).toBe(3);
	});

	it("splits a thread whose tests overlap into several lanes", () => {
		const data = collectTimeline([
			makeTest("fork 1", 0, 1000, { threadId: "Test worker" }),
			makeTest("fork 2", 10, 1000, { threadId: "Test worker" }),
			makeTest("fork 1 again", 1000, 1000, { threadId: "Test worker" }),
		]);
		expect(data.lanes.map((lane) => lane.name)).toEqual([
			"Test worker",
			"Test worker (2)",
		]);
		expect(data.lanes[0].executions.map((e) => e.name)).toEqual([
			"fork 1",
			"fork 1 again",
		]);
		expect(data.splitThreads).toEqual([{ threadId: "Test worker", lanes: 2 }]);
		expect(data.threads).toBe(1);
	});

	it("treats overlaps of a few milliseconds on a thread as clock jitter", () => {
		const data = collectTimeline([
			makeTest("a", 0, 1000, { threadId: "w1" }),
			makeTest("b", 997, 1000, { threadId: "w1" }),
		]);
		expect(data.lanes).toHaveLength(1);
		expect(data.splitThreads).toEqual([]);
	});

	it("tells short tests that overlap apart: they ran at the same time", () => {
		expect(
			collectTimeline([makeTest("a", 0, 10), makeTest("b", 8, 10)]).lanes,
		).toHaveLength(2);
		expect(
			collectTimeline([
				makeTest("a", 0, 3, { threadId: "w" }),
				makeTest("b", 1, 3, { threadId: "w" }),
			]).lanes,
		).toHaveLength(2);
	});

	it("infers lanes from start and stop when there are no thread IDs", () => {
		const data = collectTimeline([
			makeTest("a", 0, 1000),
			makeTest("b", 100, 1000),
			makeTest("c", 1000, 500),
			makeTest("d", 1200, 100),
		]);
		expect(data.inferredLanes).toBe(true);
		expect(data.threads).toBe(0);
		expect(data.lanes.map((lane) => [lane.name, lane.origin])).toEqual([
			["Lane 1", "inferred"],
			["Lane 2", "inferred"],
		]);
		expect(data.lanes[0].executions.map((e) => e.name)).toEqual(["a", "c"]);
		expect(data.lanes[1].executions.map((e) => e.name)).toEqual(["b", "d"]);
	});

	it("keeps tests without a thread ID apart from threaded ones", () => {
		const data = collectTimeline([
			makeTest("a", 0, 10, { threadId: "main" }),
			makeTest("b", 0, 10),
		]);
		expect(data.lanes.map((lane) => [lane.name, lane.origin])).toEqual([
			["main", "thread"],
			["No thread ID", "unthreaded"],
		]);
		expect(data.inferredLanes).toBe(false);
		expect(data.threads).toBe(1);
	});

	it("infers lanes when there are more thread IDs than lanes", () => {
		const tests = Array.from({ length: 50 }, (_, index) =>
			makeTest(`t${index}`, index * 100, 90, { threadId: `thread-${index}` }),
		);
		tests.push(makeTest("no thread", 5000, 10));
		const data = collectTimeline(tests, { maxLanes: 10 });
		expect(data.lanes.map((lane) => lane.name)).toEqual(["Lane 1"]);
		expect(data.tooManyThreads).toBe(50);
		expect(data.inferredLanes).toBe(true);
		expect(data.tests).toBe(51);
	});

	it("hides the lanes past the limit and counts their tests", () => {
		const tests = Array.from({ length: 12 }, (_, index) =>
			makeTest(`t${index}`, index, 1000),
		);
		const data = collectTimeline(tests, { maxLanes: 5 });
		expect(data.lanes).toHaveLength(5);
		expect(data.hiddenLanes).toHaveLength(7);
		expect(data.hiddenLanes.flatMap((lane) => lane.executions)).toHaveLength(7);
		expect(data.tests).toBe(12);
	});

	it("packs thousands of overlapping tests quickly", () => {
		const tests = Array.from({ length: 20_000 }, (_, index) =>
			makeTest(`t${index}`, index % 7, 1000),
		);
		const started = performance.now();
		const data = collectTimeline(tests);
		expect(performance.now() - started).toBeLessThan(2000);
		expect(data.lanes).toHaveLength(40);
		expect(data.hiddenLanes.flatMap((lane) => lane.executions)).toHaveLength(
			20_000 - 40,
		);
	});

	it("packs thousands of short tests that start together quickly", () => {
		const tests = Array.from({ length: 20_000 }, (_, index) =>
			makeTest(`t${index}`, index % 4, 1 + (index % 5)),
		);
		const started = performance.now();
		collectTimeline(tests);
		expect(performance.now() - started).toBeLessThan(2000);
	});
});

describe("collectTimeline with real-world data", () => {
	it("converts start and stop times written in seconds, micro- or nanoseconds", () => {
		const seconds = Math.floor(T0 / 1000);
		const data = collectTimeline([
			{
				name: "seconds",
				status: "passed",
				duration: 1500,
				start: seconds,
				stop: seconds + 1,
				threadId: "a",
			},
			{
				name: "micro",
				status: "passed",
				duration: 20,
				start: (T0 + 2000) * 1000,
				stop: (T0 + 2020) * 1000,
				threadId: "b",
			},
			{
				name: "nano",
				status: "passed",
				duration: 20,
				start: (T0 + 3000) * 1e6,
				stop: (T0 + 3020) * 1e6,
				threadId: "c",
			},
		]);
		const [a, b, c] = data.lanes.map((lane) => lane.executions[0]);
		expect(a).toMatchObject({
			start: seconds * 1000,
			stop: seconds * 1000 + 1500,
		});
		expect(b).toMatchObject({ start: T0 + 2000, stop: T0 + 2020 });
		expect(c).toMatchObject({ start: T0 + 3000, stop: T0 + 3020 });
		expect(data.convertedUnits).toEqual(["s", "µs", "ns"]);
		// Two of six times are not on a whole second: not a whole-second report.
		expect(data.coarse).toBe(false);
	});

	it("keeps the milliseconds of times in seconds with a fraction", () => {
		const data = collectTimeline([
			{
				name: "a",
				status: "passed",
				duration: 500,
				start: (T0 + 250) / 1000,
				stop: (T0 + 750) / 1000,
			},
		]);
		expect(data.lanes[0].executions[0]).toMatchObject({
			start: T0 + 250,
			stop: T0 + 750,
		});
		expect(data.coarse).toBe(false);
		expect(data.convertedUnits).toEqual(["s"]);
	});

	it("draws tests of one lane one after another when times are in whole seconds", () => {
		const seconds = Math.floor(T0 / 1000);
		const tests = Array.from({ length: 3 }, (_, index) => ({
			name: `t${index}`,
			status: "passed" as const,
			duration: 300,
			start: seconds,
			stop: seconds,
			threadId: "w1",
		}));
		const data = collectTimeline(tests);
		expect(data.lanes).toHaveLength(1);
		expect(
			data.lanes[0].executions.map((e) => [e.start - T0, e.stop - T0]),
		).toEqual([
			[0, 300],
			[300, 600],
			[600, 900],
		]);
	});

	it("treats tests in the same whole second as sequential when times are in seconds", () => {
		const seconds = Math.floor(T0 / 1000);
		const tests = Array.from({ length: 6 }, (_, index) => ({
			name: `t${index}`,
			status: "passed" as const,
			duration: 300,
			start: seconds + Math.floor((index * 330) / 1000),
			stop: seconds + Math.floor((index * 330 + 300) / 1000),
		}));
		expect(collectTimeline(tests).lanes).toHaveLength(1);
	});

	it("ignores times that are not epoch timestamps", () => {
		const data = collectTimeline([
			makeTest("real", 0, 10),
			{ name: "relative", status: "passed", duration: 10, start: 5, stop: 15 },
			{
				name: "minus one",
				status: "failed",
				duration: 10,
				start: -1,
				stop: -1,
			},
		]);
		expect(data.tests).toBe(1);
		expect(data.untimed).toBe(2);
		expect(data.untimedFailed).toBe(1);
	});

	it("counts a result listed twice once", () => {
		const test = makeTest("same", 0, 100, { threadId: "w1", testId: "id-1" });
		const data = collectTimeline([test, { ...test }]);
		expect(data.tests).toBe(1);
		expect(data.duplicates).toBe(1);
		expect(data.splitThreads).toEqual([]);
	});

	it("tells apart tests with the same name but different IDs", () => {
		const data = collectTimeline([
			makeTest("same", 0, 100, { testId: "a" }),
			makeTest("same", 0, 100, { testId: "b" }),
		]);
		expect(data.tests).toBe(2);
		expect(data.duplicates).toBe(0);
	});

	it("drops a run before a retry that repeats the final result", () => {
		const data = collectTimeline([
			makeTest("go test", 0, 100, {
				threadId: "w1",
				retryAttempts: [
					{ attempt: 1, status: "failed", start: T0 - 200, stop: T0 - 100 },
					{ attempt: 2, status: "passed", start: T0, stop: T0 + 100 },
				],
			}),
		]);
		expect(data.attempts).toBe(1);
		expect(data.duplicates).toBe(1);
	});

	it("draws Go's final result at its last attempt, not across all of them", () => {
		// go-ctrf-json-reporter widens the final result to span every attempt and
		// lists the last attempt again.
		const data = collectTimeline([
			makeTest("TestFlaky", 0, 900, {
				retryAttempts: [
					{ attempt: 1, status: "failed", start: T0, stop: T0 + 200 },
					{ attempt: 2, status: "passed", start: T0 + 600, stop: T0 + 900 },
				],
			}),
			makeTest("TestOther", 200, 400),
		]);
		expect(data.lanes).toHaveLength(1);
		expect(data.tests).toBe(2);
		expect(data.attempts).toBe(1);
		expect(data.duplicates).toBe(1);
		expect(
			data.lanes[0].executions.map((e) => [e.name, e.start - T0, e.stop - T0]),
		).toEqual([
			["TestFlaky", 0, 200],
			["TestOther", 200, 600],
			["TestFlaky", 600, 900],
		]);
	});

	it("leaves out Go parent tests, which only group their subtests", () => {
		const data = collectTimeline([
			makeTest("TestParse", 0, 1000, { status: "failed" }),
			makeTest("TestParse/empty", 0, 400),
			makeTest("TestParse/broken", 400, 600, { status: "failed" }),
			makeTest("TestOther", 1000, 500),
		]);
		expect(data.parents).toBe(1);
		expect(data.tests).toBe(3);
		expect(data.lanes).toHaveLength(1);
	});

	it("labels bars without the suite or file that use-suite-name puts in front", () => {
		const previous = process.env.GITHUB_WORKSPACE;
		process.env.GITHUB_WORKSPACE = "/home/runner/work/repo";
		try {
			const data = collectTimeline([
				makeTest("Checkout > pays - pays with card", 0, 10, {
					suite: ["Checkout", "pays"],
				}),
				makeTest("tests/a.spec.ts - opens", 10, 10, {
					filePath: "tests/a.spec.ts",
				}),
				makeTest("/tests/b.spec.ts - closes", 20, 10, {
					filePath: "/home/runner/work/repo/tests/b.spec.ts",
				}),
				makeTest("plain name", 30, 10, { suite: ["Other"] }),
			]);
			expect(data.lanes[0].executions.map((e) => e.label)).toEqual([
				"pays with card",
				"opens",
				"closes",
				"plain name",
			]);
		} finally {
			process.env.GITHUB_WORKSPACE = previous;
		}
	});

	it("draws two runs in one report side by side, cutting out the wait between them", () => {
		const tests = [
			makeTest("old run", 0, 1000, { threadId: "w1" }),
			makeTest("old run 2", 1000, 1000, { threadId: "w1" }),
			...Array.from({ length: 5 }, (_, index) =>
				makeTest(`new run ${index}`, 3 * HOUR + index * 100, 90, {
					threadId: "w1",
				}),
			),
		];
		const data = collectTimeline(tests);
		expect(data.tests).toBe(7);
		expect(data.cuts).toHaveLength(1);
		const [cut] = data.cuts;
		expect(cut.length).toBe(3 * HOUR - 2000);
		// The runs stay 3% of the chart apart: 75ms of 2,490ms.
		expect(cut.removed).toBe(3 * HOUR - 2000 - 75);
		expect(cut.at).toBe(T0 + 2000 + 37.5);
		const newRun = data.lanes[0].executions.find((e) => e.name === "new run 0");
		expect(newRun?.start).toBe(T0 + 2075);
		expect(data.stop).toBe(T0 + 2075 + 490);
	});

	it("draws an earlier result of a test that ran again later as a run before a retry", () => {
		const data = collectTimeline([
			makeTest("flaky", 0, 1000, { threadId: "w1", status: "failed" }),
			makeTest("stable", 1000, 1000, { threadId: "w1" }),
			makeTest("flaky", 3 * HOUR, 1000, { threadId: "w1" }),
		]);
		expect(data.tests).toBe(2);
		expect(data.attempts).toBe(1);
		expect(data.rerun).toBe(1);
		const earlier = data.lanes[0].executions[0];
		expect(earlier).toMatchObject({ name: "flaky", attempt: 0, kind: "retry" });
	});

	it("leaves out earlier runs that a later run repeated", () => {
		const tests = Array.from({ length: 10 }, (_, index) => [
			makeTest(`t${index}`, index * 100, 90, { threadId: "w1" }),
			makeTest(`t${index}`, 3 * HOUR + index * 100, 90, { threadId: "w1" }),
		]).flat();
		const data = collectTimeline(tests);
		expect(data.tests).toBe(10);
		expect(data.attempts).toBe(0);
		expect(data.history).toBe(10);
		expect(data.cuts).toEqual([]);
		expect(data.start).toBe(T0 + 3 * HOUR);
	});

	it("keeps idle stretches that are short or a small part of the run", () => {
		const data = collectTimeline([
			makeTest("a", 0, 30 * 60_000, { threadId: "w1" }),
			makeTest("b", 40 * 60_000, 30 * 60_000, { threadId: "w1" }),
		]);
		expect(data.tests).toBe(2);
		expect(data.cuts).toEqual([]);
		expect(data.stop - data.start).toBe(70 * 60_000);
	});

	it("infers lanes that share the work like the workers did", () => {
		// Four equally loaded workers that are idle two thirds of the time. Taking
		// the first free lane would pile most tests into lane 1.
		const random = seeded(7);
		const tests: Test[] = [];
		for (let worker = 0; worker < 4; worker++) {
			let cursor = Math.floor(random() * 1000);
			for (let index = 0; index < 150; index++) {
				const length = 100 + Math.floor(random() * 900);
				tests.push(makeTest(`w${worker}-${index}`, cursor, length));
				cursor += length + 200 + Math.floor(random() * 1800);
			}
		}
		const sizes = collectTimeline(tests).lanes.map(
			(lane) => lane.executions.length,
		);
		expect(sizes).toHaveLength(4);
		for (const size of sizes) {
			expect(size).toBeGreaterThan(100);
			expect(size).toBeLessThan(200);
		}
	});

	it("puts a run before a retry on its test's thread only where the thread was free", () => {
		const data = collectTimeline([
			makeTest("other test", 0, 1000, { threadId: "w1" }),
			makeTest("flaky", 2000, 500, {
				threadId: "w1",
				retryAttempts: [
					{ attempt: 1, status: "failed", start: T0 + 200, stop: T0 + 600 },
					{ attempt: 2, status: "failed", start: T0 + 1200, stop: T0 + 1900 },
				],
			}),
		]);
		expect(data.lanes.map((lane) => [lane.name, lane.origin])).toEqual([
			["w1", "thread"],
			["Runs before a retry", "attempts"],
		]);
		expect(data.lanes[0].executions.map((e) => e.attempt ?? 0)).toEqual([
			0, 2, 0,
		]);
		expect(data.lanes[1].executions.map((e) => e.attempt)).toEqual([1]);
		expect(data.strayAttempts).toBe(1);
		expect(data.splitThreads).toEqual([]);
	});

	it("uses the pytest-xdist worker when there is no thread ID", () => {
		const data = collectTimeline([
			makeTest("a", 0, 10, { extra: { worker: "gw1" } }),
			makeTest("b", 0, 10, { extra: { worker: "gw0" } }),
		]);
		expect(data.lanes.map((lane) => lane.name)).toEqual(["gw0", "gw1"]);
		expect(data.inferredLanes).toBe(false);
	});

	it("draws a skipped test that took time, but not one that did not", () => {
		const data = collectTimeline([
			makeTest("assumption failed after setup", 0, 800, { status: "skipped" }),
			makeTest("skipped at once", 900, 0, { status: "skipped" }),
			makeTest("pending", undefined, 0, { status: "pending" }),
		]);
		expect(data.tests).toBe(1);
		expect(data.lanes[0].executions[0].kind).toBe("other");
		expect(data.skippedDrawn).toBe(true);
		expect(data.notRun).toBe(2);
	});

	it("reads an unknown status as other", () => {
		const data = collectTimeline([
			makeTest("broken", 0, 10, { status: "broken" as Test["status"] }),
		]);
		expect(data.lanes[0].executions[0]).toMatchObject({
			status: "other",
			kind: "other",
		});
	});

	it("counts runs before a retry without timing", () => {
		const data = collectTimeline([
			makeTest("flaky", 0, 10, {
				retryAttempts: [
					{ attempt: 1, status: "failed", duration: 5 },
					{ attempt: 2, status: "skipped" },
				],
			}),
		]);
		expect(data.untimedAttempts).toBe(1);
	});

	it("flags implausibly many inferred lanes", () => {
		const tests = Array.from({ length: 20 }, (_, index) =>
			makeTest(`t${index}`, index, 1000),
		);
		expect(collectTimeline(tests).implausibleLanes).toBe(true);
		expect(collectTimeline(tests.slice(0, 8)).implausibleLanes).toBe(false);
	});

	it("leaves out a thread whose start times were not measured, and keeps the others", () => {
		const tests: Test[] = [];
		for (let worker = 1; worker <= 4; worker++) {
			for (let index = 0; index < 10; index++) {
				tests.push(
					makeTest(`w${worker}-${index}`, index * 100, 90, {
						threadId: `w${worker}`,
					}),
				);
			}
		}
		for (let index = 0; index < 25; index++) {
			tests.push(
				makeTest(`stamped ${index}`, 2000, 10 + index, { threadId: "w5" }),
			);
		}
		const data = collectTimeline(tests);
		expect(data.unmeasured).toEqual({ tests: 25, failed: 0, threads: ["w5"] });
		expect(data.tests).toBe(40);
		expect(data.lanes.map((lane) => lane.name)).toEqual([
			"w1",
			"w2",
			"w3",
			"w4",
		]);
	});

	it("keeps tests that took no time and share a millisecond: they were measured", () => {
		const tests = Array.from({ length: 25 }, (_, index) =>
			makeTest(`case ${index}`, 2000, 0, { threadId: "w1" }),
		);
		tests.push(makeTest("setup", 0, 2000, { threadId: "w1" }));
		const data = collectTimeline(tests);
		expect(data.unmeasured.tests).toBe(0);
		expect(data.tests).toBe(26);
	});
});

describe("renderTimelineGantt", () => {
	it("writes a compact Gantt on a clock that starts at 0:00", () => {
		const { text } = gantt([
			makeTest("Login works", 0, 4200, { threadId: "worker-1" }),
			makeTest("Logout works", 4300, 2100, {
				threadId: "worker-1",
				status: "failed",
			}),
		]);
		expect(
			text.startsWith("---\nconfig:\n  gantt:\n    displayMode: compact\n"),
		).toBe(true);
		expect(text).toContain("\ngantt\n");
		expect(text).toContain("\ndateFormat D HH:mm:ss.SSS\n");
		expect(text).toContain("\naxisFormat %-S.%Ls\n");
		expect(text).toContain("\ntodayMarker off");
		expect(sections(text)).toEqual(["worker-1"]);
		expect(taskLines(text)).toEqual([
			`${ZWSP}Login works :16 00:00:00.000, 4200ms`,
			`${ZWSP}Logout works :crit, 16 00:00:04.300, 2100ms`,
		]);
		// Empty tasks at both ends keep the axis on the whole run.
		expect(text).toContain(`\n${ZWSP} :16 00:00:00.000, 0ms\n`);
		expect(text).toContain(`\n${ZWSP} :16 00:00:06.400, 0ms`);
	});

	it("keeps GitHub's light and dark themes and sets colors that differ in more than hue", () => {
		const { text } = gantt([makeTest("a", 0, 10)]);
		const frontmatter = text.split("\n---\n")[0];
		expect(frontmatter).not.toMatch(/^\s*theme:/m);
		expect(frontmatter).toContain("    taskBkgColor: '#4ac26b'");
		expect(frontmatter).toContain("    critBkgColor: '#cf222e'");
		expect(frontmatter).toContain("    activeTaskBkgColor: '#eac54f'");
		expect(frontmatter).toContain("    doneTaskBkgColor: '#afb8c1'");
		expect(frontmatter).toContain("    vertLineColor: '#8c959f'");
		// White names on failed bars, dashed outlines on failed attempts.
		expect(frontmatter).toMatch(
			/\n {2}themeCSS: "[^"]*\.taskText\.critText0[^"]*fill:#ffffff !important[^"]*\.active0[^"]*stroke-dasharray:4 2[^"]*"\n/,
		);
	});

	it.each([
		[5_000, "%-S.%Ls"],
		[30 * 60_000, "%-M:%S"],
		[2 * HOUR, "%-H:%M:%S"],
	])("formats the axis for a run of %ims as %s", (length, format) => {
		const { text } = gantt([makeTest("a", 0, length)]);
		expect(text).toContain(`\naxisFormat ${format}\n`);
		expect(text).toContain("\ndateFormat D HH:mm:ss.SSS\n");
	});

	it("switches to epoch timestamps for runs of a day or more", () => {
		const { text } = gantt([
			makeTest("soak", 0, 25 * HOUR),
			makeTest("after", 25 * HOUR, 1000),
		]);
		expect(text).toContain("\ndateFormat x\n");
		expect(text).toContain("\naxisFormat %b %-d %H:%M\n");
		expect(taskLines(text)[0]).toMatch(new RegExp(` :${T0}, 90000000ms$`));
	});

	it("tags bars by kind", () => {
		const lines = taskLines(
			gantt([
				makeTest("passed", 0, 10_000),
				makeTest("failed", 10_000, 10_000, { status: "failed" }),
				makeTest("other", 20_000, 10_000, { status: "other" }),
				makeTest("flaky", 40_000, 10_000, {
					retryAttempts: [
						{
							attempt: 1,
							status: "failed",
							start: T0 + 30_000,
							stop: T0 + 40_000,
						},
					],
				}),
			]).text,
		);
		const tags = lines.map((line) => {
			const data = line.split(" :")[1];
			return data.startsWith("16 ") ? "" : data.split(" 16 ")[0];
		});
		expect(tags).toEqual(["", "crit,", "done,", "active,", ""]);
	});

	it("starts every task with a zero-width space so no name reads as a keyword", () => {
		const names = [
			"section should collapse",
			"title renders",
			"gantt chart",
			"click me",
			"2024-01-01 report",
			"dateFormat x",
			"Excludes weekends",
			"todayMarker off",
			"accTitle: hijack",
			"%% not a comment",
			"5% load",
		];
		const { text } = gantt(
			names.map((name, index) =>
				makeTest(name, 0, 60_000, { threadId: `t${index}` }),
			),
		);
		const lines = taskLines(text);
		expect(lines).toHaveLength(names.length);
		expect(sections(text)).toHaveLength(names.length);
		for (const line of text.split("\n").filter((l) => l.includes(" :"))) {
			if (line.startsWith("section") || /^\w/.test(line)) {
				continue;
			}
			expect(line.startsWith(ZWSP)).toBe(true);
			expect(line.split(" :")[0]).not.toMatch(/[:;%]/);
		}
		expect(text.match(/^title /m)).toBeNull();
	});

	it("removes what would break the diagram or the markdown fence", () => {
		const { text } = gantt([
			makeTest("a: b; c #1; d #amp; 100% ```x``` \nnext\tline", 0, 60_000, {
				threadId: "w#1; x: `y` %%{i}%% <br/>z",
			}),
		]);
		const [line] = taskLines(text);
		const name = line.slice(1, line.lastIndexOf(" :"));
		expect(name).toBe("a∶ b, c #1, d #amp, 100％ '''x''' next line");
		expect(sections(text)).toEqual(["w#1, x∶ 'y' ％％{i}％％ z"]);
		expect(text).not.toContain("`");
		expect(text).not.toMatch(/#\w+;/);
	});

	it("writes a name only when it fits inside its bar", () => {
		const { text } = gantt([
			makeTest("A long test with a readable name", 0, 50_000),
			makeTest("A short test with a long name that cannot fit", 50_000, 600),
		]);
		const [long, short] = taskLines(text);
		expect(long).toMatch(/^\u200bA long test with a readable name :/);
		expect(short).toMatch(/^\u200b :/);
	});

	it("cuts a name that is too long for its bar", () => {
		const name = "Checkout with a saved card and a discount code applied twice";
		const { text } = gantt([
			makeTest(name, 0, 9000),
			makeTest("rest", 9000, 51_000),
		]);
		const label = taskLines(text)[0].split(" :")[0].slice(1);
		expect(label.endsWith("…")).toBe(true);
		expect(name.startsWith(label.slice(0, -1))).toBe(true);
		expect(label.length).toBeGreaterThan(6);
	});

	it("draws a failure too short for a bar as a diamond and keeps neighbours off it", () => {
		const { text, diamonds } = gantt([
			makeTest("before", 0, 9900),
			makeTest("init fails", 9900, 0, { status: "failed" }),
			makeTest("after", 9910, 20_090),
		]);
		expect(diamonds).toBe(true);
		const lines = taskLines(text);
		expect(lines[1]).toBe(`${ZWSP} :crit, milestone, 16 00:00:09.900, 0ms`);
		const [lane] = laneSpans(text);
		const [before, after] = [lane[1], lane[3]];
		const half = 12 * (30_000 / (1000 - 75 - 40));
		expect(before[0] + before[1]).toBeLessThanOrEqual(9900 - half + 1);
		expect(after[0]).toBeGreaterThanOrEqual(9900 + half - 1);
	});

	it("keeps a failed bar red by drawing a retried attempt right before it as a sliver", () => {
		const { text, kinds } = gantt([
			makeTest("A passes", 0, 30_000, { threadId: "T1" }),
			makeTest("X fails", 30_100, 400, {
				threadId: "T1",
				status: "failed",
				retryAttempts: [
					{
						attempt: 1,
						status: "failed",
						start: T0 + 30_000,
						stop: T0 + 30_100,
					},
				],
			}),
			makeTest("B passes", 30_500, 29_500, { threadId: "T1" }),
		]);
		expect(kinds).toEqual(["passed", "failed", "retry"]);
		const lines = taskLines(text);
		expect(lines.filter((line) => line.includes(":crit, 16"))).toHaveLength(1);
		expect(lines.filter((line) => line.includes(":active, 16"))).toHaveLength(
			1,
		);
		expect(text).not.toContain("milestone");
	});

	it("draws short failures as slivers on lanes where diamonds would crowd out the passes", () => {
		const tests: Test[] = [];
		for (let index = 0; index < 45; index++) {
			tests.push(
				makeTest(`fast failure ${index}`, index * 1330, 5, {
					status: "failed",
					threadId: "worker-0",
				}),
				makeTest(`passing test ${index}`, index * 1330 + 5, 1325, {
					threadId: "worker-0",
				}),
			);
		}
		tests.push(
			makeTest("lone failure", 30_000, 5, {
				status: "failed",
				threadId: "worker-1",
			}),
			makeTest("long pass", 30_005, 29_000, { threadId: "worker-1" }),
		);
		const { text, diamonds } = gantt(tests);
		const [crowded, quiet] = laneSpans(text);
		const milestones = text
			.split("\n")
			.filter((line) => line.includes("milestone"));
		// worker-0 gets slivers, and keeps its passes between them;
		// worker-1 keeps its diamond.
		expect(milestones).toHaveLength(1);
		expect(diamonds).toBe(true);
		const lines = text.split("\nsection ")[1].split("\n");
		expect(lines.filter((line) => line.includes(":crit,")).length).toBe(45);
		expect(
			crowded.filter(([, length]) => length > 1000).length,
		).toBeGreaterThan(40);
		expect(quiet.length).toBeGreaterThan(1);
	});

	it("draws short failures as slivers when diamonds would crowd the chart", () => {
		const tests: Test[] = [];
		for (let index = 0; index < 400; index++) {
			tests.push(
				makeTest(`t${index}`, index * 1000, 990, {
					status: index % 2 === 0 ? "failed" : "passed",
				}),
			);
		}
		const { text, diamonds } = gantt(tests);
		expect(diamonds).toBe(false);
		expect(text).not.toContain("milestone");
		expect(text).toContain("crit, ");
	});

	it("keeps failures spread over a stretch apart instead of one marker for all", () => {
		const tests: Test[] = [makeTest("setup", 0, 20_000, { threadId: "w0" })];
		for (let index = 0; index < 3000; index++) {
			tests.push(
				makeTest(`parse case ${index}`, 20_000 + index * 3, 3, {
					threadId: "w0",
					status: index % 10 === 0 ? "failed" : "passed",
				}),
			);
		}
		tests.push(makeTest("teardown", 29_000, 31_000, { threadId: "w0" }));
		const { text } = gantt(tests);
		const markers = laneSpans(text)[0].filter(
			([start]) => start >= 20_000 && start <= 29_000,
		);
		const failures = text.split("\n").filter((line) => line.includes(":crit,"));
		// The 9 seconds of cases are about 133px: several markers, not one.
		expect(failures.length).toBeGreaterThan(4);
		expect(markers.length).toBeGreaterThan(4);
	});

	it("merges runs of tests too short to tell apart and says how many", () => {
		const tests = Array.from({ length: 300 }, (_, index) =>
			makeTest(`quick ${index}`, index * 10, 9),
		);
		tests.push(makeTest("slow", 3000, 9000));
		const { text, mergedBars } = gantt(tests);
		expect(mergedBars).toBe(true);
		const lines = taskLines(text);
		expect(lines.length).toBeLessThan(5);
		expect(text).toContain("300 tests");
	});

	it("never merges a failure into the passes around it", () => {
		const tests = Array.from({ length: 200 }, (_, index) =>
			makeTest(`quick ${index}`, index * 10, 9, {
				status: index === 100 ? "failed" : "passed",
			}),
		);
		tests.push(makeTest("slow", 2000, 600_000));
		const lines = taskLines(gantt(tests).text);
		const failures = lines.filter((line) => line.includes("crit"));
		expect(failures).toHaveLength(1);
		expect(failures[0]).toContain("milestone");
		expect(lines.find((line) => line.startsWith(`${ZWSP}slow :`))).toMatch(
			/^\u200bslow :16 /,
		);
	});

	it("keeps passes green when it merges skips into them to save space", () => {
		const tests: Test[] = [];
		const random = seeded(11);
		for (let lane = 0; lane < 8; lane++) {
			let cursor = 0;
			for (let index = 0; index < 180; index++) {
				const skip = index % 3 === 1;
				const failed = index === 9 || index === 170;
				const length = failed
					? 1500
					: skip
						? 30
						: 250 + Math.floor(random() * 100);
				tests.push(
					makeTest(`t${lane}-${index}`, cursor, length, {
						threadId: `gw${lane}`,
						status: failed ? "failed" : skip ? "skipped" : "passed",
					}),
				);
				cursor += length;
			}
		}
		const { text, kinds } = gantt(tests, { maxDiagramChars: 20_000 });
		expect(text.length).toBeLessThanOrEqual(20_000);
		expect(kinds).toContain("passed");
		let green = 0;
		let gray = 0;
		for (const line of taskLines(text)) {
			const length = Number(line.match(/, (\d+)ms$/)?.[1]);
			if (line.includes(":done,")) {
				gray += length;
			} else if (!line.includes(":crit,")) {
				green += length;
			}
		}
		expect(green).toBeGreaterThan(gray * 3);
		// Both 1.5s failures of each worker stay where they ran, as bars.
		const failed = taskLines(text).filter((line) => line.includes(":crit, 16"));
		expect(failed.length).toBe(16);
	});

	it("survives merged bars split by failures into pieces over idle time", () => {
		const tests: Test[] = [];
		for (let worker = 1; worker < 40; worker++) {
			for (let index = 0; index < 22; index++) {
				tests.push(
					makeTest(`w${worker}-${index}`, index * 4000, 4000, {
						threadId: `worker-${worker}`,
					}),
				);
			}
		}
		tests.push(
			makeTest("checkout passes", 0, 4000, { threadId: "worker-0" }),
			makeTest("payment fails fast", 4000, 100, {
				threadId: "worker-0",
				status: "failed",
			}),
			makeTest("refund passes", 4100, 4000, { threadId: "worker-0" }),
			makeTest("invoice fails fast", 8100, 100, {
				threadId: "worker-0",
				status: "failed",
			}),
			...Array.from({ length: 19 }, (_, index) =>
				makeTest(`late ${index}`, 9200 + index * 4000, 4000, {
					threadId: "worker-0",
				}),
			),
		);
		const report = buildTimelineReport(tests);
		expect(report.hasData).toBe(true);
		expect(report.mermaid).toContain("crit");
		expect(vi.mocked(core.warning)).not.toHaveBeenCalled();
	});

	it("keeps every lane on one row: bars in a lane never overlap", () => {
		const tests: Test[] = [];
		const random = seeded(42);
		for (let lane = 0; lane < 6; lane++) {
			let cursor = Math.floor(random() * 100);
			for (let index = 0; index < 400; index++) {
				const length = Math.floor(random() ** 3 * 4000);
				const status = random() < 0.05 ? "failed" : "passed";
				tests.push(
					makeTest(`t${lane}-${index}`, cursor, length, {
						status,
						threadId: `w${lane}`,
						retryAttempts:
							random() < 0.03
								? [
										{
											attempt: 1,
											status: "failed",
											start: T0 + cursor - 20,
											stop: T0 + cursor - 2,
										},
									]
								: undefined,
					}),
				);
				cursor += length + Math.floor(random() * 50) - 3;
			}
		}
		for (const maxDiagramChars of [20_000, 6000, 2500]) {
			const lanes = laneSpans(gantt(tests, { maxDiagramChars }).text);
			for (const lane of lanes) {
				for (let index = 1; index < lane.length; index++) {
					const [previousStart, previousLength] = lane[index - 1];
					expect(lane[index][0]).toBeGreaterThanOrEqual(
						previousStart + previousLength,
					);
				}
			}
		}
	});

	it("stays within the character budget for very large runs", () => {
		const tests: Test[] = [];
		for (let lane = 0; lane < 16; lane++) {
			for (let index = 0; index < 1500; index++) {
				tests.push(
					makeTest(
						`suite ${lane} test ${index}`,
						index * 130 + (lane % 3),
						100,
						{
							status: index % 97 === 0 ? "failed" : "passed",
							threadId: `ForkJoinPool-1-worker-${lane + 1}`,
						},
					),
				);
			}
		}
		const { text, kinds } = gantt(tests);
		expect(text.length).toBeLessThanOrEqual(20_000);
		expect(kinds).toContain("failed");
		expect(sections(text)).toHaveLength(16);
	});

	it("stays within a small budget by coarsening further", () => {
		const tests: Test[] = [];
		for (let lane = 0; lane < 10; lane++) {
			for (let index = 0; index < 500; index++) {
				tests.push(
					makeTest(`t${index}`, index * 200, 100, {
						status: index % 2 ? "failed" : "passed",
						threadId: `w${lane}`,
					}),
				);
			}
		}
		const { text } = gantt(tests, { maxDiagramChars: 3000 });
		expect(text.length).toBeLessThanOrEqual(3000);
		expect(sections(text)).toHaveLength(10);
	});

	it("drops the labels, then the chart, rather than go over the budget", () => {
		const name = `renders ✔${"\ufe0f".repeat(60_000)} icon`;
		const tests = [
			makeTest(name, 0, 60_000, { threadId: "main" }),
			makeTest("b", 0, 1000, { threadId: `w${"\ufe0f".repeat(60_000)}` }),
		];
		const { text } = gantt(tests);
		expect(text.length).toBeLessThanOrEqual(20_000);
		expect(gantt(tests, { maxDiagramChars: 300 }).text).toBe("");
	});

	it("gives every lane its own section, even when names clash once cleaned", () => {
		const { text } = gantt([
			makeTest("a", 0, 10, { threadId: "a;b" }),
			makeTest("b", 0, 10, { threadId: "a,b" }),
		]);
		expect(sections(text)).toEqual(["a,b", "a,b [2]"]);
	});

	it("keeps the part where long lane names differ", () => {
		const base = "integration-tests-runner-node-alpha-0001-shard-";
		const { text } = gantt(
			["west", "east", "north"].map((region, index) =>
				makeTest(`t${index}`, 0, 1000, {
					threadId: `${base}${region}-europe-zone-b-000123`,
				}),
			),
		);
		const names = sections(text);
		expect(new Set(names).size).toBe(3);
		expect(names.every((name) => !name.includes("["))).toBe(true);
		expect(
			names.some((name) => name.endsWith("rth-europe-zone-b-000123")),
		).toBe(true);
	});

	it("sizes the left margin to the longest lane name, within limits", () => {
		const short = gantt([makeTest("a", 0, 10, { threadId: "w1" })]).text;
		const long = gantt([
			makeTest("a", 0, 10, { threadId: "ForkJoinPool-1-worker-1" }),
		]).text;
		const huge = gantt([
			makeTest("a", 0, 10, { threadId: "x".repeat(200) }),
		]).text;
		const padding = (text: string) =>
			Number(text.match(/leftPadding: (\d+)/)?.[1]);
		expect(padding(short)).toBe(75);
		expect(padding(long)).toBeGreaterThan(150);
		expect(padding(huge)).toBeGreaterThan(220);
		expect(padding(huge)).toBeLessThanOrEqual(240);
		expect(sections(huge)[0]).toMatch(/^x+…x{10}$/);
	});

	it("writes the description it is given for screen readers", () => {
		const { text } = renderTimelineGantt(
			collectTimeline([makeTest("a", 0, 1000)]),
			{},
			"One test: a; 100% done",
		);
		expect(text).toContain("\naccTitle: Test execution timeline\n");
		expect(text).toContain("\naccDescr: One test: a, 100％ done\n");
	});

	it("keeps the axis at 0:00 when the first test becomes a diamond", () => {
		const lanes = laneSpans(
			gantt([
				makeTest("init fails", 0, 0, { status: "failed" }),
				makeTest("rest", 10, 60_000),
			]).text,
		);
		expect(lanes[0][0]).toEqual([0, 0]);
	});

	it("gives a run where everything took no time an axis of its own", () => {
		const { text } = gantt([
			makeTest("a", 0, 0),
			makeTest("b", 0, 0, { status: "failed" }),
		]);
		expect(text).not.toContain("NaN");
		expect(text).toContain(`\n${ZWSP} :16 00:00:00.001, 0ms`);
	});

	it("marks where a stretch without tests is cut out, and merges nothing across it", () => {
		const tests = [
			...Array.from({ length: 50 }, (_, index) =>
				makeTest(`first ${index}`, index * 20, 20, { threadId: "w1" }),
			),
			...Array.from({ length: 50 }, (_, index) =>
				makeTest(`second ${index}`, 3 * HOUR + index * 20, 20, {
					threadId: "w1",
				}),
			),
		];
		const data = collectTimeline(tests);
		const { text } = renderTimelineGantt(data);
		const cut = text.split("\n").filter((line) => line.includes(":vert,"));
		// The runs stay 60ms apart, 3% of the 2s they took.
		expect(cut).toEqual([`${ZWSP} :vert, 16 00:00:01.030, 0ms`]);
		for (const [start, length] of laneSpans(text)[0]) {
			expect(start >= 1030 || start + length <= 1030).toBe(true);
		}
	});
});

describe("buildTimelineReport", () => {
	it("explains what is missing when no test has timing", () => {
		const report = buildTimelineReport([makeTest("a", undefined, 10)]);
		expect(report.hasData).toBe(false);
		expect(report.message).toContain("<code>start</code>");
		expect(report.message).toContain("<code>threadId</code>");
	});

	it("says what is wrong when every test's times are broken", () => {
		const report = buildTimelineReport([
			{
				name: "a",
				status: "passed",
				duration: Number.NaN,
				start: T0 + 9,
				stop: T0,
			},
		]);
		expect(report.hasData).toBe(false);
		expect(report.message).toBe(
			"No test in this report has start and stop times that can be placed on a timeline: they stop before they start, or are not plausible dates.",
		);
	});

	it("says so when no test ran at all", () => {
		const report = buildTimelineReport([
			makeTest("a", 0, 0, { status: "skipped" }),
		]);
		expect(report.hasData).toBe(false);
		expect(report.message).toBe("No test ran, so there is no timeline.");
		expect(buildTimelineReport([]).hasData).toBe(false);
	});

	it("summarises tests, lanes, length, how busy the lanes were and the peak", () => {
		const report = buildTimelineReport([
			makeTest("a", 0, 10_000, { threadId: "w1" }),
			makeTest("b", 0, 5000, { threadId: "w2" }),
			makeTest("c", 5000, 5000, {
				threadId: "w2",
				retryAttempts: [
					{ attempt: 1, status: "failed", start: T0 + 5000, stop: T0 + 5000 },
				],
			}),
		]);
		expect(report.headline).toBe(
			"**3** tests (and **1** run before a retry) on **2** threads in **10.0s** · busy **100%** of the time · up to **2** at once",
		);
	});

	it("counts threads, not lanes, and leaves runs before a retry out of how busy they were", () => {
		const report = buildTimelineReport([
			makeTest("A", 0, 5000, { threadId: "0" }),
			makeTest("B", 5000, 5000, { threadId: "0" }),
			makeTest("C", 0, 5000, { threadId: "1" }),
			makeTest("X", 5000, 5000, {
				threadId: "1",
				retryAttempts: [
					{ attempt: 1, status: "failed", start: T0, stop: T0 + 5000 },
				],
			}),
		]);
		expect(report.headline).toBe(
			"**4** tests (and **1** run before a retry) on **2** threads and **1** more lane in **10.0s** · busy **100%** of the time · up to **3** at once",
		);
		const split = buildTimelineReport([
			makeTest("fork 1", 0, 1000, { threadId: "Test worker" }),
			makeTest("fork 2", 0, 1000, { threadId: "Test worker" }),
		]);
		expect(split.headline).toBe(
			"**2** tests on **1** thread in **2** lanes in **1.0s** · busy **100%** of the time · up to **2** at once",
		);
	});

	it("reports busy and idle time per lane", () => {
		const report = buildTimelineReport([
			makeTest("a", 0, 10_000, { threadId: "w1", status: "failed" }),
			makeTest("b", 0, 2000, { threadId: "w2" }),
			makeTest("c", 6000, 2000, { threadId: "w2" }),
		]);
		expect(report.showLanes).toBe(true);
		expect(report.lanes).toEqual([
			{
				name: "w1",
				tests: 1,
				retries: 0,
				failed: 1,
				busy: "10.0s",
				idle: "0ms",
				utilization: "100%",
			},
			{
				name: "w2",
				tests: 2,
				retries: 0,
				failed: 0,
				busy: "4.0s",
				idle: "6.0s",
				utilization: "40%",
			},
		]);
		expect(report.headline).toContain("busy **70%** of the time");
	});

	it("hides the lane table for a single lane", () => {
		const report = buildTimelineReport([
			makeTest("a", 0, 10, { threadId: "w1" }),
		]);
		expect(report.showLanes).toBe(false);
		expect(report.headline).toBe(
			"**1** test on **1** thread in **10ms** · busy **100%** of the time",
		);
		expect(report.highlights).toBe("");
	});

	it("names the slowest test and the one that finished last", () => {
		const report = buildTimelineReport([
			makeTest("login", 0, 2000, { threadId: "w1" }),
			makeTest("export `csv`", 0, 9000, { threadId: "w2" }),
			makeTest("logout", 9000, 1500, { threadId: "w2" }),
		]);
		expect(report.highlights).toBe(
			"Slowest: `` export `csv` `` (9.0s on `w2`) · Last to finish: `logout` at 0:10.500 on `w2`",
		);
		expect(report.mermaid).toContain(
			"\naccDescr: 3 tests on 2 threads over 10.5s, 0 failed. The slowest test is export 'csv' (9.0s on w2). The last to finish is logout on w2, at 0:10.500.\n",
		);
		const same = buildTimelineReport([
			makeTest("a", 0, 1000, { threadId: "w1" }),
			makeTest("b", 0, 5000, { threadId: "w2" }),
		]);
		expect(same.highlights).toBe(
			"Slowest and last to finish: `b` (5.0s on `w2`, until 0:05.000)",
		);
	});

	it("lists executions grouped by lane, in start order on the clock of the axis", () => {
		const report = buildTimelineReport([
			makeTest("second", 65_250, 1000, { threadId: "w2" }),
			makeTest("third", 1000, 1000, { threadId: "w1" }),
			makeTest("first", 0, 1500, { threadId: "w2", status: "failed" }),
		]);
		expect(report.rows).toEqual([
			{
				number: "",
				start: "0:01.000",
				duration: "1.0s",
				lane: "w1",
				name: "third",
				status: "✅ passed",
			},
			{
				number: "1",
				start: "0:00.000",
				duration: "1.5s",
				lane: "w2",
				name: "first",
				status: "❌ failed",
			},
			{
				number: "",
				start: "1:05.250",
				duration: "1.0s",
				lane: "w2",
				name: "second",
				status: "✅ passed",
			},
		]);
		expect(report.rowsTitle).toBe("Test timings (3)");
		expect(report.startHeader).toBe("Start");
	});

	it("caps the timings table, keeping failures, retried failures and the slowest tests", () => {
		const tests = Array.from({ length: 10 }, (_, index) =>
			makeTest(`t${index}`, index * 1000, 100 + index),
		);
		tests[2] = makeTest("broken", 2000, 1, { status: "failed" });
		tests[3] = makeTest("flaky", 3500, 1, {
			retryAttempts: [
				{ attempt: 1, status: "failed", start: T0 + 3000, stop: T0 + 3001 },
			],
		});
		const report = buildTimelineReport(tests, { maxRows: 4 });
		expect(report.rows.map((row) => row.name)).toEqual([
			"broken",
			"flaky (attempt 1)",
			"t8",
			"t9",
		]);
		expect(report.rowsTitle).toBe(
			"Test timings (4 of 11: failures, retried failures and the slowest)",
		);
		const failuresOnly = buildTimelineReport(tests, { maxRows: 1 });
		expect(failuresOnly.rowsTitle).toBe("Test timings (1 of 11: failures)");
	});

	it("shows table cells as written: one line, no links, formatting or mentions", () => {
		const report = buildTimelineReport([
			makeTest("a | b\nc", 0, 10, { threadId: "x|y" }),
			makeTest(
				"see [log](https://evil.example) ![](https://evil.example/p.png) **bold** @octocat #12 `code` <b>",
				10,
				10,
				{ threadId: "x|y" },
			),
		]);
		expect(report.rows[0].name).toBe("a \\| b c");
		expect(report.rows[0].lane).toBe("x\\|y");
		expect(report.rows[1].name).toBe(
			"see \\[log\\](https:\u2060//evil.example) !\\[\\](https:\u2060//evil.example/p.png) \\*\\*bold\\*\\* @\u2060octocat #\u206012 \\`code\\` &lt;b&gt;",
		);
	});

	it("adds notes only for what applies", () => {
		expect(
			buildTimelineReport([makeTest("a", 0, 10, { threadId: "w1" })]).notes,
		).toEqual([]);

		const report = buildTimelineReport([
			makeTest("timed", 0, 10),
			makeTest("untimed", undefined, 10),
			makeTest("skipped", undefined, 0, { status: "skipped" }),
		]);
		expect(report.notes).toEqual([
			"1 test without start and stop times is not shown.",
			"1 skipped or pending test is not shown.",
			"The report has no thread IDs (<code>threadId</code>), so lanes are inferred from start and stop times.",
		]);
	});

	it("explains split threads, naming them as code", () => {
		const report = buildTimelineReport([
			makeTest("a", 0, 1000, { threadId: "<b>Test worker</b>" }),
			makeTest("b", 10, 1000, { threadId: "<b>Test worker</b>" }),
		]);
		expect(report.notes).toEqual([
			"Tests on `<b>Test worker</b>` overlap in time (processes sharing a thread name, or a test timed around others), so it is shown as 2 lanes.",
		]);
		const windows = buildTimelineReport([
			makeTest("a", 0, 1000, { threadId: "D:\\agents\\w1\\" }),
			makeTest("b", 10, 1000, { threadId: "D:\\agents\\w1\\" }),
		]);
		expect(windows.notes[0]).toContain("Tests on `D:\\agents\\w1\\` overlap");
	});

	it("keeps notes short, whatever the thread names", () => {
		const report = buildTimelineReport(
			[0, 1, 2, 3].flatMap((thread) => [
				makeTest("a", 0, 1000, {
					threadId: `pool-${thread}-${"worker".repeat(5000)}`,
				}),
				makeTest("b", 500, 1000, {
					threadId: `pool-${thread}-${"worker".repeat(5000)}`,
				}),
			]),
		);
		const note = report.notes.find((text) => text.startsWith("Tests on"));
		expect(note?.length).toBeLessThan(400);
		expect(note).toContain("and 1 other thread");
	});

	it("lists only the bar kinds that appear, and when 0:00 was to the millisecond", () => {
		const report = buildTimelineReport([
			makeTest("a", 999, 60_000, { threadId: "w1" }),
			makeTest("b", 60_999, 60_000, { threadId: "w1", status: "failed" }),
		]);
		expect(report.legend).toBe(
			`🟩 passed · 🟥 failed · 0:00 = ${new Date(T0 + 999).toISOString().slice(0, 23).replace("T", " ")} UTC`,
		);
		const retried = buildTimelineReport([
			makeTest("flaky", 30_000, 30_000, {
				retryAttempts: [
					{ attempt: 1, status: "failed", start: T0, stop: T0 + 30_000 },
				],
			}),
		]);
		expect(retried.legend).toContain("🟨 failed, then retried (dashed)");
	});

	it("shows real times in the tables when a stretch is cut out of the chart", () => {
		const report = buildTimelineReport([
			makeTest("early", 0, 1000, { threadId: "w1" }),
			makeTest("late", 3 * HOUR, 1000, { threadId: "w1" }),
		]);
		expect(report.rows.map((row) => row.start)).toEqual([
			"0:00:00.000",
			"3:00:00.000",
		]);
		expect(report.notes).toContain(
			"No test ran for 2h 59m, so that stretch is cut out of the chart at the gray line; the tables show real times.",
		);
		expect(report.highlights).toContain("at 3:00:01.000");
	});
});

describe("text helpers", () => {
	it("leaves ordinary names alone", () => {
		expect(sanitizeMermaidText("should render > nested (case 1)")).toBe(
			"should render > nested (case 1)",
		);
	});

	it("drops control, zero-width and bidirectional formatting characters", () => {
		expect(
			sanitizeMermaidText("a\u0000b\u200bc\u202ed\u2028e\u0085f\ufeff"),
		).toBe("a bcd e f");
	});

	it("keeps the joiners that Persian, Indic scripts and emoji need", () => {
		expect(sanitizeMermaidText("می\u200cخواهم 👨\u200d👩\u200d👧")).toBe(
			"می\u200cخواهم 👨\u200d👩\u200d👧",
		);
	});

	it("cuts names between characters, never inside an emoji or a flag", () => {
		const name = "🏳️\u200d🌈🇺🇦👨\u200d👩\u200d👧".repeat(10);
		const cut = fitText(name, 120, 1);
		expect(cut.endsWith("…")).toBe(true);
		expect(name.startsWith(cut.slice(0, -1))).toBe(true);
		expect(cut.length % "🏳️\u200d🌈🇺🇦👨\u200d👩\u200d👧".length).toBeGreaterThan(
			0,
		);
		const tail = fitMiddle(name, 120);
		expect(name.endsWith(tail.slice(tail.indexOf("…") + 1))).toBe(true);
	});

	it("cuts a name only where it does not fit, and keeps its cut inside the room", () => {
		const name = "abcdefghijklmnopqrstuvwxyzabcdefghijkl";
		expect(fitText(name, textWidth(name), 10)).toBe(name);
		const cut = fitText(name, textWidth(name) - 1, 10);
		expect(cut.endsWith("…")).toBe(true);
		expect(textWidth(cut)).toBeLessThanOrEqual(textWidth(name) - 1);
	});

	it("writes code spans that hold any text", () => {
		expect(codeSpan("plain")).toBe("`plain`");
		expect(codeSpan("a `b` c")).toBe("``a `b` c``");
		expect(codeSpan("`edge`")).toBe("`` `edge` ``");
		expect(codeSpan("")).toBe("` `");
	});

	it("escapes cells for markdown and HTML", () => {
		expect(escapeCell("a & <b> www.example.com")).toBe(
			"a &amp; &lt;b&gt; www\u2060.example.com",
		);
	});
});

describe("formatDuration", () => {
	it.each([
		[0, "0ms"],
		[999.4, "999ms"],
		[1500, "1.5s"],
		[65_000, "1m 5s"],
		[120_000, "2m"],
		[3_600_000, "1h"],
		[3_900_000, "1h 5m"],
	])("formats %ims as %s", (ms, text) => {
		expect(formatDuration(ms)).toBe(text);
	});
});

describe("buildTimelineReport with real-world data", () => {
	it("never throws, and says so in the job log", () => {
		const hostile = [
			null,
			1,
			"x",
			{ name: 123, status: "weird", duration: "abc", start: "nope" },
			{
				get name() {
					throw new Error("boom");
				},
				status: "passed",
				duration: 1,
				start: T0,
				stop: T0 + 1,
			},
		] as unknown as Test[];
		const report = buildTimelineReport(hostile);
		expect(report.hasData).toBe(false);
		expect(report.message).toContain("could not be drawn");
		expect(vi.mocked(core.warning)).toHaveBeenCalledWith(
			"Timeline report could not be built: boom",
		);
	});

	it("explains every kind of test it leaves out", () => {
		const report = buildTimelineReport([
			makeTest("drawn", 0, 1000, { threadId: "w1" }),
			makeTest("drawn twice", 1000, 1000, { threadId: "w1", testId: "x" }),
			makeTest("drawn twice", 1000, 1000, { threadId: "w1", testId: "x" }),
			makeTest("untimed failure", undefined, 10, { status: "failed" }),
			makeTest("old run", -6 * HOUR - 1000, 1000, { threadId: "w1" }),
			makeTest("flaky", 2000, 100, {
				threadId: "w1",
				retryAttempts: [{ attempt: 1, status: "failed", duration: 5 }],
			}),
			makeTest("broken", 0, 10, { stop: T0 - 10, duration: Number.NaN }),
			makeTest("TestGroup", 3000, 100, { threadId: "w1" }),
			makeTest("TestGroup/case", 3000, 100, { threadId: "w1" }),
		]);
		expect(report.notes).toEqual([
			"1 test without start and stop times is not shown (it failed).",
			"1 test whose start and stop times cannot be placed (stopping before starting, or not a plausible date) is not shown.",
			"1 run before a retry without start and stop times is not shown.",
			"No test ran for 6h, so that stretch is cut out of the chart at the gray line; the tables show real times.",
			"1 result listed more than once is counted once.",
			"1 parent test that only groups its subtests (<code>TestX</code> around <code>TestX/case</code>) is not drawn.",
			"A number on a bar is the row with that number (#) in the test timings below.",
		]);
	});

	it("says which results of a test that ran again are drawn as attempts, and what is left out", () => {
		const rerun = buildTimelineReport([
			makeTest("flaky", 0, 1000, { threadId: "w1", status: "failed" }),
			makeTest("stable", 1000, 1000, { threadId: "w1" }),
			makeTest("flaky", 3 * HOUR, 1000, { threadId: "w1" }),
		]);
		expect(rerun.notes).toContain(
			"1 test ran again later in the report, so its earlier result is drawn as a run before a retry.",
		);
		const history = buildTimelineReport(
			Array.from({ length: 10 }, (_, index) => [
				makeTest(`t${index}`, index * 100, 90, { threadId: "w1" }),
				makeTest(`t${index}`, 3 * HOUR + index * 100, 90, { threadId: "w1" }),
			]).flat(),
		);
		expect(history.notes).toEqual([
			"10 results from earlier runs in the same report are not shown: later runs repeated those tests.",
		]);
	});

	it("says when start and stop times are in whole seconds", () => {
		const seconds = Math.floor(T0 / 1000);
		const report = buildTimelineReport([
			{
				name: "a",
				status: "passed",
				duration: 10,
				start: seconds,
				stop: seconds,
			},
		]);
		expect(report.notes).toContain(
			"Start and stop times are in whole seconds, so tests are drawn one after another from the second they started: the chart shows their order rather than exact times.",
		);
	});

	it("says when start and stop times were converted from other units", () => {
		const report = buildTimelineReport([
			{
				name: "a",
				status: "passed",
				duration: 10,
				start: T0 * 1000,
				stop: (T0 + 10) * 1000,
			},
		]);
		expect(report.notes).toContain(
			"Some start and stop times are in microseconds rather than milliseconds.",
		);
	});

	it("explains runs before a retry drawn in a lane of their own", () => {
		const report = buildTimelineReport([
			makeTest("other test", 0, 1000, { threadId: "w1" }),
			makeTest("flaky", 2000, 500, {
				threadId: "w1",
				retryAttempts: [
					{ attempt: 1, status: "failed", start: T0 + 200, stop: T0 + 600 },
				],
			}),
		]);
		expect(report.notes).toContain(
			"1 run before a retry overlaps other tests on its thread (such runs do not record where they ran), so it is shown in a lane of its own.",
		);
		expect(report.lanes.map((lane) => lane.name)).toEqual([
			"w1",
			"Runs before a retry",
		]);
	});

	it("names skipped tests in the legend when one is drawn", () => {
		const report = buildTimelineReport([
			makeTest("a", 0, 1000),
			makeTest("b", 1000, 1000, { status: "skipped" }),
		]);
		expect(report.legend).toContain("⬜ skipped or other");
	});

	it("draws the other threads when one thread's start times were not measured", () => {
		const tests: Test[] = [];
		for (let worker = 1; worker <= 2; worker++) {
			for (let index = 0; index < 10; index++) {
				tests.push(
					makeTest(`w${worker}-${index}`, index * 100, 90, {
						threadId: `w${worker}`,
					}),
				);
			}
		}
		for (let index = 0; index < 25; index++) {
			tests.push(
				makeTest(`stamped ${index}`, 2000, 10 + index, { threadId: "w9" }),
			);
		}
		const report = buildTimelineReport(tests);
		expect(report.hasData).toBe(true);
		expect(report.notes).toContain(
			"25 tests on `w9` are not shown: most tests there that took time start in the same millisecond, so their start times were not measured.",
		);
	});
});

describe("timeline at scale", () => {
	it("keeps the red share close to the real share of failures when it has to merge", () => {
		const { text, approximate } = renderTimelineGantt(
			collectTimeline(bigRun(0.05)),
			{ maxDiagramChars: 8000 },
		);
		expect(text.length).toBeLessThanOrEqual(8000);
		expect(approximate).toBe(true);
		let red = 0;
		let all = 0;
		for (const lane of laneSpans(text)) {
			for (const [, length] of lane) {
				all += length;
			}
		}
		for (const line of taskLines(text)) {
			const match = line.match(/:crit, (?!milestone).*, (\d+)ms$/);
			if (match) {
				red += Number(match[1]);
			}
		}
		expect(red / all).toBeLessThan(0.15);
	});

	it("counts every thread in the headline and the lanes it cannot draw in a note", () => {
		const tests = Array.from({ length: 60 }, (_, index) =>
			makeTest(`t${index}`, 0, 1000 + index, {
				threadId: `worker-${index}`,
				status: index === 59 ? "failed" : "passed",
			}),
		);
		const report = buildTimelineReport(tests, { maxLanes: 10 });
		expect(report.headline.startsWith("**60** tests on **60** threads")).toBe(
			true,
		);
		expect(report.lanes.map((lane) => lane.name)).toContain("worker-59");
		expect(report.notes).toContain(
			"50 more threads with 50 tests are not drawn.",
		);
	});

	it("lists failures from lanes it cannot draw first, and says how many are listed", () => {
		const tests = Array.from({ length: 60 }, (_, index) =>
			makeTest(`t${index}`, 0, 1000 + index, {
				threadId: `worker-${index}`,
				status: index < 15 ? "failed" : "passed",
			}),
		);
		const report = buildTimelineReport(tests, { maxLanes: 10 });
		expect(report.notes).toContain(
			"50 more threads with 50 tests are not drawn; their failures are listed in the test timings.",
		);
		const failedRows = report.rows.filter((row) => row.status === "❌ failed");
		expect(failedRows).toHaveLength(15);
		const capped = buildTimelineReport(tests, { maxLanes: 10, maxRows: 3 });
		expect(capped.notes).toContain(
			"50 more threads with 50 tests are not drawn; 3 of their 5 failures are listed in the test timings.",
		);
		expect(capped.rows.map((row) => row.name)).toEqual(["t2", "t3", "t4"]);
	});

	it("keeps thread lanes when inferring lanes would not fit either", () => {
		const tests = Array.from({ length: 30 }, (_, index) =>
			makeTest(`t${index}`, 0, 1000, { threadId: `w${index}` }),
		);
		const data = collectTimeline(tests, { maxLanes: 10 });
		expect(data.inferredLanes).toBe(false);
		expect(data.lanes).toHaveLength(10);
		expect(data.hiddenLanes).toHaveLength(20);
	});

	it("keeps the timings table small even with huge test names", () => {
		const tests = Array.from({ length: 400 }, (_, index) =>
			makeTest(`${index} ${"long & <name> ".repeat(220)}`, index * 10, 5, {
				status: "failed",
				threadId: "w1",
			}),
		);
		const report = buildTimelineReport(tests);
		const tableSize = report.rows
			.map((row) => `| ${Object.values(row).join(" | ")} |`)
			.join("\n").length;
		expect(tableSize).toBeLessThanOrEqual(10_000);
		expect(report.mermaid.length).toBeLessThanOrEqual(20_000);
	});

	it("does not draw start times that were not measured", () => {
		const tests = Array.from({ length: 30 }, (_, index) =>
			makeTest(`t${index}`, 0, 100 + index * 10),
		);
		const report = buildTimelineReport(tests);
		expect(report.hasData).toBe(false);
		expect(report.message).toBe(
			"Most of the 30 tests with start and stop times start in the same millisecond, so their start times were not measured and there is no timeline.",
		);
	});

	it("says so when every test took no time at the same instant", () => {
		const report = buildTimelineReport([
			makeTest("a", 0, 0, { threadId: "w1" }),
			makeTest("b", 0, 0, { threadId: "w2" }),
		]);
		expect(report.hasData).toBe(false);
		expect(report.message).toBe(
			"Every test with start and stop times started and finished within the same millisecond, so there is no timeline.",
		);
		expect(
			buildTimelineReport([
				makeTest("a", 0, 0, { threadId: "w1" }),
				makeTest("b", undefined, 10, { status: "failed" }),
			]).message,
		).toBe(
			"The only test with start and stop times started and finished within the same millisecond, so there is no timeline. 1 other test without start and stop times is not shown.",
		);
	});

	it("tells very fast forks sharing a thread name apart", () => {
		const random = seeded(5);
		const tests: Test[] = [];
		for (let fork = 0; fork < 4; fork++) {
			let cursor = fork;
			for (let index = 0; index < 500; index++) {
				const length = Math.floor(random() * 4);
				tests.push(
					makeTest(`f${fork}-${index}`, cursor, length, {
						threadId: "Test worker",
					}),
				);
				cursor += length;
			}
		}
		const report = buildTimelineReport(tests);
		expect(report.lanes.length).toBeGreaterThanOrEqual(4);
		expect(report.headline).toContain("up to **4** at once");
	});

	it("keeps lanes named like numbers in order", () => {
		const { text } = renderTimelineGantt(
			collectTimeline([
				makeTest("a", 0, 1000, { threadId: "1" }),
				makeTest("b", 10, 1000, { threadId: "1" }),
				makeTest("c", 0, 1000, { threadId: "2" }),
			]),
		);
		expect(sections(text)).toEqual(["1", "1 (2)", "2"]);
	});

	it("draws smaller bars when there are many lanes", () => {
		const tests = Array.from({ length: 25 }, (_, index) =>
			makeTest(`t${index}`, index * 10, 1000, { threadId: `w${index}` }),
		);
		const { text } = renderTimelineGantt(collectTimeline(tests));
		expect(text).toContain("\n    barHeight: 12\n    barGap: 3\n");
		expect(
			renderTimelineGantt(collectTimeline(tests.slice(0, 5))).text,
		).not.toContain("barHeight");
	});

	it("shortens long lane names in the middle so their ends stay apart", () => {
		const { text } = renderTimelineGantt(
			collectTimeline(
				[1, 2].map((index) =>
					makeTest(`t${index}`, 0, 1000, {
						threadId: `ForkJoinPool-1-worker-thread-pool-for-integration-tests-${index}`,
					}),
				),
			),
		);
		const names = sections(text);
		expect(names[0]).not.toBe(names[1]);
		expect(names[0]).toMatch(/^ForkJoinPool.*….*tests-1$/);
		expect(names[1]).toMatch(/tests-2$/);
	});

	it("names hidden lanes in the tables so that they stay apart", () => {
		const tests = Array.from({ length: 45 }, (_, index) =>
			makeTest(`t${index}`, 0, 1000 + (index < 40 ? 100 : 0), {
				threadId: `com.example.integration.ParallelSuiteRunner-worker-${String(index + 1).padStart(2, "0")}`,
				status: index >= 40 ? "failed" : "passed",
			}),
		);
		const report = buildTimelineReport(tests, { maxLanes: 40 });
		const lanes = report.rows
			.filter((row) => row.status === "❌ failed")
			.map((row) => row.lane);
		expect(new Set(lanes).size).toBe(lanes.length);
	});

	it("writes every date on the 16th with exactly three digits of milliseconds", () => {
		const { text } = renderTimelineGantt(collectTimeline(bigRun(0.02)));
		for (const line of text.split("\n").filter((l) => l.startsWith(ZWSP))) {
			expect(line).toMatch(/[ :]16 \d\d:\d\d:\d\d\.\d{3}, \d+ms$/);
		}
	});

	it("uses the duration when the stop only repeats the start", () => {
		const data = collectTimeline([
			{ name: "a", status: "passed", duration: 250, start: T0, stop: T0 },
		]);
		expect(data.lanes[0].executions[0].stop).toBe(T0 + 250);
	});

	it("handles 200,000 executions in reasonable time", () => {
		const random = seeded(9);
		const tests: Test[] = [];
		for (let lane = 0; lane < 32; lane++) {
			let cursor = 0;
			for (let index = 0; index < 6250; index++) {
				const length = 1 + Math.floor(random() * 30);
				tests.push(
					makeTest(`t${lane}-${index}`, cursor, length, {
						threadId: `w${lane}`,
						status: random() < 0.01 ? "failed" : "passed",
					}),
				);
				cursor += length + Math.floor(random() * 3);
			}
		}
		const started = performance.now();
		const report = buildTimelineReport(tests);
		expect(performance.now() - started).toBeLessThan(8000);
		expect(report.mermaid.length).toBeLessThanOrEqual(20_000);
	});
});

describe("what GitHub's diagram viewer does to the text", () => {
	it("neutralises character references, which the viewer decodes before Mermaid parses", () => {
		const { text } = renderTimelineGantt(
			collectTimeline([
				makeTest("renders &#10; as a line break &#58 &copy", 0, 60_000, {
					threadId: "pool&#10thread",
				}),
			]),
		);
		expect(text).not.toContain("&");
		const [line] = taskLines(text);
		expect(line.slice(1, line.lastIndexOf(" :"))).toBe(
			"renders ＆#10, as a line break ＆#58 ＆copy",
		);
		expect(sections(text)).toEqual(["pool＆#10thread"]);
	});

	it("survives thread IDs named like object properties", () => {
		const names = ["constructor", "__proto__", "toString", "hasOwnProperty"];
		const { text } = renderTimelineGantt(
			collectTimeline(
				names.map((threadId, index) =>
					makeTest(`t${index}`, index, 1000, { threadId }),
				),
			),
		);
		expect(sections(text)).toEqual([
			"__proto__",
			"constructor",
			"hasOwnProperty",
			"toString",
		]);
		for (const line of text
			.split("\n")
			.filter((l) => l.startsWith("section "))) {
			expect(line.startsWith(`section ${ZWSP}`)).toBe(true);
		}
	});

	it("measures symbols that browsers draw as emoji generously", () => {
		const symbols = "✓✗★⚡⭐✅❌".repeat(2);
		const { text } = renderTimelineGantt(
			collectTimeline([
				makeTest(symbols, 0, 10_000),
				makeTest("rest", 10_000, 50_000),
			]),
		);
		// The bar is about 150px wide: room for 14 letters, not for 14 emoji.
		expect(taskLines(text)[0]).toMatch(/^\u200b :/);
	});
});

describe("Go reports", () => {
	it("keeps a same-named test from another package that has no subtests", () => {
		const data = collectTimeline([
			makeTest("TestParse", 0, 1500, { status: "failed", suite: ["alpha"] }),
			makeTest("TestParse", 0, 500, { suite: ["beta"] }),
			makeTest("TestParse/empty", 0, 200, { suite: ["beta"] }),
			makeTest("TestParse/unicode", 200, 300, { suite: ["beta"] }),
		]);
		expect(data.parents).toBe(1);
		expect(data.tests).toBe(3);
		const failed = data.lanes
			.flatMap((lane) => lane.executions)
			.filter((e) => e.kind === "failed");
		expect(failed.map((e) => e.scope)).toEqual([JSON.stringify(["", "alpha"])]);
	});

	it("recognises subtests whose case names hold slashes", () => {
		const data = collectTimeline([
			makeTest("TestHandler", 0, 182, { status: "failed" }),
			makeTest("TestHandler/GET_/health", 0, 40),
			makeTest("TestHandler/GET_/users", 40, 40),
			makeTest("TestHandler/POST_/users", 80, 50, { status: "failed" }),
			makeTest("TestHandler/GET_/users/{id}", 130, 52),
			makeTest("TestOther", 182, 100),
		]);
		expect(data.parents).toBe(1);
		expect(data.lanes).toHaveLength(1);
	});

	it("keeps a parent that failed while its subtests passed: it failed on its own", () => {
		const data = collectTimeline([
			makeTest("TestFlow", 0, 556, { status: "failed" }),
			makeTest("TestFlow/a", 0, 100),
			makeTest("TestFlow/b", 100, 100),
			makeTest("TestFlow/c", 200, 56),
		]);
		expect(data.parents).toBe(0);
		expect(data.tests).toBe(4);
	});

	it("never takes other frameworks' path-like names for parent tests", () => {
		const data = collectTimeline([
			makeTest("/docs", 0, 800, { status: "failed" }),
			makeTest("/docs/page-0", 100, 300),
			makeTest("Users API GET /users", 0, 800, {
				threadId: "w2",
				status: "failed",
			}),
			makeTest("Users API GET /users/:id", 100, 300, { threadId: "w2" }),
		]);
		expect(data.parents).toBe(0);
		expect(data.tests).toBe(4);
	});
});

describe("whole-second times", () => {
	const S = Math.floor(T0 / 1000) * 1000;

	it("recognises whole seconds written in milliseconds by their durations", () => {
		const tests = Array.from({ length: 30 }, (_, index) => ({
			name: `t${index}`,
			status: "passed" as const,
			duration: 50,
			start: S + Math.floor((index * 50) / 1000) * 1000,
			stop: S + Math.floor((index * 50 + 50) / 1000) * 1000,
		}));
		const data = collectTimeline(tests);
		expect(data.coarse).toBe(true);
		expect(data.unmeasured.tests).toBe(0);
		expect(data.lanes).toHaveLength(1);
		expect(data.stop - data.start).toBe(1500);
	});

	it("keeps round times in milliseconds exact", () => {
		const data = collectTimeline([
			makeTest("a", 0, 1000, { threadId: "w1" }),
			makeTest("b", 0, 2000, { threadId: "w2" }),
			makeTest("c", 1000, 1000, { threadId: "w1" }),
		]);
		expect(data.coarse).toBe(false);
		expect(data.lanes[0].executions.map((e) => e.start - T0)).toEqual([
			0, 1000,
		]);
	});

	it("is not fooled by one whole second among fractional seconds", () => {
		const tests = Array.from({ length: 200 }, (_, index) => {
			const start = (T0 + index * 997 + 13) / 1000;
			return {
				name: `t${index}`,
				status: "passed" as const,
				duration: 900,
				start: index === 50 ? Math.round(start) : start,
				stop: (T0 + index * 997 + 913) / 1000,
			};
		});
		const data = collectTimeline(tests);
		expect(data.coarse).toBe(false);
		expect(data.lanes).toHaveLength(1);
	});

	it("keeps parallel workers apart when there are no thread IDs", () => {
		const tests = [];
		for (let worker = 0; worker < 4; worker++) {
			for (let index = 0; index < 10; index++) {
				const at = S + worker * 77 + index * 930;
				tests.push({
					name: `w${worker}-${index}`,
					status: "passed" as const,
					duration: 900,
					start: Math.floor(at / 1000) * 1000,
					stop: Math.floor((at + 900) / 1000) * 1000,
				});
			}
		}
		const data = collectTimeline(tests);
		expect(data.coarse).toBe(true);
		// Whole seconds cannot tell which tests of a second ran one after another,
		// so a lane more than there were workers is possible; never fewer.
		expect(data.lanes.length).toBeGreaterThanOrEqual(4);
		expect(data.lanes.length).toBeLessThanOrEqual(5);
		expect(data.stop - data.start).toBeLessThan(11_000);
	});

	it("lays the tests of a second out in the order of the report", () => {
		const data = collectTimeline(
			["setup_db", "query", "cleanup"].map((name, index) => ({
				name,
				testId: `id-${9 - index}`,
				status: "passed" as const,
				duration: 200,
				start: S,
				stop: S,
				threadId: "gw0",
			})),
		);
		expect(data.lanes[0].executions.map((e) => e.name)).toEqual([
			"setup_db",
			"query",
			"cleanup",
		]);
	});

	it("never draws a test past the line of a cut", () => {
		const tests = [0, HOUR].flatMap((offset, run) =>
			Array.from({ length: 20 }, (_, index) => ({
				name: `run${run} test ${index}`,
				status: "passed" as const,
				duration: 100,
				start: S + offset + Math.floor((index * 100) / 1000) * 1000,
				stop: S + offset + Math.floor((index * 100 + 100) / 1000) * 1000,
				threadId: "w1",
			})),
		);
		const data = collectTimeline(tests);
		expect(data.cuts).toHaveLength(1);
		const [cut] = data.cuts;
		for (const execution of data.lanes[0].executions) {
			expect(execution.stop <= cut.at || execution.start >= cut.at).toBe(true);
		}
		const report = buildTimelineReport(tests);
		const late = report.rows.find((row) => row.name === "run0 test 12");
		expect(late?.start).toBe("0:00:01.200");
	});
});

describe("runs in one report", () => {
	it("keeps a later session made mostly of retries", () => {
		const tests: Test[] = Array.from({ length: 40 }, (_, index) =>
			makeTest(`test_${index}`, index * 100, 90, {
				threadId: `gw${index % 2}`,
				status: index < 2 ? "failed" : "passed",
			}),
		);
		for (const name of ["test_0", "test_1"]) {
			tests.push(
				makeTest(name, 15 * 60_000 + (name === "test_1" ? 2000 : 0), 100, {
					threadId: "gw0",
					status: "failed",
					retryAttempts: Array.from({ length: 15 }, (_, attempt) => ({
						attempt: attempt + 1,
						status: "failed" as const,
						start: T0 + 15 * 60_000 - 1600 + attempt * 100,
						stop: T0 + 15 * 60_000 - 1510 + attempt * 100,
					})),
				}),
			);
		}
		const data = collectTimeline(tests);
		expect(data.history).toBe(0);
		expect(data.tests).toBe(40);
		expect(data.rerun).toBe(2);
		const failed = data.lanes
			.flatMap((lane) => lane.executions)
			.filter((e) => e.kind === "failed");
		expect(failed).toHaveLength(2);
	});

	it("keeps the results of a shard that did not run again", () => {
		const tests: Test[] = [];
		for (let shard = 1; shard <= 12; shard++) {
			tests.push(
				makeTest(`shard ${shard}`, 0, 60_000, { threadId: `s${shard}` }),
			);
			if (shard < 12) {
				tests.push(
					makeTest(`shard ${shard}`, 2 * HOUR, 60_000, {
						threadId: `s${shard}`,
					}),
				);
			}
		}
		const data = collectTimeline(tests);
		expect(data.history).toBe(11);
		expect(data.tests).toBe(12);
		const twelve = data.lanes.find((lane) => lane.name === "s12");
		expect(twelve?.executions).toHaveLength(1);
	});

	it("does not count the space left at a cut as idle time", () => {
		const tests = [0, 40 * 60_000].flatMap((offset, run) =>
			["w1", "w2"].flatMap((threadId) =>
				Array.from({ length: 20 }, (_, index) =>
					makeTest(
						`run${run} ${threadId} ${index}`,
						offset + index * 30_000,
						30_000,
						{
							threadId,
						},
					),
				),
			),
		);
		const report = buildTimelineReport(tests);
		expect(report.headline).toContain("in **20m** · busy **100%** of the time");
		expect(report.lanes[0]).toMatchObject({ idle: "0ms", utilization: "100%" });
	});
});

describe("large reports", () => {
	it("draws a stretch of 130,000 tests that follows an idle moment", () => {
		const tests: Test[] = [makeTest("smoke", 0, 10, { threadId: "w0" })];
		for (let worker = 0; worker < 8; worker++) {
			for (let index = 0; index < 16_250; index++) {
				tests.push(
					makeTest(`w${worker}-${index}`, 15 + worker + index * 2, 2, {
						threadId: `w${worker}`,
					}),
				);
			}
		}
		const report = buildTimelineReport(tests);
		expect(report.hasData).toBe(true);
		expect(vi.mocked(core.warning)).not.toHaveBeenCalled();
	});

	it("draws a thread whose lanes hold more than 130,000 tests", () => {
		const tests: Test[] = [makeTest("Suite", 0, 270_000, { threadId: "main" })];
		for (let index = 0; index < 130_000; index++) {
			tests.push(makeTest(`t${index}`, index * 2 + 1, 2, { threadId: "main" }));
		}
		const report = buildTimelineReport(tests);
		expect(report.hasData).toBe(true);
		expect(vi.mocked(core.warning)).not.toHaveBeenCalled();
	});

	it("places thousands of runs before a retry quickly", () => {
		const tests = Array.from({ length: 40_000 }, (_, index) =>
			makeTest(`t${index}`, index % 3, 1, {
				threadId: "w1",
				retryAttempts: [
					{ attempt: 1, status: "failed", start: T0 + 5, stop: T0 + 6 },
				],
			}),
		);
		const started = performance.now();
		collectTimeline(tests);
		expect(performance.now() - started).toBeLessThan(3000);
	});
});

describe("chart details", () => {
	it("keeps failures visible in very short runs", () => {
		const tests: Test[] = [];
		for (let index = 0; index < 24; index++) {
			tests.push(
				makeTest(`pass ${index}`, index * 9, 8, { threadId: "w1" }),
				...(index % 2 === 0
					? [
							makeTest(`fail ${index}`, index * 9 + 8, 0, {
								threadId: "w1",
								status: "failed" as const,
							}),
						]
					: []),
			);
		}
		const { text } = gantt(tests);
		const failures = text.split("\n").filter((line) => line.includes(":crit,"));
		expect(failures).toHaveLength(12);
		for (const line of failures) {
			expect(line.includes("milestone") || !line.endsWith(", 0ms")).toBe(true);
		}
	});

	it("keeps idle time idle when it merges bars", () => {
		const tests: Test[] = [
			makeTest("warm up cache", 0, 300, { threadId: "w0" }),
			makeTest("late check", 22_000, 300, { threadId: "w0" }),
		];
		for (let worker = 1; worker <= 12; worker++) {
			for (let index = 0; index < 400; index++) {
				tests.push(
					makeTest(`w${worker}-${index}`, index * 56, 55, {
						threadId: `w${worker}`,
						status: index % 12 === 0 ? "failed" : "passed",
					}),
				);
			}
		}
		const [lane] = laneSpans(gantt(tests).text);
		for (const [start, length] of lane) {
			expect(start >= 22_000 || start + length <= 300).toBe(true);
		}
	});

	it("draws a long failure as a bar, also when it has to merge", () => {
		const tests: Test[] = [];
		for (let worker = 1; worker <= 12; worker++) {
			for (let index = 0; index < 400; index++) {
				tests.push(
					makeTest(`w${worker}-${index}`, index * 56, 55, {
						threadId: `w${worker}`,
						status: index % 12 === 0 ? "failed" : "passed",
					}),
				);
			}
		}
		for (let index = 0; index < 20; index++) {
			tests.push(
				makeTest(
					index === 10 ? "payment times out" : `w0-${index}`,
					index * 1100,
					index === 10 ? 1500 : 1000,
					{ threadId: "w0", status: index === 10 ? "failed" : "passed" },
				),
			);
		}
		const { text } = gantt(tests);
		const lane = text.split("\nsection ")[1].split("\n");
		const failure = lane.find((line) => line.includes(":crit,"));
		expect(failure).toMatch(/:crit, 16 00:00:11\.000, 1500ms$/);
	});

	it("does not repaint passes after a long skipped test", () => {
		const tests: Test[] = [
			makeTest("skipped after setup", 0, 180_000, {
				threadId: "w1",
				status: "skipped",
			}),
		];
		for (let index = 0; index < 300; index++) {
			tests.push(
				makeTest(`p${index}`, 180_000 + index * 500, 500, { threadId: "w1" }),
			);
		}
		tests.push(makeTest("long", 0, 330_000, { threadId: "w2" }));
		const { text, kinds } = gantt(tests);
		expect(kinds).toEqual(["passed", "other"]);
		const [lane] = laneSpans(text);
		const lines = text.split("\nsection ")[1].split("\n");
		expect(
			lines.some((line) => /:done, 16 00:00:00\.000, 18\d{4}ms$/.test(line)),
		).toBe(true);
		expect(lane.length).toBeGreaterThan(2);
	});

	it("draws failures that sit close together as slivers, so the passes between stay", () => {
		const tests: Test[] = [];
		for (let index = 0; index < 8; index++) {
			tests.push(
				makeTest(`fail ${index}`, 20_000 + index * 1700, 5, {
					threadId: "w1",
					status: "failed",
				}),
				makeTest(`pass ${index}`, 20_005 + index * 1700, 1695, {
					threadId: "w1",
				}),
			);
		}
		tests.push(makeTest("long", 0, 60_000, { threadId: "w2" }));
		const { text } = gantt(tests);
		expect(text).not.toContain("milestone");
		const passes = laneSpans(text)[0].filter(([, length]) => length > 1000);
		expect(passes).toHaveLength(8);
	});
});

describe("report text", () => {
	it("calls hidden lanes lanes when their threads are drawn", () => {
		const tests = Array.from({ length: 30 }, (_, worker) => [
			makeTest(`class ${worker}`, 0, 14_000, { threadId: `worker-${worker}` }),
			...Array.from({ length: 15 }, (_, index) =>
				makeTest(`t${worker}-${index}`, index * 1000, 1000, {
					threadId: `worker-${worker}`,
				}),
			),
		]).flat();
		const report = buildTimelineReport(tests);
		expect(report.headline).toContain("on **30** threads in **60** lanes");
		expect(report.notes).toContain(
			"20 more lanes with 20 tests are not drawn.",
		);
	});

	it("says the highlight times are UTC for runs of a day or more", () => {
		const report = buildTimelineReport([
			makeTest("soak", 0, 26 * HOUR, { threadId: "w1" }),
			makeTest("quick", 26 * HOUR, 500, { threadId: "w1", status: "failed" }),
		]);
		expect(report.highlights).toContain("at 10-22 10:16:56.500 UTC");
		expect(report.startHeader).toBe("Start (UTC)");
	});

	it("keeps GitHub references, math and emoji codes in table cells as written", () => {
		const report = buildTimelineReport([
			makeTest("GH-123 regression and gh-7", 0, 10, { threadId: "w1" }),
			makeTest("expands $(pwd) and $(ls)", 10, 10, { threadId: "w1" }),
			makeTest("renders :warning: icon", 20, 10, { threadId: "w1" }),
		]);
		expect(report.rows.map((row) => row.name)).toEqual([
			"GH\u2060-123 regression and gh\u2060-7",
			"expands <span>$</span>(pwd) and <span>$</span>(ls)",
			"renders :\u2060warning: icon",
		]);
	});

	it("explains a report whose tests have no times or broken ones", () => {
		const report = buildTimelineReport([
			makeTest("a", undefined, 10),
			{
				name: "b",
				status: "passed",
				duration: Number.NaN,
				start: T0 + 9,
				stop: T0,
			},
		]);
		expect(report.message).toBe(
			"No test in this report has start and stop times that can be placed on a timeline: 1 test has none, and 1 stop before they start or are not plausible dates.",
		);
	});

	it("says the chart is left out to keep the summary small, and leaves out what only the chart shows", () => {
		const tests = [0, 2 * HOUR].flatMap((offset) =>
			Array.from({ length: 100 }, (_, index) =>
				makeTest(`t${index}`, offset + index * 10, 10, {
					threadId: "w1",
					status: index % 2 === 0 ? "failed" : "passed",
					testId: `${offset}-${index}`,
				}),
			),
		);
		const report = buildTimelineReport(tests, { maxDiagramChars: 300 });
		expect(report.mermaid).toBe("");
		expect(report.notes).toContain(
			"The chart would be too large for this summary, so it is left out.",
		);
		expect(report.notes.join(" ")).not.toContain("gray line");
	});

	it("counts the failures among tests whose start times were not measured", () => {
		const tests: Test[] = Array.from({ length: 10 }, (_, index) =>
			makeTest(`w1-${index}`, index * 100, 90, { threadId: "w1" }),
		);
		for (let index = 0; index < 25; index++) {
			tests.push(
				makeTest(`stamped ${index}`, 2000, 10 + index, {
					threadId: "w9",
					status: index < 3 ? "failed" : "passed",
				}),
			);
		}
		const report = buildTimelineReport(tests);
		expect(report.notes[0]).toBe(
			"25 tests on `w9` are not shown (3 of them failed): most tests there that took time start in the same millisecond, so their start times were not measured.",
		);
	});

	it("tells long thread names apart in the tables", () => {
		const base = "integration-tests-runner-node-alpha-0001-shard-";
		const report = buildTimelineReport(
			["west", "east", "north"].map((region, index) =>
				makeTest(`t${index}`, 0, 1000, {
					threadId: `${base}${region}-europe-zone-b-000123-and-more-text`,
				}),
			),
		);
		const names = report.lanes.map((lane) => lane.name);
		expect(new Set(names).size).toBe(3);
		expect(names.every((name) => !name.includes("["))).toBe(true);
	});
});

describe("invariants", () => {
	/** Lanes of [start, length, failure] triples, as offsets from 0:00. */
	function bars(text: string): Array<Array<[number, number, boolean]>> {
		const lanes: Array<Array<[number, number, boolean]>> = [];
		for (const line of text.split("\n")) {
			if (line.startsWith("section ")) {
				lanes.push([]);
				continue;
			}
			const match = line.match(/ (\d\d):(\d\d):(\d\d)\.(\d{3}), (\d+)ms$/);
			if (match && line.startsWith(ZWSP) && !line.includes(":vert,")) {
				const [, h, m, s, ms, length] = match.map(Number);
				lanes[lanes.length - 1].push([
					((h * 60 + m) * 60 + s) * 1000 + ms,
					length,
					/:(crit|active),/.test(line),
				]);
			}
		}
		return lanes;
	}

	it("never draws a pass over a failure wide enough to see", () => {
		const data = collectTimeline(bigRun(0.05, seeded(17)));
		const gantt = renderTimelineGantt(data);
		expect(gantt.approximate).toBe(false);
		const msPerPx = (data.stop - data.start) / 885;
		bars(gantt.text).forEach((lane, index) => {
			for (const failure of data.lanes[index].executions) {
				if (
					failure.kind !== "failed" ||
					failure.stop - failure.start < 2 * msPerPx
				) {
					continue;
				}
				const middle = (failure.start + failure.stop) / 2 - data.start;
				const covering = lane.find(
					([start, length, failed]) =>
						!failed && start < middle && start + length > middle,
				);
				expect(covering).toBeUndefined();
			}
		});
	});

	it("counts a report and a copy with use-suite-name prefixes once", () => {
		const raw = [
			makeTest("opens", 0, 100, { suite: ["Checkout"], threadId: "w1" }),
			makeTest("pays", 100, 100, { suite: ["Checkout"], threadId: "w1" }),
		];
		const prefixed = raw.map((test) => ({
			...test,
			name: `Checkout - Checkout - ${test.name}`,
		}));
		const data = collectTimeline([...raw, ...prefixed]);
		expect(data.tests).toBe(2);
		expect(data.duplicates).toBe(2);
	});
});

describe("numbered bars", () => {
	/** Two forks of 30 tests of 0.2-1.7s: no bar is wide enough for a name. */
	function forks(): Test[] {
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
		return tests;
	}

	/** Numbered bars of the chart: number, lane index, start offset and length. */
	function numbered(text: string) {
		const bars: Array<{
			number: string;
			lane: number;
			start: number;
			length: number;
		}> = [];
		let lane = -1;
		for (const line of text.split("\n")) {
			if (line.startsWith("section ")) {
				lane++;
				continue;
			}
			const match = line.match(
				/^\u200b(\d+) :(?:[a-z]+, )*16 (\d\d):(\d\d):(\d\d)\.(\d{3}), (\d+)ms$/,
			);
			if (match) {
				const [, number, h, m, s, ms, length] = match;
				bars.push({
					number,
					lane,
					start: ((+h * 60 + +m) * 60 + +s) * 1000 + +ms,
					length: +length,
				});
			}
		}
		return bars;
	}

	it("numbers bars too narrow for their name, as rows of the timings table", () => {
		const report = buildTimelineReport(forks());
		expect(report.showNumbers).toBe(true);
		const bars = numbered(report.mermaid);
		expect(bars.length).toBeGreaterThan(30);
		const rows = report.rows.filter((row) => row.number !== "");
		expect(rows.map((row) => row.number)).toEqual(
			bars.map((_, index) => String(index + 1)),
		);
		const laneNames = ["Test worker", "Test worker (2)"];
		for (const bar of bars) {
			const row = rows.find((candidate) => candidate.number === bar.number);
			expect(row?.lane).toBe(laneNames[bar.lane]);
			expect(row?.start).toBe(formatClockForTest(bar.start));
		}
		expect(report.notes).toContain(
			"A number on a bar is the row with that number (#) in the test timings below.",
		);
	});

	it("writes each number only where it fits inside its bar", () => {
		const data = collectTimeline(forks());
		const report = buildTimelineReport(forks());
		const padding = Number(report.mermaid.match(/leftPadding: (\d+)/)?.[1]);
		const msPerPx = (data.stop - data.start) / (1000 - padding - 40);
		for (const bar of numbered(report.mermaid)) {
			expect(textWidth(bar.number)).toBeLessThanOrEqual(
				bar.length / msPerPx - 8,
			);
		}
	});

	it("keeps names where they fit, and numbers neither merged bars nor markers", () => {
		const tests = [
			makeTest("a test with a name that fits easily", 0, 20_000, {
				threadId: "w1",
			}),
			makeTest("narrow", 20_000, 1200, { threadId: "w1" }),
			makeTest("rest one", 21_200, 18_800, { threadId: "w1" }),
			makeTest("fails at once", 40_000, 0, {
				threadId: "w1",
				status: "failed",
			}),
			makeTest("rest two", 41_000, 4000, { threadId: "w1" }),
			...Array.from({ length: 50 }, (_, index) =>
				makeTest(`quick ${index}`, 45_000 + index * 10, 9, { threadId: "w1" }),
			),
			makeTest("rest three", 45_500, 14_500, { threadId: "w1" }),
		];
		const report = buildTimelineReport(tests);
		const lines = taskLines(report.mermaid);
		expect(lines[0]).toMatch(/^\u200ba test with a name that fits easily :/);
		expect(lines).toContain(`${ZWSP}1 :16 00:00:20.000, 1200ms`);
		expect(report.rows.find((row) => row.number === "1")?.name).toBe("narrow");
		expect(lines.find((line) => line.includes("milestone"))).toMatch(
			/^\u200b :crit, milestone, /,
		);
		expect(lines.find((line) => line.includes(":16 00:00:45.000, "))).toMatch(
			/^\u200b :16 00:00:45\.000, \d+ms$/,
		);
		expect(report.rows.filter((row) => row.number !== "")).toHaveLength(1);
	});

	it("numbers only the bars the table has rows for", () => {
		const report = buildTimelineReport(forks(), { maxRows: 5 });
		expect(report.rows).toHaveLength(5);
		expect(numbered(report.mermaid).map((bar) => bar.number)).toEqual([
			"1",
			"2",
			"3",
			"4",
			"5",
		]);
		expect(report.rowsTitle).toBe("Test timings (5 of 60: numbered bars)");
	});

	it("numbers failed bars too", () => {
		const tests = forks().map((test, index) =>
			index === 10 ? { ...test, status: "failed" as const } : test,
		);
		const report = buildTimelineReport(tests);
		const failed = report.rows.find((row) => row.name === "fork0 Test10");
		expect(failed?.number).not.toBe("");
		expect(report.mermaid).toContain(`\n${ZWSP}${failed?.number} :crit, 16 `);
	});

	it("leaves the # column out when no bar needs a number", () => {
		const report = buildTimelineReport([
			makeTest("a long test with its name on the bar", 0, 60_000, {
				threadId: "w1",
			}),
		]);
		expect(report.showNumbers).toBe(false);
		expect(report.rows[0].number).toBe("");
	});

	it("keeps the chart within its budget with the numbers written", () => {
		const tests: Test[] = [];
		for (let lane = 0; lane < 12; lane++) {
			for (let index = 0; index < 30; index++) {
				tests.push(
					makeTest(`lane ${lane} test ${index}`, index * 2000, 1990, {
						threadId: `w${lane}`,
					}),
				);
			}
		}
		for (const maxDiagramChars of [4000, 8000, 12_000, 20_000]) {
			const report = buildTimelineReport(tests, { maxDiagramChars });
			expect(report.mermaid.length).toBeLessThanOrEqual(maxDiagramChars);
		}
		const report = buildTimelineReport(tests);
		expect(numbered(report.mermaid)).toHaveLength(99);
	});
});

function formatClockForTest(offset: number): string {
	const minutes = Math.floor(offset / 60_000);
	const seconds = String(Math.floor(offset / 1000) % 60).padStart(2, "0");
	return `${minutes}:${seconds}.${String(offset % 1000).padStart(3, "0")}`;
}

describe("numbered bars, edge cases", () => {
	it("writes a test's number on one bar only, and none for a test whose name is shown", () => {
		const tests: Test[] = [];
		for (let index = 0; index < 12; index++) {
			const at = index * 3020;
			tests.push(
				makeTest(`fail ${index}`, at, 10, { threadId: "w1", status: "failed" }),
				makeTest(`a test with a long name number ${index}`, at + 10, 3010, {
					threadId: "w1",
				}),
			);
		}
		for (let lane = 2; lane <= 6; lane++) {
			for (let index = 0; index < 40; index++) {
				tests.push(
					makeTest(`l${lane} ${index}`, index * 900, 890, {
						threadId: `w${lane}`,
						status: index % 7 === 3 ? "failed" : "passed",
					}),
				);
			}
		}
		for (const maxDiagramChars of [2500, 3000, 4000, 6000, 20_000]) {
			const report = buildTimelineReport(tests, { maxDiagramChars });
			const numbers = report.mermaid.match(/\n\u200b\d+ :/g) ?? [];
			expect(new Set(numbers).size).toBe(numbers.length);
			const named = new Set(
				[...report.mermaid.matchAll(/\n\u200b([^\n:]+?) :/g)].map((m) => m[1]),
			);
			for (const row of report.rows.filter((row) => row.number !== "")) {
				expect(named.has(row.name)).toBe(false);
			}
		}
	});

	it("ranks only tests whose bars get a number above retried failures and the slowest", () => {
		const tests: Test[] = [];
		for (const threadId of ["w0", "w1"]) {
			for (let index = 0; index < 50; index++) {
				tests.push(
					makeTest(`short test ${threadId}-${index}`, index * 2000, 2000, {
						threadId,
					}),
				);
			}
		}
		for (let index = 0; index < 5; index++) {
			tests.push(
				makeTest(`slow ${index}`, index * 20_000, 19_000, { threadId: "w2" }),
			);
		}
		tests.push(
			makeTest("flaky", 30_000, 10_000, {
				threadId: "w3",
				retryAttempts: [0, 1, 2].map((attempt) => ({
					attempt: attempt + 1,
					status: "failed" as const,
					start: T0 + attempt * 10_000,
					stop: T0 + attempt * 10_000 + 10_000,
				})),
			}),
		);
		const report = buildTimelineReport(tests);
		expect(report.rows.filter((row) => row.number !== "")).toHaveLength(9);
		expect(
			report.rows.filter((row) => row.name.startsWith("slow ")),
		).toHaveLength(5);
		expect(
			report.rows.filter((row) => row.name.includes("(attempt ")),
		).toHaveLength(3);
		expect(report.rowsTitle).toBe(
			"Test timings (100 of 109: numbered bars, retried failures and the slowest)",
		);
	});

	it("quotes a test name made of digits, so it does not read as a number", () => {
		const report = buildTimelineReport([
			makeTest("2", 0, 3000, { threadId: "w0" }),
			makeTest("checkout rejects an expired card", 3000, 300, {
				threadId: "w0",
				status: "failed",
			}),
			makeTest("rest", 3300, 6000, { threadId: "w0" }),
		]);
		expect(report.mermaid).toContain(`\n${ZWSP}"2" :16 00:00:00.000, 3000ms\n`);
	});

	it("does not make the chart coarser to leave room for numbers", () => {
		const tests: Test[] = [];
		for (let lane = 0; lane < 12; lane++) {
			for (let index = 0; index < 20; index++) {
				tests.push(
					makeTest(`lane ${lane} test ${index}`, index * 3000, 2990, {
						threadId: `w${lane}`,
					}),
				);
			}
		}
		const roomy = buildTimelineReport(tests, { maxDiagramChars: 1_000_000 });
		expect(roomy.showNumbers).toBe(true);
		// The same chart without its numbers: the one that has to fit the budget.
		const plain = roomy.mermaid.replace(/\n\u200b\d+ :/g, `\n${ZWSP} :`);
		const tight = buildTimelineReport(tests, { maxDiagramChars: plain.length });
		expect(tight.showNumbers).toBe(false);
		expect(tight.mermaid).toBe(plain);
	});
});
