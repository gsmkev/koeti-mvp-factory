// API route (POST) — /api/pagopar/webhook. Pagopar notifies payments and
// reversals here; set it as the "respuesta" URL in the Pagopar dashboard.
import {
  PAGOPAR_PERIOD_DAYS,
  handlePagoparPayment,
  pagoparEnabled,
  sifenEnabled,
  verifyPagoparWebhook,
} from '@koeti/billing';
import { enqueueJob } from '@koeti/db';
import { db } from '@/lib/db/drizzle';
import { getTeamByStripeCustomerId, updateTeamSubscription } from '@/lib/db/queries';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  if (!pagoparEnabled()) {
    return NextResponse.json({ error: 'Pagopar not configured' }, { status: 503 });
  }
  const payment = verifyPagoparWebhook(await request.json().catch(() => null));
  if (!payment) {
    return NextResponse.json({ error: 'Token no coincide' }, { status: 400 });
  }
  const team = await handlePagoparPayment(payment, {
    getTeamByStripeCustomerId,
    updateTeamSubscription,
  });
  if (team && payment.pagado) {
    // One paid order buys one period. The expiry job downgrades the team
    // unless a renewal replaced the subscription id by then (see lib/jobs.ts).
    await enqueueJob(
      db,
      'pagopar-expire',
      { teamId: team.id, order: `pagopar:${payment.numero_pedido}` },
      { teamId: team.id, runAt: new Date(Date.now() + PAGOPAR_PERIOD_DAYS * 86_400_000) },
    );
    // Invoicing is mandatory in Paraguay: emit the factura electrónica for
    // this payment in the background (retries + dead-letter for free).
    if (sifenEnabled()) {
      await enqueueJob(
        db,
        'sifen-invoice',
        {
          teamId: team.id,
          order: `pagopar:${payment.numero_pedido}`,
          amount: Math.round(Number(payment.monto ?? 0)),
        },
        { teamId: team.id },
      );
    }
  }
  // Pagopar requires the resultado echoed back as the 200 body — anything
  // else is redelivered every 10 minutes. Handlers are idempotent, and an
  // unknown hash (stale order after a renewal) is acked too, not retried.
  return NextResponse.json([payment]);
}
