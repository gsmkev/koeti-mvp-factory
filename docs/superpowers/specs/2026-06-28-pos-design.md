# koeti-pos — Design Spec

**Date:** 2026-06-28  
**App name:** `koeti-pos`  
**Scaffold:** `pnpm create-mvp pos`

## Purpose

Point-of-sale for small businesses. Sell products from a catalog, record supplier payments, edit records, and view a simple dashboard.

## Schema (extends `@koeti/db` base)

```ts
products          — id, teamId, name, sku(nullable), price(numeric), stock(int)
sales             — id, teamId, userId, total(numeric), status('paid'|'cancelled'), createdAt
sale_items        — id, saleId, productId, qty(int), unitPrice(numeric)  // unitPrice snapshot at sale time
suppliers         — id, teamId, name, contact(nullable text)
supplier_payments — id, teamId, supplierId, amount(numeric), description(text), paidAt(timestamp)
```

Stock is decremented atomically when a sale is created. Cancelling a sale restores stock.  
`activityLogs` from base schema covers audit trail — no extra logging needed.

## Pages

| Route | Purpose |
|-------|---------|
| `/pos` | POS screen — search products, build cart, checkout |
| `/sales` | Sale history — view, cancel |
| `/inventory` | Product catalog — create, edit, adjust stock |
| `/suppliers` | Supplier list — create, edit; record and edit payments |
| `/dashboard` | KPIs: sales by period, top products, supplier payments total |

## Business logic (`lib/`)

- `lib/pos/actions.ts` — `createSale(items[]), cancelSale(saleId)`
- `lib/inventory/actions.ts` — `upsertProduct(data), adjustStock(productId, delta)`
- `lib/suppliers/actions.ts` — `upsertSupplier(data), upsertPayment(data)`

All actions use `validatedActionWithUser` or `withTeam` from `lib/auth/middleware.ts`.  
Cart lives entirely client-side — no `open` sale status, sales hit the server only on checkout.

## Dashboard queries

- Total sales (sum of `sales.total` where `status='paid'`) by day/week/month
- Top 5 products by qty sold (join `sale_items`)
- Total supplier payments by period

## Skipped (YAGNI)

- Product variants / categories
- Purchase orders that increase stock
- Tax calculation
- Printable receipts
- Multi-currency
