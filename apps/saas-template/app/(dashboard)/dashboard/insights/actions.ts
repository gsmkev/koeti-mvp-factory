'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { insights } from '@koeti/db';
import { withTeam } from '@/lib/auth/middleware';
import { db } from '@/lib/db/drizzle';

export const dismissInsight = withTeam(async (formData, team) => {
  const id = Number(formData.get('id'));
  if (!Number.isInteger(id)) return;
  await db
    .update(insights)
    .set({ dismissedAt: new Date() })
    .where(and(eq(insights.id, id), eq(insights.teamId, team.id)));
  revalidatePath('/dashboard/insights');
});
