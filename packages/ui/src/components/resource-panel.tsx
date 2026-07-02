import * as React from "react"
import { Trash2 } from "lucide-react"

import { cn } from "../utils"
import { Card, CardContent } from "./card"
import { DataTable, type DataTableColumn } from "./data-table"
import { EmptyState } from "./empty-state"
import { Input } from "./input"
import { Label } from "./label"
import { PageHeader } from "./page-header"
import { SubmitButton } from "./submit-button"
import { Textarea } from "./textarea"

export type ResourceField = {
  name: string
  label: string
  type?: "text" | "number" | "date" | "email" | "textarea" | "select"
  placeholder?: string
  required?: boolean
  step?: string
  /** for type: "select" */
  options?: { value: string; label: string }[]
  defaultValue?: string
}

function FieldControl({ field }: { field: ResourceField }) {
  const common = {
    id: `resource-${field.name}`,
    name: field.name,
    placeholder: field.placeholder,
    required: field.required,
    defaultValue: field.defaultValue,
  }
  if (field.type === "textarea") return <Textarea {...common} />
  if (field.type === "select")
    return (
      // ponytail: native select — works in server-component forms without client wiring
      <select
        {...common}
        className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-xs outline-none"
      >
        {field.options?.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    )
  return <Input {...common} type={field.type ?? "text"} step={field.step} />
}

// Declarative team-scoped CRUD page section: a create form built from `fields`,
// a DataTable built from `columns`, and an optional per-row delete button.
// Server-component friendly — pass server actions to onCreate/onDelete.
function ResourcePanel<T>({
  title,
  description,
  fields,
  onCreate,
  createLabel = "Add",
  columns,
  rows,
  rowKey,
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
  /** server action receiving a hidden `id` field; adds a delete button per row */
  onDelete?: (formData: FormData) => void | Promise<unknown>
  emptyTitle?: string
  emptyDescription?: string
  className?: string
}) {
  const allColumns: DataTableColumn<T>[] = onDelete
    ? [
        ...columns,
        {
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
        },
      ]
    : columns

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
