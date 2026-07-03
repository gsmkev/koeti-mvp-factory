import { compare, hash } from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

// Lazy: read at first use (not module load) so a missing secret fails with a
// clear message instead of jose's cryptic "Zero-length key is not supported".
let _key: Uint8Array | undefined
function key() {
  if (!_key) {
    if (!process.env.AUTH_SECRET) {
      throw new Error('AUTH_SECRET environment variable is not set')
    }
    _key = new TextEncoder().encode(process.env.AUTH_SECRET)
  }
  return _key
}
const SALT_ROUNDS = 10

export async function hashPassword(password: string) {
  return hash(password, SALT_ROUNDS)
}

export async function comparePasswords(plain: string, hashed: string) {
  return compare(plain, hashed)
}

type SessionData = {
  user: { id: number }
  expires: string
}

export async function signToken(payload: SessionData) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1 day from now')
    .sign(key())
}

export async function verifyToken(input: string) {
  const { payload } = await jwtVerify(input, key(), { algorithms: ['HS256'] })
  return payload as SessionData
}

// Purpose-scoped short-lived tokens (password reset, email verification).
// The fingerprint ties the token to the current credential (e.g. a slice of
// the password hash), so it stops verifying once that credential changes —
// effectively single-use without a token table.
type OneTimeTokenData = { purpose: string; userId: number; fingerprint: string }

export async function signOneTimeToken(
  data: OneTimeTokenData,
  expiresIn: string = '1 hour'
) {
  return await new SignJWT(data)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(key())
}

export async function verifyOneTimeToken(
  token: string,
  purpose: string
): Promise<OneTimeTokenData | null> {
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ['HS256'] })
    const data = payload as unknown as OneTimeTokenData
    return data.purpose === purpose ? data : null
  } catch {
    return null
  }
}

export async function getSession() {
  const session = (await cookies()).get('session')?.value
  if (!session) return null
  return await verifyToken(session)
}

export async function setSession(user: { id: number }) {
  const expiresInOneDay = new Date(Date.now() + 24 * 60 * 60 * 1000)
  const session: SessionData = {
    user: { id: user.id },
    expires: expiresInOneDay.toISOString(),
  }
  const encryptedSession = await signToken(session)
  ;(await cookies()).set('session', encryptedSession, {
    expires: expiresInOneDay,
    httpOnly: true,
    // Secure cookies over plain http are dropped by Safari even on localhost,
    // and by every browser when the app is reached by IP/tunnel — dev stays http.
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  })
}
