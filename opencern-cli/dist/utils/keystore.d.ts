export declare function setKey(service: string, key: string): void;
export declare function getKey(service: string): string | null;
export declare function deleteKey(service: string): void;
export declare function hasKey(service: string): boolean;
export declare function maskKey(key: string): string;
export declare const keystore: {
    setKey: typeof setKey;
    getKey: typeof getKey;
    deleteKey: typeof deleteKey;
    hasKey: typeof hasKey;
    maskKey: typeof maskKey;
};
export default keystore;
//# sourceMappingURL=keystore.d.ts.map