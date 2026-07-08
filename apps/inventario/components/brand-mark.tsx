// Shared logomark: a crate with an ascending tick, standing in for "stock
// going up." One glyph used by the marketing header, dashboard sidebar, and
// every auth/onboarding screen so a rebrand touches one file, not five.
import { cn } from '@koeti/ui';

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground',
        className,
      )}
      aria-hidden
    >
      <svg
        viewBox="0 0 24 24"
        className="size-[62%]"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3.5 9 12 4.5 20.5 9 12 13.5 3.5 9Z" />
        <path d="M3.5 9v7l8.5 4.5M20.5 9v7L12 20.5v-7" />
        <path d="M9 12.5 11 14.5 15.5 9.5" />
      </svg>
    </span>
  );
}
