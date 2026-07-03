// Google OAuth 2.0 authorization-code flow — zero deps, just fetch.
// ponytail: only what a "Sign in with Google" button needs. Add another
// provider by copying this file; add refresh-token storage when you actually
// call Google APIs later (we read the profile once at sign-in and stop).

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const USERINFO_ENDPOINT = 'https://openidconnect.googleapis.com/v1/userinfo'

function creds() {
  const id = process.env.GOOGLE_CLIENT_ID
  const secret = process.env.GOOGLE_CLIENT_SECRET
  if (!id || !secret) {
    throw new Error('GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are not set')
  }
  return { id, secret }
}

/** True when the app is configured for Google sign-in (both env vars present). */
export function googleConfigured() {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
}

/** The URL to send the browser to; `state` is the CSRF token echoed back. */
export function googleAuthUrl(redirectUri: string, state: string) {
  const params = new URLSearchParams({
    client_id: creds().id,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'online',
    prompt: 'select_account',
  })
  return `${AUTH_ENDPOINT}?${params}`
}

export type GoogleProfile = { email: string; name?: string; emailVerified: boolean }

/** Exchange the callback `code` for the user's Google profile. `redirectUri`
 *  must be byte-identical to the one used in {@link googleAuthUrl}. */
export async function getGoogleProfile(code: string, redirectUri: string): Promise<GoogleProfile> {
  const { id, secret } = creds()
  const tokenRes = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: id,
      client_secret: secret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })
  if (!tokenRes.ok) throw new Error(`Google token exchange failed: ${tokenRes.status}`)
  const { access_token } = (await tokenRes.json()) as { access_token: string }

  const userRes = await fetch(USERINFO_ENDPOINT, {
    headers: { authorization: `Bearer ${access_token}` },
  })
  if (!userRes.ok) throw new Error(`Google userinfo failed: ${userRes.status}`)
  const info = (await userRes.json()) as {
    email: string
    name?: string
    email_verified?: boolean
  }
  return { email: info.email, name: info.name, emailVerified: !!info.email_verified }
}
