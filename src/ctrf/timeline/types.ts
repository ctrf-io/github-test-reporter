import type { TestStatus } from "ctrf";

/**
 * Limits that keep the timeline readable and inside GitHub's size limits.
 */
export interface TimelineLimits {
	/**
	 * Maximum length of the Mermaid source. GitHub refuses diagrams over 50,000
	 * characters, and a pull request comment holds 65,536 characters in all.
	 */
	maxDiagramChars: number;
	/** Maximum number of lanes (rows) in the chart. */
	maxLanes: number;
	/** Maximum number of rows in the test timings table. */
	maxRows: number;
}

export const TIMELINE_LIMITS: TimelineLimits = {
	maxDiagramChars: 20_000,
	maxLanes: 40,
	maxRows: 100,
};

/**
 * How a bar is drawn: passed, failed, a failed attempt that was retried, or
 * any other status (including skipped tests that took time).
 */
export type TimelineKind = "passed" | "failed" | "retry" | "other";

export interface TimelineExecution {
	/** The test name as the report gives it. */
	name: string;
	/** The name for a bar: without the suite prefix that use-suite-name adds. */
	label: string;
	/** Identifies the test across runs and attempts: testId, id, or file, suite and name. */
	testId: string;
	/** The test's file and suite, which tell tests of the same name apart (Go writes the package). */
	scope: string;
	status: TestStatus;
	kind: TimelineKind;
	/** Epoch milliseconds, on the chart's clock (gaps cut out of the chart are removed). */
	start: number;
	/** Epoch milliseconds, never before `start`. */
	stop: number;
	threadId?: string;
	/**
	 * Attempt number of a `retryAttempts` entry, 0 for an earlier result of a
	 * test that ran again in a later run, undefined for the final result.
	 */
	attempt?: number;
	/** Which run of the report the execution belongs to, when it holds several. */
	run?: number;
}

/**
 * Where a lane comes from: a thread ID, tests without one, runs before a retry
 * that overlap their test's thread, or start and stop times alone.
 */
export type TimelineLaneOrigin =
	| "thread"
	| "unthreaded"
	| "attempts"
	| "inferred";

export interface TimelineLane {
	name: string;
	origin: TimelineLaneOrigin;
	/**
	 * Executions sorted by start time. They overlap by at most 1ms, or 5ms on a
	 * thread.
	 */
	executions: TimelineExecution[];
}

/** A stretch without tests that is cut out of the chart. */
export interface TimelineCut {
	/** Where the cut is on the chart's clock (epoch milliseconds). */
	at: number;
	/** How long the stretch really was, in milliseconds. */
	length: number;
	/** How much of it is cut out: times after the cut are this much later than the chart shows. */
	removed: number;
}

export interface TimelineData {
	/** Lanes drawn in the chart. */
	lanes: TimelineLane[];
	/** Lanes left out of the chart because there are more than `maxLanes`. */
	hiddenLanes: TimelineLane[];
	/** Earliest start of an execution (epoch milliseconds). */
	start: number;
	/** Latest stop of an execution, on the chart's clock. */
	stop: number;
	/** Distinct thread IDs among the executions, 0 when lanes are inferred. */
	threads: number;
	/** True when lanes come from start and stop times instead of thread IDs. */
	inferredLanes: boolean;
	/** True when inferred lanes are so many that the start and stop times look reconstructed. */
	implausibleLanes: boolean;
	/** Number of thread IDs when there were too many to draw one lane each, otherwise 0. */
	tooManyThreads: number;
	/** Number of thread IDs when their overlapping tests needed too many lanes, otherwise 0. */
	crowdedThreads: number;
	/** Thread IDs whose tests overlap in time and are drawn as several lanes. */
	splitThreads: Array<{ threadId: string; lanes: number }>;
	/** Runs before a retry drawn in a lane of their own because they overlap tests on their thread. */
	strayAttempts: number;
	/** Final test results with usable times, in drawn and hidden lanes. */
	tests: number;
	/**
	 * Runs before a retry with usable times, in drawn and hidden lanes:
	 * `retryAttempts` entries and the earlier results counted in `rerun`.
	 */
	attempts: number;
	/** True when a skipped or pending test that took time is drawn. */
	skippedDrawn: boolean;
	/** True when start and stop times are in whole seconds. */
	coarse: boolean;
	/** Tests without usable start and stop times. */
	untimed: number;
	/** How many of the untimed tests failed. */
	untimedFailed: number;
	/** Runs before a retry without usable start and stop times. */
	untimedAttempts: number;
	/** Tests whose times cannot be placed: stop before start, or far outside any plausible date. */
	invalid: number;
	/** Skipped and pending tests that took no time, which are not drawn. */
	notRun: number;
	/** Executions listed more than once (for example by overlapping report files). */
	duplicates: number;
	/** Parent tests (Go's `TestX` around `TestX/case`) that only group subtests. */
	parents: number;
	/**
	 * Tests left out because most tests of their thread start in the same
	 * millisecond, so their start times were not measured; how many of them
	 * failed, and the threads ("" for tests without one).
	 */
	unmeasured: { tests: number; failed: number; threads: string[] };
	/**
	 * Results left out from earlier runs in the same report that later runs
	 * repeated almost entirely, as when a reporter keeps adding to one file.
	 */
	history: number;
	/** Earlier results of tests that ran again in a later run, drawn as runs before a retry. */
	rerun: number;
	/** Stretches without tests cut out of the chart. */
	cuts: TimelineCut[];
	/** Units the start and stop times were converted from, such as "s". */
	convertedUnits: string[];
}

/**
 * A bar that stands for one test and has room for a number, but not for the
 * test's name: it can carry the number of the test's row in the timings table.
 */
export interface NumberCandidate {
	execution: TimelineExecution;
	/** Index of the bar's lane in `TimelineData.lanes`. */
	lane: number;
	/** How many digits fit on the bar. */
	digits: number;
}

export interface TimelineGantt {
	/** Mermaid source, without the markdown fence; empty when even the coarsest chart is over `maxDiagramChars`. */
	text: string;
	/** Bar kinds that appear in the chart, in legend order. */
	kinds: TimelineKind[];
	/** True when a bar stands for several tests. */
	mergedBars: boolean;
	/** True when a failure is drawn as a diamond because its bar would be too thin to see. */
	diamonds: boolean;
	/**
	 * True when, to fit, a marker stands for all the failures near it and the
	 * passes around them are drawn over them.
	 */
	approximate: boolean;
}

/** A row of the per-lane table. Text cells are markdown, ready to write with `{{{ }}}`. */
export interface TimelineLaneRow {
	name: string;
	tests: number;
	retries: number;
	failed: number;
	busy: string;
	idle: string;
	utilization: string;
}

/** A row of the test timings table. Cells are markdown, ready to write with `{{{ }}}`. */
export interface TimelineRow {
	/** The number on the test's bar in the chart, or "" when the bar has none. */
	number: string;
	start: string;
	duration: string;
	lane: string;
	name: string;
	status: string;
}

/** Everything the timeline template renders. */
export interface TimelineReport {
	hasData: boolean;
	/** Shown instead of the chart when there is nothing to draw. */
	message: string;
	headline: string;
	/** The tests that kept the run longest, or "" when there is only one test. */
	highlights: string;
	mermaid: string;
	legend: string;
	notes: string[];
	laneHeader: string;
	showLanes: boolean;
	showRetries: boolean;
	lanes: TimelineLaneRow[];
	/** True when bars carry numbers, shown in a # column of the timings table. */
	showNumbers: boolean;
	startHeader: string;
	rowsTitle: string;
	rows: TimelineRow[];
}
