/**
 * Next.js glue for sessions: cookie read/write on top of src/lib/users.mjs.
 * Server-side only.
 */
import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  SESSION_COOKIE,
  SESSION_DAYS,
  userForSession,
  createSession,
  destroySession,
} from './users.mjs';

export type Role = 'player' | 'author' | 'admin';

export interface CurrentUser {
  id: number;
  username: string;
  email: string;
  role: Role;
  points: number;
  bio: string;
  created_at: string;
}

/** The signed-in user, or null. Safe to call from any server component. */
export async function currentUser(): Promise<CurrentUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  return (userForSession(token) as CurrentUser | null) ?? null;
}

/** Require a signed-in user, redirecting to the login page otherwise. */
export async function requireUser(returnTo?: string): Promise<CurrentUser> {
  const user = await currentUser();
  if (!user) {
    const next = returnTo ? `?next=${encodeURIComponent(returnTo)}` : '';
    redirect(`/login${next}`);
  }
  return user;
}

const RANK: Record<Role, number> = { player: 0, author: 1, admin: 2 };

/** Require at least `role`. Renders a 404 rather than advertising the route. */
export async function requireRole(role: Role): Promise<CurrentUser> {
  const user = await requireUser();
  if (RANK[user.role] < RANK[role]) redirect('/');
  return user;
}

export async function startSession(userId: number, userAgent = '') {
  const token = createSession(userId, userAgent);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
  return token;
}

export async function endSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  destroySession(token);
  store.delete(SESSION_COOKIE);
}
