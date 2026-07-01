'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Suspense } from 'react'
import {
  ShoppingCart, Package, Users, BarChart2, ClipboardList,
  CircleIcon, LogOut,
} from 'lucide-react'
import { signOut } from '@/app/(login)/actions'
import useSWR from 'swr'
import { User } from '@/lib/db/schema'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const nav = [
  { href: '/pos',        label: 'Vender',      icon: ShoppingCart },
  { href: '/sales',      label: 'Ventas',       icon: ClipboardList },
  { href: '/inventory',  label: 'Inventario',   icon: Package },
  { href: '/suppliers',  label: 'Proveedores',  icon: Users },
  { href: '/dashboard',  label: 'Dashboard',    icon: BarChart2 },
]

function Sidebar() {
  const pathname = usePathname()
  const { data: user } = useSWR<User>('/api/user', fetcher)

  return (
    <aside className="w-56 min-h-screen border-r border-border bg-card flex flex-col">
      <div className="p-4 border-b border-border flex items-center gap-2">
        <CircleIcon className="h-5 w-5 text-primary" />
        <span className="font-semibold text-foreground">koeti-pos</span>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              pathname === href
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-secondary'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>
      <div className="p-3 border-t border-border">
        <p className="text-xs text-muted-foreground truncate px-3 mb-2">{user?.email}</p>
        <form action={signOut}>
          <button
            type="submit"
            className="flex items-center gap-2 px-3 py-2 w-full rounded-md text-sm text-muted-foreground hover:bg-secondary"
          >
            <LogOut className="h-4 w-4" />
            Salir
          </button>
        </form>
      </div>
    </aside>
  )
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Suspense fallback={<div className="w-56 border-r border-border" />}>
        <Sidebar />
      </Suspense>
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}
