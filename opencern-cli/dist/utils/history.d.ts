interface HistoryEntry {
    command: string;
    timestamp: string;
}
export declare function add(command: string): void;
export declare function getAll(): HistoryEntry[];
export declare function search(query: string): string[];
export declare function getPrevious(): string | null;
export declare function getNext(): string | null;
export declare function resetCursor(): void;
export declare function clear(): void;
export declare const history: {
    add: typeof add;
    getAll: typeof getAll;
    search: typeof search;
    getPrevious: typeof getPrevious;
    getNext: typeof getNext;
    resetCursor: typeof resetCursor;
    clear: typeof clear;
};
export default history;
//# sourceMappingURL=history.d.ts.map