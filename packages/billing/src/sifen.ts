// @koeti/billing — SIFEN e-invoicing (Paraguay) via FacturaSend
// (facturasend.com.py). Talking to SIFEN directly means signed XML over SOAP
// with a qualified certificate plus homologation; FacturaSend does the XML,
// firma digital, envío and KuDE behind one REST call, and can email the
// document to the client. Enabled by FACTURASEND_TENANT + FACTURASEND_API_KEY;
// without them nothing is emitted — same degradation contract as
// Stripe/Pagopar without their keys.
export function sifenEnabled() {
  return Boolean(process.env.FACTURASEND_TENANT && process.env.FACTURASEND_API_KEY);
}

export type SifenInvoiceInput = {
  buyer: {
    taxDocumentType: string; // 'CI' | 'RUC' (teams.taxDocumentType)
    taxId: string | null;
    businessName: string | null;
    email: string;
  };
  item: { description: string; amount: number }; // whole ₲, IVA 10% included
};

// Emits one factura electrónica (tipoDocumento 1) and returns the identifiers
// worth persisting. Approval is asynchronous on SIFEN's side — `estado` here
// is the enqueue result, the authoritative state lives with FacturaSend.
export async function emitSifenInvoice({ buyer, item }: SifenInvoiceInput): Promise<{
  cdc: string;
  numero: string;
  estado: string;
}> {
  const isRuc = buyer.taxDocumentType === 'RUC' && !!buyer.taxId;
  const razonSocial = buyer.businessName || 'CONSUMIDOR FINAL';
  const de = {
    tipoDocumento: 1,
    establecimiento: process.env.FACTURASEND_ESTABLECIMIENTO || '001',
    punto: process.env.FACTURASEND_PUNTO || '001',
    // ponytail: numero omitted — FacturaSend assigns the sequence per
    // establecimiento/punto. If a tenant's config requires explicit numbering
    // the job fails loudly and dead-letters instead of emitting gaps.
    fecha: new Date().toISOString().slice(0, 19),
    tipoImpuesto: 1,
    moneda: 'PYG',
    cliente: isRuc
      ? {
          contribuyente: true,
          ruc: buyer.taxId,
          razonSocial,
          tipoOperacion: 1, // B2B
          pais: 'PRY',
          email: buyer.email,
        }
      : {
          contribuyente: false,
          documentoTipo: 1, // cédula paraguaya
          documentoNumero: buyer.taxId || '0',
          razonSocial,
          tipoOperacion: 2, // B2C
          pais: 'PRY',
          email: buyer.email,
        },
    items: [
      {
        codigo: 'SUB',
        descripcion: item.description,
        unidadMedida: 77, // unidad
        cantidad: 1,
        precioUnitario: item.amount,
        ivaTipo: 1, // gravado
        ivaBase: 100,
        iva: 10, // SaaS subscription = IVA 10%, price is IVA-included
      },
    ],
    condicion: {
      tipo: 1, // contado — Pagopar only notifies after the money moved
      // ponytail: payment method reported as efectivo; map Pagopar's
      // forma_pago_identificador to SIFEN entrega tipos if a tenant needs it.
      entregas: [{ tipo: 1, monto: String(item.amount), moneda: 'PYG', cambio: 0 }],
    },
  };
  // FACTURASEND_BASE_URL: override for their sandbox or a local mock in tests.
  const base = process.env.FACTURASEND_BASE_URL || 'https://api.facturasend.com.py';
  const res = await fetch(`${base}/${process.env.FACTURASEND_TENANT}/lote/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.FACTURASEND_API_KEY}`,
    },
    body: JSON.stringify([de]),
  });
  const json = (await res.json().catch(() => null)) as {
    success?: boolean;
    error?: unknown;
    result?: { deList?: { cdc?: string; numero?: string; estado?: string }[] };
  } | null;
  if (!json?.success) {
    throw new Error(
      `FacturaSend emit failed (${res.status}): ${JSON.stringify(json?.error ?? json)}`,
    );
  }
  const first = json.result?.deList?.[0] ?? {};
  return { cdc: first.cdc ?? '', numero: first.numero ?? '', estado: first.estado ?? 'sent' };
}
