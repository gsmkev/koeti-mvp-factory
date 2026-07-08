// Layout for the (dashboard) group: server-side onboarding gate.
// Owners of a team that hasn't finished first-run setup land on /onboarding.
// Members/admins are never bounced — only the owner can complete it.
import { redirect } from 'next/navigation';
import { teamRoleFor } from '@/lib/auth/middleware';
import { getTeamForUser, getUser } from '@/lib/db/queries';

export default async function DashboardGroupLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  const team = user ? await getTeamForUser() : null;
  if (user && team && !team.onboardingCompletedAt && teamRoleFor(user, team) === 'owner') {
    redirect('/onboarding');
  }
  return <>{children}</>;
}
