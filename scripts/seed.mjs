#!/usr/bin/env node
/**
 * Seed badges and, in development, a demo account.
 * Safe to re-run: badges are upserted by slug, users skipped if present.
 */
import { get, run } from '../src/lib/db.mjs';
import { createUser } from '../src/lib/users.mjs';

const BADGES = [
  { slug: 'first-steps', title: 'First Steps', icon: 'footprints',
    description: 'Complete your first room.',
    criteria: { type: 'rooms_completed', count: 1 } },
  { slug: 'plant-tour', title: 'Plant Tour', icon: 'factory',
    description: 'Complete the Welcome to the Plant induction.',
    criteria: { type: 'room_complete', room: 'welcome-to-the-plant' } },
  { slug: 'packet-whisperer', title: 'Packet Whisperer', icon: 'radio',
    description: 'Complete a room built on Modbus traffic analysis.',
    criteria: { type: 'protocol', protocol: 'modbus', count: 1 } },
  { slug: 'process-engineer', title: 'Process Engineer', icon: 'droplets',
    description: 'Drive a simulated process to an unsafe state in Clearwater.',
    criteria: { type: 'room_complete', room: 'clearwater-level-control' } },
  { slug: 'substation-sleuth', title: 'Substation Sleuth', icon: 'zap',
    description: 'Reconstruct the Silent Substation incident.',
    criteria: { type: 'room_complete', room: 'silent-substation' } },
  { slug: 'logic-surgeon', title: 'Logic Surgeon', icon: 'git-branch',
    description: 'Reverse engineer a ladder logic program.',
    criteria: { type: 'room_complete', room: 'ladder-logic-autopsy' } },
  { slug: 'bridgehead', title: 'Crossed the Bridge', icon: 'network',
    description: 'Pivot from corporate IT all the way to Level 1.',
    criteria: { type: 'room_complete', room: 'bridgehead' } },
  { slug: 'unaided', title: 'No Hints Needed', icon: 'eye-off',
    description: 'Finish Clearwater without unlocking a single hint.',
    criteria: { type: 'no_hints', room: 'clearwater-level-control' } },
  { slug: 'first-blood-5', title: 'First Blood x5', icon: 'flame',
    description: 'Be the first to solve five questions.',
    criteria: { type: 'first_blood', count: 5 } },
  { slug: 'fundamentals', title: 'ICS Fundamentals', icon: 'graduation-cap',
    description: 'Complete the ICS Fundamentals path.',
    criteria: { type: 'path_complete', path: 'ics-fundamentals' } },
  { slug: 'rank-controls', title: 'Controls Engineer', icon: 'cpu',
    description: 'Reach 750 points.', criteria: { type: 'points', min: 750 } },
  { slug: 'rank-scada', title: 'SCADA Analyst', icon: 'monitor',
    description: 'Reach 1500 points.', criteria: { type: 'points', min: 1500 } },
];

for (const badge of BADGES) {
  const criteria = JSON.stringify(badge.criteria);
  if (get('SELECT 1 FROM badges WHERE slug = ?', badge.slug)) {
    run(
      'UPDATE badges SET title=?, description=?, icon=?, criteria=? WHERE slug=?',
      badge.title, badge.description, badge.icon, criteria, badge.slug,
    );
  } else {
    run(
      'INSERT INTO badges (slug, title, description, icon, criteria) VALUES (?,?,?,?,?)',
      badge.slug, badge.title, badge.description, badge.icon, criteria,
    );
  }
}
console.log(`✓ ${BADGES.length} badges seeded.`);

if (process.env.NODE_ENV !== 'production') {
  const demos = [
    { username: 'operator', email: 'operator@otf.local', password: 'changeme-operator', role: 'player' },
    { username: 'admin', email: 'admin@otf.local', password: 'changeme-admin', role: 'admin' },
  ];
  for (const demo of demos) {
    if (get('SELECT 1 FROM users WHERE email = ?', demo.email)) {
      console.log(`  ${demo.username} already exists, skipped.`);
      continue;
    }
    createUser(demo);
    console.log(`  created ${demo.role.padEnd(6)} ${demo.email}  (password: ${demo.password})`);
  }
  console.log('\nDevelopment accounts only — change these before exposing the instance.');
}
