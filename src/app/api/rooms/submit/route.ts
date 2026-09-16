import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/session';
import { submitAnswer } from '@/lib/scoring.mjs';
import { get } from '@/lib/db.mjs';

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { questionId, value } = await request.json();
  const qid = Number(questionId);
  if (!Number.isInteger(qid) || typeof value !== 'string') {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  if (value.length > 512) {
    return NextResponse.json({ error: 'Answer too long' }, { status: 400 });
  }

  // Enforce room prerequisites server-side, so the API cannot be used to skip them.
  const q = get('SELECT room_id FROM questions WHERE id = ?', qid);
  if (!q) return NextResponse.json({ error: 'Unknown question' }, { status: 404 });
  const blocked = get(
    `SELECT 1 FROM room_prereqs rp
       WHERE rp.room_id = ?
         AND NOT EXISTS (
           SELECT 1 FROM room_progress p
            WHERE p.room_id = rp.requires_room_id AND p.user_id = ? AND p.completed_at IS NOT NULL)
       LIMIT 1`,
    q.room_id,
    user.id,
  );
  if (blocked) {
    return NextResponse.json({ error: 'Complete the prerequisite rooms first.' }, { status: 403 });
  }

  const result = submitAnswer(user.id, qid, value);
  const status =
    result.status === 'rate-limited' ? 429 : result.status === 'unknown-question' ? 404 : 200;
  return NextResponse.json(result, { status });
}
