import { ShieldAlert, Building2 } from 'lucide-react'
import { isSuperadmin } from '@koeti/auth'
import { Badge, Card, CardContent, DataTable, EmptyState, PageHeader } from '@koeti/ui'
import { getTranslations } from 'next-intl/server'
import { getAdminTeamsOverview, getUser } from '@/lib/db/queries'

// Factory-owner view across every tenant. Not in the nav on purpose —
// only superadmins (SUPERADMIN_EMAIL) ever see data here.
export default async function AdminPage() {
  const user = await getUser()
  const t = await getTranslations('admin')
  const tc = await getTranslations('common')
  if (!user || !isSuperadmin(user)) {
    return (
      <section className="flex-1 p-4 lg:p-8">
        <EmptyState
          icon={ShieldAlert}
          title={t('onlyTitle')}
          description={t('onlyDesc')}
        />
      </section>
    )
  }

  const rows = await getAdminTeamsOverview()

  return (
    <section className="flex-1 space-y-6 p-4 lg:p-8">
      <PageHeader title={t('title')} description={t('description')} />
      <Card>
        <CardContent>
          <DataTable
            columns={[
              { header: t('colTeam'), cell: (row) => row.name },
              { header: t('colMembers'), cell: (row) => row.memberCount },
              {
                header: t('colPlan'),
                cell: (row) =>
                  row.planName ? (
                    <Badge variant="secondary">{row.planName}</Badge>
                  ) : (
                    <span className="text-muted-foreground">{tc('free')}</span>
                  ),
              },
              {
                header: t('colStatus'),
                cell: (row) => row.subscriptionStatus ?? '—',
              },
              {
                header: t('colCreated'),
                cell: (row) => row.createdAt.toLocaleDateString(),
              },
            ]}
            rows={rows}
            rowKey={(row) => row.id}
            empty={<EmptyState icon={Building2} title={t('emptyTitle')} />}
          />
        </CardContent>
      </Card>
    </section>
  )
}
