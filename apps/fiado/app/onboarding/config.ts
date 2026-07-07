// Onboarding wizard config: step order, shared by page and actions.
import { createLoader, parseAsStringEnum } from 'nuqs/server';

export const STEPS = ['workspace', 'locale', 'team', 'plan'] as const;
export type Step = (typeof STEPS)[number];

export const loadSearchParams = createLoader({
  step: parseAsStringEnum([...STEPS]).withDefault('workspace'),
});

// ponytail: no currency/measurement-unit picker here — every fiado despensa
// bills in guaraníes (hardcoded ₲ throughout the app, see money() in each
// page), so team.currency/measurementSystem are never read. Asking a
// question with only one right answer just adds confusion; add the picker
// back if fiado ever needs multi-currency.
