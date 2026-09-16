import { NextResponse } from 'next/server';
import { createUser, ValidationError } from '@/lib/users.mjs';
import { startSession } from '@/lib/session';
import { get } from '@/lib/db.mjs';

export async function POST(request: Request) {
  if (process.env.OTF_OPEN_REGISTRATION !== '1') {
    // Even with registration closed, allow the very first account (bootstrap admin).
    const count = get('SELECT COUNT(*) AS n FROM users').n as number;
    if (count > 0) {
      return NextResponse.json({ error: 'Registration is currently invite-only.' }, { status: 403 });
    }
  }

  const form = await request.formData();
  const username = String(form.get('username') ?? '');
  const email = String(form.get('email') ?? '');
  const password = String(form.get('password') ?? '');

  try {
    // First-ever user becomes admin so a fresh instance is manageable.
    const isFirst = (get('SELECT COUNT(*) AS n FROM users').n as number) === 0;
    const user = createUser({ username, email, password, role: isFirst ? 'admin' : 'player' });
    await startSession(user.id, request.headers.get('user-agent') ?? '');
    return NextResponse.redirect(new URL('/rooms', request.url), 303);
  } catch (err) {
    if (err instanceof ValidationError) {
      const url = new URL('/register', request.url);
      url.searchParams.set('error', err.message);
      url.searchParams.set('field', err.field);
      return NextResponse.redirect(url, 303);
    }
    throw err;
  }
}
