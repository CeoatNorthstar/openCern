// Next.js API Route — OAuth callback & token exchange for Claude Account
// POST /api/ai/oauth/token  — exchange auth code for access token
// The PKCE flow runs client-side; this route handles the token exchange.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CLAUDE_TOKEN_URL = 'https://platform.claude.com/v1/oauth/token'; // Bypass Cloudflare on claude.ai
const CLIENT_ID = '9d1c250a-e61b-44d9-88ed-5944d1962f5e'; // Official Claude Code client_id

export async function POST(request) {
  try {
    const { code, codeVerifier, redirectUri } = await request.json();

    if (!code || !codeVerifier || !redirectUri) {
      return Response.json({ error: 'Missing code, codeVerifier, or redirectUri' }, { status: 400 });
    }

    const response = await fetch(CLAUDE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: CLIENT_ID,
        code,
        code_verifier: codeVerifier,
        redirect_uri: redirectUri,
      }).toString(),
    });

    if (!response.ok) {
      const text = await response.text();
      return Response.json(
        { error: `Token exchange failed: ${response.status} ${text}` },
        { status: response.status }
      );
    }

    const tokens = await response.json();
    return Response.json(tokens);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
