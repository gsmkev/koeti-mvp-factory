// API route (GET) — /api/team/invitations. Session-only, admin+.
// Pending invitations are team-internal; unlike /api/team this is never exposed
// to Bearer API-key callers.
import { isSuperadmin, roleAtLeast } from '@koeti/auth';
import { getPendingInvitations, getTeamForUser, getUser } from '@/lib/db/queries';

export async function GET() {
  const user = await getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const team = await getTeamForUser();
  if (!team) return Response.json([]);

  const myRole = team.teamMembers.find((m) => m.user.id === user.id)?.role;
  if (!isSuperadmin(user) && !roleAtLeast(myRole, 'admin')) {
    return new Response('Forbidden', { status: 403 });
  }

  return Response.json(await getPendingInvitations(team.id));
}
