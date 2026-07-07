// API route (GET) — /api/team.
import { apiRateLimitOk, getTeamFromApiKey } from '@/lib/auth/api-key';
import { getTeamForUser } from '@/lib/db/queries';

export async function GET(request: Request) {
  if (!apiRateLimitOk(request)) return new Response('Too many requests', { status: 429 });
  // Session cookie for the dashboard, Bearer API key for other MVPs/scripts.
  const team = (await getTeamFromApiKey(request)) ?? (await getTeamForUser());
  return Response.json(team);
}
