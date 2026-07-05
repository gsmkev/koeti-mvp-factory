// pagination — exported via @koeti/ui.
import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '../utils';
import { buttonVariants } from './button';

type LinkLike = React.ComponentType<{
  href: string;
  className?: string;
  children: React.ReactNode;
  'aria-label'?: string;
}>;

// Server-component-safe pager driven by a URL search param (see
// .claude/rules/url-state.md). The page fetches pageSize + 1 rows: render the
// first pageSize and pass hasMore = rows.length > pageSize. `hrefFor` builds
// the link for a page number so existing filter params are preserved.
export function Pagination({
  page,
  hasMore,
  hrefFor,
  linkComponent,
  className,
  prevLabel = 'Previous page',
  nextLabel = 'Next page',
}: {
  page: number;
  hasMore: boolean;
  hrefFor: (page: number) => string;
  linkComponent?: LinkLike;
  className?: string;
  prevLabel?: string;
  nextLabel?: string;
}) {
  if (page <= 1 && !hasMore) return null; // single page — no chrome
  const Link = linkComponent ?? ((props) => <a {...props} />);
  const item = buttonVariants({ variant: 'outline', size: 'icon' });
  const disabled = cn(item, 'pointer-events-none opacity-50');

  return (
    <nav aria-label="pagination" className={cn('flex items-center justify-end gap-2', className)}>
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} aria-label={prevLabel} className={item}>
          <ChevronLeft className="size-4" />
        </Link>
      ) : (
        <span aria-hidden className={disabled}>
          <ChevronLeft className="size-4" />
        </span>
      )}
      <span className="min-w-8 text-center text-sm tabular-nums text-muted-foreground">{page}</span>
      {hasMore ? (
        <Link href={hrefFor(page + 1)} aria-label={nextLabel} className={item}>
          <ChevronRight className="size-4" />
        </Link>
      ) : (
        <span aria-hidden className={disabled}>
          <ChevronRight className="size-4" />
        </span>
      )}
    </nav>
  );
}
