import * as React from "react"
import { Trash2 } from "lucide-react"

import { cn } from "../utils"
import { Card, CardContent } from "./card"
import { DataTable, type DataTableColumn } from "./data-table"
import { EmptyState } from "./empty-state"
import { Label } from "./label"
import { PageHeader } from "./page-header"
import { ResourceEditDialog } from "./resource-edit-dialog"
import { FieldControl, type ResourceField } from "./resource-field"
import { SubmitButton } from "./submit-button"

export type { ResourceField } from "./resource-field"

// Declarative team-scoped CRUD page section: a create form built from `fields`,
// a DataTable built from `columns`, an optional per-row edit dialog, and an
// optional per-row delete button.
// Server-component friendly — pass server actions to onCreate/onUpdate/onDelete.
function ResourcePanel<T>({
  title,
  description,
  fields,
  onCreate,
  createLabel = "Add",
  columns,
  rows,
  rowKey,
  onUpdate,
  editLabel = "Edit",
  onDelete,
  emptyTitle = "Nothing here yet",
  emptyDescription,
  className,
}: {
  title: string
  description?: string
  /** create-form fields; omit (with onCreate) to hide the form */
  fields?: ResourceField[]
  onCreate?: (formData: FormData) => void | Promise<unknown>
  createLabel?: string
  columns: DataTableColumn<T>[]
  rows: T[]
  rowKey: (row: T) => string | number
  /** server action (crudActions.update) receiving a hidden `id`; adds a per-row edit dialog prefilled from the row via `fields` */
  onUpdate?: (formData: FormData) => void | Promise<unknown>
  editLabel?: string
  /** server action receiving a hidden `id` field; adds a delete button per row */
  onDelete?: (formData: FormData) => void | Promise<unknown>
  emptyTitle?: string
  emptyDescription?: string
  className?: string
}) {
  const actionColumns: DataTableColumn<T>[] = []
  if (onUpdate && fields && fields.length > 0) {
    actionColumns.push({
      header: "",
      className: "w-12 text-right",
      cell: (row) => (
        <ResourceEditDialog
          id={rowKey(row)}
          title={editLabel}
          fields={fields}
          values={Object.fromEntries(
            fields.map((f) => {
              const v = (row as Record<string, unknown>)[f.name]
              const s =
                v == null ? "" : v instanceof Date ? v.toISOString().slice(0, 10) : String(v)
              return [f.name, s]
            })
          )}
          onUpdate={onUpdate}
        />
      ),
    })
  }
  if (onDelete) {
    actionColumns.push({
      header: "",
      className: "w-12 text-right",
      cell: (row) => (
        <form data-slot="resource-delete-form" action={onDelete as (formData: FormData) => void}>
          <input type="hidden" name="id" value={String(rowKey(row))} />
          <SubmitButton variant="ghost" size="icon" aria-label="Delete">
            <Trash2 className="size-4 text-muted-foreground" />
          </SubmitButton>
        </form>
      ),
    })
  }
  const allColumns = [...columns, ...actionColumns]

  return (
    <section
      data-slot="resource-panel"
      className={cn("flex-1 space-y-6 p-4 lg:p-8", className)}
    >
      <PageHeader title={title} description={description} />
      {onCreate && fields && fields.length > 0 && (
        <Card>
          <CardContent>
            <form data-slot="resource-create-form" action={onCreate as (formData: FormData) => void} className="flex flex-wrap items-end gap-3">
              {fields.map((field) => (
                <div key={field.name} className="grid min-w-40 flex-1 gap-1.5">
                  <Label htmlFor={`resource-${field.name}`}>{field.label}</Label>
                  <FieldControl field={field} />
                </div>
              ))}
              <SubmitButton pendingText="Saving…">{createLabel}</SubmitButton>
            </form>
          </CardContent>
        </Card>
      )}
      <DataTable
        columns={allColumns}
        rows={rows}
        rowKey={rowKey}
        empty={<EmptyState title={emptyTitle} description={emptyDescription} />}
      />
    </section>
  )
}

export { ResourcePanel }
