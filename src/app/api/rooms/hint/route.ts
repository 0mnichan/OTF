import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/session';
import { unlockHint } from '@/lib/scoring.mjs';

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { hintId } = await request.json();
  const hid = Number(hintId);
  if (!Number.isInteger(hid)) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const result = unlockHint(user.id, hid);
  if (result.status !== 'ok') {
    return NextResponse.json({ error: 'Unknown hint' }, { status: 404 });
  }
  return NextResponse.json(result);
}
