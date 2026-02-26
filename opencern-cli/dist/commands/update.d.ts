export interface UpdateInfo {
    currentVersion: string;
    latestVersion: string;
    hasUpdate: boolean;
}
export declare function checkForUpdates(): Promise<UpdateInfo>;
export declare function updateDockerImages(onProgress: (image: string) => void): Promise<void>;
//# sourceMappingURL=update.d.ts.map