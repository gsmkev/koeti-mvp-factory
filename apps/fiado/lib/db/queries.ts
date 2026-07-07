// saas-template lib — queries.
import { desc, and, eq, isNull, sql } from 'drizzle-orm';
import { db } from './drizzle';
import { verifyToken, credentialFingerprint } from '@koeti/auth';
import { cookies } from 'next/headers';
import {
  activityLogs,
  apiKeys,
  insights,
  invitations,
  invoices,
  teamMembers,
  teams,
  users,
} from '@koeti/db';
import { clientes, pagos, productos, ventas } from './schema';

export async function getUser() {
  const sessionCookie = (await cookies()).get('session');
  if (!sessionCookie?.value) return null;
  const sessionData = await verifyToken(sessionCookie.value);
  if (!sessionData?.user || typeof sessionData.user.id !== 'number') return null;
  if (new Date(sessionData.expires) < new Date()) return null;
  const user = await db
    .select()
    .from(users)
    .where(and(eq(users.id, sessionData.user.id), isNull(users.deletedAt)))
    .limit(1);
  const found = user[0] ?? null;
  if (!found) return null;
  // Revoke sessions minted before a password change/reset. Only enforced when
  // the token carries a fingerprint — legacy/test sessions without one keep
  // working until they expire.
  if (sessionData.fp && sessionData.fp !== credentialFingerprint(found.passwordHash)) {
    return null;
  }
  return found;
}

export async function getTeamByStripeCustomerId(customerId: string) {
  const result = await db
    .select()
    .from(teams)
    .where(eq(teams.stripeCustomerId, customerId))
    .limit(1);
  return result[0] ?? null;
}

export async function updateTeamSubscription(
  teamId: number,
  data: {
    stripeSubscriptionId: string | null;
    stripeProductId: string | null;
    planName: string | null;
    subscriptionStatus: string;
  },
) {
  await db
    .update(teams)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(teams.id, teamId));
}

export async function getUserWithTeam(userId: number) {
  const result = await db
    .select({ user: users, teamId: teamMembers.teamId })
    .from(users)
    .leftJoin(teamMembers, eq(users.id, teamMembers.userId))
    .where(eq(users.id, userId))
    .limit(1);
  return result[0];
}

// SIFEN facturas emitted for this team (written by the sifen-invoice job).
// Unbounded over time → paginated per .claude/rules/crud.md §2.
export const INVOICES_PAGE_SIZE = 50;
export async function getInvoices(teamId: number, page = 1) {
  return db
    .select()
    .from(invoices)
    .where(eq(invoices.teamId, teamId))
    .orderBy(desc(invoices.createdAt))
    .limit(INVOICES_PAGE_SIZE + 1)
    .offset((page - 1) * INVOICES_PAGE_SIZE);
}

export async function getActivityLogs() {
  const user = await getUser();
  if (!user) throw new Error('User not authenticated');
  return await db
    .select({
      id: activityLogs.id,
      action: activityLogs.action,
      timestamp: activityLogs.timestamp,
      ipAddress: activityLogs.ipAddress,
      userName: users.name,
    })
    .from(activityLogs)
    .leftJoin(users, eq(activityLogs.userId, users.id))
    .where(eq(activityLogs.userId, user.id))
    .orderBy(desc(activityLogs.timestamp))
    .limit(10);
}

// Cross-tenant by design — callers MUST gate with isSuperadmin() first.
export async function getAdminTeamsOverview() {
  return db
    .select({
      id: teams.id,
      name: teams.name,
      planName: teams.planName,
      subscriptionStatus: teams.subscriptionStatus,
      createdAt: teams.createdAt,
      memberCount: sql<number>`count(${teamMembers.id})::int`,
    })
    .from(teams)
    .leftJoin(teamMembers, eq(teams.id, teamMembers.teamId))
    .groupBy(teams.id)
    .orderBy(desc(teams.createdAt));
}

export async function getInsights(teamId: number) {
  return db
    .select()
    .from(insights)
    .where(and(eq(insights.teamId, teamId), isNull(insights.dismissedAt)))
    .orderBy(desc(insights.createdAt))
    .limit(50);
}

export async function getApiKeys(teamId: number) {
  return db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.teamId, teamId))
    .orderBy(desc(apiKeys.createdAt));
}

export async function getPendingInvitations(teamId: number) {
  return db
    .select({
      id: invitations.id,
      email: invitations.email,
      role: invitations.role,
      invitedAt: invitations.invitedAt,
    })
    .from(invitations)
    .where(and(eq(invitations.teamId, teamId), eq(invitations.status, 'pending')))
    .orderBy(desc(invitations.invitedAt));
}

export async function getTeamForUser() {
  const user = await getUser();
  if (!user) return null;
  const result = await db.query.teamMembers.findFirst({
    where: eq(teamMembers.userId, user.id),
    with: {
      team: {
        with: {
          teamMembers: {
            with: { user: { columns: { id: true, name: true, email: true } } },
          },
        },
      },
    },
  });
  return result?.team ?? null;
}

// --- productos ---

export async function getProductos(teamId: number) {
  return db
    .select()
    .from(productos)
    .where(eq(productos.teamId, teamId))
    .orderBy(desc(productos.createdAt));
}

// --- clientes ---

export async function getClientes(teamId: number) {
  return db
    .select()
    .from(clientes)
    .where(eq(clientes.teamId, teamId))
    .orderBy(desc(clientes.createdAt));
}

export async function getCliente(teamId: number, id: number) {
  const [row] = await db
    .select()
    .from(clientes)
    .where(and(eq(clientes.id, id), eq(clientes.teamId, teamId)))
    .limit(1);
  return row ?? null;
}

export async function getDeudaTotal(teamId: number) {
  const [row] = await db
    .select({ total: sql<string>`coalesce(sum(${clientes.balance}), 0)` })
    .from(clientes)
    .where(eq(clientes.teamId, teamId));
  return Number(row?.total ?? 0);
}

// --- ventas ---

export const VENTAS_PAGE_SIZE = 50;

// `page` pagina la vista (trae PAGE_SIZE + 1 filas: la extra señala hasMore);
// sin `page` devuelve todo — el export CSV depende de eso. `tipo` filtra por
// contado/fiado y `clienteId` por cliente — así Ña Marta puede ver solo las
// ventas al fiado, o todo lo que le vendió a un cliente puntual.
export async function getVentas(
  teamId: number,
  page?: number,
  filters?: { tipo?: 'contado' | 'fiado'; clienteId?: number },
) {
  const conditions = [eq(ventas.teamId, teamId)];
  if (filters?.tipo) conditions.push(eq(ventas.paymentType, filters.tipo));
  if (filters?.clienteId) conditions.push(eq(ventas.clienteId, filters.clienteId));

  const q = db
    .select({
      id: ventas.id,
      clienteId: ventas.clienteId,
      clienteName: clientes.name,
      paymentType: ventas.paymentType,
      total: ventas.total,
      createdAt: ventas.createdAt,
    })
    .from(ventas)
    .leftJoin(clientes, eq(ventas.clienteId, clientes.id))
    .where(and(...conditions))
    .orderBy(desc(ventas.createdAt));
  if (!page) return q;
  return q.limit(VENTAS_PAGE_SIZE + 1).offset((page - 1) * VENTAS_PAGE_SIZE);
}

export async function getVentasForCliente(teamId: number, clienteId: number) {
  return db
    .select()
    .from(ventas)
    .where(
      and(
        eq(ventas.teamId, teamId),
        eq(ventas.clienteId, clienteId),
        eq(ventas.paymentType, 'fiado'),
      ),
    )
    .orderBy(desc(ventas.createdAt));
}

export async function getVentasStats(teamId: number) {
  const [row] = await db
    .select({
      hoy: sql<string>`coalesce(sum(case when ${ventas.createdAt} >= current_date then ${ventas.total} else 0 end), 0)`,
      mes: sql<string>`coalesce(sum(case when ${ventas.createdAt} >= date_trunc('month', now()) then ${ventas.total} else 0 end), 0)`,
    })
    .from(ventas)
    .where(eq(ventas.teamId, teamId));
  return { hoy: Number(row?.hoy ?? 0), mes: Number(row?.mes ?? 0) };
}

export async function getVentasUltimaSemana(teamId: number) {
  return db
    .select()
    .from(ventas)
    .where(and(eq(ventas.teamId, teamId), sql`${ventas.createdAt} >= now() - interval '7 days'`))
    .orderBy(desc(ventas.createdAt));
}

// --- pagos ---

export async function getPagosForCliente(teamId: number, clienteId: number) {
  return db
    .select()
    .from(pagos)
    .where(and(eq(pagos.teamId, teamId), eq(pagos.clienteId, clienteId)))
    .orderBy(desc(pagos.createdAt));
}

export async function getPagos(teamId: number) {
  return db
    .select({
      id: pagos.id,
      clienteId: pagos.clienteId,
      clienteName: clientes.name,
      amount: pagos.amount,
      note: pagos.note,
      createdAt: pagos.createdAt,
    })
    .from(pagos)
    .innerJoin(clientes, eq(pagos.clienteId, clientes.id))
    .where(eq(pagos.teamId, teamId))
    .orderBy(desc(pagos.createdAt));
}
