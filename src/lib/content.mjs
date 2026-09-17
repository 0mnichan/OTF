/**
 * The content pipeline.
 *
 * Rooms live on disk under content/ as YAML + Markdown and are the single
 * source of truth. This module loads them, validates them against a schema,
 * and syncs them into SQLite, which acts purely as a queryable cache. That
 * means rooms are reviewed in pull requests and roll back like any other code.
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';
import { createHash } from 'node:crypto';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';
import { PROJECT_ROOT, all, get, run, transaction } from './db.mjs';
import { normalizeAnswer, hashAnswer } from './crypto.mjs';
import { scenarioExists } from './webterm/engine.mjs';

export const CONTENT_DIR = join(PROJECT_ROOT, 'content');
const ROOMS_DIR = join(CONTENT_DIR, 'rooms');
const PATHS_DIR = join(CONTENT_DIR, 'paths');

/* -------------------------------------------------------------------------- */
/* Schemas                                                                    */
/* -------------------------------------------------------------------------- */

const slug = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'must be a lowercase kebab-case slug');

const hintSchema = z.object({
  body: z.string().min(1),
  cost: z.number().int().min(0).default(0),
});

const questionSchema = z
  .object({
    ref: z
      .string()
      .regex(/^[a-z0-9][a-z0-9._-]*$/, 'ref must be lowercase alphanumeric with . _ -'),
    prompt: z.string().min(1),
    kind: z
      .enum(['static', 'regex', 'dynamic', 'numeric', 'choice', 'ack'])
      .default('static'),
    answer: z.union([z.string(), z.number()]).optional(),
    pattern: z.string().optional(),
    flag_prefix: z.string().default('OTF'),
    value: z.number().optional(),
    tolerance: z.number().min(0).default(0),
    unit: z.string().default(''),
    options: z.array(z.string()).optional(),
    correct: z.union([z.number().int(), z.array(z.number().int())]).optional(),
    points: z.number().int().min(0).default(10),
    case_sensitive: z.boolean().default(false),
    placeholder: z.string().default(''),
    explain: z.string().default(''),
    hints: z.array(hintSchema).default([]),
  })
  .superRefine((q, ctx) => {
    const need = (cond, msg) => {
      if (!cond) ctx.addIssue({ code: 'custom', message: msg });
    };
    if (q.kind === 'static') need(q.answer !== undefined, 'static questions need `answer`');
    if (q.kind === 'regex') {
      need(!!q.pattern, 'regex questions need `pattern`');
      if (q.pattern) {
        try {
          new RegExp(q.pattern);
        } catch (err) {
          ctx.addIssue({ code: 'custom', message: `invalid regex: ${err.message}` });
        }
      }
    }
    if (q.kind === 'numeric') need(q.value !== undefined, 'numeric questions need `value`');
    if (q.kind === 'choice') {
      need(Array.isArray(q.options) && q.options.length >= 2, 'choice questions need >= 2 `options`');
      need(q.correct !== undefined, 'choice questions need `correct`');
    }
  });

const taskFrontmatterSchema = z.object({
  title: z.string().min(1),
  questions: z.array(questionSchema).default([]),
});

const labServiceSchema = z.object({
  name: slug,
  image: z.string().min(1),
  // How the player reaches this service from the browser.
  expose: z.enum(['none', 'http', 'terminal']).default('none'),
  port: z.number().int().min(1).max(65535).optional(),
  label: z.string().default(''),
  env: z.record(z.string(), z.string()).default({}),
  command: z.union([z.string(), z.array(z.string())]).optional(),
  // Address inside the lab network, shown to the player in the briefing.
  hostname: z.string().default(''),
  cpus: z.number().positive().default(0.5),
  memory_mb: z.number().int().positive().default(256),
  privileged: z.literal(false).default(false),
});

const labSchema = z.object({
  enabled: z.boolean().default(true),
  ttl_minutes: z.number().int().min(5).max(240).default(60),
  network: z.string().default('otf-lab'),
  // Labs are sealed off from the internet by default: a training range must
  // never become a launch pad. Rooms cannot opt out.
  egress: z.literal(false).default(false),
  briefing: z.string().default(''),
  services: z.array(labServiceSchema).min(1),
});

// A web lab: a scenario the in-browser terminal simulates. No Docker needed.
const webLabSchema = z.object({
  scenario: z.string().min(1),
  briefing: z.string().default(''),
});

const roomSchema = z.object({
  slug,
  title: z.string().min(1),
  summary: z.string().default(''),
  difficulty: z.enum(['intro', 'easy', 'medium', 'hard', 'insane']).default('easy'),
  purdue_levels: z.array(z.number().int().min(0).max(5)).default([]),
  protocols: z.array(z.string()).default([]),
  attack_ics: z
    .array(z.string().regex(/^T\d{4}(\.\d{3})?$/, 'expected an ATT&CK for ICS id like T0836'))
    .default([]),
  tags: z.array(z.string()).default([]),
  points: z.number().int().min(0).optional(),
  est_minutes: z.number().int().min(1).default(30),
  author: z.string().default('OTF'),
  free: z.boolean().default(true),
  published: z.boolean().default(true),
  order: z.number().int().default(0),
  banner: z.string().default(''),
  prereqs: z.array(slug).default([]),
  lab: labSchema.optional(),
  web_lab: webLabSchema.optional(),
  tasks: z.array(z.string()).optional(),
});

const pathSchema = z.object({
  slug,
  title: z.string().min(1),
  summary: z.string().default(''),
  description: z.string().default(''),
  difficulty: z.string().default('beginner'),
  icon: z.string().default('path'),
  order: z.number().int().default(0),
  published: z.boolean().default(true),
  rooms: z.array(slug).min(1),
});

/* -------------------------------------------------------------------------- */
/* Parsing                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Split `---`-delimited YAML frontmatter from a Markdown body.
 * @param {string} text
 */
export function parseFrontmatter(text) {
  const source = text.replace(/^﻿/, '');
  if (!source.startsWith('---')) return { data: {}, body: source.trim() };

  const end = source.indexOf('\n---', 3);
  if (end === -1) return { data: {}, body: source.trim() };

  const raw = source.slice(source.indexOf('\n') + 1, end);
  const rest = source.slice(end + 4);
  return { data: parseYaml(raw) ?? {}, body: rest.replace(/^\r?\n/, '').trim() };
}

class ContentError extends Error {
  constructor(where, message) {
    super(`${where}: ${message}`);
    this.where = where;
    this.name = 'ContentError';
  }
}

function formatIssues(err) {
  return err.issues
    .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
    .join('\n');
}

/** Load and validate a single room directory. */
export function loadRoom(dir) {
  const manifestPath = join(dir, 'room.yaml');
  if (!existsSync(manifestPath)) {
    throw new ContentError(basename(dir), 'missing room.yaml');
  }

  const rawManifest = parseYaml(readFileSync(manifestPath, 'utf8')) ?? {};
  const parsed = roomSchema.safeParse(rawManifest);
  if (!parsed.success) {
    throw new ContentError(`${basename(dir)}/room.yaml`, `\n${formatIssues(parsed.error)}`);
  }
  const room = parsed.data;

  if (room.slug !== basename(dir)) {
    throw new ContentError(
      `${basename(dir)}/room.yaml`,
      `slug "${room.slug}" does not match its directory name`,
    );
  }

  // Tasks: explicit list in room.yaml, else every .md in tasks/ sorted by name.
  const tasksDir = join(dir, 'tasks');
  const files =
    room.tasks ??
    (existsSync(tasksDir)
      ? readdirSync(tasksDir)
          .filter((f) => f.endsWith('.md'))
          .sort()
          .map((f) => join('tasks', f))
      : []);

  if (files.length === 0) {
    throw new ContentError(basename(dir), 'room has no tasks');
  }

  const seenRefs = new Set();
  const tasks = files.map((relative, index) => {
    const file = join(dir, relative);
    if (!existsSync(file)) {
      throw new ContentError(room.slug, `task file not found: ${relative}`);
    }

    const { data, body } = parseFrontmatter(readFileSync(file, 'utf8'));
    const result = taskFrontmatterSchema.safeParse(data);
    if (!result.success) {
      throw new ContentError(`${room.slug}/${relative}`, `\n${formatIssues(result.error)}`);
    }

    for (const q of result.data.questions) {
      const qualified = `${room.slug}.${q.ref}`;
      if (seenRefs.has(q.ref)) {
        throw new ContentError(room.slug, `duplicate question ref "${q.ref}"`);
      }
      seenRefs.add(q.ref);
      q.qualifiedRef = qualified;
    }

    return {
      slug: basename(relative, '.md').replace(/^\d+[-_]/, ''),
      title: result.data.title,
      body,
      questions: result.data.questions,
      order: index,
    };
  });

  const computedPoints =
    room.points ??
    tasks.reduce((sum, t) => sum + t.questions.reduce((s, q) => s + q.points, 0), 0);

  const hash = createHash('sha256')
    .update(JSON.stringify({ room, tasks }))
    .digest('hex')
    .slice(0, 16);

  return { ...room, points: computedPoints, tasks, dir, content_hash: hash };
}

export function loadAllRooms() {
  if (!existsSync(ROOMS_DIR)) return [];
  return readdirSync(ROOMS_DIR)
    .filter((name) => statSync(join(ROOMS_DIR, name)).isDirectory())
    .sort()
    .map((name) => loadRoom(join(ROOMS_DIR, name)));
}

export function loadAllPaths() {
  if (!existsSync(PATHS_DIR)) return [];
  return readdirSync(PATHS_DIR)
    .filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'))
    .sort()
    .map((file) => {
      const raw = parseYaml(readFileSync(join(PATHS_DIR, file), 'utf8')) ?? {};
      const parsed = pathSchema.safeParse(raw);
      if (!parsed.success) {
        throw new ContentError(`paths/${file}`, `\n${formatIssues(parsed.error)}`);
      }
      return parsed.data;
    });
}

/**
 * Validate the whole content tree, including cross-references that a
 * per-file schema cannot catch.
 * @returns {{rooms: any[], paths: any[], errors: string[]}}
 */
export function validateContent() {
  const errors = [];
  let rooms = [];
  let paths = [];

  try {
    rooms = loadAllRooms();
  } catch (err) {
    errors.push(err.message);
  }
  try {
    paths = loadAllPaths();
  } catch (err) {
    errors.push(err.message);
  }

  const slugs = new Set(rooms.map((r) => r.slug));

  for (const room of rooms) {
    for (const prereq of room.prereqs) {
      if (!slugs.has(prereq)) {
        errors.push(`${room.slug}: prereq "${prereq}" does not exist`);
      }
      if (prereq === room.slug) {
        errors.push(`${room.slug}: room lists itself as a prerequisite`);
      }
    }
    // A room promising a lab-derived flag but shipping no lab (Docker or web)
    // is a dead end.
    const needsLab = room.tasks.some((t) => t.questions.some((q) => q.kind === 'dynamic'));
    if (needsLab && !room.lab && !room.web_lab) {
      errors.push(`${room.slug}: has dynamic flags but no lab (add a lab: or web_lab: block)`);
    }
    if (room.web_lab && !scenarioExists(room.web_lab.scenario)) {
      errors.push(`${room.slug}: web_lab scenario "${room.web_lab.scenario}" is not implemented in the terminal engine`);
    }
  }

  for (const path of paths) {
    for (const roomSlug of path.rooms) {
      if (!slugs.has(roomSlug)) {
        errors.push(`paths/${path.slug}: room "${roomSlug}" does not exist`);
      }
    }
  }

  // Prerequisite cycles would lock rooms behind each other forever.
  const graph = new Map(rooms.map((r) => [r.slug, r.prereqs]));
  const state = new Map();
  const walk = (node, trail) => {
    if (state.get(node) === 'done') return;
    if (state.get(node) === 'open') {
      errors.push(`prerequisite cycle: ${[...trail, node].join(' -> ')}`);
      return;
    }
    state.set(node, 'open');
    for (const next of graph.get(node) ?? []) walk(next, [...trail, node]);
    state.set(node, 'done');
  };
  for (const room of rooms) walk(room.slug, []);

  return { rooms, paths, errors: [...new Set(errors)] };
}

/* -------------------------------------------------------------------------- */
/* Sync                                                                       */
/* -------------------------------------------------------------------------- */

/** Build the DB `answer_spec` for a question, never storing a plaintext flag. */
function answerSpec(q) {
  switch (q.kind) {
    case 'static':
      return { hash: hashAnswer(normalizeAnswer(String(q.answer), q.case_sensitive)) };
    case 'regex':
      return { pattern: q.pattern, flags: q.case_sensitive ? '' : 'i' };
    case 'dynamic':
      return { prefix: q.flag_prefix };
    case 'numeric':
      return { value: q.value, tolerance: q.tolerance, unit: q.unit };
    case 'choice':
      return {
        options: q.options,
        correct: Array.isArray(q.correct) ? q.correct : [q.correct],
      };
    default:
      return {};
  }
}

/**
 * Write the validated content tree into SQLite.
 *
 * Tasks and questions are replaced wholesale per room, but rooms themselves are
 * upserted by slug so their primary keys — and therefore every player's
 * progress rows — survive a content edit. Question progress is keyed on the
 * stable `ref`, remapped below, for the same reason.
 */
export function syncContent({ quiet = false } = {}) {
  const { rooms, paths, errors } = validateContent();
  if (errors.length) {
    const err = new Error(`Content validation failed:\n${errors.map((e) => `  ${e}`).join('\n')}`);
    err.errors = errors;
    throw err;
  }

  const log = (...args) => {
    if (!quiet) console.log(...args);
  };

  return transaction(() => {
    for (const room of rooms) {
      const existing = get('SELECT id FROM rooms WHERE slug = ?', room.slug);
      const fields = [
        room.title,
        room.summary,
        room.difficulty,
        JSON.stringify(room.purdue_levels),
        JSON.stringify(room.protocols),
        JSON.stringify(room.attack_ics),
        JSON.stringify(room.tags),
        room.points,
        room.est_minutes,
        room.author,
        room.free,
        room.published,
        room.order,
        room.lab ? JSON.stringify(room.lab) : null,
        room.banner,
        room.content_hash,
        room.web_lab ? JSON.stringify(room.web_lab) : null,
      ];

      let roomId;
      if (existing) {
        roomId = existing.id;
        run(
          `UPDATE rooms SET title=?, summary=?, difficulty=?, purdue_levels=?, protocols=?,
                  attack_ics=?, tags=?, points=?, est_minutes=?, author=?, free=?, published=?,
                  order_index=?, lab_spec=?, banner=?, content_hash=?, web_lab=?, updated_at=datetime('now')
             WHERE id=?`,
          ...fields,
          roomId,
        );
      } else {
        const res = run(
          `INSERT INTO rooms (title, summary, difficulty, purdue_levels, protocols, attack_ics,
                              tags, points, est_minutes, author, free, published, order_index,
                              lab_spec, banner, content_hash, web_lab, slug)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          ...fields,
          room.slug,
        );
        roomId = Number(res.lastInsertRowid);
      }

      // Preserve progress across content edits by remapping ref -> new question id.
      const solvedByRef = new Map(
        all(
          `SELECT q.ref, qp.user_id, qp.points_awarded, qp.first_blood, qp.solved_at
             FROM question_progress qp JOIN questions q ON q.id = qp.question_id
            WHERE qp.room_id = ?`,
          roomId,
        ).map((r) => [`${r.ref}:${r.user_id}`, r]),
      );

      run('DELETE FROM tasks WHERE room_id = ?', roomId);
      run('DELETE FROM room_prereqs WHERE room_id = ?', roomId);

      for (const task of room.tasks) {
        const taskRes = run(
          'INSERT INTO tasks (room_id, slug, title, body_md, order_index) VALUES (?,?,?,?,?)',
          roomId,
          task.slug,
          task.title,
          task.body,
          task.order,
        );
        const taskId = Number(taskRes.lastInsertRowid);

        task.questions.forEach((q, qi) => {
          const qRes = run(
            `INSERT INTO questions (task_id, room_id, ref, prompt, kind, answer_spec, points,
                                    case_sensitive, placeholder, explain_md, order_index)
             VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
            taskId,
            roomId,
            q.ref,
            q.prompt,
            q.kind,
            JSON.stringify(answerSpec(q)),
            q.points,
            q.case_sensitive,
            q.placeholder,
            q.explain,
            qi,
          );
          const questionId = Number(qRes.lastInsertRowid);

          q.hints.forEach((h, hi) => {
            run(
              'INSERT INTO hints (question_id, body_md, cost, order_index) VALUES (?,?,?,?)',
              questionId,
              h.body,
              h.cost,
              hi,
            );
          });

          for (const [key, prior] of solvedByRef) {
            if (key.startsWith(`${q.ref}:`)) {
              run(
                `INSERT OR IGNORE INTO question_progress
                   (user_id, question_id, room_id, solved_at, points_awarded, first_blood)
                 VALUES (?,?,?,?,?,?)`,
                prior.user_id,
                questionId,
                roomId,
                prior.solved_at,
                prior.points_awarded,
                prior.first_blood,
              );
            }
          }
        });
      }

      log(`  room  ${room.slug.padEnd(28)} ${room.tasks.length} tasks, ${room.points} pts`);
    }

    // Prerequisites need every room to exist first.
    for (const room of rooms) {
      const me = get('SELECT id FROM rooms WHERE slug = ?', room.slug);
      for (const prereq of room.prereqs) {
        const other = get('SELECT id FROM rooms WHERE slug = ?', prereq);
        run(
          'INSERT OR IGNORE INTO room_prereqs (room_id, requires_room_id) VALUES (?,?)',
          me.id,
          other.id,
        );
      }
    }

    for (const p of paths) {
      const existing = get('SELECT id FROM paths WHERE slug = ?', p.slug);
      let pathId;
      if (existing) {
        pathId = existing.id;
        run(
          `UPDATE paths SET title=?, summary=?, description=?, difficulty=?, icon=?,
                  order_index=?, published=? WHERE id=?`,
          p.title, p.summary, p.description, p.difficulty, p.icon, p.order, p.published, pathId,
        );
      } else {
        const res = run(
          `INSERT INTO paths (title, summary, description, difficulty, icon, order_index, published, slug)
           VALUES (?,?,?,?,?,?,?,?)`,
          p.title, p.summary, p.description, p.difficulty, p.icon, p.order, p.published, p.slug,
        );
        pathId = Number(res.lastInsertRowid);
      }

      run('DELETE FROM path_rooms WHERE path_id = ?', pathId);
      p.rooms.forEach((roomSlug, index) => {
        const r = get('SELECT id FROM rooms WHERE slug = ?', roomSlug);
        run(
          'INSERT INTO path_rooms (path_id, room_id, order_index) VALUES (?,?,?)',
          pathId, r.id, index,
        );
      });
      log(`  path  ${p.slug.padEnd(28)} ${p.rooms.length} rooms`);
    }

    return { rooms: rooms.length, paths: paths.length };
  });
}
