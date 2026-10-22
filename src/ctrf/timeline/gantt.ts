import {
	attemptName,
	distinctNames,
	fitMiddle,
	fitText,
	limitUnits,
	pad,
	sanitizeMermaidLine,
	sanitizeMermaidText,
	textWidth,
	ZWSP,
} from "./text.js";
import {
	type NumberCandidate,
	TIMELINE_LIMITS,
	type TimelineData,
	type TimelineExecution,
	type TimelineGantt,
	type TimelineKind,
	type TimelineLane,
	type TimelineLimits,
} from "./types.js";

// Runs shorter than this are drawn on a clock that starts at 0:00, longer ones on dates.
const DAY_MS = 86_400_000;

// Chart geometry, in Mermaid's own pixels: the diagram is laid out this wide and scaled to fit.
const CHART_WIDTH = 1000;
const RIGHT_PADDING = 40;
const MIN_LEFT_PADDING = 75;
const MAX_LEFT_PADDING = 240;
// Section titles are drawn from x = 10; keep as much space again before the bars.
const LANE_NAME_MARGIN = 20;
// Section titles may be bold, so they are measured a little wider.
const SECTION_SCALE = 1.1;
// Longest lane name written into the chart, in UTF-16 code units.
const MAX_LANE_NAME_UNITS = 120;
// Above this many lanes, bars and text get smaller so the chart stays a sensible height.
const COMPACT_ABOVE_LANES = 20;
// Space kept free around a label inside its bar.
const LABEL_PADDING = 8;
// A name cut shorter than this says too little to be worth drawing.
const MIN_LABEL_CHARS = 10;
// Bars with less room than this get no label.
const MIN_LABEL_ROOM = 6;
// Bars too narrow for their name carry numbers of up to this many digits.
const MAX_NUMBER_DIGITS = 3;
// Failures narrower than this are drawn as markers: diamonds, or slivers this
// wide on lanes where diamonds would cover more than the given share of the
// plot, or would sit closer together than the given multiple of their width.
const DIAMOND_BELOW_PX = 4;
const SLIVER_PX = 3;
const MAX_DIAMOND_COVERAGE = 0.25;
const MIN_DIAMOND_SPACING = 1.5;
// Bars narrower than this merge with neighbours of their kind: too narrow for a
// label, they only add stripes. Merged bars bridge idle gaps up to this wide,
// or as wide as the tests on either side.
const NARROW_BAR_PX = 8;
// A merged bar may hold this much of a second kind (passed and other, or
// failed and failed attempt), too little to see.
const MIXED_BAR_PX = 2;
// Each level doubles the widths above and the gap merged bars may bridge (1px
// at level 0), until everything between two failures is one bar.
const LAST_LEVEL = 20;
// Up to this level failure markers keep their size; above it, they stand for
// failures twice as far apart at each level.
const FAILURE_LEVEL = 8;

const THEME_VARIABLES: Record<string, string> = {
	// passed
	taskBkgColor: "#4ac26b",
	taskBorderColor: "#1a7f37",
	// failed, dark enough to tell from passed without seeing colors
	critBkgColor: "#cf222e",
	critBorderColor: "#82071e",
	// failed attempt that was retried
	activeTaskBkgColor: "#eac54f",
	activeTaskBorderColor: "#9a6700",
	// other
	doneTaskBkgColor: "#afb8c1",
	doneTaskBorderColor: "#6e7781",
	// text inside the bars, which have the same colors in light and dark mode
	taskTextColor: "#1f2328",
	taskTextDarkColor: "#1f2328",
	sectionBkgColor: "#8c959f",
	sectionBkgColor2: "#8c959f",
	// lines where a stretch without tests is cut out
	vertLineColor: "#8c959f",
};

// White names on failed bars, and a dashed outline on failed attempts, so that
// kinds differ in more than their color.
const THEME_CSS = [
	".taskText.critText0,.taskText.critText1,.taskText.critText2,.taskText.critText3{fill:#ffffff !important}",
	".active0,.active1,.active2,.active3{stroke-dasharray:4 2}",
].join("");

const KIND_TAGS: Record<TimelineKind, string> = {
	passed: "",
	failed: "crit, ",
	retry: "active, ",
	other: "done, ",
};

const KIND_ORDER: TimelineKind[] = ["passed", "failed", "retry", "other"];

const NO_TIME: Record<TimelineKind, number> = {
	passed: 0,
	failed: 0,
	retry: 0,
	other: 0,
};

interface Geometry {
	msPerPx: number;
	/** Mermaid's barHeight; a diamond is about 1.13 times as wide. */
	barHeight: number;
	/** Text size relative to the default 11px. */
	fontScale: number;
}

interface Chart {
	geometry: Geometry;
	plotWidth: number;
	/** The run on the chart's clock, in whole milliseconds. */
	run: { start: number; stop: number };
	/** Chart-clock times of the stretches cut out of the chart. */
	breaks: number[];
	laneNames: string[];
	header: string;
	/** Lines added to the first lane: empty tasks that keep the axis on the whole run, and the cut lines. */
	firstLane: { before: string[]; after: string[] };
	clock: (time: number) => string;
	nameOf: (execution: TimelineExecution) => string;
}

interface Bar {
	start: number;
	stop: number;
	kind: TimelineKind;
	members: TimelineExecution[];
	/** Time each kind takes in the bar. */
	time: Record<TimelineKind, number>;
	/** Width of the last execution added. */
	last: number;
	diamond: boolean;
	/** True for a failure marker, drawn at a fixed width whatever the failures took. */
	marker: boolean;
}

interface Cluster {
	start: number;
	stop: number;
	/** Time the failures in the cluster took. */
	busy: number;
	kind: TimelineKind;
	members: TimelineExecution[];
	/** True when passes ran between its failures. */
	passesInside: boolean;
}

/** How far merging goes at one level, in milliseconds. */
interface Level {
	/** Bars narrower than this merge with neighbours of their kind. */
	narrow: number;
	/** Merged bars may bridge this much idle time, if the tests around it are as wide. */
	gap: number;
	/** A merged bar may hold this much of a second kind. */
	mixed: number;
	/** Failures narrower than this are drawn as markers... */
	markBelow: number;
	/** ...unless failures fill this much of the time together, without passes between them. */
	barFrom: number;
	/** Failures within this stretch share a marker... */
	window: number;
	/** ...and so do failures this close together, with no pass between, that mostly fill the time. */
	chain: number;
}

type FailureMarker = "diamond" | "sliver";

/**
 * Whether the chart (and the tables) show elapsed time from 0:00, or dates for
 * runs of a day or more.
 */
export function elapsedClock(data: TimelineData): boolean {
	return Math.max(1, data.stop - data.start) < DAY_MS;
}

/**
 * Renders the lanes as a Mermaid Gantt chart in compact mode, one row per lane,
 * on a clock that starts at 0:00 with the first test (or on dates, for runs of
 * a day or more).
 *
 * Bars too thin to tell apart are merged, and the merging coarsens level by
 * level until the source fits `maxDiagramChars`; the finest level that fits is
 * used. Failures never merge with passes and passes never cover failure time;
 * failures too short to see are drawn as diamonds or slivers of fixed width,
 * so many failures never paint a large area red. Labels are written only
 * where they fit inside their bar. When even the coarsest level is too large,
 * a marker stands for the failures near it and passes are drawn over them
 * (`approximate`); after that the labels are left out, and when that is still
 * too large, `text` is empty.
 *
 * A bar that stands for one test and is too narrow for its name, but not for
 * a number, is offered to `numberBars`, which returns the numbers to write on
 * such bars: those of the tests' rows in the timings table.
 *
 * @param data - Lanes from {@link collectTimeline}.
 * @param limits - Limits to apply; defaults to {@link TIMELINE_LIMITS}.
 * @param description - Text for screen readers, written as the chart's accDescr.
 * @param numberBars - Picks numbers for bars too narrow for their test's name.
 * @returns The Mermaid source and what it contains.
 */
export function renderTimelineGantt(
	data: TimelineData,
	limits: Partial<TimelineLimits> = {},
	description = "Test execution timeline",
	numberBars?: (
		candidates: NumberCandidate[],
		room: number,
	) => Map<TimelineExecution, number>,
): TimelineGantt {
	const { maxDiagramChars } = { ...TIMELINE_LIMITS, ...limits };
	const span = Math.max(1, data.stop - data.start);
	const elapsed = elapsedClock(data);
	const compact = data.lanes.length > COMPACT_ABOVE_LANES;
	const fontScale = compact ? 10 / 11 : 1;
	const laneNames = chartLaneNames(data.lanes, fontScale);
	let widestName = 0;
	for (const name of laneNames) {
		widestName = Math.max(
			widestName,
			textWidth(name) * SECTION_SCALE * fontScale,
		);
	}
	const leftPadding = Math.min(
		MAX_LEFT_PADDING,
		Math.max(MIN_LEFT_PADDING, Math.ceil(widestName) + LANE_NAME_MARGIN),
	);
	const plotWidth = CHART_WIDTH - leftPadding - RIGHT_PADDING;
	// Elapsed time on a clock that starts at 0:00, unless the run is too long for one day.
	const clock = elapsed
		? (time: number) => mermaidClock(time - data.start)
		: (time: number) => String(Math.round(time));
	const start = Math.round(data.start);
	const end = start + Math.max(1, Math.round(data.stop) - start);
	const names = new Map<TimelineExecution, string>();
	const chart: Chart = {
		geometry: {
			msPerPx: span / plotWidth,
			barHeight: compact ? 12 : 20,
			fontScale,
		},
		plotWidth,
		run: { start, stop: end },
		breaks: data.cuts.map((cut) => cut.at).sort((a, b) => a - b),
		laneNames,
		header: ganttHeader({
			leftPadding,
			compact,
			description,
			dateFormat: elapsed ? "D HH:mm:ss.SSS" : "x",
			axisFormat: axisFormat(span, elapsed, data),
		}),
		// Mermaid fits the axis to the bars; empty tasks at both ends of the run
		// keep it on the whole run, so it starts at 0:00.
		firstLane: {
			before: [`${ZWSP} :${clock(start)}, 0ms`],
			after: [
				`${ZWSP} :${clock(end)}, 0ms`,
				...data.cuts.map(
					(cut) => `${ZWSP} :vert, ${clock(Math.round(cut.at))}, 0ms`,
				),
			],
		},
		clock,
		nameOf: (execution) => {
			let name = names.get(execution);
			if (name === undefined) {
				name = sanitizeMermaidText(
					attemptName(execution.label, execution.attempt),
				);
				// A name of digits only would read as the number of a row.
				if (/^\d+$/.test(name)) {
					name = `"${name}"`;
				}
				names.set(execution, name);
			}
			return name;
		},
	};

	// Once a chart fits, the numbers chosen for bars too narrow for their
	// test's name are written in the room left under the budget.
	const fits = (build: Build) => {
		const numbering: Numbering = { candidates: [], named: new Set() };
		const gantt = buildGantt(data, chart, build, maxDiagramChars, numbering);
		if (!gantt || !numberBars || !build.labels) {
			return gantt;
		}
		const numbers = numberBars(
			candidatesOf(numbering),
			maxDiagramChars - gantt.text.length,
		);
		if (numbers.size === 0) {
			return gantt;
		}
		return buildGantt(data, chart, build, Number.POSITIVE_INFINITY, {
			numbers,
			written: new Set(),
		});
	};
	// Coarser levels are usually, but not always, shorter: take the first that fits.
	for (let level = 0; level <= LAST_LEVEL; level++) {
		const gantt = fits({ level, exact: true, labels: true });
		if (gantt) {
			return gantt;
		}
	}
	// Too many failures to draw apart: let a marker stand for the failures near
	// it, passes running past them, and then leave the labels out.
	for (let level = FAILURE_LEVEL + 1; level <= LAST_LEVEL; level++) {
		const gantt = fits({ level, exact: false, labels: true });
		if (gantt) {
			return gantt;
		}
	}
	return (
		fits({ level: LAST_LEVEL, exact: false, labels: false }) ?? {
			text: "",
			kinds: [],
			mergedBars: false,
			diamonds: false,
			approximate: false,
		}
	);
}

/** How a chart is built. */
interface Build {
	/** Merge level, from 0 to {@link LAST_LEVEL}. */
	level: number;
	/** True to keep passes off every failure wide enough to see. */
	exact: boolean;
	/** True to write names and counts on the bars that fit them. */
	labels: boolean;
}

/**
 * Numbers on bars too narrow for their test's name: `candidates` collects such
 * bars, and `numbers` gives the number to write on each.
 */
interface Numbering {
	candidates?: NumberCandidate[];
	/** Tests whose name is written on one of their bars. */
	named?: Set<TimelineExecution>;
	numbers?: Map<TimelineExecution, number>;
	/** Tests whose number is written: once, on the first bar it fits. */
	written?: Set<TimelineExecution>;
}

/**
 * The bars to offer for numbers: one per test, the one with room for the most
 * digits, and none for a test whose name is written on another of its bars
 * (a failure can cut a test's bar in two).
 */
function candidatesOf(numbering: Numbering): NumberCandidate[] {
	const best = new Map<TimelineExecution, NumberCandidate>();
	for (const candidate of numbering.candidates ?? []) {
		const known = best.get(candidate.execution);
		if (!numbering.named?.has(candidate.execution)) {
			if (!known || candidate.digits > known.digits) {
				best.set(candidate.execution, candidate);
			}
		}
	}
	return [...best.values()];
}

/** Builds the chart at one merge level, or returns undefined once it outgrows the budget. */
function buildGantt(
	data: TimelineData,
	chart: Chart,
	build: Build,
	budget: number,
	numbering: Numbering,
): TimelineGantt | undefined {
	const lines = [chart.header];
	let length = chart.header.length;
	const kinds = new Set<TimelineKind>();
	let mergedBars = false;
	let diamonds = false;
	const push = (line: string) => {
		lines.push(line);
		length += line.length + 1;
	};
	for (const [index, lane] of data.lanes.entries()) {
		let bars = layoutLane(lane.executions, chart, build, "diamond");
		if (crowdedDiamonds(bars, chart)) {
			bars = layoutLane(lane.executions, chart, build, "sliver");
		}
		push(`section ${sectionName(chart.laneNames[index])}`);
		if (index === 0) {
			for (const line of chart.firstLane.before) {
				push(line);
			}
		}
		for (const bar of bars) {
			kinds.add(bar.kind);
			mergedBars ||= bar.members.length > 1 && !bar.marker;
			diamonds ||= bar.diamond;
			push(
				taskLine(
					bar,
					build.labels ? barLabel(bar, chart, index, numbering) : "",
					chart.clock,
				),
			);
		}
		if (index === 0) {
			for (const line of chart.firstLane.after) {
				push(line);
			}
		}
		if (length > budget) {
			return undefined;
		}
	}
	return {
		text: lines.join("\n"),
		kinds: KIND_ORDER.filter((kind) => kinds.has(kind)),
		mergedBars,
		diamonds,
		approximate: !build.exact,
	};
}

/**
 * Diamonds are wide: where they would cover much of the lane, or sit so close
 * that the passes between them disappear, the failures are drawn as slivers.
 */
function crowdedDiamonds(bars: Bar[], chart: Chart): boolean {
	const width = diamondWidth(chart.geometry);
	const spacing = MIN_DIAMOND_SPACING * width * chart.geometry.msPerPx;
	let count = 0;
	let previous = Number.NEGATIVE_INFINITY;
	for (const bar of bars) {
		if (!bar.diamond) {
			continue;
		}
		if (bar.start - previous < spacing) {
			return true;
		}
		previous = bar.start;
		count++;
	}
	return count * width > MAX_DIAMOND_COVERAGE * chart.plotWidth;
}

/**
 * Turns the executions of one lane into bars that never overlap, so Mermaid
 * keeps the lane on one row.
 *
 * - Clock jitter is clamped away.
 * - Passes and other results merge with each other, and failures with each
 *   other, never across: bars of one kind too thin to tell apart merge into one
 *   bar labelled with their count, a bar may hold a little of the other kind,
 *   and merged bars bridge only idle gaps that are small next to their tests.
 * - Failures too thin to see form clusters of failures close together. A
 *   cluster the failures mostly fill, with no pass between them, is drawn as a
 *   failed bar; any other as one marker of fixed width (a diamond, or a sliver)
 *   that cuts the passes around it and, in an exact build, under its failures,
 *   so the passes keep their color, never cover a failure, and the failure
 *   stays where it was. A diamond that would hide a failed bar next to it is
 *   drawn as a sliver.
 * - Nothing merges across a stretch cut out of the chart.
 */
function layoutLane(
	executions: TimelineExecution[],
	chart: Chart,
	build: Build,
	marker: FailureMarker,
): Bar[] {
	const { geometry } = chart;
	const limits = levelLimits(build.level, geometry, marker);
	const passes: Bar[] = [];
	const failures: Bar[] = [];
	const clusters: Cluster[] = [];
	// Which bars may still grow: a failure bar ends the pass bar before it,
	// a pass ends the failure bar, and a failure bar ends the cluster.
	let passOpen = false;
	let failureOpen = false;
	let clusterOpen = false;
	let passSinceCluster = false;
	let lastStop = Number.NEGATIVE_INFINITY;
	for (const execution of executions) {
		const start = Math.max(execution.start, lastStop);
		const stop = Math.max(execution.stop, start);
		lastStop = stop;
		if (!isFailure(execution.kind)) {
			const previous = passOpen ? passes[passes.length - 1] : undefined;
			if (
				previous &&
				merges(previous, execution.kind, start, stop, limits, chart)
			) {
				grow(previous, execution, start, stop);
			} else {
				passes.push(newBar(execution, start, stop));
			}
			passOpen = true;
			failureOpen = false;
			passSinceCluster ||= clusterOpen;
		} else if (stop - start >= limits.markBelow) {
			const previous = failureOpen ? failures[failures.length - 1] : undefined;
			if (
				previous &&
				merges(previous, execution.kind, start, stop, limits, chart)
			) {
				grow(previous, execution, start, stop);
			} else {
				failures.push(newBar(execution, start, stop));
			}
			failureOpen = true;
			passOpen = false;
			clusterOpen = false;
		} else {
			const cluster = clusterOpen ? clusters[clusters.length - 1] : undefined;
			if (
				cluster &&
				joins(cluster, start, stop, limits, chart, passSinceCluster)
			) {
				cluster.stop = Math.max(cluster.stop, stop);
				cluster.busy += stop - start;
				cluster.members.push(execution);
				cluster.passesInside ||= passSinceCluster;
				if (execution.kind === "failed") {
					cluster.kind = "failed";
				}
			} else {
				clusters.push({
					start,
					stop,
					busy: stop - start,
					kind: execution.kind,
					members: [execution],
					passesInside: false,
				});
			}
			clusterOpen = true;
			failureOpen = false;
			passSinceCluster = false;
		}
	}

	// Failure bars, including clusters the failures fill.
	const bars: Bar[] = failures;
	const covered: Array<[number, number]> = [];
	const markers: Cluster[] = [];
	for (const cluster of clusters) {
		const extent = cluster.stop - cluster.start;
		if (
			extent >= limits.barFrom &&
			cluster.busy * 2 >= extent &&
			!cluster.passesInside
		) {
			bars.push({
				start: cluster.start,
				stop: cluster.stop,
				kind: cluster.kind,
				members: cluster.members,
				time: { ...NO_TIME, [cluster.kind]: cluster.busy },
				last: 0,
				diamond: false,
				marker: false,
			});
			covered.push([cluster.start, cluster.stop]);
		} else {
			markers.push(cluster);
		}
	}
	const failureSpans = bars
		.map((bar): [number, number] => [bar.start, bar.stop])
		.sort((a, b) => a[0] - b[0]);
	let span = 0;
	for (const cluster of markers) {
		const center = (cluster.start + cluster.stop) / 2;
		const reach = (diamondWidth(geometry) / 2) * geometry.msPerPx;
		while (
			span < failureSpans.length &&
			failureSpans[span][1] < center - reach
		) {
			span++;
		}
		// A diamond drawn over a failed bar next to it would hide that bar.
		const diamond =
			marker === "diamond" &&
			!(span < failureSpans.length && failureSpans[span][0] <= center + reach);
		const half =
			((diamond ? diamondWidth(geometry) : SLIVER_PX) / 2) * geometry.msPerPx;
		const width = diamond ? 0 : SLIVER_PX * geometry.msPerPx;
		bars.push({
			start: center - width / 2,
			stop: center + width / 2,
			kind: cluster.kind,
			members: cluster.members,
			time: { ...NO_TIME, [cluster.kind]: cluster.busy },
			last: 0,
			diamond,
			marker: true,
		});
		covered.push([center - half, center + half]);
		for (const member of build.exact ? cluster.members : []) {
			// Passes never cover a failure wide enough to see, where it is drawn:
			// after the clock jitter before it was clamped away.
			const from = Math.max(member.start, cluster.start);
			const to = Math.min(member.stop, cluster.stop);
			if (to - from >= geometry.msPerPx) {
				covered.push([from, to]);
			}
		}
	}
	for (const piece of cutAround(passes, covered)) {
		bars.push(piece);
	}
	bars.sort((a, b) => a.start - b.start || a.stop - b.stop);

	// Markers can reach into the bars next to them or past either end of the
	// run; a lane must never overlap itself, and the clock starts at the run.
	// Bars are written in whole milliseconds, so they are laid out in them.
	const laid: Bar[] = [];
	let previousStop = chart.run.start;
	for (const bar of bars) {
		let start = Math.min(
			Math.max(Math.round(bar.start), previousStop),
			chart.run.stop,
		);
		let stop = Math.min(Math.max(Math.round(bar.stop), start), chart.run.stop);
		if (stop <= start && bar.stop > bar.start && !isFailure(bar.kind)) {
			// Squeezed out by the bar before it.
			continue;
		}
		if (stop === start && isFailure(bar.kind) && !bar.diamond) {
			// A failure must stay visible: at least 1ms wide, or a diamond.
			if (stop < chart.run.stop) {
				stop++;
			} else if (start > previousStop) {
				start--;
			} else {
				bar.diamond = true;
			}
		}
		bar.start = start;
		bar.stop = stop;
		previousStop = stop;
		laid.push(bar);
	}
	return laid;
}

function levelLimits(
	level: number,
	geometry: Geometry,
	marker: FailureMarker,
): Level {
	const px = geometry.msPerPx;
	const scale = 2 ** level * px;
	const failureScale = 2 ** Math.max(0, level - FAILURE_LEVEL) * px;
	const markerPx = marker === "diamond" ? DIAMOND_BELOW_PX : SLIVER_PX;
	return {
		narrow: NARROW_BAR_PX * scale,
		gap: scale,
		mixed: MIXED_BAR_PX * scale,
		markBelow: markerPx * failureScale,
		barFrom: markerPx * px,
		window: Math.max(
			(marker === "diamond" ? diamondWidth(geometry) : SLIVER_PX) * px,
			SLIVER_PX * failureScale,
		),
		chain: failureScale,
	};
}

function isFailure(kind: TimelineKind): boolean {
	return kind === "failed" || kind === "retry";
}

function newBar(
	execution: TimelineExecution,
	start: number,
	stop: number,
): Bar {
	return {
		start,
		stop,
		kind: execution.kind,
		members: [execution],
		time: { ...NO_TIME, [execution.kind]: stop - start },
		last: stop - start,
		diamond: false,
		marker: false,
	};
}

/** Whether an execution of `kind` at start-stop merges into the bar before it. */
function merges(
	previous: Bar,
	kind: TimelineKind,
	start: number,
	stop: number,
	limits: Level,
	chart: Chart,
): boolean {
	const width = stop - start;
	const gap = start - previous.stop;
	// Idle time stays idle, unless it is too small to see next to its tests.
	const bridge = Math.max(
		NARROW_BAR_PX * chart.geometry.msPerPx,
		previous.last,
		width,
	);
	if (
		gap > Math.min(limits.gap, bridge) ||
		crosses(chart, previous.stop, start)
	) {
		return false;
	}
	if (kind === previous.kind) {
		return (
			width < limits.narrow &&
			(previous.members.length > 1 ||
				previous.stop - previous.start < limits.narrow)
		);
	}
	// The kind with less time in the merged bar must stay too thin to see.
	const time = { ...previous.time };
	time[kind] += width;
	const minority = isFailure(kind)
		? Math.min(time.failed, time.retry)
		: Math.min(time.passed, time.other);
	return minority < limits.mixed;
}

/**
 * Whether a failure too thin for a bar shares the marker of the cluster before
 * it: when both fit in one marker's stretch, or when the failure carries on a
 * run of failures that mostly fill their time, with no pass between.
 */
function joins(
	cluster: Cluster,
	start: number,
	stop: number,
	limits: Level,
	chart: Chart,
	passBetween: boolean,
): boolean {
	if (crosses(chart, cluster.stop, start)) {
		return false;
	}
	const extent = Math.max(stop, cluster.stop) - cluster.start;
	return (
		extent <= limits.window ||
		(!passBetween &&
			start - cluster.stop <= limits.chain &&
			(cluster.busy + stop - start) * 2 >= extent)
	);
}

function crosses(chart: Chart, from: number, to: number): boolean {
	return chart.breaks.some((at) => at > from && at < to);
}

function grow(
	bar: Bar,
	execution: TimelineExecution,
	start: number,
	stop: number,
): void {
	bar.stop = Math.max(bar.stop, stop);
	bar.members.push(execution);
	bar.time[execution.kind] += stop - start;
	bar.last = stop - start;
	bar.kind = dominantKind(bar.time, bar.kind);
}

/**
 * The kind a bar of several executions is drawn as. Failures and passes never
 * share a bar: among failures, failed beats a failed attempt; among the rest,
 * the kind that took most of the time wins.
 */
function dominantKind(
	time: Record<TimelineKind, number>,
	fallback: TimelineKind,
): TimelineKind {
	if (isFailure(fallback)) {
		return time.failed > 0 || fallback === "failed" ? "failed" : "retry";
	}
	if (time.passed === time.other) {
		return fallback;
	}
	return time.passed > time.other ? "passed" : "other";
}

/**
 * Removes the stretches covered by failures and their markers from the pass
 * bars, splitting a merged bar where a failure sits inside it. Each piece
 * keeps the executions it overlaps and shrinks to them; a piece over idle time
 * only goes.
 */
function cutAround(bars: Bar[], cuts: Array<[number, number]>): Bar[] {
	if (cuts.length === 0) {
		return bars;
	}
	const union: Array<[number, number]> = [];
	for (const [from, to] of [...cuts].sort((a, b) => a[0] - b[0])) {
		const last = union[union.length - 1];
		if (last && from <= last[1]) {
			last[1] = Math.max(last[1], to);
		} else {
			union.push([from, to]);
		}
	}
	const pieces: Bar[] = [];
	let first = 0;
	for (const bar of bars) {
		while (first < union.length && union[first][1] <= bar.start) {
			first++;
		}
		if (first === union.length || union[first][0] >= bar.stop) {
			pieces.push(bar);
			continue;
		}
		let from = bar.start;
		for (
			let next = first;
			next < union.length && union[next][0] < bar.stop;
			next++
		) {
			if (union[next][0] > from) {
				addPiece(pieces, bar, from, union[next][0]);
			}
			from = Math.max(from, union[next][1]);
		}
		if (bar.stop > from) {
			addPiece(pieces, bar, from, bar.stop);
		}
	}
	return pieces;
}

function addPiece(pieces: Bar[], bar: Bar, from: number, to: number): void {
	const members = bar.members.filter((member) =>
		member.stop > member.start
			? member.start < to && member.stop > from
			: member.start >= from && member.start <= to,
	);
	if (members.length === 0) {
		return;
	}
	const time = { ...NO_TIME };
	let start = Number.POSITIVE_INFINITY;
	let stop = Number.NEGATIVE_INFINITY;
	for (const member of members) {
		time[member.kind] += Math.max(
			0,
			Math.min(member.stop, to) - Math.max(member.start, from),
		);
		start = Math.min(start, member.start);
		stop = Math.max(stop, member.stop);
	}
	pieces.push({
		...bar,
		start: Math.max(from, start),
		stop: Math.min(to, stop),
		members,
		time,
		kind: dominantKind(time, members[0].kind),
	});
}

/**
 * The text written on a bar: the name of its test when it fits, else the number
 * it was given, or how many tests a merged bar stands for. A bar too narrow for
 * its test's name but not for a number becomes a candidate for one.
 */
function barLabel(
	bar: Bar,
	chart: Chart,
	lane: number,
	numbering: Numbering,
): string {
	if (bar.marker) {
		return "";
	}
	const { msPerPx, fontScale } = chart.geometry;
	// The bar is laid out in whole milliseconds, as it is written.
	const room = (bar.stop - bar.start) / msPerPx / fontScale - LABEL_PADDING;
	if (room < MIN_LABEL_ROOM) {
		return "";
	}
	if (bar.members.length > 1) {
		const label = `${bar.members.length} ${countNoun(bar)}`;
		return textWidth(label) <= room ? label : "";
	}
	const [execution] = bar.members;
	const name = fitText(chart.nameOf(execution), room, MIN_LABEL_CHARS);
	if (name !== "") {
		numbering.named?.add(execution);
		return name;
	}
	const number = numbering.numbers?.get(execution);
	if (
		number !== undefined &&
		!numbering.written?.has(execution) &&
		textWidth(String(number)) <= room
	) {
		numbering.written?.add(execution);
		return String(number);
	}
	let digits = 0;
	while (
		digits < MAX_NUMBER_DIGITS &&
		textWidth("8".repeat(digits + 1)) <= room
	) {
		digits++;
	}
	if (digits > 0) {
		numbering.candidates?.push({ execution, lane, digits });
	}
	return "";
}

function countNoun(bar: Bar): string {
	if (!isFailure(bar.kind)) {
		return "tests";
	}
	if (bar.members.some((member) => member.kind !== bar.kind)) {
		return "failures";
	}
	return bar.kind === "failed" ? "failed" : "attempts";
}

/** Width of a milestone diamond: a square of barHeight, turned 45° and scaled to 0.8. */
function diamondWidth(geometry: Geometry): number {
	return Math.ceil(geometry.barHeight * Math.SQRT2 * 0.8) + 1;
}

function taskLine(
	bar: Bar,
	label: string,
	clock: (time: number) => string,
): string {
	const start = Math.round(bar.start);
	const length = Math.max(0, Math.round(bar.stop) - start);
	const tags = KIND_TAGS[bar.kind] + (bar.diamond ? "milestone, " : "");
	// The zero-width space keeps names such as "section x" or "2024-01-01 y" from being read as keywords.
	return `${ZWSP}${label} :${tags}${clock(start)}, ${length}ms`;
}

/**
 * Mermaid keys sections in a plain object in compact mode: a name like
 * "constructor" breaks it and names like "1" jump ahead of the others. A
 * zero-width space in front keeps every name a plain, ordered key.
 */
function sectionName(name: string): string {
	return `${ZWSP}${name}`;
}

function ganttHeader(options: {
	leftPadding: number;
	compact: boolean;
	description: string;
	dateFormat: string;
	axisFormat: string;
}): string {
	return [
		"---",
		"config:",
		"  gantt:",
		"    displayMode: compact",
		`    useWidth: ${CHART_WIDTH}`,
		`    leftPadding: ${options.leftPadding}`,
		`    rightPadding: ${RIGHT_PADDING}`,
		...(options.compact
			? [
					"    barHeight: 12",
					"    barGap: 3",
					"    fontSize: 10",
					"    sectionFontSize: 10",
				]
			: []),
		`  themeCSS: "${THEME_CSS}"`,
		"  themeVariables:",
		...Object.entries(THEME_VARIABLES).map(
			([name, value]) => `    ${name}: '${value}'`,
		),
		"---",
		"gantt",
		"accTitle: Test execution timeline",
		`accDescr: ${limitUnits(sanitizeMermaidLine(options.description), 1000)}`,
		`dateFormat ${options.dateFormat}`,
		`axisFormat ${options.axisFormat}`,
		"todayMarker off",
	].join("\n");
}

/**
 * The axis is formatted in the viewer's time zone, and so are the parsed task
 * times, so a clock that starts at midnight shows elapsed time everywhere.
 */
function axisFormat(
	span: number,
	elapsed: boolean,
	run: { start: number; stop: number },
): string {
	if (!elapsed) {
		const sameYear =
			new Date(run.start).getUTCFullYear() ===
			new Date(run.stop).getUTCFullYear();
		return sameYear ? "%b %-d %H:%M" : "%Y-%m-%d %H:%M";
	}
	if (span < 10_000) {
		return "%-S.%Ls";
	}
	return span < 3_600_000 ? "%-M:%S" : "%-H:%M:%S";
}

/**
 * Elapsed time as a Mermaid date. The day is fixed to the 16th: no regular
 * daylight saving rule changes clocks on that day, so every hour exists.
 */
function mermaidClock(offset: number): string {
	const ms = Math.max(0, Math.round(offset));
	const hours = Math.floor(ms / 3_600_000);
	const minutes = Math.floor(ms / 60_000) % 60;
	const seconds = Math.floor(ms / 1000) % 60;
	return `16 ${pad(hours, 2)}:${pad(minutes, 2)}:${pad(seconds, 2)}.${pad(ms % 1000, 3)}`;
}

/**
 * Lane names as written in the chart: cleaned for Mermaid, shortened in the
 * middle to fit the margin (thread names often differ only at the end), and
 * unique, keeping more of the end where names would read the same.
 */
function chartLaneNames(lanes: TimelineLane[], fontScale: number): string[] {
	const room =
		(MAX_LEFT_PADDING - LANE_NAME_MARGIN) / SECTION_SCALE / fontScale;
	return distinctNames(
		lanes.map((lane) => sanitizeMermaidText(lane.name) || "(unnamed)"),
		(name, tail) =>
			limitUnits(fitMiddle(name, room, tail), MAX_LANE_NAME_UNITS),
	);
}
