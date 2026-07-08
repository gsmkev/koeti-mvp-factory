'use client';
// resource edit dialog — exported via @koeti/ui.

import * as React from 'react';
import { Pencil } from 'lucide-react';

import { Button } from './button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './dialog';
import { Label } from './label';
import { FieldControl, type ResourceField } from './resource-field';
import { SubmitButton } from './submit-button';

// Per-row edit affordance for ResourcePanel: pencil icon → dialog with the
// create-form fields prefilled from the row, submitting to the update action
// (crudActions.update) with a hidden `id`.
export function ResourceEditDialog({
  id,
  title = 'Edit',
  saveLabel = 'Save',
  savingLabel = 'Saving…',
  closeLabel = 'Close',
  fields,
  values,
  onUpdate,
}: {
  id: string | number;
  title?: string;
  saveLabel?: string;
  savingLabel?: string;
  closeLabel?: string;
  fields: ResourceField[];
  /** current row values keyed by field name, pre-stringified by the caller */
  values: Record<string, string>;
  onUpdate: (formData: FormData) => void | Promise<unknown>;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-slot="resource-edit-trigger" variant="ghost" size="icon" aria-label={title}>
          <Pencil className="size-4 text-muted-foreground" />
        </Button>
      </DialogTrigger>
      <DialogContent closeLabel={closeLabel}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form
          data-slot="resource-edit-form"
          action={async (formData) => {
            await onUpdate(formData);
            setOpen(false);
          }}
          className="grid gap-4"
        >
          <input type="hidden" name="id" value={String(id)} />
          {fields.map((field) => (
            <div key={field.name} className="grid gap-1.5">
              <Label htmlFor={`edit-${field.name}`}>{field.label}</Label>
              <FieldControl field={field} idPrefix="edit" defaultValue={values[field.name]} />
            </div>
          ))}
          <SubmitButton pendingText={savingLabel}>{saveLabel}</SubmitButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}
