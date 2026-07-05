'use server';
// Server actions — /onboarding: first-run tenant setup.

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { teams } from '@koeti/db';
import { getTranslations } from 'next-intl/server';
import { roleAtLeast } from '@koeti/auth';
import { inviteTeamMember } from '@/app/(login)/actions';
import { teamRoleFor, validatedActionWithUser } from '@/lib/auth/middleware';
import { db } from '@/lib/db/drizzle';
import { getTeamForUser } from '@/lib/db/queries';

const schema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  invites: z.string().optional(),
});

export const completeOnboarding = validatedActionWithUser(schema, async (data, _, user) => {
  const team = await getTeamForUser();
  if (!team) {
    const t = await getTranslations('errors');
    return { error: t('notInTeam') };
  }
  if (!roleAtLeast(teamRoleFor(user, team), 'owner')) redirect('/dashboard');

  await db
    .update(teams)
    .set({ name: data.name, onboardingCompletedAt: new Date(), updatedAt: new Date() })
    .where(eq(teams.id, team.id));

  // ponytail: reuse inviteTeamMember per address — dup checks, email send and
  // activity log for free. A bad address returns an error we deliberately
  // ignore so one typo never blocks getting into the product.
  const emails = (data.invites ?? '')
    .split(/[\s,;]+/)
    .filter((e) => e.includes('@'))
    .slice(0, 20);
  for (const email of emails) {
    const fd = new FormData();
    fd.set('email', email);
    fd.set('role', 'member');
    await inviteTeamMember({}, fd);
  }

  redirect('/dashboard');
});
