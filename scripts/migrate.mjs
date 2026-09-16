#!/usr/bin/env node
/** Apply pending database migrations. */
import { getDb, migrate, dbPath } from '../src/lib/db.mjs';

const db = getDb();
const applied = migrate(db);
console.log(`Database: ${dbPath()}`);
console.log(
  applied.length
    ? `Applied ${applied.length} migration(s):\n${applied.map((m) => `  - ${m}`).join('\n')}`
    : 'Already up to date.',
);
