export interface OpenCERNConfig {
    dataDir: string;
    defaultModel: string;
    quantumBackend: 'local' | 'ibm' | 'braket';
    theme: 'dark' | 'light';
    autoStartDocker: boolean;
    maxEvents: number;
    apiBaseUrl: string;
    quantumShots: number;
    debug: boolean;
}
declare function getConfigDir(): string;
declare function getConfigPath(): string;
declare function load(): OpenCERNConfig;
declare function save(cfg: OpenCERNConfig): void;
declare function get<K extends keyof OpenCERNConfig>(key: K): OpenCERNConfig[K];
declare function set<K extends keyof OpenCERNConfig>(key: K, value: OpenCERNConfig[K]): void;
declare function reset(): void;
declare function isFirstRun(): boolean;
export declare const config: {
    load: typeof load;
    save: typeof save;
    get: typeof get;
    set: typeof set;
    reset: typeof reset;
    getConfigPath: typeof getConfigPath;
    getConfigDir: typeof getConfigDir;
    isFirstRun: typeof isFirstRun;
};
export default config;
//# sourceMappingURL=config.d.ts.map