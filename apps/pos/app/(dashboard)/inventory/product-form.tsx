'use client'

import { useActionState, useState, useEffect, useRef, useId } from 'react'
import { Button, Input, Label } from '@koeti/ui'
import { upsertProduct } from '@/lib/inventory/actions'
import type { ActionState } from '@/lib/auth/middleware'
import type { Product } from '@/lib/db/schema'

const initial: ActionState = { error: '' }

function Fields({ product, uid }: { product?: Product; uid: string }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <Label htmlFor={`${uid}-name`}>Nombre</Label>
        <Input id={`${uid}-name`} name="name" defaultValue={product?.name} required />
      </div>
      <div>
        <Label htmlFor={`${uid}-sku`}>SKU</Label>
        <Input id={`${uid}-sku`} name="sku" defaultValue={product?.sku ?? ''} />
      </div>
      <div>
        <Label htmlFor={`${uid}-price`}>Precio</Label>
        <Input id={`${uid}-price`} name="price" type="number" step="0.01" min="0" defaultValue={product?.price} required />
      </div>
      <div>
        <Label htmlFor={`${uid}-stock`}>Stock</Label>
        <Input id={`${uid}-stock`} name="stock" type="number" min="0" defaultValue={product?.stock ?? 0} required />
      </div>
    </div>
  )
}

export default function ProductForm({ product }: { product?: Product }) {
  const [state, action] = useActionState<ActionState, FormData>(upsertProduct, initial)
  const [editing, setEditing] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const uid = useId()

  useEffect(() => {
    if (!state?.success) return
    if (product) setEditing(false)
    else formRef.current?.reset()
  }, [state, product])

  if (product && !editing) {
    return (
      <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Editar</Button>
    )
  }

  return (
    <form ref={formRef} action={action} className="border border-border rounded-lg p-4 mb-4 space-y-3 max-w-md bg-card">
      <h2 className="font-semibold">{product ? 'Editar producto' : 'Nuevo producto'}</h2>
      {product && <input type="hidden" name="id" value={product.id} />}
      <Fields product={product} uid={uid} />
      {state?.error && <p className="text-destructive text-sm">{state.error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm">{product ? 'Guardar' : 'Crear'}</Button>
        {product && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancelar</Button>
        )}
      </div>
    </form>
  )
}
