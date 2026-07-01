import { getTeamForUser, getProducts } from '@/lib/db/queries'
import { redirect } from 'next/navigation'
import ProductForm from './product-form'

export default async function InventoryPage() {
  const team = await getTeamForUser()
  if (!team) redirect('/sign-in')
  const prods = await getProducts(team.id)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Inventario</h1>
      </div>
      <ProductForm />
      <table className="w-full mt-6 text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            <th className="pb-2 font-medium">Nombre</th>
            <th className="pb-2 font-medium">SKU</th>
            <th className="pb-2 font-medium text-right">Precio</th>
            <th className="pb-2 font-medium text-right">Stock</th>
            <th className="pb-2"></th>
          </tr>
        </thead>
        <tbody>
          {prods.length === 0 && (
            <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">Sin productos todavía</td></tr>
          )}
          {prods.map(p => (
            <tr key={p.id} className="border-b border-border hover:bg-secondary/50">
              <td className="py-2">{p.name}</td>
              <td className="py-2 text-muted-foreground money">{p.sku ?? '—'}</td>
              <td className="py-2 text-right money">${parseFloat(p.price).toFixed(2)}</td>
              <td className="py-2 text-right money">{p.stock}</td>
              <td className="py-2 text-right">
                <ProductForm product={p} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
