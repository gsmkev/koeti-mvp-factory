// API route (GET) — /api/auth/google.
import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { googleAuthUrl, googleConfigured } from '@koeti/auth';
import { googleCallbackUri } from '@/lib/auth/google';

// Kick off the flow: set a CSRF state cookie, redirect to Google's consent screen.
export async function GET(request: Request) {
  if (!googleConfigured()) {
    return new NextResponse('Google sign-in is not configured.', { status: 501 });
  }
  const state = randomBytes(16).toString('hex');
  (await cookies()).set('google_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  });
  return NextResponse.redirect(googleAuthUrl(googleCallbackUri(request), state));
}
