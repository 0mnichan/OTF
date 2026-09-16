import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/session';
import { getRoomBySlug } from '@/lib/queries.mjs';
import { refreshLab } from '@/lib/labs.mjs';

export async function GET(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const slug = new URL(request.url).searchParams.get('room') ?? '';
  const room = getRoomBySlug(slug);
  if (!room) return NextResponse.json({ error: 'Unknown room' }, { status: 404 });
  const instance = await refreshLab(user.id, room.id);
  return NextResponse.json({ instance });
}
