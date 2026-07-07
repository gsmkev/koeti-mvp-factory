'use server';
// Server actions — /onboarding wizard. One action per step; each saves and
// redirects to the next step, so every form is a plain server-rendered
// <form action={...}> (no client state). Owner-only: the wizard manages
// tenant basics.

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { eq } from 'drizzle-orm';
import { teams, type TeamDataWithMembers, type User } from '@koeti/db';
import { roleAtLeast } from '@koeti/auth';
import { isLocale, LOCALE_COOKIE } from '@koeti/i18n';
import { inviteTeamMember } from '@/app/(login)/actions';
import { teamRoleFor, withTeam } from '@/lib/auth/middleware';
import { db } from '@/lib/db/drizzle';
import { getUser } from '@/lib/db/queries';
import { createCheckoutSession } from '@/lib/payments/stripe';

function ownerOnly(user: User, team: TeamDataWithMembers) {
  if (!roleAtLeast(teamRoleFor(user, team), 'owner')) redirect('/dashboard');
}

export const saveWorkspace = withTeam(async (formData, team, user) => {
  ownerOnly(user, team);
  const name = String(formData.get('name') ?? '')
    .trim()
    .slice(0, 100);
  if (name) {
    await db.update(teams).set({ name, updatedAt: new Date() }).where(eq(teams.id, team.id));
  }
  redirect('/onboarding?step=locale');
});

export const saveLocale = withTeam(async (formData, team, user) => {
  ownerOnly(user, team);

  const locale = String(formData.get('locale') ?? '');
  if (isLocale(locale)) {
    (await cookies()).set(LOCALE_COOKIE, locale, {
      path: '/',
      maxAge: 31_536_000,
      sameSite: 'lax',
    });
  }

  redirect('/onboarding?step=team');
});

export const saveInvites = withTeam(async (formData, team, user) => {
  ownerOnly(user, team);
  // ponytail: reuse inviteTeamMember per address — dup checks, email send and
  // activity log for free. A bad address returns an error we deliberately
  // ignore so one typo never blocks getting into the product.
  const emails = String(formData.get('invites') ?? '')
    .split(/[\s,;]+/)
    .filter((e) => e.includes('@'))
    .slice(0, 20);
  for (const email of emails) {
    const fd = new FormData();
    fd.set('email', email);
    fd.set('role', 'member');
    await inviteTeamMember({}, fd);
  }
  redirect('/onboarding?step=plan');
});

export const completeOnboarding = withTeam(async (formData, team, user) => {
  ownerOnly(user, team);
  await db
    .update(teams)
    .set({ onboardingCompletedAt: new Date(), updatedAt: new Date() })
    .where(eq(teams.id, team.id));

  // Paid plan picked → straight to Stripe checkout (onboarding already
  // stamped, so the post-checkout return lands on the dashboard, not here).
  // createCheckoutSession redirects internally, so this never falls through.
  const priceId = String(formData.get('priceId') ?? '');
  if (priceId && process.env.STRIPE_SECRET_KEY) {
    await createCheckoutSession({ team, priceId, getUser });
  }
  redirect('/dashboard');
});
