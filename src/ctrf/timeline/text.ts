/** Zero-width space, the first character of every Gantt task and section name. */
export const ZWSP = String.fromCharCode(0x200b);

// Longest name, in UTF-16 code units, worth measuring for a label.
const MAX_LABEL_UNITS = 300;

const graphemes = new Intl.Segmenter("en", { granularity: "grapheme" });

/**
 * Splits text into the characters a reader sees (grapheme clusters), so that
 * cutting text never splits an emoji, a flag or a letter with its marks.
 */
function characters(text: string): string[] {
	return Array.from(graphemes.segment(text), (part) => part.segment);
}

/** Puts text on one line: control characters and runs of whitespace become one space. */
export function oneLine(text: string): string {
	return (
		String(text ?? "")
			// biome-ignore lint/suspicious/noControlCharactersInRegex: control characters are what is removed
			.replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g, " ")
			.replace(/\s+/g, " ")
			.trim()
	);
}

/**
 * Makes text safe as a Mermaid Gantt task or section name: removes line breaks,
 * control characters, zero-width spaces and bidirectional overrides, and
 * replaces the characters the Gantt syntax, GitHub's diagram viewer or the
 * markdown fence give a meaning to. Joiners (ZWJ, ZWNJ) are kept, because
 * Persian, Indic scripts and emoji need them.
 *
 * @param text - Any text, such as a test name.
 * @returns Text that Mermaid draws as written.
 */
export function sanitizeMermaidText(text: string): string {
	// ":" ends the task name
	return sanitizeMermaidLine(text).replace(/:/g, "∶");
}

/**
 * Makes text safe as the rest of a Mermaid line, such as an accDescr: like
 * {@link sanitizeMermaidText}, but colons are kept.
 */
export function sanitizeMermaidLine(text: string): string {
	return (
		oneLine(
			String(text ?? "")
				.slice(0, MAX_LABEL_UNITS * 4)
				// half of a surrogate pair split by the cut
				.replace(/[\ud800-\udbff]$/, ""),
		)
			.replace(/[\u200b\u202a-\u202e\u2066-\u2069\ufeff]/g, "")
			.replace(/<br\s*\/?>/gi, " ")
			// ";" makes "#word;" an entity code, "%" starts comments and
			// directives, and GitHub decodes "&#10" or "&#58" before Mermaid reads
			// the diagram
			.replace(/;/g, ",")
			.replace(/%/g, "％")
			.replace(/&/g, "＆")
			// a backtick fence inside the name would close the markdown code block
			.replace(/`/g, "'")
			.replace(/\s+/g, " ")
			.trim()
	);
}

/**
 * Makes text a markdown table cell that shows it as written, for templates
 * that write it with `{{{ }}}`: one line, HTML and markdown punctuation
 * escaped, pipes escaped, and no @mentions, issue references or autolinks
 * when the summary is posted as a comment.
 */
export function escapeCell(text: string): string {
	return (
		oneLine(text)
			// links and images need "[", so "(", ")" and "!" can stay as they are
			.replace(/[\\`*_~[\]|]/g, "\\$&")
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			// GitHub reads "$...$" as math, and no escape stops that but HTML
			.replace(/\$/g, () => "<span>$</span>")
			// a word joiner keeps "@name", "#123", "GH-123", "https://", "www." and
			// ":emoji:" as they are
			.replace(/([@#])(?=\w)/g, "$1\u2060")
			.replace(/\b(gh)-(?=\d)/gi, "$1\u2060-")
			.replace(/:\/\//g, ":\u2060//")
			.replace(/\bwww\./gi, "www\u2060.")
			.replace(/:(?=[\w+-]+:)/g, ":\u2060")
	);
}

/**
 * Writes text as a markdown code span, which shows it exactly as written:
 * nothing inside is read as markdown or HTML, and @mentions do not link.
 */
export function codeSpan(text: string): string {
	const content = oneLine(text) || " ";
	let longest = 0;
	for (const run of content.match(/`+/g) ?? []) {
		longest = Math.max(longest, run.length);
	}
	const fence = "`".repeat(longest + 1);
	const space = /^`|`$/.test(content) ? " " : "";
	return `${fence}${space}${content}${space}${fence}`;
}

/**
 * A generous estimate of the width of 11px text in the fonts GitHub's diagrams
 * fall back through (Trebuchet MS, Verdana, Arial, DejaVu Sans). A label that
 * turns out wider than its bar is drawn outside it, over the next bar.
 */
export function textWidth(text: string): number {
	let width = 0;
	for (const character of characters(text)) {
		width += characterWidth(character);
	}
	return width;
}

function characterWidth(character: string): number {
	const code = character.codePointAt(0) ?? 0;
	let width: number;
	if (code === 0x200b) {
		width = 0;
	} else if (
		code >= 0x1f000 ||
		(code >= 0x2190 && code <= 0x2bff) ||
		character.includes("\ufe0f")
	) {
		// Arrows, symbols and dingbats (✓ ✗ ★ ⚡) are often drawn as emoji.
		width = 15;
	} else if (
		(code >= 0x1100 && code <= 0x115f) ||
		(code >= 0x2e80 && code <= 0xa4cf) ||
		(code >= 0xac00 && code <= 0xd7a3) ||
		(code >= 0xf900 && code <= 0xfaff) ||
		(code >= 0xfe30 && code <= 0xfe4f) ||
		(code >= 0xff00 && code <= 0xff60) ||
		(code >= 0xffe0 && code <= 0xffe6) ||
		code >= 0x20000
	) {
		width = 11.5;
	} else if ("MWmw@%&".includes(character)) {
		width = 10.2;
	} else if ("=<>+~^#".includes(character)) {
		// as wide as Verdana draws them
		width = 8.6;
	} else if ("|[]();:!".includes(character)) {
		width = 5.6;
	} else if ("iljtfr.,' ".includes(character)) {
		width = 4.4;
	} else if (code >= 0x41 && code <= 0x5a) {
		width = 7.6;
	} else if (code >= 0x30 && code <= 0x39) {
		width = 7;
	} else {
		width = code < 0x80 ? 6.2 : 8.6;
	}
	return width * 1.05;
}

/**
 * Returns the text if it fits the width, otherwise its longest prefix that fits
 * with an ellipsis, or an empty string if fewer than `minCharacters` fit.
 */
export function fitText(
	text: string,
	room: number,
	minCharacters: number,
): string {
	if (text.length <= MAX_LABEL_UNITS && textWidth(text) <= room) {
		return text;
	}
	const parts = characters(text.slice(0, MAX_LABEL_UNITS));
	let width = characterWidth("…");
	let kept = 0;
	for (const part of parts) {
		width += characterWidth(part);
		if (width > room) {
			break;
		}
		kept++;
	}
	return kept >= minCharacters
		? `${parts.slice(0, kept).join("").trimEnd()}…`
		: "";
}

/**
 * Shortens text in the middle to fit the width, keeping its last `tail`
 * characters, where thread names usually differ ("…worker-12"). The tail is
 * 10 characters by default, at most half the text.
 */
export function fitMiddle(text: string, room: number, tail?: number): string {
	if (text.length <= MAX_LABEL_UNITS && textWidth(text) <= room) {
		return text;
	}
	const parts = characters(text);
	const keep = Math.min(
		tail ?? Math.min(10, Math.floor(parts.length / 2)),
		parts.length - 1,
	);
	const end = keep > 0 ? parts.slice(-keep) : [];
	let width = textWidth(end.join("")) + characterWidth("…");
	let head = 0;
	for (const part of parts.slice(0, parts.length - keep)) {
		width += characterWidth(part);
		if (width > room) {
			break;
		}
		head++;
	}
	return head > 0
		? `${parts.slice(0, head).join("")}…${end.join("")}`
		: fitText(text, room, 1);
}

/**
 * Shortens text to at most `max` characters, keeping its start and its last
 * `tail` characters (a third of them by default).
 */
function truncateMiddle(text: string, max: number, tail?: number): string {
	const parts = characters(text);
	if (parts.length <= max) {
		return text;
	}
	const end = Math.max(0, Math.min(tail ?? Math.floor((max - 1) / 3), max - 2));
	return `${parts
		.slice(0, max - 1 - end)
		.join("")
		.trimEnd()}…${end > 0 ? parts.slice(-end).join("") : ""}`;
}

/**
 * Shortens a name for the tables and notes to at most `max` characters, keeping
 * its start and end, and to a length in code units that a few odd characters
 * (one with thousands of combining marks) cannot blow up.
 */
export function shorten(text: string, max: number, tail?: number): string {
	return limitUnits(truncateMiddle(text, max, tail), max * 4);
}

/** Shortens text to at most `max` UTF-16 code units, between characters. */
export function limitUnits(text: string, max: number): string {
	if (text.length <= max) {
		return text;
	}
	let kept = "";
	for (const part of characters(text.slice(0, max))) {
		if (kept.length + part.length > max - 1) {
			break;
		}
		kept += part;
	}
	return `${kept}…`;
}

/**
 * Shortens names with `shortenName` and keeps them apart: names that would read the
 * same keep more of their end, where names of threads usually differ, and any
 * that still read the same get a number.
 *
 * @param names - The names in full.
 * @param shortenName - Shortens a name, keeping `tail` characters of its end when given.
 */
export function distinctNames(
	names: string[],
	shortenName: (name: string, tail?: number) => string,
): string[] {
	const labels = names.map((name) => shortenName(name));
	const byLabel = new Map<string, number[]>();
	labels.forEach((label, index) => {
		const same = byLabel.get(label);
		if (same) {
			same.push(index);
		} else {
			byLabel.set(label, [index]);
		}
	});
	for (const indices of byLabel.values()) {
		const distinct = [...new Set(indices.map((index) => names[index]))];
		if (distinct.length > 1) {
			const tail = commonEnd(distinct) + 3;
			for (const index of indices) {
				labels[index] = shortenName(names[index], tail);
			}
		}
	}
	return uniqueNames(labels);
}

/** Number of characters at the end that all the names share. */
function commonEnd(names: string[]): number {
	const parts = names.map((name) => characters(name).reverse());
	let shared = 0;
	while (
		parts.every(
			(chars) => shared < chars.length && chars[shared] === parts[0][shared],
		)
	) {
		shared++;
	}
	return shared;
}

/** Makes names unique by numbering repeats: "a", "a [2]", "a [3]". */
function uniqueNames(names: string[]): string[] {
	const used = new Set<string>();
	return names.map((name) => {
		let unique = name;
		for (let number = 2; used.has(unique); number++) {
			unique = `${name} [${number}]`;
		}
		used.add(unique);
		return unique;
	});
}

/**
 * A test name with the attempt it stands for.
 *
 * @param name - The test name.
 * @param attempt - Undefined for the final result, 0 for a result from an earlier run.
 */
export function attemptName(name: string, attempt: number | undefined): string {
	if (attempt === undefined) {
		return name;
	}
	return attempt === 0
		? `${name} (earlier run)`
		: `${name} (attempt ${attempt})`;
}

/**
 * Formats a duration like the other reports do: 250ms, 1.5s, 3m 12s, 1h 5m.
 *
 * @param ms - Duration in milliseconds.
 * @returns A human readable duration.
 */
export function formatDuration(ms: number): string {
	const rounded = Math.max(0, Math.round(ms));
	if (rounded < 1000) {
		return `${rounded}ms`;
	}
	if (rounded < 60_000) {
		return `${(rounded / 1000).toFixed(1)}s`;
	}
	if (rounded < 3_600_000) {
		const minutes = Math.floor(rounded / 60_000);
		const seconds = Math.floor((rounded % 60_000) / 1000);
		return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
	}
	const hours = Math.floor(rounded / 3_600_000);
	const minutes = Math.floor((rounded % 3_600_000) / 60_000);
	return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

/** Elapsed time as the tables show it: m:ss.SSS, or h:mm:ss.SSS for long runs. */
export function formatClock(offset: number, span: number): string {
	const ms = Math.max(0, Math.round(offset));
	const seconds = `${pad(Math.floor(ms / 1000) % 60, 2)}.${pad(ms % 1000, 3)}`;
	if (span >= 3_600_000) {
		return `${Math.floor(ms / 3_600_000)}:${pad(Math.floor(ms / 60_000) % 60, 2)}:${seconds}`;
	}
	return `${Math.floor(ms / 60_000)}:${seconds}`;
}

export function pad(value: number, width: number): string {
	return String(value).padStart(width, "0");
}

export function plural(value: number, word: string): string {
	return value === 1 ? word : `${word}s`;
}

export function count(value: number, word: string): string {
	return `${value} ${plural(value, word)}`;
}

export function isAre(value: number): string {
	return value === 1 ? "is" : "are";
}

export function percent(ratio: number): string {
	return `${Math.round(Math.min(1, Math.max(0, ratio)) * 100)}%`;
}
