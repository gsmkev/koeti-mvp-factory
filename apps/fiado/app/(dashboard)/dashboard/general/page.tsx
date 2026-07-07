// Page — route /dashboard/general. Own account settings (name/usuario) —
// every team member, not just the owner.
import { requireRole } from '@/lib/auth/middleware';
import { GeneralPanel } from './general-panel';

export default async function GeneralPage() {
  await requireRole('viewer');
  return <GeneralPanel />;
}
