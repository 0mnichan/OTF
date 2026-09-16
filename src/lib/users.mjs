/**
 * User and session persistence. Kept in plain JS so the CLI scripts
 * (seed, admin) can share it with the Next.js app.
 */
import { all, get, run, transaction } from './db.mjs';
import { hashPassword, verifyPassword, randomToken } from './crypto.mjs';

export const SESSION_COOKIE = 'otf_session';
export const SESSION_DAYS = 30;

const USERNAME_RE = /^[a-zA-Z0-9_-]{3,24}$/;
const EMAIL_RE = /^[^@\s]+@[^@\s.]+\.[^@\s]+$/;

export class ValidationError extends Error {
  constructor(field, message) {
    super(message);
    this.field = field;
    this.name = 'ValidationError';
  }
}

export function validateRegistration({ username, email, password }) {
  if (!USERNAME_RE.test(username ?? '')) {
    throw new ValidationError(
      'username',
      'Username must be 3-24 characters, letters, numbers, underscore or hyphen.',
    );
  }
  if (!EMAIL_RE.test(email ?? '')) {
    throw new ValidationError('email', 'Enter a valid email address.');
  }
  if ((password ?? '').length < 10) {
    throw new ValidationError('password', 'Password must be at least 10 characters.');
  }
}

/**
 * Create a user. Throws ValidationError on bad input or a taken
 * username/email so callers can surface a field-level message.
 */
export function createUser({ username, email, password, role = 'player' }) {
  validateRegistration({ username, email, password });

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedUsername = username.trim();

  if (get('SELECT 1 FROM users WHERE lower(username) = ?', normalizedUsername.toLowerCase())) {
    throw new ValidationError('username', 'That username is already taken.');
  }
  if (get('SELECT 1 FROM users WHERE email = ?', normalizedEmail)) {
    throw new ValidationError('email', 'An account already exists for that email.');
  }

  const result = run(
    'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
    normalizedUsername,
    normalizedEmail,
    hashPassword(password),
    role,
  );
  return findUserById(Number(result.lastInsertRowid));
}

export function findUserById(id) {
  return get(
    `SELECT id, username, email, role, points, bio, created_at, last_seen_at
       FROM users WHERE id = ?`,
    id,
  );
}

export function findUserByUsername(username) {
  return get(
    `SELECT id, username, email, role, points, bio, created_at, last_seen_at
       FROM users WHERE lower(username) = ?`,
    String(username).toLowerCase(),
  );
}

/**
 * Verify credentials. Always runs a hash comparison, even for an unknown
 * email, so response time doesn't reveal whether an account exists.
 */
export function authenticate(email, password) {
  const row = get(
    'SELECT id, password_hash FROM users WHERE email = ?',
    String(email ?? '').trim().toLowerCase(),
  );
  const stored =
    row?.password_hash ??
    'scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

  const ok = verifyPassword(password ?? '', stored);
  return ok && row ? findUserById(row.id) : null;
}

/* -------------------------------------------------------------------------- */
/* Sessions                                                                   */
/* -------------------------------------------------------------------------- */

export function createSession(userId, userAgent = '') {
  const id = randomToken(32);
  run(
    `INSERT INTO sessions (id, user_id, expires_at, user_agent)
     VALUES (?, ?, datetime('now', ?), ?)`,
    id,
    userId,
    `+${SESSION_DAYS} days`,
    String(userAgent).slice(0, 255),
  );
  return id;
}

/** Resolve a session token to a user, or null if missing/expired. */
export function userForSession(sessionId) {
  if (!sessionId) return null;
  const row = get(
    `SELECT u.id, u.username, u.email, u.role, u.points, u.bio, u.created_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.id = ? AND s.expires_at > datetime('now')`,
    sessionId,
  );
  if (row) {
    run("UPDATE users SET last_seen_at = datetime('now') WHERE id = ?", row.id);
  }
  return row ?? null;
}

export function destroySession(sessionId) {
  if (sessionId) run('DELETE FROM sessions WHERE id = ?', sessionId);
}

/** Housekeeping: drop expired sessions. Called opportunistically. */
export function pruneSessions() {
  return run("DELETE FROM sessions WHERE expires_at <= datetime('now')").changes;
}

export function listUsers({ limit = 50, offset = 0 } = {}) {
  return all(
    `SELECT id, username, email, role, points, created_at, last_seen_at
       FROM users ORDER BY points DESC, id ASC LIMIT ? OFFSET ?`,
    limit,
    offset,
  );
}

export function setUserRole(userId, role) {
  if (!['player', 'author', 'admin'].includes(role)) {
    throw new ValidationError('role', 'Unknown role.');
  }
  run('UPDATE users SET role = ? WHERE id = ?', role, userId);
  return findUserById(userId);
}

export function updateProfile(userId, { bio }) {
  return transaction(() => {
    run('UPDATE users SET bio = ? WHERE id = ?', String(bio ?? '').slice(0, 500), userId);
    return findUserById(userId);
  });
}
