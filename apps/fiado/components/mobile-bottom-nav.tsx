'use client';
// Bottom tab bar for the 4 screens everyone uses every day. The hamburger
// drawer (AppShell) still has everything else (settings, activity...) —
// this is a mobile-only shortcut, not a replacement for it.
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, ShoppingCart, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@koeti/ui';

export function MobileBottomNav() {
  const pathname = usePathname();
  const t = useTranslations('nav');
  const tf = useTranslations('fiado');

  const items = [
    { href: '/dashboard', label: t('overview'), icon: LayoutDashboard },
    { href: '/dashboard/pos', label: tf('navPos'), icon: ShoppingCart },
    { href: '/dashboard/productos', label: tf('navProductos'), icon: Package },
    { href: '/dashboard/clientes', label: tf('navClientes'), icon: Users },
  ];

  return (
    <nav
      aria-label={tf('bottomNavLabel')}
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-sidebar-border bg-sidebar pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium',
              active
                ? 'text-sidebar-primary'
                : 'text-sidebar-foreground/70 hover:text-sidebar-foreground',
            )}
          >
            <Icon className="size-6" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
