// Dashboard home = the product overview. Replace the placeholder stats below
// with your app's domain metrics (see apps/gastos for a worked example).
// Team/subscription management lives at /dashboard/team — leave it there.
import {
  BarChart,
  Card,
  CardContent,
  DonutChart,
  LineChart,
  PageHeader,
  PrintButton,
  StatCard,
} from '@koeti/ui'
import { getTeamForUser } from '@/lib/db/queries'

// Placeholder chart data — replace with real queries scoped by team.id.
// Charts are zero-dependency SVG (render in server components, no client JS).
const trend = [
  { label: 'Mon', value: 12 },
  { label: 'Tue', value: 18 },
  { label: 'Wed', value: 15 },
  { label: 'Thu', value: 27 },
  { label: 'Fri', value: 32 },
  { label: 'Sat', value: 24 },
  { label: 'Sun', value: 38 },
]
const breakdown = [
  { label: 'Direct', value: 42 },
  { label: 'Search', value: 31 },
  { label: 'Social', value: 18 },
  { label: 'Email', value: 9 },
]

export default async function OverviewPage() {
  const team = await getTeamForUser()
  if (!team) throw new Error('Team not found')

  return (
    <section className="flex-1 space-y-6 p-4 lg:p-8">
      <PageHeader
        title="Overview"
        description="What's happening across your workspace."
        actions={<PrintButton />}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Team members" value={team.teamMembers.length} />
        <StatCard label="Plan" value={team.planName ?? 'Free'} />
        <StatCard
          label="Activity this week"
          value={trend.reduce((s, d) => s + d.value, 0)}
          delta={18}
          hint="vs last week"
          trend={trend.map((d) => d.value)}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="pt-6">
            <LineChart title="Activity this week" data={trend} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <DonutChart title="By source" data={breakdown} centerLabel="visits" />
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardContent className="pt-6">
            <BarChart title="Daily activity" data={trend} />
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
