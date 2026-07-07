'use client';
// Carrito de venta — agrega productos, elige contado/fiado y cliente,
// y postea al server action registrarVenta con el carrito serializado.
import { useActionState, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Trash2 } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DataTable,
  EmptyState,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SubmitButton,
} from '@koeti/ui';
import type { Cliente, Producto } from '@/lib/db/schema';
import { registrarVenta } from '@/app/(dashboard)/dashboard/pos/actions';

const money = (n: number) => `₲${n.toLocaleString('es')}`;

type CartLine = { productoId: number; name: string; price: number; qty: number };

export function PosCart({ productos, clientes }: { productos: Producto[]; clientes: Cliente[] }) {
  const t = useTranslations('pos');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [productoId, setProductoId] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [paymentType, setPaymentType] = useState<'contado' | 'fiado'>('contado');
  const [state, formAction, isPending] = useActionState<{ error?: string } | undefined, FormData>(
    async (_prev, formData) => (await registrarVenta(formData)) ?? {},
    undefined,
  );

  useEffect(() => {
    if (state && !state.error) {
      setCart([]);
      setClienteId('');
      setPaymentType('contado');
    }
  }, [state]);

  const disponibles = productos.filter((p) => p.stock > 0);
  const total = cart.reduce((sum, l) => sum + l.price * l.qty, 0);

  function addToCart() {
    const p = productos.find((p) => p.id === Number(productoId));
    if (!p) return;
    setCart((prev) => {
      const existing = prev.find((l) => l.productoId === p.id);
      const nextQty = (existing?.qty ?? 0) + 1;
      if (nextQty > p.stock) return prev;
      if (existing) {
        return prev.map((l) => (l.productoId === p.id ? { ...l, qty: nextQty } : l));
      }
      return [...prev, { productoId: p.id, name: p.name, price: Number(p.price), qty: 1 }];
    });
    setProductoId('');
  }

  function setQty(productoId: number, qty: number) {
    const p = productos.find((p) => p.id === productoId);
    const capped = Math.max(1, Math.min(qty, p?.stock ?? qty));
    setCart((prev) => prev.map((l) => (l.productoId === productoId ? { ...l, qty: capped } : l)));
  }

  function removeFromCart(productoId: number) {
    setCart((prev) => prev.filter((l) => l.productoId !== productoId));
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>{t('cartTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="grid min-w-52 flex-1 gap-1.5">
              <Label>{t('addProduct')}</Label>
              <Select value={productoId} onValueChange={setProductoId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('selectProduct')} />
                </SelectTrigger>
                <SelectContent>
                  {disponibles.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name} — {money(Number(p.price))} ({t('stockLabel', { count: p.stock })})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="button" onClick={addToCart} disabled={!productoId}>
              {t('add')}
            </Button>
          </div>

          <DataTable
            rows={cart}
            rowKey={(l) => l.productoId}
            columns={[
              { header: t('colProduct'), cell: (l) => l.name },
              {
                header: t('colQty'),
                className: 'w-24',
                cell: (l) => (
                  <Input
                    type="number"
                    min={1}
                    value={l.qty}
                    onChange={(e) => setQty(l.productoId, Number(e.target.value))}
                    className="h-8 w-20"
                  />
                ),
              },
              {
                header: t('colSubtotal'),
                className: 'text-right',
                cell: (l) => money(l.price * l.qty),
              },
              {
                header: '',
                className: 'w-10',
                cell: (l) => (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={t('remove')}
                    onClick={() => removeFromCart(l.productoId)}
                  >
                    <Trash2 className="size-4 text-muted-foreground" />
                  </Button>
                ),
              },
            ]}
            empty={<EmptyState title={t('emptyCart')} className="border-none" />}
          />

          <div className="flex items-center justify-between border-t pt-4 text-lg font-semibold">
            <span>{t('total')}</span>
            <span>{money(total)}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('checkoutTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <input
              type="hidden"
              name="items"
              value={JSON.stringify(cart.map(({ productoId, qty }) => ({ productoId, qty })))}
            />
            <div>
              <Label className="mb-2">{t('paymentType')}</Label>
              <Select
                value={paymentType}
                onValueChange={(v) => setPaymentType(v as 'contado' | 'fiado')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contado">{t('contado')}</SelectItem>
                  <SelectItem value="fiado">{t('fiado')}</SelectItem>
                </SelectContent>
              </Select>
              <input type="hidden" name="paymentType" value={paymentType} />
            </div>
            <div>
              <Label className="mb-2">{t('client')}</Label>
              <Select value={clienteId} onValueChange={setClienteId}>
                <SelectTrigger>
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
              <input type="hidden" name="clienteId" value={clienteId} />
              {paymentType === 'fiado' && !clienteId && (
                <p className="mt-1 text-sm text-muted-foreground">{t('clientRequiredHint')}</p>
              )}
            </div>
            {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
            <SubmitButton
              className="w-full"
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
