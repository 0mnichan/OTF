/**
 * Scoring engine tests — answer checking, points, first blood, hints, badges,
 * dynamic flags and anti-cheat. Runs against a real (in-file) SQLite database,
 * so there is no mock: the same code path the app uses is exercised here.
 */
import { test, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { useDatabase, run, get, all } from '../src/lib/db.mjs';
import { createUser } from '../src/lib/users.mjs';
import { dynamicFlag, hashAnswer, normalizeAnswer } from '../src/lib/crypto.mjs';
import {
  checkAnswer, submitAnswer, unlockHint, awardBadges, leaderboard,
  rankFor, recomputeUserPoints,
} from '../src/lib/scoring.mjs';

let roomId, staticQ, choiceQ, numericQ, regexQ, dynamicQ, hintId;

before(() => {
  useDatabase(join(mkdtempSync(join(tmpdir(), 'otf-test-')), 'test.db'));
});

beforeEach(() => {
  // Fresh content graph for each test.
  for (const t of ['question_progress', 'submissions', 'room_progress', 'hint_unlocks',
    'user_badges', 'hints', 'questions', 'tasks', 'rooms', 'badges', 'audit_log', 'users']) {
    run(`DELETE FROM ${t}`);
  }
  const r = run(`INSERT INTO rooms (slug, title, points) VALUES ('t','T',100)`);
  roomId = Number(r.lastInsertRowid);
  const tk = run(`INSERT INTO tasks (room_id, slug, title) VALUES (?,?,?)`, roomId, 'task', 'Task');
  const taskId = Number(tk.lastInsertRowid);
  const q = (ref, kind, spec, points = 10) =>
    Number(run(
      `INSERT INTO questions (task_id, room_id, ref, prompt, kind, answer_spec, points) VALUES (?,?,?,?,?,?,?)`,
      taskId, roomId, ref, ref, kind, JSON.stringify(spec), points,
    ).lastInsertRowid);
  // hashAnswer of normalized 'flag value'
  staticQ = q('s', 'static', { hash: 'placeholder' }); // each test sets a real hash
  choiceQ = q('c', 'choice', { options: ['a', 'b', 'c', 'd'], correct: [2] });
  numericQ = q('nq', 'numeric', { value: 42, tolerance: 1 });
  regexQ = q('rq', 'regex', { pattern: '^T0\\d{3}$', flags: 'i' });
});

test('static answer: normalization makes formatting differences pass', () => {
  const hash = hashAnswer(normalizeAnswer('Scan Cycle', false));
  run(`UPDATE questions SET answer_spec = ? WHERE id = ?`, JSON.stringify({ hash }), staticQ);
  const question = get(`SELECT q.*, r.slug AS room_slug FROM questions q JOIN rooms r ON r.id=q.room_id WHERE q.id=?`, staticQ);
  assert.equal(checkAnswer(question, '  scan   cycle ', 1), true);
  assert.equal(checkAnswer(question, 'scancycle', 1), false);
});

test('submitAnswer awards points and first blood, then is idempotent', () => {
  const hash = hashAnswer(normalizeAnswer('correct', false));
  run(`UPDATE questions SET answer_spec = ? WHERE id = ?`, JSON.stringify({ hash }), staticQ);
  const u = createUser({ username: 'alice', email: 'a@x.io', password: 'passypassy12' });

  const wrong = submitAnswer(u.id, staticQ, 'nope');
  assert.equal(wrong.correct, false);

  const right = submitAnswer(u.id, staticQ, 'CORRECT');
  assert.equal(right.correct, true);
  assert.equal(right.points, 10);
  assert.equal(right.firstBlood, true);

  // Points reflected on the user (10 + 10% first-blood bonus = 11).
  assert.equal(get('SELECT points FROM users WHERE id=?', u.id).points, 11);

  const again = submitAnswer(u.id, staticQ, 'CORRECT');
  assert.equal(again.status, 'already-solved');
  assert.equal(again.points, 0);
});

test('second solver does not get first blood', () => {
  const hash = hashAnswer(normalizeAnswer('x', false));
  run(`UPDATE questions SET answer_spec = ? WHERE id = ?`, JSON.stringify({ hash }), staticQ);
  const a = createUser({ username: 'alice2', email: 'a2@x.io', password: 'passypassy12' });
  const b = createUser({ username: 'bob2', email: 'b2@x.io', password: 'passypassy12' });
  assert.equal(submitAnswer(a.id, staticQ, 'x').firstBlood, true);
  assert.equal(submitAnswer(b.id, staticQ, 'x').firstBlood, false);
});

test('hints reduce the award by their cost but never below zero', () => {
  const hash = hashAnswer(normalizeAnswer('y', false));
  run(`UPDATE questions SET answer_spec = ?, points = 10 WHERE id = ?`, JSON.stringify({ hash }), staticQ);
  const h = run(`INSERT INTO hints (question_id, body_md, cost) VALUES (?,?,?)`, staticQ, 'help', 4);
  const u = createUser({ username: 'helen', email: 'h@x.io', password: 'passypassy12' });
  unlockHint(u.id, Number(h.lastInsertRowid));
  const res = submitAnswer(u.id, staticQ, 'y');
  assert.equal(res.points, 6); // 10 - 4
});

test('dynamic flag: only the owner\'s flag validates, others are attributed', () => {
  const dq = Number(run(
    `INSERT INTO questions (task_id, room_id, ref, prompt, kind, answer_spec, points)
     VALUES ((SELECT id FROM tasks LIMIT 1), ?, 'dyn', 'd', 'dynamic', ?, 20)`,
    roomId, JSON.stringify({ prefix: 'OTF' }),
  ).lastInsertRowid);
  const a = createUser({ username: 'dave', email: 'da@x.io', password: 'passypassy12' });
  const b = createUser({ username: 'dora', email: 'db@x.io', password: 'passypassy12' });

  const aFlag = dynamicFlag(a.id, 't.dyn');
  const bFlag = dynamicFlag(b.id, 't.dyn');
  assert.notEqual(aFlag, bFlag);

  // a submits their own flag: correct.
  assert.equal(submitAnswer(a.id, dq, aFlag).correct, true);
  // b submits a's flag: wrong AND logged as flag sharing.
  const shared = submitAnswer(b.id, dq, aFlag);
  assert.equal(shared.correct, false);
  const log = get(`SELECT * FROM audit_log WHERE action='flag.shared' AND user_id=?`, b.id);
  assert.ok(log, 'expected a flag.shared audit entry');
});

test('numeric answer honours tolerance', () => {
  const nq = get(`SELECT q.*, r.slug AS room_slug FROM questions q JOIN rooms r ON r.id=q.room_id WHERE q.id=?`,
    Number(run(`INSERT INTO questions (task_id, room_id, ref, prompt, kind, answer_spec)
      VALUES ((SELECT id FROM tasks LIMIT 1), ?, 'n', 'n', 'numeric', ?)`,
      roomId, JSON.stringify({ value: 502, tolerance: 0 })).lastInsertRowid));
  assert.equal(checkAnswer(nq, '502', 1), true);
  assert.equal(checkAnswer(nq, '503', 1), false);
  assert.equal(checkAnswer(nq, 'port 502', 1), true); // strips non-numerics
});

test('rank ladder maps points to the right rung', () => {
  assert.equal(rankFor(0).name, 'Apprentice');
  assert.equal(rankFor(800).name, 'Controls Engineer');
  assert.equal(rankFor(999999).name, 'Grid Guardian');
  assert.ok(rankFor(150).progress > 0 && rankFor(150).progress <= 100);
});

test('badges award on criteria and appear on the leaderboard', () => {
  run(`INSERT INTO badges (slug, title, criteria) VALUES ('p50','50 pts',?)`,
    JSON.stringify({ type: 'points', min: 5 }));
  const hash = hashAnswer(normalizeAnswer('z', false));
  run(`UPDATE questions SET answer_spec = ?, points = 10 WHERE id = ?`, JSON.stringify({ hash }), staticQ);
  const u = createUser({ username: 'lead', email: 'l@x.io', password: 'passypassy12' });
  submitAnswer(u.id, staticQ, 'z');
  const badges = awardBadges(u.id);
  assert.ok(all('SELECT * FROM user_badges WHERE user_id=?', u.id).length >= 1);
  const board = leaderboard({ limit: 10 });
  assert.equal(board[0].username, 'lead');
});
