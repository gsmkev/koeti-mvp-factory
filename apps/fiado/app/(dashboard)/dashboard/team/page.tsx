// Page — route /dashboard/team. Managing employees is admin+ (in practice,
// owner-only) — a vendedor works in POS/Productos/Clientes/Ventas.
import { requireRole } from '@/lib/auth/middleware';
import { TeamPanel } from './team-panel';

export default async function TeamPage() {
  await requireRole('admin');
  return <TeamPanel />;
}
