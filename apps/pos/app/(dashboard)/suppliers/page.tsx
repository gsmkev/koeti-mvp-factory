import { getTeamForUser, getSuppliers, getSupplierPayments } from '@/lib/db/queries'
import { redirect } from 'next/navigation'
import SupplierForm from './supplier-form'
import PaymentForm from './payment-form'

export default async function SuppliersPage() {
  const team = await getTeamForUser()
  if (!team) redirect('/sign-in')

  const [supps, payments] = await Promise.all([
    getSuppliers(team.id),
    getSupplierPayments(team.id),
  ])

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold mb-4">Proveedores</h1>
        <SupplierForm />
        <table className="w-full mt-4 text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="pb-2 font-medium">Nombre</th>
              <th className="pb-2 font-medium">Contacto</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {supps.length === 0 && (
              <tr><td colSpan={3} className="py-6 text-center text-muted-foreground">Sin proveedores todavía</td></tr>
            )}
            {supps.map(s => (
              <tr key={s.id} className="border-b border-border hover:bg-secondary/50">
                <td className="py-2">{s.name}</td>
                <td className="py-2 text-muted-foreground">{s.contact ?? '—'}</td>
                <td className="py-2 text-right"><SupplierForm supplier={s} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="text-xl font-bold mb-4">Pagos a proveedores</h2>
        {supps.length === 0 ? (
          <p className="text-muted-foreground text-sm">Registra un proveedor antes de pagarle.</p>
        ) : (
          <PaymentForm suppliers={supps} />
        )}
        <table className="w-full mt-4 text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="pb-2 font-medium">Fecha</th>
              <th className="pb-2 font-medium">Proveedor</th>
              <th className="pb-2 font-medium">Descripción</th>
              <th className="pb-2 font-medium text-right">Monto</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 && (
              <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">Sin pagos todavía</td></tr>
            )}
            {payments.map(p => (
              <tr key={p.id} className="border-b border-border hover:bg-secondary/50">
                <td className="py-2 money">{new Date(p.paidAt).toLocaleDateString('es-MX')}</td>
                <td className="py-2">{p.supplierName}</td>
                <td className="py-2 text-muted-foreground">{p.description}</td>
                <td className="py-2 text-right money">${parseFloat(p.amount).toFixed(2)}</td>
                <td className="py-2 text-right"><PaymentForm suppliers={supps} payment={p} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
