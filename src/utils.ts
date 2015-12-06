export function arrayInitialize<T>(n: number, factory: () => T): T[] {
	return new Array(n).map(factory);
}

export function isFunction(x: any): boolean {
	return typeof x, 'function';
}
