// API route (GET) — /verify-email?token=…  Public: the one-time token is the auth.
import { verifyOneTimeToken } from '@koeti/auth';
import { users } from '@koeti/db';
import { db } from '@/lib/db/drizzle';
import { eq, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  const fail = NextResponse.redirect(new URL('/sign-in?verify=invalid', request.url));
  if (!token) return fail;

  const payload = await verifyOneTimeToken(token, 'email-verification');
  if (!payload) return fail;

  const [user] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
  // Reject a link minted for a since-changed email (fingerprint is the old address).
  if (!user || user.deletedAt || user.email.toLowerCase() !== payload.fingerprint) return fail;

  // Idempotent: only stamp the first time, so a re-clicked link is a no-op.
  if (!user.emailVerified) {
    await db
      .update(users)
      .set({ emailVerified: sql`CURRENT_TIMESTAMP` })
      .where(eq(users.id, user.id));
  }

  return NextResponse.redirect(new URL('/dashboard?verified=1', request.url));
}
