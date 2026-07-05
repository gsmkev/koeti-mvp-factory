// Plan gating: a team keeps paid features while Stripe still grants access.
// Gate a feature:   if (!isSubscribed(team)) redirect('/pricing')
// Gate in UI:       isSubscribed(team) ? <Feature/> : <UpgradeNudge/>
export function isSubscribed(team: { subscriptionStatus: string | null }) {
  return team.subscriptionStatus === 'active' || team.subscriptionStatus === 'trialing';
}
