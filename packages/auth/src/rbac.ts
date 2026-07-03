// Tenant RBAC: one ordered list, no permission matrix. A screen or action
// declares the minimum role it needs; anything at or above passes.
//
//   page:   const { team, role } = await requireRole('viewer')   // per-app helper
//   action: withTeam(fn, 'admin')                                 // per-app helper
//   ui:     roleAtLeast(role, 'admin') && <DangerButton/>
export const TEAM_ROLES = ['viewer', 'member', 'admin', 'owner'] as const
export type TeamRole = (typeof TEAM_ROLES)[number]

export function roleAtLeast(role: string | null | undefined, min: TeamRole) {
  const i = TEAM_ROLES.indexOf(role as TeamRole)
  return i >= 0 && i >= TEAM_ROLES.indexOf(min)
}

// Global admin across every tenant of every MVP. Set SUPERADMIN_EMAIL in the
// app's env (or users.role = 'superadmin' in the DB). Superadmins pass every
// team role check as if they were owner.
export function isSuperadmin(user: { email: string; role: string }) {
  return (
    user.role === 'superadmin' ||
    (!!process.env.SUPERADMIN_EMAIL && user.email === process.env.SUPERADMIN_EMAIL)
  )
}
