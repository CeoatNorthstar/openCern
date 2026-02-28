/**
 * Copyright (c) 2026 OpenCERN. All Rights Reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL — Enterprise Component
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 * See LICENSE.enterprise for full terms.
 */
export interface LoginResult {
    success: boolean;
    username?: string;
    error?: string;
}
export declare function login(onCode: (code: string, url: string) => void, onWaiting: () => void): Promise<LoginResult>;
export declare function logout(): Promise<void>;
export declare function getUsername(): string | null;
//# sourceMappingURL=auth.d.ts.map