// Dashboard home = the product overview. Replace the placeholder stats below
// with your app's domain metrics (see apps/gastos for a worked example).
// Team/subscription management lives at /dashboard/team — leave it there.
import { PageHeader, StatCard } from '@koeti/ui'
import { getTeamForUser } from '@/lib/db/queries'

export default async function OverviewPage() {
  const team = await getTeamForUser()
  if (!team) throw new Error('Team not found')

  return (
    <section className="flex-1 space-y-6 p-4 lg:p-8">
      <PageHeader
        title="Overview"
        description="What's happening across your workspace."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Team members" value={team.teamMembers.length} />
        <StatCard label="Plan" value={team.planName ?? 'Free'} />
      </div>
    </section>
  )
}
