import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/session';
import { getRoomBySlug } from '@/lib/queries.mjs';
import { startLab } from '@/lib/labs.mjs';

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const { room: slug } = await request.json();
  const room = getRoomBySlug(String(slug ?? ''));
  if (!room) return NextResponse.json({ error: 'Unknown room' }, { status: 404 });
  if (!room.lab_spec) return NextResponse.json({ error: 'This room has no lab.' }, { status: 400 });

  const result = await startLab(user.id, room);
  return NextResponse.json(result, { status: result.ok === false ? 400 : 200 });
}
