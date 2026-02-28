export interface LoginResult {
    success: boolean;
    username?: string;
    error?: string;
}
export declare function login(onCode: (code: string, url: string) => void, onWaiting: () => void): Promise<LoginResult>;
export declare function logout(): Promise<void>;
export declare function getUsername(): string | null;
//# sourceMappingURL=auth.d.ts.map