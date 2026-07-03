import { randomBytes } from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { hashPassword } from '@/lib/auth/session';
import {
  users,
  teams,
  teamMembers,
  activityLogs,
  ActivityType,
  type NewUser,
} from '@koeti/db';

// redirect_uri must match a URI registered in the Google Cloud Console exactly.
// Prod pins the canonical BASE_URL (the Host header is client-suppliable);
// dev follows the request origin so localhost and port-forwards both work.
export function googleCallbackUri(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.BASE_URL) throw new Error('BASE_URL must be set in production');
    return `${process.env.BASE_URL}/api/auth/google/callback`;
  }
  return `${new URL(request.url).origin}/api/auth/google/callback`;
}

// Find-or-create the user (and their team on first sign-in) from a Google
// profile. OAuth users have no password: we store an unverifiable random hash
// so password sign-in can never match.
export async function upsertGoogleUser(profile: { email: string; name?: string }) {
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, profile.email))
    .limit(1);
  if (existing && !existing.deletedAt) {
    // Google has proved ownership of this email, so the verified Google user
    // keeps the account. But this row may have been pre-registered by an
    // attacker (sign-up doesn't verify email → account pre-hijacking): burn any
    // existing password to a fresh unusable hash so a planted/known credential
    // can never be reused. A legit user who wants a password can set one via
    // "forgot password" afterward.
    // ponytail: we reset on every Google login because without a
    // users.authProvider column we can't tell a real password from our
    // sentinel; add that column if password + Google must coexist on one email.
    await db
      .update(users)
      .set({ passwordHash: await hashPassword(randomBytes(32).toString('hex')) })
      .where(eq(users.id, existing.id));
    return existing;
  }

  const passwordHash = await hashPassword(randomBytes(32).toString('hex'));
  const newUser: NewUser = {
    email: profile.email,
    name: profile.name ?? null,
    passwordHash,
    role: 'owner',
  };
  const [user] = await db.insert(users).values(newUser).returning();

  const [team] = await db
    .insert(teams)
    .values({ name: `${profile.email}'s Team` })
    .returning();
  await db.insert(teamMembers).values({ userId: user.id, teamId: team.id, role: 'owner' });
  await db.insert(activityLogs).values({
    teamId: team.id,
    userId: user.id,
    action: ActivityType.SIGN_UP,
    ipAddress: '',
  });
  return user;
}
