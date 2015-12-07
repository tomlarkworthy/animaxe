export function arrayInitialize<T>(n: number, factory: () => T): T[] {
	var arr = new Array(n);
	for (let i = 0; i < n; i++) arr[i] = factory();
	return arr;
}

export function isFunction(x: any): boolean {
	return typeof x == 'function';
}
