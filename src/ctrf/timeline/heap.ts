/** A binary heap: `pop` returns the item that `less` puts first. */
export class MinHeap<T> {
	private readonly items: T[] = [];

	constructor(private readonly less: (a: T, b: T) => boolean) {}

	get size(): number {
		return this.items.length;
	}

	peek(): T | undefined {
		return this.items[0];
	}

	push(item: T): void {
		const items = this.items;
		items.push(item);
		let index = items.length - 1;
		while (index > 0) {
			const parent = (index - 1) >> 1;
			if (!this.less(items[index], items[parent])) {
				break;
			}
			[items[index], items[parent]] = [items[parent], items[index]];
			index = parent;
		}
	}

	pop(): T | undefined {
		const items = this.items;
		if (items.length === 0) {
			return undefined;
		}
		const top = items[0];
		const last = items.pop() as T;
		if (items.length > 0) {
			items[0] = last;
			let index = 0;
			for (;;) {
				const left = 2 * index + 1;
				const right = left + 1;
				let smallest = index;
				if (left < items.length && this.less(items[left], items[smallest])) {
					smallest = left;
				}
				if (right < items.length && this.less(items[right], items[smallest])) {
					smallest = right;
				}
				if (smallest === index) {
					break;
				}
				[items[index], items[smallest]] = [items[smallest], items[index]];
				index = smallest;
			}
		}
		return top;
	}
}
