'use client'

import { useActionState, useState, useEffect, useRef, useId } from 'react'
import { Button, Input, Label } from '@koeti/ui'
import { upsertSupplier } from '@/lib/suppliers/actions'
import type { ActionState } from '@/lib/auth/middleware'
import type { Supplier } from '@/lib/db/schema'

const initial: ActionState = { error: '' }

export default function SupplierForm({ supplier }: { supplier?: Supplier }) {
  const [state, action] = useActionState<ActionState, FormData>(upsertSupplier, initial)
  const [editing, setEditing] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const uid = useId()

  useEffect(() => {
    if (!state?.success) return
    if (supplier) setEditing(false)
    else formRef.current?.reset()
  }, [state, supplier])

  if (supplier && !editing) {
    return (
      <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Editar</Button>
    )
  }

  return (
    <form ref={formRef} action={action} className="border border-border rounded-lg p-4 space-y-3 max-w-md bg-card">
      <h3 className="font-semibold">{supplier ? 'Editar proveedor' : 'Nuevo proveedor'}</h3>
      {supplier && <input type="hidden" name="id" value={supplier.id} />}
      <div>
        <Label htmlFor={`${uid}-name`}>Nombre</Label>
        <Input id={`${uid}-name`} name="name" defaultValue={supplier?.name} required />
      </div>
      <div>
        <Label htmlFor={`${uid}-contact`}>Contacto</Label>
        <Input id={`${uid}-contact`} name="contact" defaultValue={supplier?.contact ?? ''} />
      </div>
      {state?.error && <p className="text-destructive text-sm">{state.error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm">{supplier ? 'Guardar' : 'Crear'}</Button>
        {supplier && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancelar</Button>
        )}
      </div>
    </form>
  )
}
