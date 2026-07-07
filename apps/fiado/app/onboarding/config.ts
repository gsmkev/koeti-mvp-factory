// Onboarding wizard config: step order, shared by page and actions.
import { createLoader, parseAsStringEnum } from 'nuqs/server';

export const STEPS = ['workspace', 'locale', 'plan'] as const;
export type Step = (typeof STEPS)[number];

export const loadSearchParams = createLoader({
  step: parseAsStringEnum([...STEPS]).withDefault('workspace'),
});

// ponytail: no currency/measurement-unit picker here — every fiado despensa
// bills in guaraníes (hardcoded ₲ throughout the app, see money() in each
// page), so team.currency/measurementSystem are never read. Asking a
// question with only one right answer just adds confusion; add the picker
// back if fiado ever needs multi-currency.
//
// No "invite an employee" step either — that flow only ever sent an email
// invite, which fiado doesn't use (see /dashboard/team: employees get a
// username+password the owner sets up directly). Skipping a step nobody
// could complete beats shipping a step that's actively wrong.
