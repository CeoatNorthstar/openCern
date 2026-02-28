/**
 * Copyright (c) 2026 OpenCERN. All Rights Reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL — Enterprise Component
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 * See LICENSE.enterprise for full terms.
 */
export interface ConfigItem {
    key: string;
    label: string;
    description: string;
    type: 'secret' | 'choice' | 'boolean' | 'string';
    choices?: string[];
    required?: boolean;
    current?: string;
}
export declare function getConfigItems(): ConfigItem[];
export declare function setConfigValue(key: string, value: string): Promise<{
    success: boolean;
    error?: string;
}>;
export declare function showConfig(): string[];
export declare function resetConfig(): void;
export declare function getKeyStatus(): string[];
export declare function setApiKey(provider: string, key: string): {
    success: boolean;
    message: string;
};
export declare function removeApiKey(provider: string): {
    success: boolean;
    message: string;
};
//# sourceMappingURL=config.d.ts.map