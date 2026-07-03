import { getTeamFromApiKey } from '@/lib/auth/api-key';
import { getTeamForUser } from '@/lib/db/queries';

export async function GET(request: Request) {
  // Session cookie for the dashboard, Bearer API key for other MVPs/scripts.
  const team = (await getTeamFromApiKey(request)) ?? (await getTeamForUser());
  return Response.json(team);
}
