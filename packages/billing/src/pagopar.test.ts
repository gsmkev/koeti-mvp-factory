// Tests for pagopar.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import {
  createPagoparOrder,
  getPagoparPlans,
  handlePagoparPayment,
  pagoparEnabled,
  verifyPagoparWebhook,
} from './pagopar';

const sha1 = (s: string) => createHash('sha1').update(s).digest('hex');

beforeEach(() => {
  vi.stubEnv('PAGOPAR_PUBLIC_TOKEN', 'pub');
  vi.stubEnv('PAGOPAR_PRIVATE_TOKEN', 'priv');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('without Pagopar keys', () => {
  beforeEach(() => {
    vi.stubEnv('PAGOPAR_PUBLIC_TOKEN', '');
  });

  it('is disabled and the catalog is empty', () => {
    expect(pagoparEnabled()).toBe(false);
    expect(getPagoparPlans()).toEqual([]);
  });
});

describe('getPagoparPlans', () => {
  it('ships a default Base/Plus catalog', () => {
    expect(getPagoparPlans()).toEqual([
      { name: 'Base', amount: 60000 },
      { name: 'Plus', amount: 90000 },
    ]);
  });

  it('parses PAGOPAR_PLANS and drops malformed entries', () => {
    vi.stubEnv('PAGOPAR_PLANS', 'Pro: 100000, sinPrecio, :5, Gratis:abc, Neg:-2');
    expect(getPagoparPlans()).toEqual([{ name: 'Pro', amount: 100000 }]);
  });
});

function webhookBody(over: Partial<Record<string, unknown>> = {}) {
  const hash_pedido = 'hash123';
  return {
    respuesta: true,
    resultado: [
      {
        pagado: true,
        cancelado: false,
        hash_pedido,
        numero_pedido: '1746',
        token: sha1('priv' + hash_pedido),
        ...over,
      },
    ],
  };
}

describe('verifyPagoparWebhook', () => {
  it('accepts a correctly signed notification', () => {
    expect(verifyPagoparWebhook(webhookBody())?.numero_pedido).toBe('1746');
  });

  it('rejects a tampered token', () => {
    expect(verifyPagoparWebhook(webhookBody({ token: 'forged' }))).toBeNull();
  });

  it('rejects garbage bodies', () => {
    expect(verifyPagoparWebhook(null)).toBeNull();
    expect(verifyPagoparWebhook({ resultado: [] })).toBeNull();
  });
});

describe('handlePagoparPayment', () => {
  const team = { id: 7, stripeProductId: 'pagopar:Base' } as never;

  it('activates the subscription on payment', async () => {
    const deps = {
      getTeamByStripeCustomerId: vi.fn().mockResolvedValue(team),
      updateTeamSubscription: vi.fn().mockResolvedValue(undefined),
    };
    await handlePagoparPayment(verifyPagoparWebhook(webhookBody())!, deps);
    expect(deps.getTeamByStripeCustomerId).toHaveBeenCalledWith('pagopar:hash123');
    expect(deps.updateTeamSubscription).toHaveBeenCalledWith(7, {
      stripeSubscriptionId: 'pagopar:1746',
      stripeProductId: 'pagopar:Base',
      planName: 'Base',
      subscriptionStatus: 'active',
    });
  });

  it('clears the subscription on a reversal', async () => {
    const deps = {
      getTeamByStripeCustomerId: vi.fn().mockResolvedValue(team),
      updateTeamSubscription: vi.fn().mockResolvedValue(undefined),
    };
    await handlePagoparPayment(verifyPagoparWebhook(webhookBody({ pagado: false }))!, deps);
    expect(deps.updateTeamSubscription).toHaveBeenCalledWith(7, {
      stripeSubscriptionId: null,
      stripeProductId: null,
      planName: null,
      subscriptionStatus: 'canceled',
    });
  });

  it('does nothing for an unknown order hash', async () => {
    const deps = {
      getTeamByStripeCustomerId: vi.fn().mockResolvedValue(null),
      updateTeamSubscription: vi.fn(),
    };
    expect(await handlePagoparPayment(verifyPagoparWebhook(webhookBody())!, deps)).toBeNull();
    expect(deps.updateTeamSubscription).not.toHaveBeenCalled();
  });
});

describe('createPagoparOrder', () => {
  const order = (billing = { taxDocumentType: 'CI', taxId: '1234567', businessName: 'Ana SRL' }) =>
    createPagoparOrder({
      team: { id: 7 },
      user: { email: 'a@b.py', name: 'Ana' },
      plan: { name: 'Base', amount: 60000 },
      billing,
    });

  it('signs the order and returns the checkout URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({ respuesta: true, resultado: [{ data: 'abc123' }] }),
    });
    vi.stubGlobal('fetch', fetchMock);
    expect(await order()).toEqual({ hash: 'abc123', url: 'https://www.pagopar.com/pagos/abc123' });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.token).toBe(sha1('priv' + body.id_pedido_comercio + '60000'));
    expect(body.monto_total).toBe(60000);
    expect(body.id_pedido_comercio).toMatch(/^7-\d+$/);
    expect(body.comprador).toMatchObject({
      tipo_documento: 'CI',
      documento: '1234567',
      ruc: '',
      razon_social: 'Ana SRL',
    });
  });

  it('maps a RUC to ruc + bare documento (invoicing data)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({ respuesta: true, resultado: [{ data: 'abc123' }] }),
    });
    vi.stubGlobal('fetch', fetchMock);
    await order({ taxDocumentType: 'RUC', taxId: '1234567-8', businessName: 'Ana SRL' });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).comprador).toMatchObject({
      tipo_documento: 'RUC',
      ruc: '1234567-8',
      documento: '1234567',
      razon_social: 'Ana SRL',
    });
  });

  it('throws on a Pagopar error response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: async () => ({ respuesta: false, resultado: 'Token no coincide.' }),
      }),
    );
    await expect(order()).rejects.toThrow('Token no coincide');
  });
});
