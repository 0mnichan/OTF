import { NextResponse } from 'next/server';
import { authenticate } from '@/lib/users.mjs';
import { startSession } from '@/lib/session';

export async function POST(request: Request) {
  const form = await request.formData();
  const email = String(form.get('email') ?? '');
  const password = String(form.get('password') ?? '');
  const next = String(form.get('next') ?? '/rooms');

  const user = authenticate(email, password);
  if (!user) {
    const url = new URL('/login', request.url);
    url.searchParams.set('error', 'Incorrect email or password.');
    if (next && next.startsWith('/')) url.searchParams.set('next', next);
    return NextResponse.redirect(url, 303);
  }

  await startSession(user.id, request.headers.get('user-agent') ?? '');
  const dest = next.startsWith('/') ? next : '/rooms';
  return NextResponse.redirect(new URL(dest, request.url), 303);
}
