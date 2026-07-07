'use client';
// A vendedor's whole job is POS/Productos/Clientes/Ventas — everything else
// (dashboard overview, empleados, ajustes generales, seguridad, actividad)
// is admin+ server-side (see requireRole('admin') on those pages). Nav
// components use this to hide links to doors that are locked anyway.
import useSWR from 'swr';
import { TeamDataWithMembers, User } from '@/lib/db/schema';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useIsOwner() {
  const { data: user } = useSWR<User>('/api/user', fetcher);
  const { data: team } = useSWR<TeamDataWithMembers>('/api/team', fetcher);
  const myRole = team?.teamMembers?.find((m) => m.user.id === user?.id)?.role;
  return myRole === 'owner' || user?.role === 'superadmin';
}
