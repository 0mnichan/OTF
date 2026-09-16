import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/session';
import { updateProfile } from '@/lib/users.mjs';

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.redirect(new URL('/login', request.url), 303);
  const form = await request.formData();
  updateProfile(user.id, { bio: String(form.get('bio') ?? '') });
  return NextResponse.redirect(new URL('/settings?saved=1', request.url), 303);
}
