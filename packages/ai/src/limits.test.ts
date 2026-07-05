import { describe, expect, it } from 'vitest';
import { resolveAiLimits, type AiLimitConfig } from './limits';

const config: AiLimitConfig = {
  perMinute: 5,
  perDay: 50,
  plans: { plus: { perMinute: 20, perDay: 500 }, base: { perDay: 100 } },
};

describe('resolveAiLimits', () => {
  it('falls back to the SaaS default without a plan', () => {
    expect(resolveAiLimits({ planName: null, aiDailyLimit: null }, config)).toEqual({
      perMinute: 5,
      perDay: 50,
    });
  });

  it('applies plan limits case-insensitively (planName is the Stripe product name)', () => {
    expect(resolveAiLimits({ planName: 'Plus', aiDailyLimit: null }, config)).toEqual({
      perMinute: 20,
      perDay: 500,
    });
  });

  it('partial plan config inherits the default for missing fields', () => {
    expect(resolveAiLimits({ planName: 'Base', aiDailyLimit: null }, config)).toEqual({
      perMinute: 5,
      perDay: 100,
    });
  });

  it('tenant override beats the plan for the daily quota', () => {
    expect(resolveAiLimits({ planName: 'Plus', aiDailyLimit: 9999 }, config).perDay).toBe(9999);
  });

  it('unknown plan falls back to the default', () => {
    expect(resolveAiLimits({ planName: 'Enterprise', aiDailyLimit: null }, config).perDay).toBe(50);
  });
});
