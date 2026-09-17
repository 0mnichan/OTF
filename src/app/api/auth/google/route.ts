import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { googleEnabled, authUrl } from '@/lib/google.mjs';
import { randomToken } from '@/lib/crypto.mjs';

export async function GET(request: Request) {
  if (!googleEnabled()) {
    return NextResponse.redirect(new URL('/login?error=Google+sign-in+is+not+configured', request.url), 303);
  }
  const state = randomToken(16);
  const store = await cookies();
  store.set('g_state', state, {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
    path: '/', maxAge: 600,
  });
  return NextResponse.redirect(authUrl(request.url, state), 303);
}
