/**
 * Answer checking, points, ranks, badges and anti-cheat.
 */
import { all, get, run, transaction, json } from './db.mjs';
import {
  normalizeAnswer,
  hashAnswer,
  digestsEqual,
  dynamicFlag,
  attributeFlag,
} from './crypto.mjs';

/** Rank ladder, borrowed from real plant-floor job titles. */
export const RANKS = [
  { min: 0, name: 'Apprentice', icon: 'wrench' },
  { min: 100, name: 'Field Technician', icon: 'gauge' },
  { min: 300, name: 'Instrument Tech', icon: 'activity' },
  { min: 750, name: 'Controls Engineer', icon: 'cpu' },
  { min: 1500, name: 'SCADA Analyst', icon: 'monitor' },
  { min: 3000, name: 'OT Security Engineer', icon: 'shield' },
  { min: 6000, name: 'Plant Defender', icon: 'shield-check' },
  { min: 12000, name: 'Grid Guardian', icon: 'zap' },
];

export function rankFor(points) {
  let current = RANKS[0];
  let next = null;
  for (let i = 0; i < RANKS.length; i += 1) {
    if (points >= RANKS[i].min) {
      current = RANKS[i];
      next = RANKS[i + 1] ?? null;
    }
  }
  const span = next ? next.min - current.min : 0;
  const progress = next ? Math.min(100, Math.round(((points - current.min) / span) * 100)) : 100;
  return { ...current, next, progress, points };
}

/* -------------------------------------------------------------------------- */
/* Answer checking                                                            */
/* -------------------------------------------------------------------------- */

/** Max wrong answers per question per minute before we start rejecting. */
export const RATE_LIMIT = { attempts: 12, windowSeconds: 60 };

/**
 * Decide whether a submitted value answers a question.
 * Pure: no database writes, so it is trivially testable.
 *
 * @param {object} question row from `questions`, with `room_slug` joined in
 * @param {string} value
 * @param {number} userId
 */
export function checkAnswer(question, value, userId) {
  const spec = json(question.answer_spec, {});
  const caseSensitive = Boolean(question.case_sensitive);
  const raw = String(value ?? '').trim();

  switch (question.kind) {
    case 'ack':
      return true;

    case 'static':
      return digestsEqual(hashAnswer(normalizeAnswer(raw, caseSensitive)), spec.hash ?? '');

    case 'regex':
      try {
        return new RegExp(spec.pattern, spec.flags ?? '').test(raw);
      } catch {
        return false;
      }

    case 'dynamic': {
      const expected = dynamicFlag(
        userId,
        `${question.room_slug}.${question.ref}`,
        spec.prefix ?? 'OTF',
      );
      return normalizeAnswer(raw, false) === normalizeAnswer(expected, false);
    }

    case 'numeric': {
      const parsed = Number.parseFloat(raw.replace(/,/g, '').replace(/[^\d.eE+-]/g, ''));
      if (!Number.isFinite(parsed)) return false;
      return Math.abs(parsed - spec.value) <= (spec.tolerance ?? 0);
    }

    case 'choice': {
      const index = Number.parseInt(raw, 10);
      return Array.isArray(spec.correct) && spec.correct.includes(index);
    }

    default:
      return false;
  }
}

function questionWithRoom(questionId) {
  return get(
    `SELECT q.*, r.slug AS room_slug, r.id AS rid
       FROM questions q JOIN rooms r ON r.id = q.room_id
      WHERE q.id = ?`,
    questionId,
  );
}

/**
 * Record an attempt and award points if it is right.
 *
 * @returns {{status:string, correct:boolean, points?:number, firstBlood?:boolean,
 *            explain?:string, retryAfter?:number}}
 */
export function submitAnswer(userId, questionId, value) {
  const question = questionWithRoom(questionId);
  if (!question) return { status: 'unknown-question', correct: false };

  if (get('SELECT 1 FROM question_progress WHERE user_id = ? AND question_id = ?', userId, questionId)) {
    return { status: 'already-solved', correct: true, points: 0 };
  }

  // Rate limit on wrong answers only, so brute force is slow but a player
  // fixing a typo is never punished.
  const recent = get(
    `SELECT COUNT(*) AS n FROM submissions
      WHERE user_id = ? AND question_id = ? AND correct = 0
        AND created_at > datetime('now', ?)`,
    userId,
    questionId,
    `-${RATE_LIMIT.windowSeconds} seconds`,
  );
  if (recent.n >= RATE_LIMIT.attempts) {
    return { status: 'rate-limited', correct: false, retryAfter: RATE_LIMIT.windowSeconds };
  }

  const correct = checkAnswer(question, value, userId);

  return transaction(() => {
    run(
      'INSERT INTO submissions (user_id, question_id, room_id, value, correct) VALUES (?,?,?,?,?)',
      userId,
      questionId,
      question.room_id,
      String(value ?? '').slice(0, 512),
      correct,
    );

    if (!correct) {
      // A wrong answer that is somebody else's dynamic flag is flag sharing.
      if (question.kind === 'dynamic') {
        const others = all('SELECT id FROM users WHERE id != ?', userId).map((r) => r.id);
        const owner = attributeFlag(
          value,
          `${question.room_slug}.${question.ref}`,
          others,
          json(question.answer_spec, {}).prefix ?? 'OTF',
        );
        if (owner !== null) {
          run(
            'INSERT INTO audit_log (user_id, action, detail) VALUES (?,?,?)',
            userId,
            'flag.shared',
            JSON.stringify({ question: question.ref, room: question.room_slug, issuedTo: owner }),
          );
        }
      }
      return { status: 'incorrect', correct: false };
    }

    // Hints already unlocked reduce the award, but never below zero.
    const spent = get(
      `SELECT COALESCE(SUM(hu.cost), 0) AS spent
         FROM hint_unlocks hu JOIN hints h ON h.id = hu.hint_id
        WHERE hu.user_id = ? AND h.question_id = ?`,
      userId,
      questionId,
    ).spent;
    const award = Math.max(0, question.points - spent);

    const firstBlood = !get(
      'SELECT 1 FROM question_progress WHERE question_id = ?',
      questionId,
    );

    run(
      `INSERT INTO question_progress (user_id, question_id, room_id, points_awarded, first_blood)
       VALUES (?,?,?,?,?)`,
      userId,
      questionId,
      question.room_id,
      award,
      firstBlood,
    );

    run(
      `INSERT OR IGNORE INTO room_progress (user_id, room_id) VALUES (?,?)`,
      userId,
      question.room_id,
    );

    recomputeUserPoints(userId);
    const completed = refreshRoomCompletion(userId, question.room_id);
    const badges = awardBadges(userId);

    return {
      status: 'correct',
      correct: true,
      points: award,
      firstBlood,
      roomCompleted: completed,
      badges,
      explain: question.explain_md || '',
    };
  });
}

/** Sum awarded points (minus hint costs) into users.points. */
export function recomputeUserPoints(userId) {
  const earned = get(
    'SELECT COALESCE(SUM(points_awarded), 0) AS n FROM question_progress WHERE user_id = ?',
    userId,
  ).n;
  // First blood is worth a 10% bonus on the question's value.
  const bonus = get(
    `SELECT COALESCE(SUM(CAST(points_awarded * 0.1 AS INTEGER)), 0) AS n
       FROM question_progress WHERE user_id = ? AND first_blood = 1`,
    userId,
  ).n;
  const total = Math.max(0, earned + bonus);
  run('UPDATE users SET points = ? WHERE id = ?', total, userId);
  return total;
}

/** Mark a room complete once every question in it is solved. */
export function refreshRoomCompletion(userId, roomId) {
  const totals = get(
    `SELECT (SELECT COUNT(*) FROM questions WHERE room_id = ?) AS total,
            (SELECT COUNT(*) FROM question_progress WHERE room_id = ? AND user_id = ?) AS solved`,
    roomId,
    roomId,
    userId,
  );
  const done = totals.total > 0 && totals.solved >= totals.total;
  if (done) {
    run(
      `UPDATE room_progress SET completed_at = COALESCE(completed_at, datetime('now'))
        WHERE user_id = ? AND room_id = ?`,
      userId,
      roomId,
    );
  }
  return done;
}

/* -------------------------------------------------------------------------- */
/* Hints                                                                      */
/* -------------------------------------------------------------------------- */

/** Unlock a hint, charging its cost against the question's eventual award. */
export function unlockHint(userId, hintId) {
  const hint = get('SELECT * FROM hints WHERE id = ?', hintId);
  if (!hint) return { status: 'unknown-hint' };

  const already = get(
    'SELECT 1 FROM hint_unlocks WHERE user_id = ? AND hint_id = ?',
    userId,
    hintId,
  );
  if (!already) {
    run(
      'INSERT INTO hint_unlocks (user_id, hint_id, cost) VALUES (?,?,?)',
      userId,
      hintId,
      hint.cost,
    );
  }
  return { status: 'ok', body: hint.body_md, cost: hint.cost };
}

export function unlockedHintIds(userId, roomId) {
  return new Set(
    all(
      `SELECT hu.hint_id AS id FROM hint_unlocks hu
         JOIN hints h ON h.id = hu.hint_id
         JOIN questions q ON q.id = h.question_id
        WHERE hu.user_id = ? AND q.room_id = ?`,
      userId,
      roomId,
    ).map((r) => r.id),
  );
}

/* -------------------------------------------------------------------------- */
/* Badges                                                                     */
/* -------------------------------------------------------------------------- */

/** Evaluate every badge's criteria and award any newly earned ones. */
export function awardBadges(userId) {
  const held = new Set(
    all('SELECT badge_id FROM user_badges WHERE user_id = ?', userId).map((r) => r.badge_id),
  );
  const earned = [];

  for (const badge of all('SELECT * FROM badges')) {
    if (held.has(badge.id)) continue;
    const criteria = json(badge.criteria, {});
    if (meetsCriteria(userId, criteria)) {
      run('INSERT OR IGNORE INTO user_badges (user_id, badge_id) VALUES (?,?)', userId, badge.id);
      earned.push({ slug: badge.slug, title: badge.title, icon: badge.icon });
    }
  }
  return earned;
}

function meetsCriteria(userId, criteria) {
  switch (criteria.type) {
    case 'points':
      return (get('SELECT points FROM users WHERE id = ?', userId)?.points ?? 0) >= criteria.min;

    case 'room_complete':
      return Boolean(
        get(
          `SELECT 1 FROM room_progress rp JOIN rooms r ON r.id = rp.room_id
            WHERE rp.user_id = ? AND r.slug = ? AND rp.completed_at IS NOT NULL`,
          userId,
          criteria.room,
        ),
      );

    case 'rooms_completed':
      return (
        get(
          'SELECT COUNT(*) AS n FROM room_progress WHERE user_id = ? AND completed_at IS NOT NULL',
          userId,
        ).n >= criteria.count
      );

    case 'path_complete': {
      const totals = get(
        `SELECT COUNT(*) AS total,
                SUM(CASE WHEN rp.completed_at IS NOT NULL THEN 1 ELSE 0 END) AS done
           FROM paths p
           JOIN path_rooms pr ON pr.path_id = p.id
           LEFT JOIN room_progress rp ON rp.room_id = pr.room_id AND rp.user_id = ?
          WHERE p.slug = ?`,
        userId,
        criteria.path,
      );
      return totals && totals.total > 0 && totals.done === totals.total;
    }

    case 'first_blood':
      return (
        get(
          'SELECT COUNT(*) AS n FROM question_progress WHERE user_id = ? AND first_blood = 1',
          userId,
        ).n >= criteria.count
      );

    case 'protocol':
      return (
        get(
          `SELECT COUNT(DISTINCT r.id) AS n
             FROM room_progress rp
             JOIN rooms r ON r.id = rp.room_id
             JOIN json_each(r.protocols) je ON lower(je.value) = lower(?)
            WHERE rp.user_id = ? AND rp.completed_at IS NOT NULL`,
          criteria.protocol,
          userId,
        ).n >= (criteria.count ?? 1)
      );

    case 'no_hints':
      return Boolean(
        get(
          `SELECT 1 FROM room_progress rp
             JOIN rooms r ON r.id = rp.room_id
            WHERE rp.user_id = ? AND r.slug = ? AND rp.completed_at IS NOT NULL
              AND NOT EXISTS (
                SELECT 1 FROM hint_unlocks hu
                  JOIN hints h ON h.id = hu.hint_id
                  JOIN questions q ON q.id = h.question_id
                 WHERE hu.user_id = rp.user_id AND q.room_id = r.id)`,
          userId,
          criteria.room,
        ),
      );

    default:
      return false;
  }
}

export function userBadges(userId) {
  return all(
    `SELECT b.slug, b.title, b.description, b.icon, ub.awarded_at
       FROM user_badges ub JOIN badges b ON b.id = ub.badge_id
      WHERE ub.user_id = ? ORDER BY ub.awarded_at DESC`,
    userId,
  );
}

/* -------------------------------------------------------------------------- */
/* Leaderboard and progress                                                   */
/* -------------------------------------------------------------------------- */

export function leaderboard({ limit = 50, since = null } = {}) {
  if (since) {
    return all(
      `SELECT u.id, u.username, COALESCE(SUM(qp.points_awarded),0) AS points,
              COUNT(DISTINCT qp.room_id) AS rooms
         FROM users u
         LEFT JOIN question_progress qp
           ON qp.user_id = u.id AND qp.solved_at > datetime('now', ?)
        GROUP BY u.id HAVING points > 0
        ORDER BY points DESC, u.username ASC LIMIT ?`,
      since,
      limit,
    );
  }
  return all(
    `SELECT u.id, u.username, u.points,
            (SELECT COUNT(*) FROM room_progress rp
              WHERE rp.user_id = u.id AND rp.completed_at IS NOT NULL) AS rooms
       FROM users u WHERE u.points > 0
      ORDER BY u.points DESC, u.username ASC LIMIT ?`,
    limit,
  );
}

/** Per-room solved/total counts for one user, keyed by room id. */
export function progressByRoom(userId) {
  const rows = all(
    `SELECT r.id, r.slug,
            (SELECT COUNT(*) FROM questions q WHERE q.room_id = r.id) AS total,
            (SELECT COUNT(*) FROM question_progress qp
              WHERE qp.room_id = r.id AND qp.user_id = ?) AS solved,
            (SELECT completed_at FROM room_progress rp
              WHERE rp.room_id = r.id AND rp.user_id = ?) AS completed_at
       FROM rooms r`,
    userId,
    userId,
  );
  return new Map(rows.map((r) => [r.id, r]));
}

/** Rooms whose prerequisites this user has not finished yet. */
export function lockedRoomIds(userId) {
  const locked = new Set();
  for (const row of all(
    `SELECT rp.room_id, rp.requires_room_id,
            (SELECT completed_at FROM room_progress p
              WHERE p.room_id = rp.requires_room_id AND p.user_id = ?) AS done
       FROM room_prereqs rp`,
    userId,
  )) {
    if (!row.done) locked.add(row.room_id);
  }
  return locked;
}

export function recentActivity(limit = 20) {
  return all(
    `SELECT u.username, r.slug AS room_slug, r.title AS room_title,
            qp.solved_at, qp.first_blood, qp.points_awarded
       FROM question_progress qp
       JOIN users u ON u.id = qp.user_id
       JOIN rooms r ON r.id = qp.room_id
      ORDER BY qp.solved_at DESC LIMIT ?`,
    limit,
  );
}
