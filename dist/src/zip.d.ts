import * as Rx from "rx";
/**
 * Merges the specified observable sequences into one observable sequence by using the selector function whenever all of the observable sequences or an array have produced an element at a corresponding index.
 * The last element in the arguments must be a function to invoke for each series of elements at corresponding indexes in the args.
 * @returns {Observable} An observable sequence containing the result of combining elements of the args using the specified result selector function.
 */
export declare function zip<T>(resultSelector: (...sourcesValues: any[]) => T, ...sources: Rx.Observable<any>[]): Rx.Observable<T>;
