// App-specific tables go here.
// Base tables (users, teams, teamMembers, activityLogs, invitations) are in @koeti/db.

// Re-export base types for convenience
export type {
  User,
  NewUser,
  Team,
  NewTeam,
  TeamMember,
  NewTeamMember,
  ActivityLog,
  NewActivityLog,
  Invitation,
  NewInvitation,
  TeamDataWithMembers,
} from '@koeti/db';
export { ActivityType } from '@koeti/db';
