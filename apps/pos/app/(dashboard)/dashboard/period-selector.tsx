'use client'

import { useRouter, usePathname } from 'next/navigation'

export default function PeriodSelector({ current }: { current: string }) {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <select
      value={current}
      onChange={e => router.push(`${pathname}?period=${e.target.value}`)}
      className="border border-input rounded-md px-3 py-1.5 text-sm bg-background"
    >
      <option value="7d">Últimos 7 días</option>
      <option value="30d">Últimos 30 días</option>
      <option value="90d">Últimos 90 días</option>
    </select>
  )
}
