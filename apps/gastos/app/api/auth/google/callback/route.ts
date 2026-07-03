import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getGoogleProfile } from '@koeti/auth';
import { setSession } from '@/lib/auth/session';
import { googleCallbackUri, upsertGoogleUser } from '@/lib/auth/google';

// Google redirects back here with ?code&state. Verify state (CSRF), exchange
// the code for a profile, find-or-create the user, set the session cookie.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  const jar = await cookies();
  const savedState = jar.get('google_oauth_state')?.value;
  jar.delete('google_oauth_state');

  const fail = NextResponse.redirect(new URL('/sign-in?error=oauth', url.origin));
  if (!code || !state || !savedState || state !== savedState) return fail;

  try {
    const profile = await getGoogleProfile(code, googleCallbackUri(request));
    if (!profile.emailVerified) return fail;
    await setSession(await upsertGoogleUser(profile));
  } catch (err) {
    console.error('google oauth failed:', err);
    return fail;
  }
  return NextResponse.redirect(new URL('/dashboard', url.origin));
}
