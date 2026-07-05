// Next.js middleware: session refresh + route protection.
import { z } from 'zod';
import type { TeamDataWithMembers, User } from '@koeti/db';
import { getTeamForUser, getUser } from '@/lib/db/queries';
import { redirect } from 'next/navigation';
import { validatedAction, isSuperadmin, roleAtLeast, type TeamRole } from '@koeti/auth';

export type { ActionState } from '@koeti/auth';
export { validatedAction };

type ValidatedActionWithUserFunction<S extends z.ZodType<any, any>, T> = (
  data: z.infer<S>,
  formData: FormData,
  user: User,
) => Promise<T>;

export function validatedActionWithUser<S extends z.ZodType<any, any>, T>(
  schema: S,
  action: ValidatedActionWithUserFunction<S, T>,
) {
  return async (prevState: any, formData: FormData) => {
    const user = await getUser();
    if (!user) throw new Error('User is not authenticated');
    const result = schema.safeParse(Object.fromEntries(formData));
    if (!result.success) return { error: result.error.errors[0].message };
    return action(result.data, formData, user);
  };
}

// The caller's role in a team. Superadmins act as owner everywhere.
export function teamRoleFor(user: User, team: TeamDataWithMembers): TeamRole | null {
  if (isSuperadmin(user)) return 'owner';
  return (team.teamMembers.find((m) => m.user.id === user.id)?.role as TeamRole) ?? null;
}

// One-line RBAC for pages: const { user, team, role } = await requireRole('viewer')
// Below the minimum role → bounced to /dashboard.
export async function requireRole(min: TeamRole) {
  const user = await getUser();
  if (!user) redirect('/sign-in');
  const team = await getTeamForUser();
  if (!team) throw new Error('Team not found');
  const role = teamRoleFor(user, team);
  if (!roleAtLeast(role, min)) redirect('/dashboard');
  return { user, team, role: role as TeamRole };
}

type ActionWithTeamFunction<T> = (formData: FormData, team: TeamDataWithMembers) => Promise<T>;

// Overloads: without minRole the wrapper never injects an error result, so
// plain `<form action={...}>` usages keep their Promise<void> signature.
export function withTeam<T>(action: ActionWithTeamFunction<T>): (formData: FormData) => Promise<T>;
export function withTeam<T>(
  action: ActionWithTeamFunction<T>,
  minRole: TeamRole,
): (formData: FormData) => Promise<T | { error: string }>;
export function withTeam<T>(action: ActionWithTeamFunction<T>, minRole?: TeamRole) {
  return async (formData: FormData): Promise<T | { error: string }> => {
    const user = await getUser();
    if (!user) redirect('/sign-in');
    const team = await getTeamForUser();
    if (!team) throw new Error('Team not found');
    if (minRole && !roleAtLeast(teamRoleFor(user, team), minRole)) {
      return { error: `Requires the ${minRole} role or higher` };
    }
    return action(formData, team);
  };
}
