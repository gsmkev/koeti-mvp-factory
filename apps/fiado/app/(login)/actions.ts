'use server';
// Server actions for the login segment.

import { z } from 'zod';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import {
  users,
  teams,
  teamMembers,
  activityLogs,
  invitations,
  type User,
  type NewUser,
  type NewTeam,
  type NewTeamMember,
  type NewActivityLog,
  ActivityType,
  consumeRateLimit,
} from '@koeti/db';
import { comparePasswords, hashPassword, setSession } from '@/lib/auth/session';
import {
  signOneTimeToken,
  verifyOneTimeToken,
  isSuperadmin,
  roleAtLeast,
  type TeamRole,
} from '@koeti/auth';
import { redirect } from 'next/navigation';
import { cookies, headers } from 'next/headers';
import { getLocale, getTranslations } from 'next-intl/server';
import type { Locale } from '@koeti/i18n/config';
import { createCheckoutSession } from '@/lib/payments/stripe';
import { getUser, getUserWithTeam } from '@/lib/db/queries';
import { validatedAction, validatedActionWithUser } from '@/lib/auth/middleware';
import {
  sendEmail,
  WelcomeEmail,
  welcomeSubject,
  PasswordResetEmail,
  passwordResetSubject,
  InvitationEmail,
  invitationSubject,
  EmailVerificationEmail,
  emailVerificationSubject,
} from '@koeti/email';
import { track } from '@koeti/analytics/server';
import { APP_NAME } from '@/lib/site';

// ponytail: XFF is client-suppliable, so IP keys are best-effort — the
// per-email rate-limit keys alongside them are what header rotation can't bypass.
async function clientIp() {
  const h = await headers();
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
}

// Durable, cross-instance fixed window (Postgres) for the auth brute-force
// guards — the in-memory rateLimit only holds per instance, which is not
// enough on multi-instance deploys. Burst paths (AI, API throttle) keep it.
const limitOk = (key: string, limit: number) => consumeRateLimit(db, key, { limit });

// next-intl types getLocale() as string; our request config (i18n/request.ts)
// only ever resolves to a supported Locale, so this narrowing is safe.
async function currentLocale(): Promise<Locale> {
  return (await getLocale()) as Locale;
}

// Browser-facing links in emails follow the request origin in dev (tunnels,
// port forwards); in production ONLY the canonical BASE_URL is used — Host
// headers are client-suppliable (reset-link poisoning otherwise).
async function requestOrigin() {
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.BASE_URL) throw new Error('BASE_URL must be set in production');
    return process.env.BASE_URL;
  }
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  if (!host) return process.env.BASE_URL ?? 'http://localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? 'http';
  return `${proto}://${host}`;
}

// Soft email verification: mint a purpose-scoped token tied to the current
// email (so a later email change invalidates the link) and send the link.
// Fire-and-forget — a no-op without RESEND_API_KEY, must never block sign-up.
async function sendVerificationEmail(userId: number, email: string, locale: Locale) {
  const token = await signOneTimeToken(
    { purpose: 'email-verification', userId, fingerprint: email.toLowerCase() },
    '24 hours',
  );
  const verifyLink = `${await requestOrigin()}/verify-email?token=${token}`;
  return sendEmail({
    to: email,
    subject: emailVerificationSubject(APP_NAME, locale),
    react: EmailVerificationEmail({ verifyLink, locale }),
  });
}

async function logActivity(
  teamId: number | null | undefined,
  userId: number,
  type: ActivityType,
  ipAddress?: string,
) {
  if (teamId === null || teamId === undefined) {
    return;
  }
  const newActivity: NewActivityLog = {
    teamId,
    userId,
    action: type,
    ipAddress: ipAddress || '',
  };
  await db.insert(activityLogs).values(newActivity);
}

// Ña Marta types a plain "usuario", not an email — accept either and
// normalize a bare username to a synthetic local address so `users.email`
// (shared schema, must stay unique) keeps working with zero schema changes.
// A value that already looks like an email (has "@") passes through as-is —
// covers Google sign-in accounts and e2e test fixtures.
const usernameOrEmail = z
  .string()
  .trim()
  .min(3)
  .max(255)
  .transform((v) => (v.includes('@') ? v : `${v.toLowerCase()}@fiado.local`))
  .pipe(z.string().email('Usuario o email inválido'));

const signInSchema = z.object({
  email: usernameOrEmail,
  password: z.string().min(8).max(100),
});

export const signIn = validatedAction(signInSchema, async (data, formData) => {
  const { email, password } = data;
  // Redisplay what the person actually typed ("usuario"), not the synthetic
  // "usuario@fiado.local" the schema transformed it into for the DB lookup.
  const rawEmail = String(formData.get('email') ?? '').trim();
  const t = await getTranslations('errors');

  if (
    !(await limitOk(`signin:${await clientIp()}`, 10)) ||
    !(await limitOk(`signin:${email.toLowerCase()}`, 10))
  ) {
    return { error: t('tooManyAttempts'), email: rawEmail, password };
  }

  const userWithTeam = await db
    .select({
      user: users,
      team: teams,
    })
    .from(users)
    .leftJoin(teamMembers, eq(users.id, teamMembers.userId))
    .leftJoin(teams, eq(teamMembers.teamId, teams.id))
    .where(eq(users.email, email))
    .limit(1);

  if (userWithTeam.length === 0) {
    return {
      error: t('invalidCredentials'),
      email: rawEmail,
      password,
    };
  }

  const { user: foundUser, team: foundTeam } = userWithTeam[0];

  const isPasswordValid = await comparePasswords(password, foundUser.passwordHash);

  if (!isPasswordValid) {
    return {
      error: t('invalidCredentials'),
      email: rawEmail,
      password,
    };
  }

  await Promise.all([
    setSession(foundUser),
    logActivity(foundTeam?.id, foundUser.id, ActivityType.SIGN_IN),
  ]);

  const redirectTo = formData.get('redirect') as string | null;
  if (redirectTo === 'checkout') {
    const priceId = formData.get('priceId') as string;
    return createCheckoutSession({ team: foundTeam, priceId, getUser });
  }

  redirect('/dashboard');
});

const signUpSchema = z.object({
  email: usernameOrEmail,
  password: z.string().min(8),
  name: z.string().max(100).optional(),
  inviteId: z.string().optional(),
});

export const signUp = validatedAction(signUpSchema, async (data, formData) => {
  const { email, password, name, inviteId } = data;
  // Redisplay what the person actually typed ("usuario"), not the synthetic
  // "usuario@fiado.local" the schema transformed it into for storage.
  const rawEmail = String(formData.get('email') ?? '').trim();
  const t = await getTranslations('errors');

  if (!(await limitOk(`signup:${await clientIp()}`, 5))) {
    return { error: t('tooManyAttempts'), email: rawEmail, password };
  }

  const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (existingUser.length > 0) {
    return {
      error: t('createUserFailed'),
      email: rawEmail,
      password,
    };
  }

  const passwordHash = await hashPassword(password);

  // Global role stays the schema default ('member'). Tenant role lives on
  // teamMembers.role (set below to 'owner' or the invitation's role); the
  // global users.role only ever distinguishes 'superadmin'.
  const newUser: NewUser = {
    email,
    passwordHash,
    ...(name ? { name } : {}),
  };

  const [createdUser] = await db.insert(users).values(newUser).returning();

  if (!createdUser) {
    return {
      error: t('createUserFailed'),
      email: rawEmail,
      password,
    };
  }

  let teamId: number;
  let userRole: string;
  let createdTeam: typeof teams.$inferSelect | null = null;

  if (inviteId) {
    // Check if there's a valid invitation
    const [invitation] = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.id, parseInt(inviteId)),
          eq(invitations.email, email),
          eq(invitations.status, 'pending'),
        ),
      )
      .limit(1);

    if (invitation) {
      teamId = invitation.teamId;
      userRole = invitation.role;

      await db
        .update(invitations)
        .set({ status: 'accepted' })
        .where(eq(invitations.id, invitation.id));

      await logActivity(teamId, createdUser.id, ActivityType.ACCEPT_INVITATION);

      [createdTeam] = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
    } else {
      return { error: t('invalidInvitation'), email: rawEmail, password };
    }
  } else {
    // Create a new team if there's no invitation. A generic, friendly
    // default — the owner renames it to their actual store on the
    // onboarding wizard's first step, which is where the real prompting
    // happens (see teamNamePlaceholder).
    const defaultTeamNames: Record<string, string> = {
      es: 'Mi despensa',
      pt: 'Minha loja',
      en: 'My Store',
    };
    const newTeam: NewTeam = {
      name: defaultTeamNames[await getLocale()] ?? defaultTeamNames.en,
    };

    [createdTeam] = await db.insert(teams).values(newTeam).returning();

    if (!createdTeam) {
      return {
        error: t('createTeamFailed'),
        email: rawEmail,
        password,
      };
    }

    teamId = createdTeam.id;
    userRole = 'owner';

    await logActivity(teamId, createdUser.id, ActivityType.CREATE_TEAM);
  }

  const newTeamMember: NewTeamMember = {
    userId: createdUser.id,
    teamId: teamId,
    role: userRole,
  };

  await Promise.all([
    db.insert(teamMembers).values(newTeamMember),
    logActivity(teamId, createdUser.id, ActivityType.SIGN_UP),
    setSession(createdUser),
  ]);

  // Fire-and-forget: email/analytics must never block or fail sign-up.
  // Both are no-ops when their keys aren't configured.
  const locale = await currentLocale();
  sendEmail({
    to: email,
    subject: welcomeSubject(locale),
    react: WelcomeEmail({ name: email, locale }),
  }).catch((err) => console.error('welcome email failed:', err));
  sendVerificationEmail(createdUser.id, email, locale).catch((err) =>
    console.error('verification email failed:', err),
  );
  track('user_signed_up', { userId: String(createdUser.id) });

  const redirectTo = formData.get('redirect') as string | null;
  if (redirectTo === 'checkout') {
    const priceId = formData.get('priceId') as string;
    return createCheckoutSession({ team: createdTeam, priceId, getUser });
  }

  redirect('/dashboard');
});

export async function signOut() {
  const user = (await getUser()) as User;
  const userWithTeam = await getUserWithTeam(user.id);
  await logActivity(userWithTeam?.teamId, user.id, ActivityType.SIGN_OUT);
  (await cookies()).delete('session');
}

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const forgotPassword = validatedAction(forgotPasswordSchema, async (data) => {
  const t = await getTranslations('errors');
  if (
    !(await limitOk(`forgot:${await clientIp()}`, 5)) ||
    !(await limitOk(`forgot:${data.email.toLowerCase()}`, 5))
  ) {
    return { error: t('tooManyAttempts') };
  }

  const [user] = await db.select().from(users).where(eq(users.email, data.email)).limit(1);

  if (user && !user.deletedAt) {
    const token = await signOneTimeToken({
      purpose: 'password-reset',
      userId: user.id,
      // Tied to the current hash: the link dies as soon as the password changes.
      fingerprint: user.passwordHash.slice(-16),
    });
    const resetLink = `${await requestOrigin()}/reset-password?token=${token}`;
    const locale = await currentLocale();
    sendEmail({
      to: user.email,
      subject: passwordResetSubject(APP_NAME, locale),
      react: PasswordResetEmail({ resetLink, locale }),
    }).catch((err) => console.error('password reset email failed:', err));
  }

  // Same response either way — don't leak which emails have accounts.
  return { success: t('forgotSent') };
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Missing reset token'),
  password: z.string().min(8).max(100),
  confirmPassword: z.string().min(8).max(100),
});

export const resetPassword = validatedAction(resetPasswordSchema, async (data) => {
  const t = await getTranslations('errors');
  if (data.password !== data.confirmPassword) {
    return { error: t('passwordsDontMatch') };
  }

  const invalid = { error: t('resetLinkInvalid') };
  const payload = await verifyOneTimeToken(data.token, 'password-reset');
  if (!payload) return invalid;

  const [user] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
  if (!user || user.deletedAt || user.passwordHash.slice(-16) !== payload.fingerprint) {
    return invalid;
  }

  const passwordHash = await hashPassword(data.password);
  await db.update(users).set({ passwordHash }).where(eq(users.id, user.id));

  const userWithTeam = await getUserWithTeam(user.id);
  await logActivity(userWithTeam?.teamId, user.id, ActivityType.UPDATE_PASSWORD);

  return { success: t('passwordUpdatedSignIn') };
});

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(8).max(100),
  newPassword: z.string().min(8).max(100),
  confirmPassword: z.string().min(8).max(100),
});

export const updatePassword = validatedActionWithUser(
  updatePasswordSchema,
  async (data, _, user) => {
    const { currentPassword, newPassword, confirmPassword } = data;
    const t = await getTranslations('errors');

    const isPasswordValid = await comparePasswords(currentPassword, user.passwordHash);

    if (!isPasswordValid) {
      return {
        currentPassword,
        newPassword,
        confirmPassword,
        error: t('currentPasswordIncorrect'),
      };
    }

    if (currentPassword === newPassword) {
      return {
        currentPassword,
        newPassword,
        confirmPassword,
        error: t('newPasswordSame'),
      };
    }

    if (confirmPassword !== newPassword) {
      return {
        currentPassword,
        newPassword,
        confirmPassword,
        error: t('newPasswordMismatch'),
      };
    }

    const newPasswordHash = await hashPassword(newPassword);
    const userWithTeam = await getUserWithTeam(user.id);

    await Promise.all([
      db.update(users).set({ passwordHash: newPasswordHash }).where(eq(users.id, user.id)),
      logActivity(userWithTeam?.teamId, user.id, ActivityType.UPDATE_PASSWORD),
    ]);

    // Re-issue this session against the new credential — otherwise the
    // fingerprint check would log the user out of the tab they just used to
    // change their password. Other devices' sessions still die (intended).
    await setSession({ id: user.id, passwordHash: newPasswordHash });

    return {
      success: t('passwordUpdated'),
    };
  },
);

const deleteAccountSchema = z.object({
  password: z.string().min(8).max(100),
});

export const deleteAccount = validatedActionWithUser(deleteAccountSchema, async (data, _, user) => {
  const { password } = data;
  const t = await getTranslations('errors');

  const isPasswordValid = await comparePasswords(password, user.passwordHash);
  if (!isPasswordValid) {
    return {
      password,
      error: t('incorrectPasswordDelete'),
    };
  }

  const userWithTeam = await getUserWithTeam(user.id);

  await logActivity(userWithTeam?.teamId, user.id, ActivityType.DELETE_ACCOUNT);

  // Soft delete
  await db
    .update(users)
    .set({
      deletedAt: sql`CURRENT_TIMESTAMP`,
      email: sql`CONCAT(email, '-', id, '-deleted')`, // Ensure email uniqueness
    })
    .where(eq(users.id, user.id));

  if (userWithTeam?.teamId) {
    await db
      .delete(teamMembers)
      .where(and(eq(teamMembers.userId, user.id), eq(teamMembers.teamId, userWithTeam.teamId)));
  }

  (await cookies()).delete('session');
  redirect('/sign-in');
});

const updateAccountSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: usernameOrEmail,
});

export const updateAccount = validatedActionWithUser(updateAccountSchema, async (data, _, user) => {
  const { name, email } = data;
  const t = await getTranslations('errors');
  const userWithTeam = await getUserWithTeam(user.id);

  await Promise.all([
    db.update(users).set({ name, email }).where(eq(users.id, user.id)),
    logActivity(userWithTeam?.teamId, user.id, ActivityType.UPDATE_ACCOUNT),
  ]);

  return { name, success: t('accountUpdated') };
});

// Server-side RBAC for team management — hiding buttons in the UI is cosmetic.
async function hasTeamRole(user: User, teamId: number, min: TeamRole) {
  if (isSuperadmin(user)) return true;
  const [m] = await db
    .select({ role: teamMembers.role })
    .from(teamMembers)
    .where(and(eq(teamMembers.userId, user.id), eq(teamMembers.teamId, teamId)))
    .limit(1);
  return roleAtLeast(m?.role, min);
}

const removeTeamMemberSchema = z.object({
  memberId: z.coerce.number(),
});

export const removeTeamMember = validatedActionWithUser(
  removeTeamMemberSchema,
  async (data, _, user) => {
    const { memberId } = data;
    const t = await getTranslations('errors');
    const userWithTeam = await getUserWithTeam(user.id);

    if (!userWithTeam?.teamId) {
      return { error: t('notInTeam') };
    }

    if (!(await hasTeamRole(user, userWithTeam.teamId, 'admin'))) {
      return { error: t('adminOnlyRemove') };
    }

    await db
      .delete(teamMembers)
      .where(and(eq(teamMembers.id, memberId), eq(teamMembers.teamId, userWithTeam.teamId)));

    await logActivity(userWithTeam.teamId, user.id, ActivityType.REMOVE_TEAM_MEMBER);

    return { success: t('memberRemoved') };
  },
);

const inviteTeamMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['viewer', 'member', 'admin', 'owner']),
});

export const inviteTeamMember = validatedActionWithUser(
  inviteTeamMemberSchema,
  async (data, _, user) => {
    const { email, role } = data;
    const t = await getTranslations('errors');
    const userWithTeam = await getUserWithTeam(user.id);

    if (!userWithTeam?.teamId) {
      return { error: t('notInTeam') };
    }

    if (!(await hasTeamRole(user, userWithTeam.teamId, 'admin'))) {
      return { error: t('adminOnlyInvite') };
    }

    const existingMember = await db
      .select()
      .from(users)
      .leftJoin(teamMembers, eq(users.id, teamMembers.userId))
      .where(and(eq(users.email, email), eq(teamMembers.teamId, userWithTeam.teamId)))
      .limit(1);

    if (existingMember.length > 0) {
      return { error: t('alreadyMember') };
    }

    // Check if there's an existing invitation
    const existingInvitation = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.email, email),
          eq(invitations.teamId, userWithTeam.teamId),
          eq(invitations.status, 'pending'),
        ),
      )
      .limit(1);

    if (existingInvitation.length > 0) {
      return { error: t('invitationExists') };
    }

    // Create a new invitation
    const [invitation] = await db
      .insert(invitations)
      .values({
        teamId: userWithTeam.teamId,
        email,
        role,
        invitedBy: user.id,
        status: 'pending',
      })
      .returning();

    await logActivity(userWithTeam.teamId, user.id, ActivityType.INVITE_TEAM_MEMBER);

    const [team] = await db.select().from(teams).where(eq(teams.id, userWithTeam.teamId)).limit(1);
    const inviteLink = `${await requestOrigin()}/sign-up?inviteId=${invitation.id}`;
    const locale = await currentLocale();
    // Fire-and-forget: a no-op without RESEND_API_KEY, must never block the action.
    sendEmail({
      to: email,
      subject: invitationSubject(team?.name ?? APP_NAME, locale),
      react: InvitationEmail({
        teamName: team?.name ?? APP_NAME,
        inviterEmail: user.email,
        inviteLink,
        locale,
      }),
    }).catch((err) => console.error('invitation email failed:', err));

    return { success: t('invitationSent') };
  },
);

const revokeInvitationSchema = z.object({
  invitationId: z.coerce.number(),
});

export const revokeInvitation = validatedActionWithUser(
  revokeInvitationSchema,
  async (data, _, user) => {
    const t = await getTranslations('errors');
    const userWithTeam = await getUserWithTeam(user.id);

    if (!userWithTeam?.teamId) {
      return { error: t('notInTeam') };
    }

    if (!(await hasTeamRole(user, userWithTeam.teamId, 'admin'))) {
      return { error: t('adminOnlyInvite') };
    }

    // Scope the delete by team + pending status — never trust the id alone.
    await db
      .delete(invitations)
      .where(
        and(
          eq(invitations.id, data.invitationId),
          eq(invitations.teamId, userWithTeam.teamId),
          eq(invitations.status, 'pending'),
        ),
      );

    return { success: t('invitationRevoked') };
  },
);

// Re-send the verification link from the dashboard banner. Rate-limited so the
// button can't be used to spam an address.
export const resendVerification = validatedActionWithUser(z.object({}), async (_data, _, user) => {
  const t = await getTranslations('errors');
  if (user.emailVerified) {
    return { success: t('emailAlreadyVerified') };
  }
  if (!(await limitOk(`verify:${user.id}`, 5))) {
    return { error: t('tooManyAttempts') };
  }
  const locale = await currentLocale();
  sendVerificationEmail(user.id, user.email, locale).catch((err) =>
    console.error('verification email failed:', err),
  );
  return { success: t('verificationSent') };
});
