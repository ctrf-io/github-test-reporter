import type { Test, TestStatus } from "ctrf";
import { normalizeSuite } from "../helpers.js";
import { MinHeap } from "./heap.js";
import {
	TIMELINE_LIMITS,
	type TimelineCut,
	type TimelineData,
	type TimelineExecution,
	type TimelineKind,
	type TimelineLane,
	type TimelineLimits,
} from "./types.js";

// A test may overlap the next by this much (fractional times, rounded) and
// still count as one after the other, but never by more than half its own
// length: very fast tests that overlap are running at the same time. Tests on
// one thread may overlap a little more, since a thread runs one test at a time.
const JITTER_MS = 1;
const THREAD_JITTER_MS = 5;
const SECOND_MS = 1000;
// When this share of the start and stop times fall on whole seconds, and at
// least the second share of durations disagree with them, the report records
// whole seconds only: round times in milliseconds keep their durations.
const WHOLE_SECONDS_SHARE = 0.9;
const MISMATCHED_DURATIONS_SHARE = 0.1;
// A stretch without any test is cut out of the chart when it is longer than
// this and longer than all the test activity in the report.
const MIN_CUT_MS = 5 * 60_000;
// Runs on either side of a cut stay this share of the chart apart.
const CUT_SPACER = 0.03;
// Only the longest stretches are cut when there are more than this.
const MAX_CUTS = 20;
// When this share of a run's results (final results and attempts) belong to
// tests that ran again in a later run, as when a reporter keeps adding to one
// file, the run is history: those results are left out.
const HISTORY_SHARE = 0.9;
// An earlier attempt is tried on this many lanes of its test's thread.
const ATTEMPT_LANES = 4;
// More inferred lanes than this suggests start and stop times that were not
// recorded while the tests ran.
const PLAUSIBLE_INFERRED_LANES = 16;
// When this many tests of one thread (or of the tests without a thread), and
// at least half of them, start in the same millisecond and take time, their
// start times were not measured.
const MIN_TESTS_FOR_SAME_START = 20;
// Epoch milliseconds between 2001 and 2286; anything else is not a test time.
const EARLIEST_MS = 1e12;
const LATEST_MS = 1e13;
// Go names a subtest after its parent: TestParse/empty, TestParse/empty/sub.
const GO_TEST = /^(Test|Benchmark|Fuzz|Example)/;

const STATUSES: readonly TestStatus[] = [
	"passed",
	"failed",
	"skipped",
	"pending",
	"other",
];

const threadOrder = new Intl.Collator("en", {
	numeric: true,
	sensitivity: "base",
});

type Unit = "ms" | "s" | "µs" | "ns";

interface Epoch {
	ms: number;
	unit: Unit;
}

/** Start, stop and duration as the report gives them. */
interface Times {
	from?: Epoch;
	to?: Epoch;
	/** Duration in milliseconds, when it is a number of 0 or more. */
	length?: number;
}

interface Timing {
	start: number;
	stop: number;
	unit: Unit;
}

/** What one test of the report says, before its times are resolved. */
interface Entry {
	base: Pick<
		TimelineExecution,
		"name" | "label" | "testId" | "scope" | "threadId"
	>;
	status: TestStatus;
	times: Times;
	attempts: Array<{ status: TestStatus; times: Times; attempt: number }>;
}

/** How much an execution may overlap the next one in its lane, in milliseconds. */
type Tolerance = (execution: TimelineExecution) => number;

/**
 * Collects the executions of a test run (final results and earlier attempts) and
 * arranges them into lanes that never run two things at once.
 *
 * Lanes are thread IDs (or pytest-xdist workers in `extra.worker`). A thread
 * whose tests overlap in time is split into several lanes. Earlier attempts do
 * not record a thread, so they go on their test's thread where it was free,
 * and in a lane of their own otherwise. Without thread IDs, or with more of
 * them than fit, lanes are inferred by packing executions by start time, which
 * shows how many tests ran at once. If even that needs too many lanes, the
 * lanes with failures and the busiest ones are drawn and the rest are counted.
 *
 * Start and stop times in seconds, microseconds or nanoseconds are converted
 * to milliseconds and results listed twice are counted once. When a report
 * holds several runs, a test's results in earlier runs become earlier attempts
 * (or are left out, for runs that later runs repeated), and the long stretches
 * between runs are cut out of the chart.
 *
 * @param tests - The tests of the CTRF report.
 * @param limits - Limits to apply; defaults to {@link TIMELINE_LIMITS}.
 * @returns The lanes and counts of what could not be drawn.
 */
export function collectTimeline(
	tests: Test[],
	limits: Partial<TimelineLimits> = {},
): TimelineData {
	const { maxLanes } = { ...TIMELINE_LIMITS, ...limits };
	const { entries, coarse } = readTests(tests);
	const counts = {
		untimed: 0,
		untimedFailed: 0,
		untimedAttempts: 0,
		invalid: 0,
		notRun: 0,
	};
	const units = new Set<Unit>();
	let envelopes = 0;
	const collected: TimelineExecution[] = [];

	for (const { base, status, times, attempts: tries } of entries) {
		let timing = resolveTiming(times, coarse);
		const attempts: TimelineExecution[] = [];
		for (const attempt of tries) {
			const ran = attempt.status !== "skipped" && attempt.status !== "pending";
			const attemptTiming = resolveTiming(attempt.times, coarse);
			if (typeof attemptTiming !== "object") {
				counts.untimedAttempts += ran ? 1 : 0;
				continue;
			}
			if (!ran && attemptTiming.stop <= attemptTiming.start) {
				continue;
			}
			units.add(attemptTiming.unit);
			attempts.push({
				...base,
				status: attempt.status,
				kind: kindOf(attempt.status, true),
				start: attemptTiming.start,
				stop: attemptTiming.stop,
				attempt: attempt.attempt,
			});
		}

		// Go's reporter gives a retried test the span of all its attempts and
		// repeats its last attempt as the final one: draw that attempt as the final.
		if (typeof timing === "object" && attempts.length > 0) {
			const final = timing;
			const last = attempts.reduce((a, b) => (b.start > a.start ? b : a));
			if (
				last.status === status &&
				Math.abs(last.stop - final.stop) <= JITTER_MS &&
				final.stop - final.start > last.stop - last.start &&
				attempts.every((a) => a.start >= final.start && a.stop <= final.stop)
			) {
				timing = { ...final, start: last.start, stop: last.stop };
				attempts.splice(attempts.indexOf(last), 1);
				envelopes++;
			}
		}

		// Attempts first: with times in whole seconds, the order of the report
		// is the order of the tests within a second.
		for (const attempt of attempts) {
			collected.push(attempt);
		}
		const notRun = status === "skipped" || status === "pending";
		if (notRun && (typeof timing !== "object" || timing.stop <= timing.start)) {
			counts.notRun++;
		} else if (timing === "invalid") {
			counts.invalid++;
		} else if (timing === undefined) {
			counts.untimed++;
			counts.untimedFailed += status === "failed" ? 1 : 0;
		} else {
			units.add(timing.unit);
			collected.push({
				...base,
				status,
				kind: kindOf(status, false),
				start: timing.start,
				stop: timing.stop,
			});
		}
	}

	const { unique, duplicates } = dropDuplicates(collected);
	const { kept: withoutParents, parents } = dropParentTests(unique);
	const { kept: measured, unmeasured } = dropUnmeasured(withoutParents, coarse);
	const runs = splitRuns(measured);

	let { lanes, inferredLanes, splitThreads, strayAttempts } = arrange(
		runs.kept,
		coarse,
	);
	const threadIds = new Set<string>();
	for (const execution of runs.kept) {
		if (execution.threadId !== undefined) {
			threadIds.add(execution.threadId);
		}
	}
	let tooManyThreads = 0;
	let crowdedThreads = 0;
	const threadLanes = lanes.filter((lane) => lane.origin === "thread").length;
	if (!inferredLanes && threadLanes > maxLanes) {
		const packed = coarse
			? packCoarse(runs.kept)
			: pack(runs.kept, toleranceFor(JITTER_MS));
		if (packed.length <= maxLanes) {
			if (threadIds.size > maxLanes) {
				tooManyThreads = threadIds.size;
			} else {
				crowdedThreads = threadIds.size;
			}
			lanes = packed.map((executions, index) => ({
				name: `Lane ${index + 1}`,
				origin: "inferred",
				executions,
			}));
			inferredLanes = true;
			splitThreads = [];
			strayAttempts = 0;
		}
	}
	const { lanes: cutLanes, cuts } = cutBetweenRuns(lanes);
	const { shown, hidden } = chooseLanes(cutLanes, maxLanes);

	let start = Number.POSITIVE_INFINITY;
	let stop = Number.NEGATIVE_INFINITY;
	let finals = 0;
	let attempts = 0;
	let skippedDrawn = false;
	for (const lane of cutLanes) {
		for (const execution of lane.executions) {
			start = Math.min(start, execution.start);
			stop = Math.max(stop, execution.stop);
			if (execution.attempt === undefined) {
				finals++;
			} else {
				attempts++;
			}
			skippedDrawn ||=
				execution.status === "skipped" || execution.status === "pending";
		}
	}
	const total = finals + attempts;

	return {
		lanes: shown,
		hiddenLanes: hidden,
		start: total > 0 ? start : 0,
		stop: total > 0 ? stop : 0,
		threads: inferredLanes ? 0 : threadIds.size,
		inferredLanes,
		implausibleLanes:
			inferredLanes && cutLanes.length > PLAUSIBLE_INFERRED_LANES,
		tooManyThreads,
		crowdedThreads,
		splitThreads,
		strayAttempts,
		tests: finals,
		attempts,
		skippedDrawn,
		coarse,
		...counts,
		duplicates: duplicates + envelopes,
		parents,
		unmeasured,
		history: runs.history,
		rerun: runs.rerun,
		cuts,
		convertedUnits: [...units].filter((unit) => unit !== "ms"),
	};
}

/**
 * Time a lane spent running tests, without counting overlaps twice.
 *
 * @param executions - The executions of one lane, sorted by start.
 * @returns Busy time in milliseconds.
 */
export function busyTime(executions: TimelineExecution[]): number {
	let busy = 0;
	let lastStop = Number.NEGATIVE_INFINITY;
	for (const execution of executions) {
		const start = Math.max(execution.start, lastStop);
		if (execution.stop > start) {
			busy += execution.stop - start;
		}
		lastStop = Math.max(lastStop, execution.stop);
	}
	return busy;
}

/**
 * Reads what each test says about itself, and whether the report records its
 * times in whole seconds: when nearly all start and stop times fall on a whole
 * second while the durations say otherwise, a test only says in which second
 * it started.
 */
function readTests(tests: Test[]): { entries: Entry[]; coarse: boolean } {
	const entries: Entry[] = [];
	let timestamps = 0;
	let wholeSeconds = 0;
	let durations = 0;
	let mismatched = 0;
	const read = (start: unknown, stop: unknown, duration: unknown): Times => {
		const from = epochMs(start);
		const to = epochMs(stop);
		for (const time of [from, to]) {
			if (time) {
				timestamps++;
				wholeSeconds += time.ms % SECOND_MS === 0 ? 1 : 0;
			}
		}
		const number = toNumber(duration);
		const length = number !== undefined && number >= 0 ? number : undefined;
		if (from && to && length !== undefined) {
			durations++;
			mismatched += Math.abs(to.ms - from.ms - length) > JITTER_MS ? 1 : 0;
		}
		return { from, to, length };
	};
	for (const test of Array.isArray(tests) ? tests : []) {
		if (!test || typeof test !== "object") {
			continue;
		}
		const name = String(test.name ?? "");
		const label = labelOf(test, name);
		const scope = JSON.stringify([
			test.filePath ?? "",
			normalizeSuite(test.suite) ?? "",
		]);
		const attempts: Entry["attempts"] = [];
		if (Array.isArray(test.retryAttempts)) {
			test.retryAttempts.forEach((attempt, index) => {
				if (!attempt || typeof attempt !== "object") {
					return;
				}
				attempts.push({
					status: normalizeStatus(attempt.status),
					times: read(attempt.start, attempt.stop, attempt.duration),
					attempt:
						typeof attempt.attempt === "number" ? attempt.attempt : index + 1,
				});
			});
		}
		entries.push({
			base: {
				name,
				label,
				testId: identityOf(test, label),
				scope,
				threadId: laneKey(test),
			},
			status: normalizeStatus(test.status),
			times: read(test.start, test.stop, test.duration),
			attempts,
		});
	}
	return {
		entries,
		coarse:
			timestamps > 0 &&
			wholeSeconds >= WHOLE_SECONDS_SHARE * timestamps &&
			mismatched > 0 &&
			mismatched >= MISMATCHED_DURATIONS_SHARE * durations,
	};
}

function normalizeStatus(status: unknown): TestStatus {
	return STATUSES.includes(status as TestStatus)
		? (status as TestStatus)
		: "other";
}

function kindOf(status: TestStatus, isAttempt: boolean): TimelineKind {
	if (status === "failed") {
		return isAttempt ? "retry" : "failed";
	}
	return status === "passed" ? "passed" : "other";
}

/** Thread ID, or the pytest-xdist worker that pytest-json-ctrf stores in `extra.worker`. */
function laneKey(test: Test): string | undefined {
	return (
		normalizeThreadId(test.threadId) ??
		normalizeThreadId(
			(test.extra as Record<string, unknown> | undefined)?.worker,
		)
	);
}

function normalizeThreadId(threadId: unknown): string | undefined {
	if (typeof threadId !== "string" && typeof threadId !== "number") {
		return undefined;
	}
	const text = String(threadId).trim();
	return text === "" ? undefined : text;
}

/**
 * Identifies a test across runs and attempts: its ID, or its file, suite and
 * name without the prefix use-suite-name adds, so a report and a copy the
 * action already prefixed still name the same tests.
 */
function identityOf(test: Test, label: string): string {
	const id = test.testId ?? test.id;
	if (typeof id === "string" || typeof id === "number") {
		return String(id);
	}
	return JSON.stringify([
		test.filePath ?? "",
		normalizeSuite(test.suite) ?? "",
		label,
	]);
}

/**
 * The name without the "suite - " or "file - " prefix that use-suite-name puts
 * in front of every test name (once per pass), which would make every label in
 * a lane alike.
 */
function labelOf(test: Test, name: string): string {
	const workspace = process.env.GITHUB_WORKSPACE || "";
	const prefixes = [normalizeSuite(test.suite), test.filePath];
	if (test.filePath && workspace && test.filePath.startsWith(workspace)) {
		prefixes.push(test.filePath.slice(workspace.length));
	}
	let label = name;
	for (let pass = 0; pass < 3; pass++) {
		const prefix = prefixes.find(
			(text) =>
				text &&
				label.startsWith(`${text} - `) &&
				label.length > text.length + 3,
		);
		if (!prefix) {
			break;
		}
		label = label.slice(prefix.length + 3);
	}
	return label;
}

function toNumber(value: unknown): number | undefined {
	if (typeof value === "string" && value.trim() !== "") {
		value = Number(value);
	}
	return typeof value === "number" && Number.isFinite(value)
		? value
		: undefined;
}

/**
 * Reads an epoch timestamp. CTRF uses milliseconds, but some reporters write
 * seconds, microseconds or nanoseconds; the magnitude tells them apart for any
 * date between 2001 and 2286. Anything else (0, -1, a relative clock) is not a
 * usable time.
 */
function epochMs(value: unknown): Epoch | undefined {
	const number = toNumber(value);
	if (number === undefined) {
		return undefined;
	}
	if (number >= 1e12 && number < 1e13) {
		return { ms: number, unit: "ms" };
	}
	if (number >= 1e9 && number < 1e10) {
		return { ms: number * 1e3, unit: "s" };
	}
	if (number >= 1e15 && number < 1e16) {
		return { ms: number / 1e3, unit: "µs" };
	}
	if (number >= 1e18 && number < 1e19) {
		return { ms: number / 1e6, unit: "ns" };
	}
	return undefined;
}

function resolveTiming(
	{ from, to, length }: Times,
	coarse: boolean,
): Timing | "invalid" | undefined {
	let interval: [number, number];
	if (from && to) {
		const wholeSeconds = from.ms % SECOND_MS === 0 && to.ms % SECOND_MS === 0;
		if (
			length !== undefined &&
			(coarse || wholeSeconds || (to.ms === from.ms && length > 0))
		) {
			// A duration beats a stop in whole seconds, and a stop that only
			// repeats the start.
			interval = [from.ms, from.ms + length];
		} else if (to.ms >= from.ms) {
			interval = [from.ms, to.ms];
		} else if (length !== undefined) {
			interval = [from.ms, from.ms + length];
		} else {
			return "invalid";
		}
	} else if (from && length !== undefined) {
		interval = [from.ms, from.ms + length];
	} else if (to && length !== undefined) {
		interval = [to.ms - length, to.ms];
	} else {
		return undefined;
	}
	if (interval[0] < EARLIEST_MS || interval[1] >= LATEST_MS) {
		// A duration so long that the test would start or stop centuries away.
		return "invalid";
	}
	const start = Math.round(interval[0]);
	return {
		start,
		stop: Math.max(start, Math.round(interval[1])),
		unit: (from ?? to)?.unit ?? "ms",
	};
}

/**
 * Drops results listed more than once (the same test, times, thread and
 * status), keeping the final result over an earlier attempt that repeats it.
 * The others keep the order of the report.
 */
function dropDuplicates(executions: TimelineExecution[]): {
	unique: TimelineExecution[];
	duplicates: number;
} {
	const order = executions.map((_, index) => index);
	order.sort((x, y) => {
		const a = executions[x];
		const b = executions[y];
		return (
			a.start - b.start ||
			a.stop - b.stop ||
			compareText(a.threadId ?? "", b.threadId ?? "") ||
			compareText(a.testId, b.testId) ||
			compareText(a.status, b.status) ||
			(a.attempt ?? -1) - (b.attempt ?? -1) ||
			x - y
		);
	});
	const dropped = new Uint8Array(executions.length);
	let kept: TimelineExecution | undefined;
	for (const index of order) {
		const execution = executions[index];
		if (
			kept &&
			kept.start === execution.start &&
			kept.stop === execution.stop &&
			kept.threadId === execution.threadId &&
			kept.testId === execution.testId &&
			kept.status === execution.status
		) {
			dropped[index] = 1;
			continue;
		}
		kept = execution;
	}
	const unique = executions.filter((_, index) => dropped[index] === 0);
	return { unique, duplicates: executions.length - unique.length };
}

function compareText(a: string, b: string): number {
	return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Go reports a result for each parent test (`TestX`), spanning its subtests
 * (`TestX/case`, in the same package). The parent only groups them, so drawing
 * it would show work that ran at the same time as its own subtests. A parent
 * that failed while all its subtests passed failed in its own code, so it is
 * drawn.
 */
function dropParentTests(executions: TimelineExecution[]): {
	kept: TimelineExecution[];
	parents: number;
} {
	const subtests = new Map<string, TimelineExecution[]>();
	for (const execution of executions) {
		const name = execution.label;
		if (!GO_TEST.test(name)) {
			continue;
		}
		// Case names can hold slashes too: TestHandler/GET_/users/{id}.
		for (
			let slash = name.indexOf("/");
			slash > 0;
			slash = name.indexOf("/", slash + 1)
		) {
			const key = parentKey(execution, name.slice(0, slash));
			const list = subtests.get(key);
			if (list) {
				list.push(execution);
			} else {
				subtests.set(key, [execution]);
			}
		}
	}
	if (subtests.size === 0) {
		return { kept: executions, parents: 0 };
	}
	const kept: TimelineExecution[] = [];
	let parents = 0;
	for (const execution of executions) {
		const children = subtests.get(parentKey(execution, execution.label));
		if (children && groupsSubtests(execution, children)) {
			parents += execution.attempt === undefined ? 1 : 0;
		} else {
			kept.push(execution);
		}
	}
	return { kept, parents };
}

function parentKey(execution: TimelineExecution, name: string): string {
	return JSON.stringify([execution.threadId ?? "", execution.scope, name]);
}

/**
 * Whether a parent test only groups its subtests: some ran within it, all of
 * those that overlap it lie inside it, and it did not fail on its own.
 */
function groupsSubtests(
	parent: TimelineExecution,
	children: TimelineExecution[],
): boolean {
	let inside = false;
	let failedInside = false;
	for (const child of children) {
		const overlaps =
			child.stop > child.start
				? child.start < parent.stop && child.stop > parent.start
				: child.start >= parent.start && child.start <= parent.stop;
		if (!overlaps) {
			continue;
		}
		if (child.start < parent.start || child.stop > parent.stop) {
			return false;
		}
		inside = true;
		failedInside ||= child.kind === "failed" || child.kind === "retry";
	}
	return inside && (parent.kind !== "failed" || failedInside);
}

/**
 * Leaves out the tests of a thread (or the tests without a thread) when most
 * of them that took time start in the same millisecond: such start times were
 * written when the report was, not measured. Tests that took no time can
 * share a millisecond, and whole-second times always share one.
 */
function dropUnmeasured(
	executions: TimelineExecution[],
	coarse: boolean,
): {
	kept: TimelineExecution[];
	unmeasured: { tests: number; failed: number; threads: string[] };
} {
	const unmeasured = { tests: 0, failed: 0, threads: [] as string[] };
	if (coarse) {
		return { kept: executions, unmeasured };
	}
	const groups = new Map<string, Map<number, number>>();
	const sizes = new Map<string, number>();
	for (const execution of executions) {
		if (execution.stop - execution.start <= JITTER_MS) {
			continue;
		}
		const key = execution.threadId ?? "";
		let starts = groups.get(key);
		if (!starts) {
			starts = new Map();
			groups.set(key, starts);
		}
		starts.set(execution.start, (starts.get(execution.start) ?? 0) + 1);
		sizes.set(key, (sizes.get(key) ?? 0) + 1);
	}
	const flagged = new Set<string>();
	for (const [key, starts] of groups) {
		const size = sizes.get(key) ?? 0;
		for (const same of starts.values()) {
			if (same >= MIN_TESTS_FOR_SAME_START && same * 2 >= size) {
				flagged.add(key);
				break;
			}
		}
	}
	if (flagged.size === 0) {
		return { kept: executions, unmeasured };
	}
	const kept: TimelineExecution[] = [];
	for (const execution of executions) {
		if (!flagged.has(execution.threadId ?? "")) {
			kept.push(execution);
		} else if (execution.attempt === undefined) {
			unmeasured.tests++;
			unmeasured.failed += execution.kind === "failed" ? 1 : 0;
		}
	}
	unmeasured.threads = [...flagged].sort(threadOrder.compare);
	return { kept, unmeasured };
}

/**
 * Finds runs in one report: activity separated by a stretch without tests
 * longer than five minutes and longer than all the test activity together,
 * and marks each execution with its run. A test with a final result in a later
 * run ran again, so its earlier final results become earlier attempts; in a
 * run made almost only of such results and their attempts (a reporter that
 * keeps adding to one file), those are left out as history, and the run's
 * other results stay.
 */
function splitRuns(executions: TimelineExecution[]): {
	kept: TimelineExecution[];
	history: number;
	rerun: number;
} {
	const sorted = [...executions].sort((a, b) => a.start - b.start);
	const stretches: Array<{ start: number; stop: number; first: number }> = [];
	sorted.forEach((execution, index) => {
		const last = stretches[stretches.length - 1];
		if (last && execution.start <= last.stop) {
			last.stop = Math.max(last.stop, execution.stop);
		} else {
			stretches.push({
				start: execution.start,
				stop: execution.stop,
				first: index,
			});
		}
	});
	let active = 0;
	for (const stretch of stretches) {
		active += stretch.stop - stretch.start;
	}
	// Index of the first execution of each run.
	const runStarts: number[] = [];
	let runStop = Number.NEGATIVE_INFINITY;
	for (const stretch of stretches) {
		const gap = stretch.start - runStop;
		if (runStarts.length === 0 || (gap > MIN_CUT_MS && gap > active)) {
			runStarts.push(stretch.first);
		}
		runStop = Math.max(runStop, stretch.stop);
	}
	if (runStarts.length < 2) {
		return { kept: sorted, history: 0, rerun: 0 };
	}
	const runOf = new Int32Array(sorted.length);
	for (let run = 0; run < runStarts.length; run++) {
		const end = runStarts[run + 1] ?? sorted.length;
		runOf.fill(run, runStarts[run], end);
	}

	const lastRun = new Map<string, number>();
	sorted.forEach((execution, index) => {
		if (execution.attempt === undefined) {
			lastRun.set(execution.testId, runOf[index]);
		}
	});
	const results = new Array<number>(runStarts.length).fill(0);
	const superseded = new Array<number>(runStarts.length).fill(0);
	sorted.forEach((execution, index) => {
		const run = runOf[index];
		results[run]++;
		superseded[run] += (lastRun.get(execution.testId) ?? run) > run ? 1 : 0;
	});

	const kept: TimelineExecution[] = [];
	let history = 0;
	let rerun = 0;
	sorted.forEach((execution, index) => {
		const run = runOf[index];
		const later = (lastRun.get(execution.testId) ?? run) > run;
		if (later && superseded[run] >= HISTORY_SHARE * results[run]) {
			history++;
			return;
		}
		if (later && execution.attempt === undefined) {
			rerun++;
			kept.push({
				...execution,
				attempt: 0,
				kind: execution.kind === "failed" ? "retry" : execution.kind,
				run,
			});
			return;
		}
		kept.push({ ...execution, run });
	});
	return { kept, history, rerun };
}

/**
 * Cuts the stretches between runs out of the chart's clock, leaving a spacer
 * of a few percent of the runs' length, and records where they were. The runs
 * are measured as drawn, after whole-second times were laid out.
 */
function cutBetweenRuns(lanes: TimelineLane[]): {
	lanes: TimelineLane[];
	cuts: TimelineCut[];
} {
	const extents = new Map<number, { start: number; stop: number }>();
	for (const lane of lanes) {
		for (const execution of lane.executions) {
			if (execution.run === undefined) {
				continue;
			}
			const extent = extents.get(execution.run);
			if (extent) {
				extent.start = Math.min(extent.start, execution.start);
				extent.stop = Math.max(extent.stop, execution.stop);
			} else {
				extents.set(execution.run, {
					start: execution.start,
					stop: execution.stop,
				});
			}
		}
	}
	if (extents.size < 2) {
		return { lanes, cuts: [] };
	}
	const runs = [...extents.entries()].sort((a, b) => a[1].start - b[1].start);
	let active = 0;
	for (const [, extent] of runs) {
		active += extent.stop - extent.start;
	}
	const spacer = Math.max(1, Math.round(active * CUT_SPACER));
	const gaps: Array<{ index: number; from: number; to: number }> = [];
	let stop = runs[0][1].stop;
	for (let index = 1; index < runs.length; index++) {
		const { start } = runs[index][1];
		if (start - stop > spacer) {
			gaps.push({ index, from: stop, to: start });
		}
		stop = Math.max(stop, runs[index][1].stop);
	}
	const chosen = gaps
		.sort((a, b) => b.to - b.from - (a.to - a.from) || a.index - b.index)
		.slice(0, MAX_CUTS)
		.sort((a, b) => a.index - b.index);
	if (chosen.length === 0) {
		return { lanes, cuts: [] };
	}
	const cuts: TimelineCut[] = [];
	const shiftOf = new Map<number, number>();
	let shift = 0;
	let next = 0;
	runs.forEach(([run], index) => {
		if (chosen[next]?.index === index) {
			const { from, to } = chosen[next];
			cuts.push({
				at: from - shift + spacer / 2,
				length: to - from,
				removed: to - from - spacer,
			});
			shift += to - from - spacer;
			next++;
		}
		shiftOf.set(run, shift);
	});
	return {
		lanes: lanes.map((lane) => ({
			...lane,
			executions: lane.executions.map((execution) => {
				const by =
					execution.run === undefined ? 0 : (shiftOf.get(execution.run) ?? 0);
				return by === 0
					? execution
					: {
							...execution,
							start: execution.start - by,
							stop: execution.stop - by,
						};
			}),
		})),
		cuts,
	};
}

/**
 * Puts final results in lanes by thread, then each earlier attempt on its
 * test's thread where that thread was free, and the attempts that would
 * overlap another test there in lanes of their own. With times in whole
 * seconds, a thread's attempts are laid out with its other tests.
 */
function arrange(
	executions: TimelineExecution[],
	coarse: boolean,
): {
	lanes: TimelineLane[];
	inferredLanes: boolean;
	splitThreads: Array<{ threadId: string; lanes: number }>;
	strayAttempts: number;
} {
	const tolerance = toleranceFor(JITTER_MS);
	const packAll = (list: TimelineExecution[]) =>
		coarse ? packCoarse(list) : pack(list, tolerance);
	if (executions.every((e) => e.threadId === undefined)) {
		return {
			lanes: packAll(executions).map((laneExecutions, index) => ({
				name: `Lane ${index + 1}`,
				origin: "inferred",
				executions: laneExecutions,
			})),
			inferredLanes: true,
			splitThreads: [],
			strayAttempts: 0,
		};
	}

	interface Group {
		all: TimelineExecution[];
		finals: TimelineExecution[];
		attempts: TimelineExecution[];
	}
	const groups = new Map<string, Group>();
	const unthreaded: TimelineExecution[] = [];
	for (const execution of executions) {
		if (execution.threadId === undefined) {
			unthreaded.push(execution);
			continue;
		}
		let group = groups.get(execution.threadId);
		if (!group) {
			group = { all: [], finals: [], attempts: [] };
			groups.set(execution.threadId, group);
		}
		group.all.push(execution);
		(execution.attempt === undefined ? group.finals : group.attempts).push(
			execution,
		);
	}

	const threadTolerance = toleranceFor(THREAD_JITTER_MS);
	const lanes: TimelineLane[] = [];
	const splitThreads: Array<{ threadId: string; lanes: number }> = [];
	const stray: TimelineExecution[] = [];
	const threadIds = [...groups.keys()].sort(threadOrder.compare);
	for (const threadId of threadIds) {
		const { all, finals, attempts } = groups.get(threadId) as Group;
		let threadLanes: TimelineExecution[][];
		if (coarse) {
			threadLanes = packCoarse(all);
		} else if (finals.length === 0) {
			threadLanes = pack(attempts, threadTolerance);
		} else {
			threadLanes = pack(finals, threadTolerance);
			for (const attempt of placeAttempts(
				threadLanes,
				attempts,
				threadTolerance,
			)) {
				stray.push(attempt);
			}
		}
		if (threadLanes.length > 1) {
			splitThreads.push({ threadId, lanes: threadLanes.length });
		}
		threadLanes.forEach((laneExecutions, index) => {
			lanes.push({
				name: index === 0 ? threadId : `${threadId} (${index + 1})`,
				origin: "thread",
				executions: laneExecutions,
			});
		});
	}
	packAll(unthreaded).forEach((laneExecutions, index) => {
		lanes.push({
			name: index === 0 ? "No thread ID" : `No thread ID (${index + 1})`,
			origin: "unthreaded",
			executions: laneExecutions,
		});
	});
	pack(stray, tolerance).forEach((laneExecutions, index) => {
		lanes.push({
			name:
				index === 0
					? "Runs before a retry"
					: `Runs before a retry (${index + 1})`,
			origin: "attempts",
			executions: laneExecutions,
		});
	});
	return {
		lanes,
		inferredLanes: false,
		splitThreads,
		strayAttempts: stray.length,
	};
}

/**
 * Puts each earlier attempt into the first of a thread's lanes where nothing
 * overlaps it, trying a few lanes only, and returns the attempts that fit
 * nowhere. The lanes stay sorted by start.
 */
function placeAttempts(
	lanes: TimelineExecution[][],
	attempts: TimelineExecution[],
	tolerance: Tolerance,
): TimelineExecution[] {
	const tried = Math.min(lanes.length, ATTEMPT_LANES);
	const placed: TimelineExecution[][] = lanes.slice(0, tried).map(() => []);
	const stray: TimelineExecution[] = [];
	for (const attempt of [...attempts].sort(byStart)) {
		let fits = false;
		for (let index = 0; index < tried && !fits; index++) {
			const lane = lanes[index];
			const before = placed[index][placed[index].length - 1];
			let low = 0;
			let high = lane.length;
			while (low < high) {
				const middle = (low + high) >> 1;
				if (byStart(lane[middle], attempt) <= 0) {
					low = middle + 1;
				} else {
					high = middle;
				}
			}
			const previous = lane[low - 1];
			const next = lane[low];
			fits =
				!(previous && previous.stop - tolerance(previous) > attempt.start) &&
				!(next && attempt.stop - tolerance(attempt) > next.start) &&
				!(before && before.stop - tolerance(before) > attempt.start);
			if (fits) {
				placed[index].push(attempt);
			}
		}
		if (!fits) {
			stray.push(attempt);
		}
	}
	placed.forEach((extra, index) => {
		if (extra.length > 0) {
			lanes[index] = mergeByStart(lanes[index], extra);
		}
	});
	return stray;
}

function mergeByStart(
	a: TimelineExecution[],
	b: TimelineExecution[],
): TimelineExecution[] {
	const merged: TimelineExecution[] = [];
	let i = 0;
	let j = 0;
	while (i < a.length || j < b.length) {
		if (j >= b.length || (i < a.length && byStart(a[i], b[j]) <= 0)) {
			merged.push(a[i++]);
		} else {
			merged.push(b[j++]);
		}
	}
	return merged;
}

/**
 * Picks the lanes to draw when there are more than fit: lanes with failures
 * first, then the busiest, shown in their usual order.
 */
function chooseLanes(
	lanes: TimelineLane[],
	maxLanes: number,
): { shown: TimelineLane[]; hidden: TimelineLane[] } {
	if (lanes.length <= maxLanes) {
		return { shown: lanes, hidden: [] };
	}
	const ranked = lanes
		.map((lane, index) => ({
			index,
			failed: lane.executions.filter((e) => e.kind === "failed").length,
			busy: busyTime(lane.executions),
		}))
		.sort(
			(a, b) => b.failed - a.failed || b.busy - a.busy || a.index - b.index,
		);
	const keep = new Set(ranked.slice(0, maxLanes).map((lane) => lane.index));
	return {
		shown: lanes.filter((_, index) => keep.has(index)),
		hidden: lanes.filter((_, index) => !keep.has(index)),
	};
}

/** How much an execution may overlap the next one in its lane. */
function toleranceFor(most: number): Tolerance {
	return (execution) =>
		Math.min(most, Math.floor((execution.stop - execution.start) / 2));
}

/**
 * Packs executions into as few lanes as possible. Each goes to the free lane
 * whose last test ended latest, which keeps a worker's tests together better
 * than taking the first free lane, so lanes resemble the workers that ran them.
 * A lane is free from the time its tests stop, less the overlap they allow,
 * so a lane once free stays free for every later start.
 */
function pack(
	executions: TimelineExecution[],
	tolerance: Tolerance,
): TimelineExecution[][] {
	const lanes: TimelineExecution[][] = [];
	const ends: number[] = [];
	const freeFrom: number[] = [];
	const busy = new MinHeap<number>(
		(a, b) =>
			freeFrom[a] < freeFrom[b] || (freeFrom[a] === freeFrom[b] && a < b),
	);
	const free = new MinHeap<number>(
		(a, b) => ends[a] > ends[b] || (ends[a] === ends[b] && a < b),
	);
	for (const execution of [...executions].sort(byStart)) {
		while (
			busy.size > 0 &&
			freeFrom[busy.peek() as number] <= execution.start
		) {
			free.push(busy.pop() as number);
		}
		let lane = free.pop();
		if (lane === undefined) {
			lane = lanes.length;
			lanes.push([]);
			ends.push(execution.stop);
			freeFrom.push(Number.NEGATIVE_INFINITY);
		}
		lanes[lane].push(execution);
		ends[lane] = Math.max(ends[lane], execution.stop);
		freeFrom[lane] = Math.max(
			freeFrom[lane],
			execution.stop - tolerance(execution),
		);
		busy.push(lane);
	}
	return lanes;
}

/**
 * Packs executions whose times are in whole seconds and lays each lane out
 * one test after another. A time in whole seconds only says in which second a
 * test started, so a test fits a lane whose tests, laid out, end before that
 * second is over, and starts where they end, in the order of the report. A
 * lane already free when the second starts is best, the one free last of
 * those; otherwise the one free first, so the test starts as early as it can.
 */
function packCoarse(executions: TimelineExecution[]): TimelineExecution[][] {
	const lanes: TimelineExecution[][] = [];
	const ends: number[] = [];
	const busy = new MinHeap<number>(
		(a, b) => ends[a] < ends[b] || (ends[a] === ends[b] && a < b),
	);
	const free = new MinHeap<number>(
		(a, b) => ends[a] > ends[b] || (ends[a] === ends[b] && a < b),
	);
	for (const execution of [...executions].sort((a, b) => a.start - b.start)) {
		while (busy.size > 0 && ends[busy.peek() as number] <= execution.start) {
			free.push(busy.pop() as number);
		}
		let lane = free.pop();
		if (
			lane === undefined &&
			busy.size > 0 &&
			ends[busy.peek() as number] <= execution.start + SECOND_MS
		) {
			lane = busy.pop();
		}
		if (lane === undefined) {
			lane = lanes.length;
			lanes.push([]);
			ends.push(Number.NEGATIVE_INFINITY);
		}
		const start = Math.max(execution.start, ends[lane]);
		const stop = start + (execution.stop - execution.start);
		lanes[lane].push({ ...execution, start, stop });
		ends[lane] = stop;
		busy.push(lane);
	}
	return lanes;
}

function byStart(a: TimelineExecution, b: TimelineExecution): number {
	return a.start - b.start || a.stop - b.stop;
}
