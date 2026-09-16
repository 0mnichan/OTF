import { NextResponse } from 'next/server';
import { endSession } from '@/lib/session';

export async function POST(request: Request) {
  await endSession();
  return NextResponse.redirect(new URL('/', request.url), 303);
}
