import { getTeamForUser, getSales } from '@/lib/db/queries'
import { redirect } from 'next/navigation'
import CancelButton from './cancel-button'

export default async function SalesPage() {
  const team = await getTeamForUser()
  if (!team) redirect('/sign-in')
  const allSales = await getSales(team.id)

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Historial de ventas</h1>
      <div className="space-y-3">
        {allSales.length === 0 && <p className="text-muted-foreground">Sin ventas todavía</p>}
        {allSales.map(sale => (
          <div key={sale.id} className="border border-border rounded-lg p-4 bg-card">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="font-semibold">Venta #{sale.id}</span>
                <span className="text-sm text-muted-foreground ml-3">
                  {new Date(sale.createdAt).toLocaleString('es-MX')}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  sale.status === 'paid' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'
                }`}>
                  {sale.status === 'paid' ? 'Pagada' : 'Cancelada'}
                </span>
                <span className="font-bold money">${parseFloat(sale.total).toFixed(2)}</span>
                {sale.status === 'paid' && <CancelButton saleId={sale.id} />}
              </div>
            </div>
            <table className="w-full text-sm text-muted-foreground">
              <tbody>
                {sale.items.map(item => (
                  <tr key={item.id}>
                    <td className="py-0.5">{item.productName}</td>
                    <td className="py-0.5 text-right money">{item.qty} × ${parseFloat(item.unitPrice).toFixed(2)}</td>
                    <td className="py-0.5 text-right w-20 money">${(item.qty * parseFloat(item.unitPrice)).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  )
}
