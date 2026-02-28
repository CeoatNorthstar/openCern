/**
 * Copyright (c) 2026 OpenCERN. All Rights Reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL — Enterprise Component
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 * See LICENSE.enterprise for full terms.
 */
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