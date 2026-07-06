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

export const checkoutAction = withTeam(async (formData, team, user) => {
  const priceId = formData.get('priceId') as string;
  if (priceId && process.env.STRIPE_SECRET_KEY) {
    await createCheckoutSession({ team, priceId, getUser });
    return;
  }
  // Pagopar (Stripe alternative, Paraguay): the pricing card posts the plan
  // name; create the order, remember hash→team, send the buyer to checkout.
  const plan = getPagoparPlans().find((p) => p.name === formData.get('plan'));
  if (!plan) redirect('/pricing'); // no processor configured — nothing to sell
  const { hash, url } = await createPagoparOrder({ team, user, plan });
  await db
    .update(teams)
    .set({
      stripeCustomerId: `pagopar:${hash}`, // webhook looks the team up by this
      stripeProductId: `pagopar:${plan.name}`,
      updatedAt: new Date(),
    })
    .where(eq(teams.id, team.id));
  redirect(url);
});

export const customerPortalAction = withTeam(async (_, team) => {
  const portalSession = await createCustomerPortalSession(team);
  redirect(portalSession.url);
});
