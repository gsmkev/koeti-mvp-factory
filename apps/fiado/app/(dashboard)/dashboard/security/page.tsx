// Page — route /dashboard/security. Own password change — every team
// member, not just the owner (an owner can still reset an employee's
// password directly from /dashboard/team if they forget it).
import { requireRole } from '@/lib/auth/middleware';
import { SecurityPanel } from './security-panel';

export default async function SecurityPage() {
  await requireRole('viewer');
  return <SecurityPanel />;
}
