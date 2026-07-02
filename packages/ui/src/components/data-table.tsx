import * as React from "react"

import { cn } from "../utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table"

export type DataTableColumn<T> = {
  header: React.ReactNode
  cell: (row: T) => React.ReactNode
  className?: string
}

// Typed rows-and-columns table for the common dashboard list page.
// Server-component friendly (no hooks); compose Table* directly when you
// need sorting, selection, or other interactive behavior.
function DataTable<T>({
  columns,
  rows,
  rowKey,
  empty,
  className,
}: {
  columns: DataTableColumn<T>[]
  rows: T[]
  rowKey: (row: T) => string | number
  empty?: React.ReactNode
  className?: string
}) {
  if (rows.length === 0 && empty !== undefined) {
    return <>{empty}</>
  }
  return (
    <Table data-slot="data-table" className={className}>
      <TableHeader>
        <TableRow>
          {columns.map((column, i) => (
            <TableHead key={i} className={column.className}>
              {column.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={rowKey(row)}>
            {columns.map((column, i) => (
              <TableCell key={i} className={cn(column.className)}>
                {column.cell(row)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export { DataTable }
