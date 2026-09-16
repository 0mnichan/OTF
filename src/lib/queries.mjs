/**
 * Read-side query helpers for the web pages. Kept separate from scoring.mjs
 * (the write side) so page code has one obvious import for "give me data".
 */
import { all, get, json } from './db.mjs';

function decodeRoom(row) {
  if (!row) return row;
  return {
    ...row,
    purdue_levels: json(row.purdue_levels, []),
    protocols: json(row.protocols, []),
    attack_ics: json(row.attack_ics, []),
    tags: json(row.tags, []),
    lab_spec: json(row.lab_spec, null),
    free: Boolean(row.free),
    published: Boolean(row.published),
    hasLab: Boolean(row.lab_spec),
  };
}

export function listRooms({ includeUnpublished = false } = {}) {
  const rows = all(
    `SELECT * FROM rooms ${includeUnpublished ? '' : 'WHERE published = 1'}
      ORDER BY order_index ASC, id ASC`,
  );
  return rows.map(decodeRoom);
}

export function getRoomBySlug(slug, { includeUnpublished = false } = {}) {
  const row = get(
    `SELECT * FROM rooms WHERE slug = ? ${includeUnpublished ? '' : 'AND published = 1'}`,
    slug,
  );
  return decodeRoom(row);
}

export function getRoomTasks(roomId) {
  const tasks = all(
    'SELECT * FROM tasks WHERE room_id = ? ORDER BY order_index ASC',
    roomId,
  );
  return tasks.map((task) => ({
    ...task,
    questions: all(
      'SELECT * FROM questions WHERE task_id = ? ORDER BY order_index ASC',
      task.id,
    ).map((q) => ({
      ...q,
      answer_spec: json(q.answer_spec, {}),
      case_sensitive: Boolean(q.case_sensitive),
      hints: all(
        'SELECT id, cost, order_index FROM hints WHERE question_id = ? ORDER BY order_index ASC',
        q.id,
      ),
    })),
  }));
}

export function roomPrereqs(roomId) {
  return all(
    `SELECT r.slug, r.title FROM room_prereqs rp
       JOIN rooms r ON r.id = rp.requires_room_id
      WHERE rp.room_id = ?`,
    roomId,
  );
}

export function listPaths() {
  return all('SELECT * FROM paths WHERE published = 1 ORDER BY order_index ASC').map((p) => ({
    ...p,
    rooms: all(
      `SELECT r.* FROM path_rooms pr JOIN rooms r ON r.id = pr.room_id
        WHERE pr.path_id = ? ORDER BY pr.order_index ASC`,
      p.id,
    ).map(decodeRoom),
  }));
}

export function getPathBySlug(slug) {
  const path = get('SELECT * FROM paths WHERE slug = ? AND published = 1', slug);
  if (!path) return null;
  return {
    ...path,
    rooms: all(
      `SELECT r.* FROM path_rooms pr JOIN rooms r ON r.id = pr.room_id
        WHERE pr.path_id = ? ORDER BY pr.order_index ASC`,
      path.id,
    ).map(decodeRoom),
  };
}

/** Solved question ids for a user within a room. */
export function solvedQuestionIds(userId, roomId) {
  if (!userId) return new Set();
  return new Set(
    all(
      'SELECT question_id FROM question_progress WHERE user_id = ? AND room_id = ?',
      userId,
      roomId,
    ).map((r) => r.question_id),
  );
}

export function roomStats() {
  return new Map(
    all(
      `SELECT room_id,
              COUNT(DISTINCT user_id) AS players,
              COUNT(*) FILTER (WHERE completed_at IS NOT NULL) AS completions
         FROM room_progress GROUP BY room_id`,
    ).map((r) => [r.room_id, r]),
  );
}

export function platformStats() {
  return {
    rooms: get('SELECT COUNT(*) AS n FROM rooms WHERE published = 1').n,
    paths: get('SELECT COUNT(*) AS n FROM paths WHERE published = 1').n,
    players: get('SELECT COUNT(*) AS n FROM users').n,
    questions: get('SELECT COUNT(*) AS n FROM questions').n,
    labs: get('SELECT COUNT(*) AS n FROM rooms WHERE lab_spec IS NOT NULL').n,
    solves: get('SELECT COUNT(*) AS n FROM question_progress').n,
  };
}

export function userProfile(username) {
  const user = get(
    `SELECT id, username, bio, points, created_at FROM users WHERE lower(username) = ?`,
    String(username).toLowerCase(),
  );
  if (!user) return null;
  const completedRooms = all(
    `SELECT r.slug, r.title, r.difficulty, rp.completed_at
       FROM room_progress rp JOIN rooms r ON r.id = rp.room_id
      WHERE rp.user_id = ? AND rp.completed_at IS NOT NULL
      ORDER BY rp.completed_at DESC`,
    user.id,
  );
  const badges = all(
    `SELECT b.slug, b.title, b.description, b.icon, ub.awarded_at
       FROM user_badges ub JOIN badges b ON b.id = ub.badge_id
      WHERE ub.user_id = ? ORDER BY ub.awarded_at DESC`,
    user.id,
  );
  const solves = get(
    'SELECT COUNT(*) AS n FROM question_progress WHERE user_id = ?',
    user.id,
  ).n;
  const firstBloods = get(
    'SELECT COUNT(*) AS n FROM question_progress WHERE user_id = ? AND first_blood = 1',
    user.id,
  ).n;
  const rank = get(
    'SELECT COUNT(*) + 1 AS r FROM users WHERE points > ?',
    user.points,
  ).r;
  return { user, completedRooms, badges, solves, firstBloods, rank };
}
