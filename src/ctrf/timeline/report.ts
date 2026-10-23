import * as core from "@actions/core";
import type { Test } from "ctrf";
import { getEmoji } from "../helpers.js";
import { busyTime, collectTimeline } from "./collect.js";
import { elapsedClock, renderTimelineGantt } from "./gantt.js";
import { MinHeap } from "./heap.js";
import {
	attemptName,
	codeSpan,
	count,
	distinctNames,
	escapeCell,
	formatClock,
	formatDuration,
	isAre,
	oneLine,
	percent,
	plural,
	shorten,
} from "./text.js";
import {
	type NumberCandidate,
	TIMELINE_LIMITS,
	type TimelineData,
	type TimelineExecution,
	type TimelineGantt,
	type TimelineKind,
	type TimelineLane,
	type TimelineLaneRow,
	type TimelineLimits,
	type TimelineReport,
	type TimelineRow,
} from "./types.js";

// The timings table stops growing at this size, so the section stays well
// inside a pull request comment (65,536 characters in all).
const MAX_TABLE_CHARS = 10_000;
// Longest test name in the tables, and lane name anywhere, in characters.
const MAX_NAME_CHARS = 120;
const MAX_LANE_CHARS = 60;
// Longest test name in the highlights.
const MAX_HIGHLIGHT_CHARS = 80;
// Threads a note names before it counts the rest.
const NAMED_THREADS = 3;
// A chart too large to draw is tried with half the lanes, down to this many.
const MIN_LANES = 5;

const KIND_LEGEND: Record<TimelineKind, string> = {
	passed: "🟩 passed",
	failed: "🟥 failed",
	retry: "🟨 failed, then retried (dashed)",
	other: "⬜ other",
};

const NO_TIMING =
	"No test in this report has start and stop times, so there is no timeline. Reporters that record <code>start</code> and <code>stop</code> for each test (and <code>threadId</code> for parallel workers) enable this report.";

/**
 * Builds everything the timeline report shows: headline, highlights, chart,
 * legend, notes, per-lane table and the test timings table. Never throws: if
 * the report data cannot be laid out, it explains that instead.
 *
 * @param tests - The tests of the CTRF report.
 * @param limits - Limits to apply; defaults to {@link TIMELINE_LIMITS}.
 * @returns The timeline report view.
 */
export function buildTimelineReport(
	tests: Test[],
	limits: Partial<TimelineLimits> = {},
): TimelineReport {
	try {
		return timelineReport(tests, limits);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		core.warning(`Timeline report could not be built: ${message}`);
		return emptyReport(
			"The timeline could not be drawn from this report; see the warning in the job log.",
		);
	}
}

function timelineReport(
	tests: Test[],
	limits: Partial<TimelineLimits>,
): TimelineReport {
	const { maxLanes } = { ...TIMELINE_LIMITS, ...limits };
	let data = collectTimeline(tests, limits);
	const total = data.tests + data.attempts;
	if (total === 0) {
		return emptyReport(emptyMessage(data));
	}
	if (data.stop === data.start) {
		const untimed =
			data.untimed > 0
				? ` ${count(data.untimed, "other test")} without start and stop times ${isAre(data.untimed)} not shown.`
				: "";
		return emptyReport(
			`${total === 1 ? "The only test with start and stop times" : "Every test with start and stop times"} started and finished within the same millisecond, so there is no timeline.${untimed}`,
		);
	}

	let view = drawTimeline(data, limits);
	// A chart too large to draw shows fewer lanes: those with failures and the
	// busiest, drawn as exactly as before.
	for (
		let lanes = Math.floor(Math.min(maxLanes, data.lanes.length) / 2);
		view.gantt.text === "" && lanes >= MIN_LANES;
		lanes = Math.floor(lanes / 2)
	) {
		const fewer = collectTimeline(tests, { ...limits, maxLanes: lanes });
		const drawn = drawTimeline(fewer, limits);
		if (drawn.gantt.text !== "") {
			data = fewer;
			view = drawn;
		}
	}
	const { active, allLanes, laneNames, slowest, last, clock, where, until } =
		view;
	const { gantt, timings } = view;

	const headline = [
		`**${data.tests}** ${plural(data.tests, "test")}`,
		data.attempts > 0
			? ` (and **${data.attempts}** ${plural(data.attempts, "run")} before a retry)`
			: "",
		` on ${laneSummary(data, (value) => `**${value}**`)}`,
		` in **${formatDuration(active)}**`,
		` · busy **${percent(busyShare(allLanes, active))}** of the time`,
		allLanes.length > 1
			? ` · up to **${peakConcurrency(allLanes)}** at once`
			: "",
	].join("");

	const name = ({ execution }: Placed) =>
		codeSpan(
			shorten(
				attemptName(execution.label, execution.attempt),
				MAX_HIGHLIGHT_CHARS,
			),
		);
	let highlights = "";
	if (last && total > 1) {
		highlights =
			slowest?.execution === last.execution
				? `Slowest and last to finish: ${name(last)} (${formatDuration(length(last.execution))}${where(last, codeSpan)}, until ${until(last)})`
				: [
						slowest
							? `Slowest: ${name(slowest)} (${formatDuration(length(slowest.execution))}${where(slowest, codeSpan)})`
							: "",
						`Last to finish: ${name(last)} at ${until(last)}${where(last, codeSpan)}`,
					]
						.filter(Boolean)
						.join(" · ");
	}

	const legend = [
		...gantt.kinds.map((kind) =>
			kind === "other" && data.skippedDrawn
				? "⬜ skipped or other"
				: KIND_LEGEND[kind],
		),
		...(gantt.diamonds ? ["♦️ failed too fast for a bar"] : []),
		clock.dates
			? "times on the axis are in your time zone"
			: `0:00 = ${new Date(data.start).toISOString().slice(0, 23).replace("T", " ")} UTC`,
	].join(" · ");

	const lanes: TimelineLaneRow[] = data.lanes.map((lane, index) => {
		const finals = lane.executions.filter((e) => e.attempt === undefined);
		const busy = busyTime(lane.executions);
		return {
			name: cell(laneNames[index], MAX_LANE_CHARS),
			tests: finals.length,
			retries: lane.executions.length - finals.length,
			failed: finals.filter((e) => e.kind === "failed").length,
			busy: formatDuration(busy),
			idle: formatDuration(Math.max(0, active - busy)),
			utilization: percent(busy / active),
		};
	});

	return {
		hasData: true,
		message: "",
		headline,
		highlights,
		mermaid: gantt.text,
		legend,
		notes: notes(data, gantt, timings),
		laneHeader: data.inferredLanes ? "Lane" : "Thread",
		showLanes: data.lanes.length > 1,
		showRetries: data.attempts > 0,
		lanes,
		showNumbers: timings.numbers.size > 0,
		startHeader: clock.dates ? "Start (UTC)" : "Start",
		rowsTitle: timings.title,
		rows: timings.rows,
	};
}

interface Drawn {
	gantt: TimelineGantt;
	/** The timings table, with the numbers written on bars. */
	timings: Timings;
	/** The time tests could run: the chart's clock less the spacers left at cuts. */
	active: number;
	allLanes: TimelineLane[];
	laneNames: string[];
	slowest?: Placed;
	last?: Placed;
	clock: TableClock;
	/** " on `thread`" for an execution on a thread lane, written with `write`. */
	where: (placed: Placed, write: (name: string) => string) => string;
	/** When an execution finished, as the tables write it. */
	until: (placed: Placed) => string;
}

/** Draws the chart, with what it says about the run for screen readers. */
function drawTimeline(
	data: TimelineData,
	limits: Partial<TimelineLimits>,
): Drawn {
	const { maxRows } = { ...TIMELINE_LIMITS, ...limits };
	let active = data.stop - data.start;
	for (const cut of data.cuts) {
		active -= cut.length - cut.removed;
	}
	active = Math.max(1, active);
	const allLanes = [...data.lanes, ...data.hiddenLanes];
	const laneNames = tableLaneNames(allLanes);
	let failed = 0;
	for (const lane of allLanes) {
		for (const execution of lane.executions) {
			failed += execution.kind === "failed" ? 1 : 0;
		}
	}
	const { slowest, last } = standouts(allLanes);
	const clock = tableClock(data);
	const where = ({ lane }: Placed, write: (name: string) => string) =>
		allLanes[lane].origin === "thread" ? ` on ${write(laneNames[lane])}` : "";
	const until = (placed: Placed) =>
		`${clock.format(clock.real(placed.execution.stop))}${clock.dates ? " UTC" : ""}`;
	const rows = (candidates: NumberCandidate[], room: number) =>
		timingRows(allLanes, laneNames, {
			maxRows,
			shownLanes: data.lanes.length,
			clock,
			candidates,
			room,
		});
	// The chart offers bars too narrow for their test's name; those whose test
	// has a row in the timings table carry that row's number.
	let timings: Timings | undefined;
	const gantt = renderTimelineGantt(
		data,
		limits,
		[
			`${testsAndAttempts(data.tests, data.attempts)} on ${laneSummary(data, String)} over ${formatDuration(active)}, ${failed} failed.`,
			slowest
				? `The slowest test is ${shorten(slowest.execution.label, MAX_HIGHLIGHT_CHARS)} (${formatDuration(length(slowest.execution))}${where(slowest, String)}).`
				: "",
			last
				? `The last to finish is ${shorten(attemptName(last.execution.label, last.execution.attempt), MAX_HIGHLIGHT_CHARS)}${where(last, String)}, at ${until(last)}.`
				: "",
		]
			.filter(Boolean)
			.join(" "),
		(candidates, room) => {
			timings = rows(candidates, room);
			return timings.numbers;
		},
	);
	return {
		gantt,
		timings: timings ?? rows([], 0),
		active,
		allLanes,
		laneNames,
		slowest,
		last,
		clock,
		where,
		until,
	};
}

function emptyReport(message: string): TimelineReport {
	return {
		hasData: false,
		message,
		headline: "",
		highlights: "",
		mermaid: "",
		legend: "",
		notes: [],
		laneHeader: "Thread",
		showLanes: false,
		showRetries: false,
		lanes: [],
		showNumbers: false,
		startHeader: "Start",
		rowsTitle: "",
		rows: [],
	};
}

function emptyMessage(data: TimelineData): string {
	if (data.unmeasured.tests > 0) {
		return `Most of the ${count(data.unmeasured.tests, "test")} with start and stop times start in the same millisecond, so their start times were not measured and there is no timeline.`;
	}
	if (data.untimed > 0 && data.invalid > 0) {
		return `No test in this report has start and stop times that can be placed on a timeline: ${count(data.untimed, "test")} ${data.untimed === 1 ? "has" : "have"} none, and ${data.invalid} stop before they start or are not plausible dates.`;
	}
	if (data.untimed > 0) {
		return NO_TIMING;
	}
	if (data.invalid > 0) {
		return "No test in this report has start and stop times that can be placed on a timeline: they stop before they start, or are not plausible dates.";
	}
	return "No test ran, so there is no timeline.";
}

/** Where an execution is on the tables' clock, and how to write a time there. */
interface TableClock {
	/** Real time of a chart time, putting back the stretches cut out of the chart. */
	real: (time: number) => number;
	/** A real time as the tables write it. */
	format: (time: number) => string;
	/** True when times are written as dates in UTC, for runs of a day or more. */
	dates: boolean;
}

function tableClock(data: TimelineData): TableClock {
	const real = (time: number) => {
		let shift = 0;
		for (const cut of data.cuts) {
			if (cut.at <= time) {
				shift += cut.removed;
			}
		}
		return time + shift;
	};
	const span = real(data.stop) - data.start;
	const elapsed = elapsedClock(data);
	return {
		real,
		format: elapsed
			? (time) => formatClock(time - data.start, span)
			: (time) => new Date(time).toISOString().slice(5, 23).replace("T", " "),
		dates: !elapsed,
	};
}

/**
 * The lanes as the tables and notes name them: the real thread name on one
 * line, shortened in the middle, and unique.
 */
function tableLaneNames(lanes: TimelineLane[]): string[] {
	return distinctNames(
		lanes.map((lane) => oneLine(lane.name) || "(unnamed)"),
		(name, tail) => shorten(name, MAX_LANE_CHARS, tail),
	);
}

/**
 * What the lanes are, such as "4 threads", "1 thread in 2 lanes and 1 more
 * lane" or "3 lanes".
 */
function laneSummary(
	data: TimelineData,
	strong: (value: number) => string,
): string {
	const lanes = [...data.lanes, ...data.hiddenLanes];
	if (data.inferredLanes) {
		return `${strong(lanes.length)} ${plural(lanes.length, "lane")}`;
	}
	const threadLanes = lanes.filter((lane) => lane.origin === "thread").length;
	const more = lanes.length - threadLanes;
	return [
		`${strong(data.threads)} ${plural(data.threads, "thread")}`,
		threadLanes > data.threads ? ` in ${strong(threadLanes)} lanes` : "",
		more > 0 ? ` and ${strong(more)} more ${plural(more, "lane")}` : "",
	].join("");
}

/**
 * Share of the time the workers were busy: each thread (however many lanes
 * its tests needed) or lane of tests without a thread ID, but not the lanes
 * of runs before a retry that overlap their thread.
 */
function busyShare(lanes: TimelineLane[], active: number): number {
	let busy = 0;
	let workers = 0;
	const threads = new Map<string, TimelineExecution[]>();
	for (const lane of lanes) {
		if (lane.origin === "thread") {
			const threadId = lane.executions[0]?.threadId ?? lane.name;
			let executions = threads.get(threadId);
			if (!executions) {
				executions = [];
				threads.set(threadId, executions);
			}
			for (const execution of lane.executions) {
				executions.push(execution);
			}
		} else if (lane.origin !== "attempts") {
			busy += busyTime(lane.executions);
			workers++;
		}
	}
	for (const executions of threads.values()) {
		busy += busyTime(
			executions.sort((a, b) => a.start - b.start || a.stop - b.stop),
		);
		workers++;
	}
	return workers > 0 ? busy / workers / active : 0;
}

interface Placed {
	execution: TimelineExecution;
	lane: number;
}

/** The slowest test and the execution that finished last. */
function standouts(lanes: TimelineLane[]): {
	slowest?: Placed;
	last?: Placed;
} {
	let slowest: Placed | undefined;
	let last: Placed | undefined;
	lanes.forEach((lane, index) => {
		for (const execution of lane.executions) {
			if (
				execution.attempt === undefined &&
				(!slowest || length(execution) > length(slowest.execution))
			) {
				slowest = { execution, lane: index };
			}
			if (!last || execution.stop > last.execution.stop) {
				last = { execution, lane: index };
			}
		}
	});
	return { slowest, last };
}

interface Timings {
	rows: TimelineRow[];
	title: string;
	/** Failures in lanes that are not drawn, and how many of them are rows. */
	hiddenFailures: { total: number; listed: number };
	/** Numbers to write on bars too narrow for their test's name. */
	numbers: Map<TimelineExecution, number>;
}

/**
 * Rows for the test timings table, grouped by lane in chart order, then by
 * start. When there are more than fit, failures in lanes that are not drawn
 * come first, then other failures, then tests whose bars can carry a number
 * instead of their name, then retried failures, then the slowest. Those bars
 * get numbers that count up the table, so the table is the chart's key; a bar
 * gets one only if the number fits on it and in the chart's `room`.
 */
function timingRows(
	lanes: TimelineLane[],
	laneNames: string[],
	options: {
		maxRows: number;
		shownLanes: number;
		clock: TableClock;
		candidates: NumberCandidate[];
		/** Characters the chart has left for numbers. */
		room: number;
	},
): Timings {
	const digitsOf = new Map<TimelineExecution, number>();
	for (const { execution, digits } of options.candidates) {
		digitsOf.set(execution, digits);
	}
	// Number the candidates in table order to learn which can carry a number:
	// later rows have longer numbers, which may not fit on their bars. Only
	// those rank above retried failures and the slowest.
	const numberable = new Set<TimelineExecution>();
	let written = 0;
	for (const { execution } of [...options.candidates].sort(
		(a, b) =>
			a.lane - b.lane ||
			a.execution.start - b.execution.start ||
			a.execution.stop - b.execution.stop,
	)) {
		const number = String(numberable.size + 1);
		if (
			numberable.size < options.maxRows &&
			number.length <= (digitsOf.get(execution) ?? 0) &&
			written + number.length <= options.room
		) {
			numberable.add(execution);
			written += number.length;
		}
	}
	const priority = ({ execution, lane }: Placed) => {
		if (execution.kind === "failed") {
			return lane >= options.shownLanes ? -1 : 0;
		}
		if (numberable.has(execution)) {
			return 0.5;
		}
		return execution.kind === "retry" ? 1 : 2;
	};
	// Keep the best rows in a heap whose top is the least important one.
	const worse = (a: Placed, b: Placed) =>
		priority(a) > priority(b) ||
		(priority(a) === priority(b) && length(a.execution) < length(b.execution));
	const best = new MinHeap<Placed>(worse);
	let considered = 0;
	let hiddenFailures = 0;
	lanes.forEach((lane, index) => {
		for (const execution of lane.executions) {
			considered++;
			if (index >= options.shownLanes && execution.kind === "failed") {
				hiddenFailures++;
			}
			best.push({ execution, lane: index });
			if (best.size > options.maxRows) {
				best.pop();
			}
		}
	});
	const chosen: Placed[] = [];
	while (best.size > 0) {
		chosen.push(best.pop() as Placed);
	}
	// Most important first while the table still has room.
	chosen.reverse();
	const kept: Array<{ placed: Placed; row: TimelineRow }> = [];
	let size = 0;
	for (const placed of chosen) {
		const { execution, lane } = placed;
		const row: TimelineRow = {
			number: "",
			start: options.clock.format(options.clock.real(execution.start)),
			duration: formatDuration(length(execution)),
			lane: cell(laneNames[lane], MAX_LANE_CHARS),
			name: cell(
				attemptName(execution.name, execution.attempt),
				MAX_NAME_CHARS,
			),
			status: `${getEmoji(execution.status)} ${execution.status}`,
		};
		size +=
			20 +
			row.start.length +
			row.duration.length +
			row.lane.length +
			row.name.length +
			row.status.length;
		if (size > MAX_TABLE_CHARS && kept.length > 0) {
			break;
		}
		kept.push({ placed, row });
	}
	kept.sort(
		(a, b) =>
			a.placed.lane - b.placed.lane ||
			a.placed.execution.start - b.placed.execution.start ||
			a.placed.execution.stop - b.placed.execution.stop,
	);
	// Number the bars down the table. Rows that did not fit only make the
	// numbers smaller, so each still fits its bar and the chart.
	const numbers = new Map<TimelineExecution, number>();
	for (const { placed, row } of kept) {
		const next = numbers.size + 1;
		if (
			numberable.has(placed.execution) &&
			String(next).length <= (digitsOf.get(placed.execution) ?? 0)
		) {
			numbers.set(placed.execution, next);
			row.number = String(next);
		}
	}

	let title = `Test timings (${considered})`;
	if (kept.length < considered) {
		const parts = new Set<string>();
		for (const { placed } of kept) {
			const { execution } = placed;
			parts.add(
				execution.kind === "failed"
					? "failures"
					: numbers.has(execution)
						? "numbered bars"
						: execution.kind === "retry"
							? "retried failures"
							: "the slowest",
			);
		}
		const order = [
			"failures",
			"numbered bars",
			"retried failures",
			"the slowest",
		];
		title = `Test timings (${kept.length} of ${considered}: ${joinAnd(order.filter((part) => parts.has(part)))})`;
	}
	return {
		rows: kept.map(({ row }) => row),
		title,
		hiddenFailures: {
			total: hiddenFailures,
			listed: kept.filter(
				({ placed }) =>
					placed.lane >= options.shownLanes &&
					placed.execution.kind === "failed",
			).length,
		},
		numbers,
	};
}

function notes(
	data: TimelineData,
	gantt: TimelineGantt,
	timings: Timings,
): string[] {
	const result: string[] = [];
	const chart = gantt.text !== "";
	if (!chart) {
		result.push(
			"The chart would be too large for this summary, so it is left out.",
		);
	}
	if (data.untimed > 0) {
		const failed =
			data.untimedFailed === 0
				? ""
				: data.untimed === 1
					? " (it failed)"
					: data.untimedFailed === data.untimed
						? " (all of them failed)"
						: ` (${data.untimedFailed} of them failed)`;
		result.push(
			`${count(data.untimed, "test")} without start and stop times ${isAre(data.untimed)} not shown${failed}.`,
		);
	}
	if (data.invalid > 0) {
		result.push(
			`${count(data.invalid, "test")} whose start and stop times cannot be placed (stopping before starting, or not a plausible date) ${isAre(data.invalid)} not shown.`,
		);
	}
	if (data.notRun > 0) {
		result.push(
			`${count(data.notRun, "skipped or pending test")} ${isAre(data.notRun)} not shown.`,
		);
	}
	if (data.untimedAttempts > 0) {
		result.push(
			`${runsBeforeRetry(data.untimedAttempts)} without start and stop times ${isAre(data.untimedAttempts)} not shown.`,
		);
	}
	if (data.unmeasured.tests > 0) {
		const { tests, failed, threads } = data.unmeasured;
		const failures =
			failed === 0
				? ""
				: tests === 1
					? " (it failed)"
					: ` (${failed} of them failed)`;
		result.push(
			`${count(tests, "test")} ${threadsPhrase(threads)} ${isAre(tests)} not shown${failures}: most tests there that took time start in the same millisecond, so their start times were not measured.`,
		);
	}
	if (data.history > 0) {
		result.push(
			`${count(data.history, "result")} from earlier runs in the same report ${isAre(data.history)} not shown: later runs repeated those tests.`,
		);
	}
	if (data.rerun > 0) {
		result.push(
			data.rerun === 1
				? "1 test ran again later in the report, so its earlier result is drawn as a run before a retry."
				: `${data.rerun} earlier results of tests that ran again later in the report are drawn as runs before a retry.`,
		);
	}
	if (data.cuts.length > 0) {
		const one = data.cuts.length === 1;
		const lengths = joinAnd(data.cuts.map((cut) => formatDuration(cut.length)));
		const where = chart
			? ` cut out of the chart at the gray line${one ? "" : "s"}`
			: " cut out of the timeline";
		result.push(
			one
				? `No test ran for ${lengths}, so that stretch is${where}; the tables show real times.`
				: `Stretches without tests (${lengths}) are${where}; the tables show real times.`,
		);
	}
	if (data.duplicates > 0) {
		result.push(
			`${count(data.duplicates, "result")} listed more than once ${isAre(data.duplicates)} counted once.`,
		);
	}
	if (data.parents > 0) {
		result.push(
			data.parents === 1
				? "1 parent test that only groups its subtests (<code>TestX</code> around <code>TestX/case</code>) is not drawn."
				: `${data.parents} parent tests that only group their subtests (<code>TestX</code> around <code>TestX/case</code>) are not drawn.`,
		);
	}
	if (data.coarse) {
		result.push(
			"Start and stop times are in whole seconds, so tests are drawn one after another from the second they started: the chart shows their order rather than exact times.",
		);
	} else if (data.convertedUnits.length > 0) {
		const units = data.convertedUnits.map((unit) =>
			unit === "s" ? "seconds" : unit === "µs" ? "microseconds" : "nanoseconds",
		);
		result.push(
			`Some start and stop times are in ${joinAnd(units)} rather than milliseconds.`,
		);
	}
	if (data.tooManyThreads > 0) {
		result.push(
			`The report has ${data.tooManyThreads} thread IDs, too many for one lane each, so lanes are inferred from start and stop times.`,
		);
	} else if (data.crowdedThreads > 0) {
		result.push(
			`Tests on the report's ${count(data.crowdedThreads, "thread ID")} overlap too much for one lane per thread, so lanes are inferred from start and stop times.`,
		);
	} else if (data.inferredLanes) {
		result.push(
			"The report has no thread IDs (<code>threadId</code>), so lanes are inferred from start and stop times.",
		);
	}
	if (data.implausibleLanes) {
		result.push(
			"So many tests overlap that the times may have been recorded after the tests ran; if fewer workers ran, the lanes do not match them.",
		);
	}
	if (data.splitThreads.length > 0) {
		const shown =
			data.splitThreads.length === 1
				? `it is shown as ${data.splitThreads[0].lanes} lanes`
				: "they are shown as several lanes";
		result.push(
			`Tests on ${threadList(data.splitThreads.map(({ threadId }) => threadId))} overlap in time (processes sharing a thread name, or a test timed around others), so ${shown}.`,
		);
	}
	if (data.strayAttempts > 0) {
		const one = data.strayAttempts === 1;
		result.push(
			`${runsBeforeRetry(data.strayAttempts)} overlap${one ? "s" : ""} other tests on ${one ? "its" : "their"} thread (such runs do not record where they ran), so ${one ? "it is" : "they are"} shown in a lane of ${one ? "its" : "their"} own.`,
		);
	}
	if (data.hiddenLanes.length > 0) {
		result.push(hiddenLanesNote(data, timings));
	}
	if (gantt.approximate) {
		result.push(
			"With this many failures, a marker stands for all the failures near it.",
		);
	}
	if (timings.numbers.size > 0) {
		result.push(
			"A number on a bar is the row with that number (#) in the test timings below.",
		);
	}
	if (gantt.mergedBars) {
		result.push("Tests too short to tell apart are merged into one bar.");
	}
	return result;
}

/**
 * Says what the chart leaves out when there are more lanes than it draws:
 * whole threads when none of their lanes is drawn, lanes otherwise.
 */
function hiddenLanesNote(data: TimelineData, timings: Timings): string {
	const hidden = data.hiddenLanes.flatMap((lane) => lane.executions);
	const attempts = hidden.filter((e) => e.attempt !== undefined).length;
	const threadOf = (lane: TimelineLane) =>
		lane.origin === "thread" ? lane.executions[0]?.threadId : undefined;
	const drawn = new Set(data.lanes.map(threadOf));
	const wholeThreads = data.hiddenLanes.every((lane) => {
		const threadId = threadOf(lane);
		return threadId !== undefined && !drawn.has(threadId);
	});
	const number = wholeThreads
		? new Set(data.hiddenLanes.map(threadOf)).size
		: data.hiddenLanes.length;
	const { total, listed } = timings.hiddenFailures;
	const their = number === 1 ? "its" : "their";
	const failures =
		total === 0
			? ""
			: listed === total
				? `; ${their} ${plural(total, "failure")} ${isAre(total)} listed in the test timings`
				: `; ${listed} of ${their} ${count(total, "failure")} ${isAre(listed)} listed in the test timings`;
	return `${count(number, `more ${wholeThreads ? "thread" : "lane"}`)} with ${testsAndAttempts(hidden.length - attempts, attempts)} ${isAre(number)} not drawn${failures}.`;
}

/**
 * A table cell for a name: shortened to `max` characters, escaped, and
 * shortened further while escaping makes it much longer than that, as it does
 * for names full of characters that markdown or HTML would read.
 */
function cell(text: string, max: number): string {
	let escaped = escapeCell(shorten(text, max));
	for (let size = max; escaped.length > max * 4 && size > 8; ) {
		size = Math.floor(size / 2);
		escaped = escapeCell(shorten(text, size));
	}
	return escaped;
}

/** Up to three thread names as code, and how many more there are. */
function threadList(threadIds: string[]): string {
	const named = threadIds
		.slice(0, NAMED_THREADS)
		.map((threadId) => codeSpan(shorten(threadId, MAX_LANE_CHARS)));
	const more = threadIds.length - named.length;
	return joinAnd(more > 0 ? [...named, count(more, "other thread")] : named);
}

/** "on `w1` and `w2`", "without a thread ID", or both. */
function threadsPhrase(threadIds: string[]): string {
	const named = threadIds.filter((threadId) => threadId !== "");
	return [
		named.length > 0 ? `on ${threadList(named)}` : "",
		named.length < threadIds.length ? "without a thread ID" : "",
	]
		.filter(Boolean)
		.join(" or ");
}

function testsAndAttempts(tests: number, attempts: number): string {
	return joinAnd(
		[
			tests > 0 ? count(tests, "test") : "",
			attempts > 0 ? runsBeforeRetry(attempts) : "",
		].filter(Boolean),
	);
}

/** "1 run before a retry", "9 runs before a retry". */
function runsBeforeRetry(value: number): string {
	return `${count(value, "run")} before a retry`;
}

function joinAnd(parts: string[]): string {
	return parts.length < 2
		? parts.join("")
		: `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

/**
 * The most executions running at the same moment. A 0ms test counts as
 * running for 1ms; tests on one lane never count as running together.
 */
function peakConcurrency(lanes: TimelineLane[]): number {
	const total = lanes.reduce((sum, lane) => sum + lane.executions.length, 0);
	const starts = new Float64Array(total);
	const stops = new Float64Array(total);
	let index = 0;
	for (const lane of lanes) {
		let lastStop = Number.NEGATIVE_INFINITY;
		for (const execution of lane.executions) {
			const start = Math.max(execution.start, lastStop);
			const stop = Math.max(execution.stop, start + 1);
			starts[index] = start;
			stops[index] = stop;
			lastStop = stop;
			index++;
		}
	}
	starts.sort();
	stops.sort();
	let running = 0;
	let peak = 0;
	let stopIndex = 0;
	for (const start of starts) {
		while (stopIndex < total && stops[stopIndex] <= start) {
			running--;
			stopIndex++;
		}
		running++;
		peak = Math.max(peak, running);
	}
	return peak;
}

function length(execution: TimelineExecution): number {
	return execution.stop - execution.start;
}
