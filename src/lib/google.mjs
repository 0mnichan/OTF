/**
 * Google OAuth 2.0 (authorization code flow), dependency-free.
 *
 * Enabled only when GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set, so the
 * platform runs fine without it. The redirect URI is derived from OTF_BASE_URL
 * (preferred, must match the Google console) or the incoming request origin.
 */
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';

export function googleEnabled() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function redirectUri(requestUrl) {
  const base = process.env.OTF_BASE_URL || new URL(requestUrl).origin;
  return `${base.replace(/\/$/, '')}/api/auth/google/callback`;
}

/** Build the Google consent-screen URL. */
export function authUrl(requestUrl, state) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri(requestUrl),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'online',
    prompt: 'select_account',
  });
  return `${AUTH_URL}?${params.toString()}`;
}

/** Exchange an auth code for tokens, then fetch the verified user profile. */
export async function exchangeCode(requestUrl, code) {
  const tokenRes = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri(requestUrl),
      grant_type: 'authorization_code',
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!tokenRes.ok) {
    throw new Error(`token exchange failed: ${tokenRes.status}`);
  }
  const tokens = await tokenRes.json();

  const infoRes = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
    signal: AbortSignal.timeout(10000),
  });
  if (!infoRes.ok) {
    throw new Error(`userinfo failed: ${infoRes.status}`);
  }
  const info = await infoRes.json();
  // `sub` is Google's stable user id; email_verified guards against spoofing.
  return {
    googleId: info.sub,
    email: info.email,
    emailVerified: info.email_verified === true || info.email_verified === 'true',
    name: info.name || info.given_name || '',
  };
}
