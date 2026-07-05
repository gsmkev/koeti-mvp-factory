'use client';
// submit button — exported via @koeti/ui.

import * as React from 'react';
import { useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';

import { Button } from './button';

// Drop-in submit button for <form action={serverAction}>: disables itself
// and shows a spinner while the action is pending.
function SubmitButton({
  children,
  pendingText,
  disabled,
  ...props
}: React.ComponentProps<typeof Button> & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button data-slot="submit-button" type="submit" disabled={pending || disabled} {...props}>
      {pending && <Loader2 className="size-4 animate-spin" />}
      {pending && pendingText ? pendingText : children}
    </Button>
  );
}

export { SubmitButton };
