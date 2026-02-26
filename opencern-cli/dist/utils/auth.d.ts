export interface AuthToken {
    token: string;
    username?: string;
    expiresAt?: string;
}
export declare function getToken(): string | null;
export declare function isAuthenticated(): boolean;
export declare function requireAuth(): string;
export declare function clearToken(): void;
export declare const auth: {
    getToken: typeof getToken;
    isAuthenticated: typeof isAuthenticated;
    requireAuth: typeof requireAuth;
    clearToken: typeof clearToken;
};
export default auth;
//# sourceMappingURL=auth.d.ts.map