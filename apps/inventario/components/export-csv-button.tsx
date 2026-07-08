// Export button that turns into an upgrade prompt on plans without CSV
// export (Decision: Free plan). Cosmetic — the route itself enforces this.
import Link from 'next/link';
import { Download, Lock } from 'lucide-react';
import { Button } from '@koeti/ui';

export function ExportCsvButton({
  href,
  allowed,
  label,
  lockedLabel,
}: {
  href: string;
  allowed: boolean;
  label: string;
  lockedLabel: string;
}) {
  if (!allowed) {
    return (
      <Button variant="outline" size="sm" asChild>
        <Link href="/pricing">
          <Lock />
          {lockedLabel}
        </Link>
      </Button>
    );
  }
  return (
    <Button variant="outline" size="sm" asChild>
      <a href={href} download>
        <Download />
        {label}
      </a>
    </Button>
  );
}
