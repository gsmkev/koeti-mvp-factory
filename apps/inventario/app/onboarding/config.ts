// Onboarding wizard config: step order + option lists, shared by page and actions.
import { createLoader, parseAsStringEnum } from 'nuqs/server';

export const STEPS = ['workspace', 'locale', 'team', 'plan'] as const;
export type Step = (typeof STEPS)[number];

export const loadSearchParams = createLoader({
  step: parseAsStringEnum([...STEPS]).withDefault('workspace'),
});

// ponytail: curated ISO-4217 list (factory ships en/es/pt → US/EU/LatAm),
// not the full 180-code table. PYG first — this app is Paraguay-first
// (Pagopar billing, Spanish-first copy). Extend when a real tenant asks.
export const CURRENCIES = [
  'PYG',
  'USD',
  'EUR',
  'GBP',
  'BRL',
  'MXN',
  'COP',
  'ARS',
  'CLP',
  'PEN',
] as const;

export const MEASUREMENT_SYSTEMS = ['metric', 'imperial'] as const;
