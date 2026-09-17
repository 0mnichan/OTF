import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { googleEnabled, exchangeCode } from '@/lib/google.mjs';
import { upsertGoogleUser } from '@/lib/users.mjs';
import { startSession } from '@/lib/session';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const fail = (msg: string) => NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(msg)}`, request.url), 303);

  if (!googleEnabled()) return fail('Google sign-in is not configured.');

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const store = await cookies();
  const expected = store.get('g_state')?.value;
  store.delete('g_state');

  if (!code || !state || !expected || state !== expected) {
    return fail('Google sign-in failed (bad state). Please try again.');
  }

  try {
    const profile = await exchangeCode(request.url, code);
    if (!profile.email || !profile.emailVerified) {
      return fail('Your Google email is not verified.');
    }
    const user = upsertGoogleUser(profile);
    await startSession(user.id, request.headers.get('user-agent') ?? '');
    return NextResponse.redirect(new URL('/rooms', request.url), 303);
  } catch {
    return fail('Google sign-in failed. Please try again or use email.');
  }
}
