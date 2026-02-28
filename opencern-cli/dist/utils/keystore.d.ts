/**
 * Copyright (c) 2026 OpenCERN. All Rights Reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL — Enterprise Component
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 * See LICENSE.enterprise for full terms.
 */
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