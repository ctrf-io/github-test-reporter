/** Adapt response IDs to Octokit request parameters without losing precision. */
export function requestId(value: number | bigint): number {
	const id = Number(value);
	if (!Number.isSafeInteger(id) || id < 0) {
		throw new RangeError("GitHub ID exceeds the supported integer range");
	}
	return id;
}
