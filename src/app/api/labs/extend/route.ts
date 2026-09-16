import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/session';
import { getRoomBySlug } from '@/lib/queries.mjs';
import { extendLab } from '@/lib/labs.mjs';

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const { room: slug } = await request.json();
  const room = getRoomBySlug(String(slug ?? ''));
  if (!room) return NextResponse.json({ error: 'Unknown room' }, { status: 404 });

  const result = await extendLab(user.id, room.id);
  return NextResponse.json(result, { status: result.ok === false ? 400 : 200 });
}
