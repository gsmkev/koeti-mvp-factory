'use client'

import * as React from 'react'
import { Moon, Sun } from 'lucide-react'

import { cn } from '../utils'

// Dark mode with zero deps. The CSS ships a full `.dark` token set (globals.css);
// all that was missing is something to toggle the class. Preference is persisted
// to localStorage and applied before paint by <ThemeScript/> (no FOUC).

// Runs in <head> before React hydrates — reads the saved/ system preference and
// sets `.dark` on <html> synchronously. Requires suppressHydrationWarning on <html>.
export function ThemeScript() {
  const js = `try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`
  return <script dangerouslySetInnerHTML={{ __html: js }} />
}

export function ThemeToggle({ className }: { className?: string }) {
  const [dark, setDark] = React.useState(false)
  // Class is set by ThemeScript before hydration; sync state on mount.
  React.useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'))
  }, [])

  function toggle() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light')
    } catch {}
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={cn(
        'inline-flex size-8 shrink-0 items-center justify-center rounded-md text-current/70 transition-colors hover:bg-white/10 hover:text-current',
        className
      )}
    >
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  )
}
