'use client'

import { useState, useEffect } from 'react'
import { Button, Input } from '@koeti/ui'
import { createSale } from '@/lib/pos/actions'
import type { Product } from '@/lib/db/schema'

type CartItem = Product & { qty: number }

export default function PosPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [error, setError] = useState<string>()
  const [success, setSuccess] = useState<string>()
  const [pending, setPending] = useState(false)

  useEffect(() => {
    fetch('/api/products').then(r => r.json()).then(setProducts)
  }, [success])

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.sku ?? '').toLowerCase().includes(search.toLowerCase())
  )

  function addToCart(product: Product) {
    setSuccess(undefined)
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id)
      if (existing) {
        if (existing.qty >= product.stock) return prev
        return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i)
      }
      return [...prev, { ...product, qty: 1 }]
    })
  }

  function updateQty(productId: number, qty: number) {
    if (qty <= 0) setCart(prev => prev.filter(i => i.id !== productId))
    else setCart(prev => prev.map(i => i.id === productId ? { ...i, qty } : i))
  }

  const total = cart.reduce((sum, i) => sum + i.qty * parseFloat(i.price), 0)

  async function checkout() {
    setError(undefined)
    setSuccess(undefined)
    setPending(true)
    const result = await createSale(cart.map(i => ({
      productId: i.id,
      qty: i.qty,
      unitPrice: parseFloat(i.price),
    })))
    setPending(false)
    if (result.error) { setError(result.error); return }
    setCart([])
    setSuccess(`Venta #${result.saleId} registrada`)
  }

  return (
    <div className="flex gap-6 h-full">
      <div className="flex-1">
        <h1 className="text-2xl font-bold mb-4">Punto de venta</h1>
        <Input
          placeholder="Buscar producto o SKU..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="mb-4"
        />
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.length === 0 && (
            <p className="text-muted-foreground text-sm col-span-full">Sin productos que coincidan</p>
          )}
          {filtered.map(p => (
            <button
              key={p.id}
              onClick={() => addToCart(p)}
              disabled={p.stock === 0}
              className="border border-border rounded-lg p-3 text-left hover:bg-primary/5 hover:border-primary/40 disabled:opacity-40 transition-colors bg-card"
            >
              <p className="font-medium text-sm">{p.name}</p>
              <p className="text-primary font-semibold money">${parseFloat(p.price).toFixed(2)}</p>
              <p className="text-xs text-muted-foreground money">Stock: {p.stock}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="w-72 border-l border-border pl-6 flex flex-col">
        <h2 className="text-lg font-bold mb-4">Carrito</h2>
        {cart.length === 0 && <p className="text-muted-foreground text-sm">Agrega productos</p>}
        <div className="flex-1 space-y-3">
          {cart.map(item => (
            <div key={item.id} className="flex items-center gap-2 text-sm">
              <div className="flex-1">
                <p className="font-medium">{item.name}</p>
                <p className="text-muted-foreground money">${parseFloat(item.price).toFixed(2)} c/u</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => updateQty(item.id, item.qty - 1)} className="w-6 h-6 border border-border rounded text-center">-</button>
                <span className="w-6 text-center money">{item.qty}</span>
                <button onClick={() => updateQty(item.id, item.qty + 1)} className="w-6 h-6 border border-border rounded text-center">+</button>
              </div>
              <p className="w-16 text-right money">${(item.qty * parseFloat(item.price)).toFixed(2)}</p>
            </div>
          ))}
        </div>
        <div className="border-t border-dashed border-border pt-4 mt-4">
          <div className="flex justify-between font-bold text-lg mb-4">
            <span>Total</span>
            <span className="money">${total.toFixed(2)}</span>
          </div>
          {error && <p className="text-destructive text-sm mb-2">{error}</p>}
          {success && <p className="text-primary text-sm mb-2">{success}</p>}
          <Button
            onClick={checkout}
            disabled={cart.length === 0 || pending}
            className="w-full"
          >
            {pending ? 'Cobrando...' : 'Cobrar'}
          </Button>
        </div>
      </div>
    </div>
  )
}
