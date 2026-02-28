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