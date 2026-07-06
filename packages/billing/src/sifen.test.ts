// Tests for sifen.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emitSifenInvoice, sifenEnabled } from './sifen';

beforeEach(() => {
  vi.stubEnv('FACTURASEND_TENANT', 'empresa');
  vi.stubEnv('FACTURASEND_API_KEY', 'api_key_x');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it('is disabled without FacturaSend keys', () => {
  vi.stubEnv('FACTURASEND_API_KEY', '');
  expect(sifenEnabled()).toBe(false);
});

describe('emitSifenInvoice', () => {
  const emit = (taxDocumentType = 'RUC', taxId: string | null = '1234567-8') =>
    emitSifenInvoice({
      buyer: { taxDocumentType, taxId, businessName: 'Ana SRL', email: 'a@b.py' },
      item: { description: 'Suscripción Base', amount: 60000 },
    });

  const okResponse = () => ({
    json: async () => ({
      success: true,
      result: { deList: [{ cdc: '0'.repeat(44), numero: '001-001-0000001', estado: 'Aprobado' }] },
    }),
  });

  it('emits a B2B factura for a RUC buyer and returns the CDC', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse());
    vi.stubGlobal('fetch', fetchMock);
    expect(await emit()).toEqual({
      cdc: '0'.repeat(44),
      numero: '001-001-0000001',
      estado: 'Aprobado',
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.facturasend.com.py/empresa/lote/create');
    expect(init.headers.Authorization).toBe('Bearer api_key_x');
    const [de] = JSON.parse(init.body);
    expect(de.tipoDocumento).toBe(1);
    expect(de.cliente).toMatchObject({
      contribuyente: true,
      ruc: '1234567-8',
      razonSocial: 'Ana SRL',
      tipoOperacion: 1,
    });
    expect(de.items[0]).toMatchObject({ precioUnitario: 60000, ivaTipo: 1, iva: 10 });
  });

  it('emits a B2C factura for a CI buyer', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse());
    vi.stubGlobal('fetch', fetchMock);
    await emit('CI', '1234567');
    const [de] = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(de.cliente).toMatchObject({
      contribuyente: false,
      documentoTipo: 1,
      documentoNumero: '1234567',
      tipoOperacion: 2,
    });
  });

  it('throws on a FacturaSend error so the job retries', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        status: 401,
        json: async () => ({ success: false, error: 'api key inválida' }),
      }),
    );
    await expect(emit()).rejects.toThrow('FacturaSend emit failed (401)');
  });
});
