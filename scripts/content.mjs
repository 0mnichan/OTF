#!/usr/bin/env node
/** Validate or sync the content tree. Usage: content.mjs <validate|sync> */
import { validateContent, syncContent } from '../src/lib/content.mjs';

const command = process.argv[2] ?? 'validate';

if (command === 'validate') {
  const { rooms, paths, errors } = validateContent();
  if (errors.length) {
    console.error(`\n✗ ${errors.length} content problem(s):\n`);
    for (const e of errors) console.error(`  ${e}`);
    process.exit(1);
  }
  const questions = rooms.reduce(
    (n, r) => n + r.tasks.reduce((m, t) => m + t.questions.length, 0),
    0,
  );
  const withLabs = rooms.filter((r) => r.lab).length;
  console.log(
    `✓ ${rooms.length} rooms, ${paths.length} paths, ${questions} questions, ${withLabs} labs — all valid.`,
  );
} else if (command === 'sync') {
  console.log('Syncing content into the database...');
  try {
    const result = syncContent();
    console.log(`\n✓ Synced ${result.rooms} rooms and ${result.paths} paths.`);
  } catch (err) {
    console.error(`\n✗ ${err.message}`);
    process.exit(1);
  }
} else {
  console.error(`Unknown command "${command}". Use: validate | sync`);
  process.exit(1);
}
