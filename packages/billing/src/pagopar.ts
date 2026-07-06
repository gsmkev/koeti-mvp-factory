// @koeti/billing — Pagopar (pagopar.com.py), the Stripe alternative for
// Paraguay. Hosted checkout + signed webhook: create an order, redirect the
// buyer to pagopar.com, Pagopar POSTs the signed result back. No native
// subscriptions, so one paid order grants one PAGOPAR_PERIOD_DAYS period of
// subscriptionStatus='active' (the app's webhook enqueues the expiry job).
// Without PAGOPAR_PUBLIC_TOKEN + PAGOPAR_PRIVATE_TOKEN everything degrades to
// an empty catalog — same contract as Stripe without STRIPE_SECRET_KEY.
import { createHash } from 'node:crypto';
import type { Team } from '@koeti/db';

const API = 'https://api.pagopar.com/api';
export const PAGOPAR_PERIOD_DAYS = 30;

const sha1 = (s: string) => createHash('sha1').update(s).digest('hex');

export function pagoparEnabled() {
  return Boolean(process.env.PAGOPAR_PUBLIC_TOKEN && process.env.PAGOPAR_PRIVATE_TOKEN);
}

// Pagopar has no product/price API, so the plan catalog is env-defined:
// PAGOPAR_PLANS="Base:60000,Plus:90000" — name:₲-per-period pairs (PYG has no
// decimal subunit, amounts are whole guaraníes).
export function getPagoparPlans(): { name: string; amount: number }[] {
  if (!pagoparEnabled()) return [];
  return (process.env.PAGOPAR_PLANS ?? 'Base:60000,Plus:90000')
    .split(',')
    .map((pair) => {
      const [name, amount] = pair.split(':');
      return { name: (name ?? '').trim(), amount: Number(amount) };
    })
    .filter((p) => p.name && Number.isFinite(p.amount) && p.amount > 0);
}

// Creates the order (paso 1) and returns the hosted-checkout URL (paso 2).
// The caller must persist hash→team before redirecting: the webhook only
// echoes hash_pedido, never id_pedido_comercio.
export async function createPagoparOrder({
  team,
  user,
  plan,
}: {
  team: { id: number };
  user: { email: string; name?: string | null };
  plan: { name: string; amount: number };
}): Promise<{ hash: string; url: string }> {
  const publicKey = process.env.PAGOPAR_PUBLIC_TOKEN!;
  const privateKey = process.env.PAGOPAR_PRIVATE_TOKEN!;
  const idPedido = `${team.id}-${Date.now()}`;
  const buyer = user.name || user.email;
  const res = await fetch(`${API}/comercios/2.0/iniciar-transaccion`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: sha1(privateKey + idPedido + String(plan.amount)),
      public_key: publicKey,
      monto_total: plan.amount,
      tipo_pedido: 'VENTA-COMERCIO',
      id_pedido_comercio: idPedido,
      // Orders expire in a day; an abandoned checkout never pays late.
      fecha_maxima_pago: new Date(Date.now() + 86_400_000)
        .toISOString()
        .slice(0, 19)
        .replace('T', ' '),
      descripcion_resumen: plan.name,
      // ponytail: we only know email + name; the rest of the buyer fields are
      // required by the API shape but accepted empty for digital goods. Wire
      // real RUC/documento capture if a tenant's invoicing needs it.
      comprador: {
        ruc: '',
        email: user.email,
        ciudad: '1',
        nombre: buyer,
        telefono: '',
        direccion: '',
        documento: '',
        coordenadas: '',
        razon_social: buyer,
        tipo_documento: 'CI',
        direccion_referencia: null,
      },
      compras_items: [
        {
          ciudad: '1',
          nombre: plan.name,
          cantidad: 1,
          categoria: '909',
          public_key: publicKey,
          url_imagen: '',
          descripcion: plan.name,
          id_producto: 1,
          precio_total: plan.amount,
          vendedor_telefono: '',
          vendedor_direccion: '',
          vendedor_direccion_referencia: '',
          vendedor_direccion_coordenadas: '',
        },
      ],
    }),
  });
  const json = (await res.json()) as {
    respuesta: boolean;
    resultado: { data: string }[] | string;
  };
  if (!json.respuesta || typeof json.resultado === 'string') {
    throw new Error(`Pagopar order failed: ${JSON.stringify(json.resultado)}`);
  }
  const hash = json.resultado[0].data;
  return { hash, url: `https://www.pagopar.com/pagos/${hash}` };
}

export type PagoparPayment = {
  pagado: boolean;
  cancelado: boolean;
  hash_pedido: string;
  numero_pedido: string;
  token: string;
};

// Pagopar signs every notification with sha1(private_key + hash_pedido).
// Returns the payment row when the signature matches, null otherwise.
export function verifyPagoparWebhook(body: unknown): PagoparPayment | null {
  const result = (body as { resultado?: PagoparPayment[] } | null)?.resultado?.[0];
  if (!result?.hash_pedido || !result.token) return null;
  return result.token === sha1(process.env.PAGOPAR_PRIVATE_TOKEN! + result.hash_pedido)
    ? result
    : null;
}

type PagoparDeps = {
  getTeamByStripeCustomerId: (customerId: string) => Promise<Team | null>;
  updateTeamSubscription: (
    teamId: number,
    data: {
      stripeSubscriptionId: string | null;
      stripeProductId: string | null;
      planName: string | null;
      subscriptionStatus: string;
    },
  ) => Promise<void>;
};

// Applies a verified notification to the team. The hash→team mapping lives in
// the (otherwise unused) stripeCustomerId column as 'pagopar:<hash>', and the
// plan picked at checkout in stripeProductId as 'pagopar:<plan>' — a team pays
// through exactly one processor, so the columns never collide.
// ponytail: one pending order per team (latest overwrites); dedicated
// pagopar_orders table if concurrent orders per team ever matter.
export async function handlePagoparPayment(
  payment: PagoparPayment,
  deps: PagoparDeps,
): Promise<Team | null> {
  const team = await deps.getTeamByStripeCustomerId(`pagopar:${payment.hash_pedido}`);
  if (!team) {
    console.error('Team not found for Pagopar order:', payment.hash_pedido);
    return null;
  }
  if (payment.pagado) {
    await deps.updateTeamSubscription(team.id, {
      stripeSubscriptionId: `pagopar:${payment.numero_pedido}`,
      stripeProductId: team.stripeProductId,
      planName: team.stripeProductId?.replace(/^pagopar:/, '') ?? null,
      subscriptionStatus: 'active',
    });
  } else {
    // Reversal (paid → unpaid): drop access, same as a Stripe cancellation.
    await deps.updateTeamSubscription(team.id, {
      stripeSubscriptionId: null,
      stripeProductId: null,
      planName: null,
      subscriptionStatus: 'canceled',
    });
  }
  return team;
}
