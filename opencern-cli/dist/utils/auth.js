/**
 * Copyright (c) 2026 OpenCERN. All Rights Reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL — Enterprise Component
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 * See LICENSE.enterprise for full terms.
 */
import { getKey, hasKey, deleteKey } from './keystore.js';
const SERVICE = 'opencern-token';
export function getToken() {
    return getKey(SERVICE);
}
export function isAuthenticated() {
    return hasKey(SERVICE);
}
export function requireAuth() {
    const token = getToken();
    if (!token) {
        throw new Error('Not authenticated. Run /login to sign in.');
    }
    return token;
}
export function clearToken() {
    deleteKey(SERVICE);
}
export const auth = { getToken, isAuthenticated, requireAuth, clearToken };
export default auth;
//# sourceMappingURL=auth.js.map