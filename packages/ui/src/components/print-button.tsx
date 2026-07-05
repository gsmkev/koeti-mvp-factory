'use client';
// print button — exported via @koeti/ui.

import * as React from 'react';
import { Printer } from 'lucide-react';

import { Button } from './button';

/*
 * One-click "export this dashboard as a visual report". Uses the browser's
 * native print dialog (→ Save as PDF), styled by the @media print rules in
 * globals.css — no PDF library. data-print-hide keeps the button off the page.
 * Drop it in a PageHeader's `actions`.
 */
function PrintButton({ children = 'Print / PDF', ...props }: React.ComponentProps<typeof Button>) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      data-print-hide
      onClick={() => window.print()}
      {...props}
    >
      <Printer />
      {children}
    </Button>
  );
}

export { PrintButton };
