/** Auth: password hashing, credential verification, sessions, RBAC helpers. */
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { useDatabase } from '../src/lib/db.mjs';
import {
  createUser, authenticate, createSession, userForSession, destroySession,
  ValidationError, setUserRole, pruneSessions,
} from '../src/lib/users.mjs';
import { hashPassword, verifyPassword } from '../src/lib/crypto.mjs';

before(() => {
  useDatabase(join(mkdtempSync(join(tmpdir(), 'otf-auth-')), 'test.db'));
});

test('password hash verifies correctly and rejects wrong passwords', () => {
  const h = hashPassword('correct horse battery staple');
  assert.equal(verifyPassword('correct horse battery staple', h), true);
  assert.equal(verifyPassword('wrong', h), false);
  // Distinct salts produce distinct hashes for the same password.
  assert.notEqual(hashPassword('same'), hashPassword('same'));
});

test('createUser enforces validation', () => {
  assert.throws(() => createUser({ username: 'ab', email: 'a@b.co', password: 'longenough1' }),
    (e) => e instanceof ValidationError && e.field === 'username');
  assert.throws(() => createUser({ username: 'valid', email: 'nope', password: 'longenough1' }),
    (e) => e.field === 'email');
  assert.throws(() => createUser({ username: 'valid', email: 'a@b.co', password: 'short' }),
    (e) => e.field === 'password');
});

test('duplicate username and email are rejected', () => {
  createUser({ username: 'dupe', email: 'dupe@x.io', password: 'longenough1' });
  assert.throws(() => createUser({ username: 'DUPE', email: 'other@x.io', password: 'longenough1' }),
    (e) => e.field === 'username');
  assert.throws(() => createUser({ username: 'other', email: 'dupe@x.io', password: 'longenough1' }),
    (e) => e.field === 'email');
});

test('authenticate returns the user only on correct credentials', () => {
  createUser({ username: 'authy', email: 'authy@x.io', password: 'longenough1' });
  assert.equal(authenticate('authy@x.io', 'wrong'), null);
  assert.equal(authenticate('nobody@x.io', 'longenough1'), null); // unknown email
  const u = authenticate('authy@x.io', 'longenough1');
  assert.equal(u.username, 'authy');
});

test('sessions resolve to a user and can be destroyed', () => {
  const u = createUser({ username: 'sessy', email: 'sessy@x.io', password: 'longenough1' });
  const token = createSession(u.id);
  assert.equal(userForSession(token).id, u.id);
  destroySession(token);
  assert.equal(userForSession(token), null);
  assert.equal(userForSession('garbage'), null);
});

test('roles can be changed and are validated', () => {
  const u = createUser({ username: 'roley', email: 'roley@x.io', password: 'longenough1' });
  assert.equal(setUserRole(u.id, 'admin').role, 'admin');
  assert.throws(() => setUserRole(u.id, 'wizard'));
});

test('upsertGoogleUser: creates, then links by google_id and by email', async () => {
  const { upsertGoogleUser, findUserByGoogleId, createUser } = await import('../src/lib/users.mjs');
  // New Google user.
  const u1 = upsertGoogleUser({ googleId: 'g-100', email: 'gmailer@example.com', name: 'Gmail Person' });
  assert.ok(u1.id);
  assert.equal(u1.email, 'gmailer@example.com');
  // Same google_id returns the same user (no duplicate).
  const u1b = upsertGoogleUser({ googleId: 'g-100', email: 'gmailer@example.com', name: 'x' });
  assert.equal(u1b.id, u1.id);
  assert.ok(findUserByGoogleId('g-100'));
  // A pre-existing email account gets linked, not duplicated.
  const existing = createUser({ username: 'linkme', email: 'linkme@example.com', password: 'longenough1' });
  const linked = upsertGoogleUser({ googleId: 'g-200', email: 'linkme@example.com', name: 'Link Me' });
  assert.equal(linked.id, existing.id);
  assert.ok(findUserByGoogleId('g-200'));
});

test('upsertGoogleUser derives a unique username from the email', async () => {
  const { upsertGoogleUser } = await import('../src/lib/users.mjs');
  const a = upsertGoogleUser({ googleId: 'g-301', email: 'dup.name@example.com', name: 'dupname' });
  const b = upsertGoogleUser({ googleId: 'g-302', email: 'dupname@other.com', name: 'dupname' });
  assert.notEqual(a.username, b.username);
});
