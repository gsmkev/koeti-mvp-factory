'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getLocale, getTranslations } from 'next-intl/server';
import { aiChat, AiError } from '@koeti/ai';
import { insights } from '@koeti/db';
import { withTeam } from '@/lib/auth/middleware';
import { db } from '@/lib/db/drizzle';
import { getExpenses } from '@/lib/db/queries';
import { consumeAiQuota } from '@/lib/ai/quota';

export const dismissInsight = withTeam(async (formData, team) => {
  const id = Number(formData.get('id'));
  if (!Number.isInteger(id)) return;
  await db
    .update(insights)
    .set({ dismissedAt: new Date() })
    .where(and(eq(insights.id, id), eq(insights.teamId, team.id)));
  revalidatePath('/dashboard/insights');
});

const LANGUAGE = { en: 'English', es: 'Spanish', pt: 'Portuguese' } as const;

export type SummaryState = { summary?: string; error?: string };

// AI worked example: summarize the last 30 days of expenses with the balanced
// tier, behind the team's AI quota (per-minute burst + durable daily counter).
export const generateMonthlySummary = withTeam(async (_formData, team): Promise<SummaryState> => {
  const [tErrors, tAi, locale] = await Promise.all([
    getTranslations('errors'),
    getTranslations('gastosAi'),
    getLocale(),
  ]);

  const since = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const rows = (await getExpenses(team.id)).filter((e) => e.spentAt >= since);
  if (rows.length === 0) return { error: tAi('noData') };

  const quota = await consumeAiQuota(team);
  if (!quota.ok) {
    return { error: tErrors(quota.reason === 'perMinute' ? 'aiRateLimited' : 'aiQuotaExceeded') };
  }

  const language = LANGUAGE[locale as keyof typeof LANGUAGE] ?? 'Spanish';
  const data = rows.map((e) => `${e.spentAt} | ${e.category} | ${e.description} | $${e.amount}`);
  try {
    const { content } = await aiChat({
      tier: 'balanced',
      maxTokens: 400,
      system:
        `You are a concise financial assistant for a small team. Answer in ${language}. ` +
        'Plain text only, no markdown, at most 5 short sentences.',
      prompt:
        'Summarize this expense log from the last 30 days: overall total, main categories, ' +
        `notable spikes or patterns, and one actionable saving tip.\n\n${data.join('\n')}`,
    });
    return { summary: content };
  } catch (error) {
    // Missing MISTRAL_API_KEY or provider outage — degrade to a friendly message.
    if (error instanceof AiError) return { error: tErrors('aiUnavailable') };
    throw error;
  }
});
