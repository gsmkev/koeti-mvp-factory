import * as React from "react"

import { Input } from "./input"
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

export function FieldControl({
  field,
  idPrefix = "resource",
  defaultValue,
}: {
  field: ResourceField
  idPrefix?: string
  /** overrides field.defaultValue (used by the edit dialog to prefill from the row) */
  defaultValue?: string
}) {
  const common = {
    id: `${idPrefix}-${field.name}`,
    name: field.name,
    placeholder: field.placeholder,
    required: field.required,
    defaultValue: defaultValue ?? field.defaultValue,
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
