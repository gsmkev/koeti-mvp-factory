// page header — exported via @koeti/ui.
import * as React from 'react';

import { cn } from '../utils';

function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      data-slot="page-header"
      className={cn('flex flex-wrap items-start justify-between gap-4', className)}
    >
      <div className="space-y-1">
        <h1 className="text-lg font-semibold lg:text-2xl">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export { PageHeader };
