'use client';
// A vendedor sees everything a owner does except "Empleados" (user
// management) and the subscription/checkout flow — those two are admin+
// server-side (see requireRole('admin') on those pages). Nav components use
// this to hide links to doors that are locked anyway.
import useSWR from 'swr';
import { TeamDataWithMembers, User } from '@/lib/db/schema';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useIsOwner() {
  const { data: user } = useSWR<User>('/api/user', fetcher);
  const { data: team } = useSWR<TeamDataWithMembers>('/api/team', fetcher);
  const myRole = team?.teamMembers?.find((m) => m.user.id === user?.id)?.role;
  return myRole === 'owner' || user?.role === 'superadmin';
}

// Insights (stock/credit-limit alerts) are a Premium perk — see /pricing.
// Inlines @koeti/billing's isSubscribed() check instead of importing it: that
// package's barrel also re-exports stripe.ts (server-only, needs
// next/headers), which breaks the client bundle if pulled in from here.
export function useIsPremium() {
  const { data: team } = useSWR<TeamDataWithMembers>('/api/team', fetcher);
  const isSubscribed =
    team?.subscriptionStatus === 'active' || team?.subscriptionStatus === 'trialing';
  return Boolean(isSubscribed && team?.planName?.toLowerCase() === 'premium');
}
