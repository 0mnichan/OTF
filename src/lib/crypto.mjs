/**
 * Password hashing, session tokens, answer normalisation and per-user flags.
 * Everything here uses node:crypto — no external dependencies.
 */
import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHmac,
  createHash,
} from 'node:crypto';

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

/** The signing secret. Refuses to start with the placeholder in production. */
export function secret() {
  const value = process.env.OTF_SECRET;
  if (!value || value.startsWith('change-me')) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'OTF_SECRET is unset or still the example value. Generate one with: openssl rand -hex 32',
      );
    }
    return 'otf-development-secret-not-for-production';
  }
  return value;
}

/* -------------------------------------------------------------------------- */
/* Passwords                                                                  */
/* -------------------------------------------------------------------------- */

/** @param {string} password @returns {string} `scrypt$N$r$p$salt$hash` */
export function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = scryptSync(password.normalize('NFKC'), salt, SCRYPT.keylen, SCRYPT);
  return [
    'scrypt',
    SCRYPT.N,
    SCRYPT.r,
    SCRYPT.p,
    salt.toString('base64url'),
    hash.toString('base64url'),
  ].join('$');
}

/**
 * Constant-time password check.
 * @param {string} password
 * @param {string} stored
 */
export function verifyPassword(password, stored) {
  try {
    const [scheme, N, r, p, saltB64, hashB64] = stored.split('$');
    if (scheme !== 'scrypt') return false;

    const salt = Buffer.from(saltB64, 'base64url');
    const expected = Buffer.from(hashB64, 'base64url');
    const actual = scryptSync(password.normalize('NFKC'), salt, expected.length, {
      N: Number(N),
      r: Number(r),
      p: Number(p),
    });
    return timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/* Tokens                                                                     */
/* -------------------------------------------------------------------------- */

export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString('base64url');
}

/* -------------------------------------------------------------------------- */
/* Answers                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Normalise a submitted answer so trivial formatting differences don't cost
 * a player points: trim, collapse internal whitespace, optionally case-fold.
 * @param {string} value
 * @param {boolean} caseSensitive
 */
export function normalizeAnswer(value, caseSensitive = false) {
  let out = String(value ?? '')
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ');
  if (!caseSensitive) out = out.toLowerCase();
  return out;
}

/** SHA-256 of an already-normalised answer. Content files hold the plaintext. */
export function hashAnswer(normalized) {
  return createHash('sha256').update(normalized, 'utf8').digest('hex');
}

/** Constant-time comparison of two hex digests. */
export function digestsEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}

/* -------------------------------------------------------------------------- */
/* Per-user dynamic flags                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Derive a flag unique to one player and one question.
 *
 * Two properties matter. A leaked flag is useless to anyone else, because it
 * will not validate against their derivation. And a shared flag is *traceable*:
 * given a submitted value we can recompute it for every user and find who
 * originally received it. Lab containers get this value injected at spawn.
 *
 * @param {number|string} userId
 * @param {string} questionRef  stable content-level reference, not a DB id
 * @param {string} prefix
 */
export function dynamicFlag(userId, questionRef, prefix = 'OTF') {
  const mac = createHmac('sha256', secret())
    .update(`flag:${userId}:${questionRef}`)
    .digest('hex')
    .slice(0, 24);
  return `${prefix}{${mac}}`;
}

/**
 * Identify which user a leaked flag was issued to.
 * @param {string} submitted
 * @param {string} questionRef
 * @param {Array<number|string>} candidateUserIds
 * @param {string} prefix
 * @returns {number|string|null}
 */
export function attributeFlag(submitted, questionRef, candidateUserIds, prefix = 'OTF') {
  const needle = normalizeAnswer(submitted, true);
  for (const id of candidateUserIds) {
    if (normalizeAnswer(dynamicFlag(id, questionRef, prefix), true) === needle) {
      return id;
    }
  }
  return null;
}
