import { getKey, hasKey, deleteKey } from './keystore.js';

const SERVICE = 'opencern-token';

export interface AuthToken {
  token: string;
  username?: string;
  expiresAt?: string;
}

export function getToken(): string | null {
  return getKey(SERVICE);
}

export function isAuthenticated(): boolean {
  return hasKey(SERVICE);
}

export function requireAuth(): string {
  const token = getToken();
  if (!token) {
    throw new Error('Not authenticated. Run /login to sign in.');
  }
  return token;
}

export function clearToken(): void {
  deleteKey(SERVICE);
}

export const auth = { getToken, isAuthenticated, requireAuth, clearToken };
export default auth;
