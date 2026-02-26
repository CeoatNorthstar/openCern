export interface VizResult {
    method: 'desktop' | 'browser' | 'ascii';
    message: string;
}
export declare function checkDesktopApp(): boolean;
export declare function openViz(filePath: string, forceBrowser?: boolean): VizResult;
export declare function renderASCII(filePath: string): string[];
//# sourceMappingURL=viz.d.ts.map