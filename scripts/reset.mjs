#!/usr/bin/env node
/**
 * Delete the database file and rebuild it from scratch.
 * Refuses to run in production, and requires --yes anywhere else.
 */
import { rmSync, existsSync } from 'node:fs';
import { dbPath, closeDb, getDb } from '../src/lib/db.mjs';

if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to reset the database with NODE_ENV=production.');
  process.exit(1);
}
if (!process.argv.includes('--yes')) {
  console.error(`This deletes ${dbPath()} and everything in it.`);
  console.error('Re-run with --yes to confirm.');
  process.exit(1);
}

closeDb();
const path = dbPath();
for (const suffix of ['', '-wal', '-shm', '-journal']) {
  if (existsSync(path + suffix)) rmSync(path + suffix);
}
getDb();
console.log(`Reset ${path} and reapplied migrations.`);
