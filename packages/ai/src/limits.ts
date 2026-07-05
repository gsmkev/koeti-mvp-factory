// AI rate limits, resolved per request in three layers:
//   tenant override (teams.ai_daily_limit) > plan (config.plans[planName]) > SaaS default.
// Each app declares its own AiLimitConfig (per-SaaS knob) in lib/ai/quota.ts;
// plan keys are matched against teams.planName case-insensitively (planName is
// the Stripe product name, e.g. 'Base' / 'Plus').

export interface AiLimits {
  /** Burst guard — enforced in-memory per instance (same ceiling as `rateLimit`). */
  perMinute: number;
  /** Real quota — enforced against the durable ai_usage counter in Postgres. */
  perDay: number;
}

export interface AiLimitConfig extends AiLimits {
  plans?: Record<string, Partial<AiLimits>>;
}

export function resolveAiLimits(
  team: { planName: string | null; aiDailyLimit: number | null },
  config: AiLimitConfig,
): AiLimits {
  const plan = team.planName ? config.plans?.[team.planName.toLowerCase()] : undefined;
  return {
    perMinute: plan?.perMinute ?? config.perMinute,
    perDay: team.aiDailyLimit ?? plan?.perDay ?? config.perDay,
  };
}
