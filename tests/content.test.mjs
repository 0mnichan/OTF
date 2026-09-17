/** Content pipeline: the real repo content validates, syncs, and gates. */
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { useDatabase, get, all } from '../src/lib/db.mjs';
import { validateContent, syncContent, parseFrontmatter } from '../src/lib/content.mjs';

before(() => {
  useDatabase(join(mkdtempSync(join(tmpdir(), 'otf-content-')), 'test.db'));
});

test('the shipped content tree validates with no errors', () => {
  const { rooms, paths, errors } = validateContent();
  assert.deepEqual(errors, [], `content errors:\n${errors.join('\n')}`);
  assert.ok(rooms.length >= 6, 'expected at least six rooms');
  assert.ok(paths.length >= 2, 'expected at least two paths');
});

test('every dynamic-flag room ships a lab', () => {
  const { rooms } = validateContent();
  for (const room of rooms) {
    const hasDynamic = room.tasks.some((t) => t.questions.some((q) => q.kind === 'dynamic'));
    if (hasDynamic) assert.ok(room.lab || room.web_lab, `${room.slug} has dynamic flags but no lab`);
  }
});

test('sync populates rooms, tasks, questions and never stores a plaintext flag', () => {
  syncContent({ quiet: true });
  const roomCount = get('SELECT COUNT(*) AS n FROM rooms').n;
  assert.ok(roomCount >= 6);

  // Static answers are stored only as hashes.
  for (const q of all("SELECT answer_spec FROM questions WHERE kind='static'")) {
    const spec = JSON.parse(q.answer_spec);
    assert.ok(spec.hash && /^[0-9a-f]{64}$/.test(spec.hash), 'static answer must be a sha256 hash');
  }
  // Dynamic questions store only a prefix, never a flag value.
  for (const q of all("SELECT answer_spec FROM questions WHERE kind='dynamic'")) {
    const spec = JSON.parse(q.answer_spec);
    assert.ok(!('flag' in spec) && !('value' in spec), 'dynamic spec must not carry a flag');
  }
});

test('sync is idempotent — re-running does not duplicate rooms', () => {
  syncContent({ quiet: true });
  const first = get('SELECT COUNT(*) AS n FROM rooms').n;
  syncContent({ quiet: true });
  const second = get('SELECT COUNT(*) AS n FROM rooms').n;
  assert.equal(first, second);
});

test('frontmatter parser splits YAML and body', () => {
  const { data, body } = parseFrontmatter('---\ntitle: Hi\n---\n\nHello world');
  assert.equal(data.title, 'Hi');
  assert.equal(body, 'Hello world');
});

test('prerequisites form a DAG (no cycles) and all resolve', () => {
  const { errors } = validateContent();
  assert.ok(!errors.some((e) => e.includes('cycle')), 'prereqs must not contain a cycle');
});
