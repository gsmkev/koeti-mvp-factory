import { apiRateLimitOk, getTeamFromApiKey } from '@/lib/auth/api-key'
import { csvResponse, toCsv } from '@/lib/csv'
import { getExpenses, getTeamForUser } from '@/lib/db/queries'

// CSV de gastos del equipo. Sesión (botón "Exportar CSV" del dashboard) o
// API key Bearer (otro MVP / script): ?categoria= filtra igual que la página.
export async function GET(request: Request) {
  if (!apiRateLimitOk(request)) return new Response('Too many requests', { status: 429 })
  const team = (await getTeamFromApiKey(request)) ?? (await getTeamForUser())
  if (!team) return new Response('Unauthorized', { status: 401 })
  const categoria = new URL(request.url).searchParams.get('categoria') ?? undefined
  const rows = await getExpenses(team.id, categoria)
  return csvResponse(
    toCsv(rows, ['id', 'spentAt', 'category', 'description', 'amount']),
    'gastos.csv'
  )
}
