// Plan tiers for this SaaS. `isSubscribed` (from @koeti/billing) only tells
// you active-vs-not; which named tier a team is on is an app-level decision
// — same convention apps/fiado uses (team.planName?.toLowerCase() === 'x').
import { isSubscribed } from '@koeti/billing';
import type { Team } from '@koeti/db';

export const PLAN_TIERS = ['free', 'premium', 'empresarial'] as const;
export type PlanTier = (typeof PLAN_TIERS)[number];

export function getPlanTier(team: Pick<Team, 'subscriptionStatus' | 'planName'>): PlanTier {
  if (!isSubscribed(team)) return 'free';
  const name = team.planName?.toLowerCase();
  if (name === 'empresarial') return 'empresarial';
  if (name === 'premium') return 'premium';
  return 'free'; // lapsed/unknown plan name falls back to the free allowance
}

export function isEnterprise(team: Pick<Team, 'subscriptionStatus' | 'planName'>): boolean {
  return getPlanTier(team) === 'empresarial';
}

// Real, enforced limits — not just marketing copy. `null` = unlimited.
export const PLAN_LIMITS: Record<
  PlanTier,
  {
    maxWarehouses: number | null;
    maxProducts: number | null;
    csvExport: boolean;
    purchaseOrders: boolean;
    aiInsights: boolean;
  }
> = {
  // maxWarehouses: 2, not 1 — every new team already starts with one seeded
  // "Main Warehouse" (app/(login)/actions.ts), so a 1-warehouse cap would
  // block a free team from ever creating a warehouse of their own.
  free: {
    maxWarehouses: 2,
    maxProducts: 20,
    csvExport: false,
    purchaseOrders: false,
    aiInsights: false,
  },
  premium: {
    maxWarehouses: null,
    maxProducts: null,
    csvExport: true,
    purchaseOrders: true,
    aiInsights: false,
  },
  empresarial: {
    maxWarehouses: null,
    maxProducts: null,
    csvExport: true,
    purchaseOrders: true,
    aiInsights: true,
  },
};

export function planLimitsFor(team: Pick<Team, 'subscriptionStatus' | 'planName'>) {
  return PLAN_LIMITS[getPlanTier(team)];
}
