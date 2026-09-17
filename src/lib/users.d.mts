/** Hand-written types for the plain-JS user module. */
export const SESSION_COOKIE: string;
export const SESSION_DAYS: number;

export interface UserRow {
  id: number;
  username: string;
  email: string;
  role: 'player' | 'author' | 'admin';
  points: number;
  bio: string;
  created_at: string;
  last_seen_at?: string | null;
}

export class ValidationError extends Error {
  field: string;
}

export function validateRegistration(input: {
  username?: string;
  email?: string;
  password?: string;
}): void;
export function createUser(input: {
  username: string;
  email: string;
  password: string;
  role?: string;
}): UserRow;
export function findUserById(id: number): UserRow | undefined;
export function findUserByUsername(username: string): UserRow | undefined;
export function authenticate(email: string, password: string): UserRow | null;
export function createSession(userId: number, userAgent?: string): string;
export function userForSession(sessionId?: string | null): UserRow | null;
export function destroySession(sessionId?: string | null): void;
export function pruneSessions(): number;
export function listUsers(opts?: { limit?: number; offset?: number }): UserRow[];
export function setUserRole(userId: number, role: string): UserRow | undefined;
export function updateProfile(userId: number, input: { bio?: string }): UserRow | undefined;
export function findUserByGoogleId(googleId: string): UserRow | undefined;
export function upsertGoogleUser(input: { googleId: string; email: string; name?: string }): UserRow;
