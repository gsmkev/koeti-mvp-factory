'use client'

import { Button } from '@koeti/ui'
import { cancelSale } from '@/lib/pos/actions'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function CancelButton({ saleId }: { saleId: number }) {
  const router = useRouter()
  const [error, setError] = useState<string>()
  const [pending, setPending] = useState(false)

  async function handle() {
    if (!confirm('¿Cancelar esta venta? Se restaurará el stock.')) return
    setPending(true)
    const result = await cancelSale(saleId)
    setPending(false)
    if (result.error) { setError(result.error); return }
    router.refresh()
  }

  return (
    <>
      {error && <span className="text-destructive text-xs">{error}</span>}
      <Button variant="destructive" size="sm" onClick={handle} disabled={pending}>
        {pending ? 'Cancelando...' : 'Cancelar'}
      </Button>
    </>
  )
}
