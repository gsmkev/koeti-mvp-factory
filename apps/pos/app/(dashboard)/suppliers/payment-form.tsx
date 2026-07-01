'use client'

import { useActionState, useState, useEffect, useRef, useId } from 'react'
import { Button, Input, Label } from '@koeti/ui'
import { upsertPayment } from '@/lib/suppliers/actions'
import type { ActionState } from '@/lib/auth/middleware'
import type { Supplier } from '@/lib/db/schema'

type Payment = { id: number; supplierId: number; amount: string; description: string; paidAt: Date }

const initial: ActionState = { error: '' }

export default function PaymentForm({
  suppliers,
  payment,
}: {
  suppliers: Supplier[]
  payment?: Payment
}) {
  const [state, action] = useActionState<ActionState, FormData>(upsertPayment, initial)
  const [editing, setEditing] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const uid = useId()

  useEffect(() => {
    if (!state?.success) return
    if (payment) setEditing(false)
    else formRef.current?.reset()
  }, [state, payment])

  if (payment && !editing) {
    return (
      <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Editar</Button>
    )
  }

  return (
    <form ref={formRef} action={action} className="border border-border rounded-lg p-4 space-y-3 max-w-md bg-card">
      <h3 className="font-semibold">{payment ? 'Editar pago' : 'Nuevo pago'}</h3>
      {payment && <input type="hidden" name="id" value={payment.id} />}
      <div>
        <Label htmlFor={`${uid}-supplierId`}>Proveedor</Label>
        <select
          id={`${uid}-supplierId`}
          name="supplierId"
          defaultValue={payment?.supplierId}
          className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
          required
        >
          <option value="">Seleccionar...</option>
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor={`${uid}-amount`}>Monto</Label>
          <Input id={`${uid}-amount`} name="amount" type="number" step="0.01" min="0" defaultValue={payment?.amount} required />
        </div>
        <div>
          <Label htmlFor={`${uid}-paidAt`}>Fecha</Label>
          <Input id={`${uid}-paidAt`} name="paidAt" type="date"
            defaultValue={payment ? new Date(payment.paidAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)}
          />
        </div>
      </div>
      <div>
        <Label htmlFor={`${uid}-description`}>Descripción</Label>
        <Input id={`${uid}-description`} name="description" defaultValue={payment?.description} required />
      </div>
      {state?.error && <p className="text-destructive text-sm">{state.error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm">{payment ? 'Guardar' : 'Registrar'}</Button>
        {payment && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancelar</Button>
        )}
      </div>
    </form>
  )
}
