import { ShieldAlert, Building2 } from 'lucide-react'
import { isSuperadmin } from '@koeti/auth'
import { Badge, Card, CardContent, DataTable, EmptyState, PageHeader } from '@koeti/ui'
import { getAdminTeamsOverview, getUser } from '@/lib/db/queries'

// Factory-owner view across every tenant. Not in the nav on purpose —
// only superadmins (SUPERADMIN_EMAIL) ever see data here.
export default async function AdminPage() {
  const user = await getUser()
  if (!user || !isSuperadmin(user)) {
    return (
      <section className="flex-1 p-4 lg:p-8">
        <EmptyState
          icon={ShieldAlert}
          title="Superadmin only"
          description="Set SUPERADMIN_EMAIL to your account's email to unlock this page."
        />
      </section>
    )
  }

  const rows = await getAdminTeamsOverview()

  return (
    <section className="flex-1 space-y-6 p-4 lg:p-8">
      <PageHeader title="Admin" description="Every tenant in this app." />
      <Card>
        <CardContent>
          <DataTable
            columns={[
              { header: 'Team', cell: (t) => t.name },
              { header: 'Members', cell: (t) => t.memberCount },
              {
                header: 'Plan',
                cell: (t) =>
                  t.planName ? (
                    <Badge variant="secondary">{t.planName}</Badge>
                  ) : (
                    <span className="text-muted-foreground">Free</span>
                  ),
              },
              {
                header: 'Status',
                cell: (t) => t.subscriptionStatus ?? '—',
              },
              {
                header: 'Created',
                cell: (t) => t.createdAt.toLocaleDateString(),
              },
            ]}
            rows={rows}
            rowKey={(t) => t.id}
            empty={<EmptyState icon={Building2} title="No teams yet" />}
          />
        </CardContent>
      </Card>
    </section>
  )
}
