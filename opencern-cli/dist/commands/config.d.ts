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
//# sourceMappingURL=config.d.ts.map