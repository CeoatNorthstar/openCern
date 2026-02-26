/**
 * OpenCERN CLI Auth Worker
 *
 * Implements the device-code authentication flow for the CLI:
 *   POST /auth/cli/init     → Generate auth code, store in KV (5min TTL)
 *   GET  /auth/cli/poll     → Poll for authorization status
 *   POST /auth/cli/revoke   → Revoke/delete token
 *
 * KV Namespace: CLI_AUTH_CODES
 * Binding: CLI_AUTH_CODES (in wrangler.toml)
 */

export interface Env {
  CLI_AUTH_CODES: KVNamespace;
  JWT_SECRET: string;           // Secret for signing CLI JWTs
  CLERK_SECRET_KEY?: string;    // Optional Clerk integration
}

interface CodeEntry {
  code: string;
  status: 'pending' | 'authorized' | 'expired';
  token?: string;
  username?: string;
  createdAt: string;
}

const CODE_TTL_SECONDS = 300; // 5 minutes

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No ambiguous chars
  const segments = [4, 4];
  return segments.map(len =>
    Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  ).join('-');
}

async function signToken(username: string, secret: string): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    sub: username,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours
    iss: 'opencern-cli',
  };

  const encode = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  const data = `${encode(header)}.${encode(payload)}`;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  return `${data}.${sigB64}`;
}

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;

    // CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    // POST /auth/cli/init — Start device code flow
    if (method === 'POST' && url.pathname === '/auth/cli/init') {
      const code = generateCode();
      const entry: CodeEntry = {
        code,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      await env.CLI_AUTH_CODES.put(code, JSON.stringify(entry), {
        expirationTtl: CODE_TTL_SECONDS,
      });

      const expiresAt = new Date(Date.now() + CODE_TTL_SECONDS * 1000).toISOString();

      return json({
        code,
        expiresAt,
        pollUrl: `/auth/cli/poll?code=${code}`,
        authUrl: `https://app.opencern.io/auth/cli?code=${code}`,
      });
    }

    // GET /auth/cli/poll?code=XXXX — Check authorization status
    if (method === 'GET' && url.pathname === '/auth/cli/poll') {
      const code = url.searchParams.get('code');
      if (!code) return json({ error: 'Missing code' }, 400);

      const raw = await env.CLI_AUTH_CODES.get(code);
      if (!raw) return json({ status: 'expired' });

      const entry: CodeEntry = JSON.parse(raw);
      return json({ status: entry.status, token: entry.token, username: entry.username });
    }

    // POST /auth/cli/authorize — Called by web UI when user clicks "Authorize"
    // (Protected: requires Clerk session cookie or valid Clerk JWT)
    if (method === 'POST' && url.pathname === '/auth/cli/authorize') {
      let body: { code: string; username: string };
      try {
        body = await request.json() as { code: string; username: string };
      } catch {
        return json({ error: 'Invalid request body' }, 400);
      }

      const { code, username } = body;
      if (!code || !username) return json({ error: 'Missing code or username' }, 400);

      const raw = await env.CLI_AUTH_CODES.get(code);
      if (!raw) return json({ error: 'Code expired or not found' }, 404);

      const entry: CodeEntry = JSON.parse(raw);
      if (entry.status !== 'pending') return json({ error: 'Code already used' }, 409);

      // Issue CLI JWT
      const token = await signToken(username, env.JWT_SECRET);

      // Update KV entry with token
      entry.status = 'authorized';
      entry.token = token;
      entry.username = username;

      await env.CLI_AUTH_CODES.put(code, JSON.stringify(entry), {
        expirationTtl: 60, // Token can only be polled for 60s after authorization
      });

      return json({ ok: true });
    }

    // POST /auth/cli/revoke — Invalidate token (called on logout)
    if (method === 'POST' && url.pathname === '/auth/cli/revoke') {
      const code = url.searchParams.get('code');
      if (code) {
        await env.CLI_AUTH_CODES.delete(code);
      }
      return json({ ok: true });
    }

    return json({ error: 'Not found' }, 404);
  },
};
