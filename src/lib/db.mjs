/**
 * SQLite access layer built on Node's built-in `node:sqlite`.
 *
 * Deliberately dependency-free: no ORM, no codegen, no migration framework.
 * The whole persistence story is this file plus the .sql files in db/migrations,
 * which means it runs anywhere Node 22 runs with no database server to install.
 */
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = resolve(HERE, '..', '..');
const MIGRATIONS_DIR = join(PROJECT_ROOT, 'db', 'migrations');

/** @type {DatabaseSync | null} */
let handle = null;

export function dbPath() {
  const configured = process.env.OTF_DB_PATH ?? './data/otf.db';
  return resolve(PROJECT_ROOT, configured);
}

/**
 * Open (once per process) and return the database handle, running any pending
 * migrations on first open.
 * @returns {DatabaseSync}
 */
export function getDb() {
  if (handle) return handle;

  const path = dbPath();
  mkdirSync(dirname(path), { recursive: true });

  handle = new DatabaseSync(path);
  // WAL keeps readers from blocking on the writer, which matters because Next
  // renders several pages concurrently against this one file.
  handle.exec('PRAGMA journal_mode = WAL');
  handle.exec('PRAGMA foreign_keys = ON');
  handle.exec('PRAGMA busy_timeout = 5000');

  migrate(handle);
  return handle;
}

/**
 * Apply every migration that has not been recorded yet, each in its own
 * transaction so a failure leaves the database on the last good version.
 * @param {DatabaseSync} db
 */
export function migrate(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS _migrations (
    name        TEXT PRIMARY KEY,
    applied_at  TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  if (!existsSync(MIGRATIONS_DIR)) return [];

  const applied = new Set(
    db.prepare('SELECT name FROM _migrations').all().map((r) => r.name),
  );
  const pending = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .filter((f) => !applied.has(f));

  for (const file of pending) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
    db.exec('BEGIN');
    try {
      db.exec(sql);
      db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(file);
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw new Error(`Migration ${file} failed: ${err.message}`);
    }
  }
  return pending;
}

/* -------------------------------------------------------------------------- */
/* Query helpers                                                              */
/* -------------------------------------------------------------------------- */

/**
 * SQLite has no boolean type; normalise JS values to things it accepts.
 * @param {unknown[]} params
 */
function bind(params) {
  return params.map((p) => {
    if (typeof p === 'boolean') return p ? 1 : 0;
    if (p === undefined) return null;
    return p;
  });
}

/** @returns {any[]} */
export function all(sql, ...params) {
  return getDb().prepare(sql).all(...bind(params));
}

/** @returns {any | undefined} */
export function get(sql, ...params) {
  return getDb().prepare(sql).get(...bind(params));
}

export function run(sql, ...params) {
  return getDb().prepare(sql).run(...bind(params));
}

/**
 * Run `fn` inside a transaction, rolling back if it throws.
 * Nested calls reuse the outer transaction rather than failing.
 * @template T
 * @param {() => T} fn
 * @returns {T}
 */
export function transaction(fn) {
  const db = getDb();
  if (db.isTransaction) return fn();
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

/** Parse a JSON column, tolerating nulls and malformed values. */
export function json(value, fallback = null) {
  if (value === null || value === undefined || value === '') return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

/** Close the handle. Used by tests and CLI scripts; the app keeps it open. */
export function closeDb() {
  if (handle) {
    handle.close();
    handle = null;
  }
}

/** Point the module at a fresh database. Tests use this for isolation. */
export function useDatabase(path) {
  closeDb();
  process.env.OTF_DB_PATH = path;
  return getDb();
}
