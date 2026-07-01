import { getTeamForUser, getProducts } from '@/lib/db/queries'

export async function GET() {
  const team = await getTeamForUser()
  if (!team) return Response.json([])
  const prods = await getProducts(team.id)
  return Response.json(prods)
}
