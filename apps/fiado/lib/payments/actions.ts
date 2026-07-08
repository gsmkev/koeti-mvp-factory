'use server';
// saas-template lib — actions.

import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { teams } from '@koeti/db';
import { createPagoparOrder, getPagoparPlans } from '@koeti/billing';
import { createCheckoutSession, createCustomerPortalSession } from './stripe';
import { withTeam } from '@/lib/auth/middleware';
import { db } from '@/lib/db/drizzle';
import { getUser } from '@/lib/db/queries';

export const checkoutAction = withTeam(async (formData, team) => {
  const priceId = formData.get('priceId') as string;
  if (priceId && process.env.STRIPE_SECRET_KEY) {
    await createCheckoutSession({ team, priceId, getUser });
    return;
  }
  // Pagopar (Stripe alternative, Paraguay): invoicing is mandatory, so the
  // buyer's tax identity is captured at /checkout before the order is created.
  // getPagoparPlans() returns [] without PAGOPAR_PUBLIC_TOKEN/PRIVATE_TOKEN
  // configured (graceful degradation, see billing.md) — surface that instead
  // of silently landing back on /pricing with no explanation.
  const plan = getPagoparPlans().find((p) => p.name === formData.get('plan'));
  redirect(
    plan
      ? `/dashboard/checkout?plan=${encodeURIComponent(plan.name)}`
      : '/pricing?error=unavailable',
  );
}, 'admin');

// `<form action={...}>` needs a Promise<void> signature; checkoutAction's
// 'admin' gate makes it Promise<void | {error}> instead. The pages that use
// this (checkout, /pricing) already requireRole('admin') themselves, so the
// {error} branch is unreachable through the UI — only a raw POST bypassing
// the page would hit it, and discarding it there is fine (denied either way).
export const checkoutFormAction = async (formData: FormData) => {
  await checkoutAction(formData);
};

// Second step of the Pagopar flow: /dashboard/checkout posts the tax identity the
// factura legally requires, we save it on the team (renewals prefill it),
// create the signed order and send the buyer to Pagopar's hosted checkout.
export const pagoparCheckoutAction = withTeam(async (formData, team, user) => {
  const plan = getPagoparPlans().find((p) => p.name === formData.get('plan'));
  if (!plan) redirect('/pricing');

  const taxDocumentType = formData.get('taxDocumentType') === 'RUC' ? 'RUC' : 'CI';
  const taxId = String(formData.get('taxId') ?? '')
    .replace(/[.\s]/g, '')
    .slice(0, 20);
  const businessName = String(formData.get('businessName') ?? '')
    .trim()
    .slice(0, 100);
  // CI: 6–8 digits. RUC: base number + "-" + check digit.
  const taxIdOk = taxDocumentType === 'RUC' ? /^\d{5,8}-\d$/.test(taxId) : /^\d{6,8}$/.test(taxId);
  if (!taxIdOk || !businessName) {
    redirect(`/dashboard/checkout?plan=${encodeURIComponent(plan.name)}&error=invalid`);
  }

  const billing = { taxDocumentType, taxId, businessName };
  const { hash, url } = await createPagoparOrder({ team, user, plan, billing });
  await db
    .update(teams)
    .set({
      ...billing,
      stripeCustomerId: `pagopar:${hash}`, // webhook looks the team up by this
      stripeProductId: `pagopar:${plan.name}`,
      updatedAt: new Date(),
    })
    .where(eq(teams.id, team.id));
  redirect(url);
}, 'admin');

// Same Promise<void> vs Promise<void | {error}> issue as checkoutFormAction above.
export const pagoparCheckoutFormAction = async (formData: FormData) => {
  await pagoparCheckoutAction(formData);
};

export const customerPortalAction = withTeam(async (_, team) => {
  const portalSession = await createCustomerPortalSession(team);
  redirect(portalSession.url);
}, 'admin');

// Same Promise<void> vs Promise<void | {error}> issue as checkoutFormAction above.
export const customerPortalFormAction = async (formData: FormData) => {
  await customerPortalAction(formData);
};
