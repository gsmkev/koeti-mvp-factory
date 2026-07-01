import { getTeamForUser, getDashboardStats } from '@/lib/db/queries'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@koeti/ui'
import PeriodSelector from './period-selector'

type Period = '7d' | '30d' | '90d'

function sinceDate(period: Period): Date {
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  const team = await getTeamForUser()
  if (!team) redirect('/sign-in')

  const { period: rawPeriod } = await searchParams
  const period: Period = rawPeriod === '7d' || rawPeriod === '90d' ? rawPeriod : '30d'
  const since = sinceDate(period)
  const stats = await getDashboardStats(team.id, since)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <PeriodSelector current={period} />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Ventas</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold money">${stats.totalSales.toFixed(2)}</p>
            <p className="text-sm text-muted-foreground">{stats.saleCount} transacciones</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Pagos a proveedores</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold money">${stats.totalPayments.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Utilidad bruta est.</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold money">
              {stats.totalSales - stats.totalPayments < 0 ? '-' : ''}${Math.abs(stats.totalSales - stats.totalPayments).toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">ventas − pagos a proveedores</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Productos más vendidos</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-2 font-medium">Producto</th>
                <th className="pb-2 font-medium text-right">Unidades</th>
                <th className="pb-2 font-medium text-right">Ingresos</th>
              </tr>
            </thead>
            <tbody>
              {stats.topProducts.length === 0 && (
                <tr><td colSpan={3} className="py-4 text-center text-muted-foreground">Sin datos en este período</td></tr>
              )}
              {stats.topProducts.map((p, i) => (
                <tr key={i} className="border-b border-border">
                  <td className="py-2">{p.productName}</td>
                  <td className="py-2 text-right money">{p.totalQty}</td>
                  <td className="py-2 text-right money">${parseFloat(String(p.totalRevenue ?? 0)).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
