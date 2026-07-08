'use client';
// Punto de venta: tocá un producto para agregarlo (como una caja registradora
// simple), elegí contado o fiado, y cobrá. Sin selects para elegir producto —
// pensado para uso con el pulgar, en el mostrador, por alguien que puede no
// estar cómodo con formularios.
import { useActionState, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Minus, Plus } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  cn,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SubmitButton,
} from '@koeti/ui';
import type { Cliente, Producto } from '@/lib/db/schema';
import { registrarVenta } from '@/app/(dashboard)/dashboard/pos/actions';

const money = (n: number) => `₲${n.toLocaleString('es-PY')}`;

export function PosCart({ productos, clientes }: { productos: Producto[]; clientes: Cliente[] }) {
  const t = useTranslations('pos');
  const [qtyById, setQtyById] = useState<Record<number, number>>({});
  const [clienteId, setClienteId] = useState('');
  const [paymentType, setPaymentType] = useState<'contado' | 'fiado'>('contado');
  const [state, formAction, isPending] = useActionState<{ error?: string } | undefined, FormData>(
    async (_prev, formData) => (await registrarVenta(formData)) ?? {},
    undefined,
  );

  useEffect(() => {
    if (state && !state.error) {
      setQtyById({});
      setClienteId('');
      setPaymentType('contado');
    }
  }, [state]);

  const cart = productos
    .map((p) => ({ producto: p, qty: qtyById[p.id] ?? 0 }))
    .filter((l) => l.qty > 0);
  const total = cart.reduce((sum, l) => sum + Number(l.producto.price) * l.qty, 0);

  function setQty(productoId: number, stock: number, next: number) {
    const capped = Math.max(0, Math.min(next, stock));
    setQtyById((prev) => {
      if (capped === 0) {
        const { [productoId]: _drop, ...rest } = prev;
        return rest;
      }
      return { ...prev, [productoId]: capped };
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {productos.map((p) => {
          const qty = qtyById[p.id] ?? 0;
          const agotado = p.stock <= 0;
          return (
            <Card
              key={p.id}
              className={cn(
                'gap-2 py-4 transition-colors',
                qty > 0 && 'border-primary ring-1 ring-primary',
                agotado && 'opacity-50',
              )}
            >
              <CardContent className="flex flex-col gap-3 px-4">
                <button
                  type="button"
                  disabled={agotado}
                  onClick={() => setQty(p.id, p.stock, qty + 1)}
                  className="text-left disabled:cursor-not-allowed"
                >
                  <p className="font-medium leading-snug">{p.name}</p>
                  <p className="text-muted-foreground">
                    {agotado ? t('outOfStock') : money(Number(p.price))}
                  </p>
                </button>
                {qty > 0 && (
                  <div className="flex items-center justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-11"
                      aria-label={t('decrease')}
                      onClick={() => setQty(p.id, p.stock, qty - 1)}
                    >
                      <Minus />
                    </Button>
                    <span className="text-xl font-semibold tabular-nums">{qty}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-11"
                      aria-label={t('increase')}
                      disabled={qty >= p.stock}
                      onClick={() => setQty(p.id, p.stock, qty + 1)}
                    >
                      <Plus />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-baseline justify-between">
            <span>{t('total')}</span>
            <span className="text-2xl">{money(total)}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-5">
            <input
              type="hidden"
              name="items"
              value={JSON.stringify(cart.map((l) => ({ productoId: l.producto.id, qty: l.qty })))}
            />
            <input type="hidden" name="paymentType" value={paymentType} />
            <input
              type="hidden"
              name="clienteId"
              value={paymentType === 'fiado' ? clienteId : ''}
            />

            <p className="font-medium">{t('paymentType')}</p>
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                size="lg"
                variant={paymentType === 'contado' ? 'default' : 'outline'}
                onClick={() => setPaymentType('contado')}
              >
                {t('contado')}
              </Button>
              <Button
                type="button"
                size="lg"
                variant={paymentType === 'fiado' ? 'default' : 'outline'}
                onClick={() => setPaymentType('fiado')}
              >
                {t('fiado')}
              </Button>
            </div>

            {paymentType === 'fiado' && (
              <div>
                <Select value={clienteId} onValueChange={setClienteId}>
                  <SelectTrigger className="h-auto w-full py-3 text-base">
                    <SelectValue placeholder={t('selectClient')} />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!clienteId && (
                  <p className="mt-2 text-muted-foreground">{t('clientRequiredHint')}</p>
                )}
              </div>
            )}

            {state?.error && <p className="text-destructive">{state.error}</p>}

            <SubmitButton
              size="lg"
              className="h-14 w-full text-lg"
              disabled={cart.length === 0 || (paymentType === 'fiado' && !clienteId) || isPending}
              pendingText={t('registering')}
            >
              {t('checkout')}
            </SubmitButton>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
