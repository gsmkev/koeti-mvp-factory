// Page — route /dashboard/warehouses.
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DataTable,
  EmptyState,
  ResourcePanel,
  SubmitButton,
  type ResourceField,
} from '@koeti/ui';
import { roleAtLeast } from '@koeti/auth';
import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/lib/auth/middleware';
import { getWarehouseAssignments, getWarehouses } from '@/lib/db/queries';
import {
  assignStaffToWarehouse,
  createWarehouse,
  deleteWarehouse,
  unassignStaff,
  updateWarehouse,
} from './actions';

export default async function WarehousesPage() {
  const { team, role } = await requireRole('viewer');
  const [warehouses, assignments, t] = await Promise.all([
    getWarehouses(team.id),
    getWarehouseAssignments(team.id),
    getTranslations('warehouses'),
  ]);
  const isAdmin = roleAtLeast(role, 'admin');

  const fields = [
    { name: 'name', label: t('fieldName'), required: true },
    { name: 'location', label: t('fieldLocation') },
  ] satisfies ResourceField[];

  return (
    <section className="flex-1 space-y-6 p-4 lg:p-8">
      <ResourcePanel
        title={t('panelTitle')}
        description={t('panelDesc')}
        fields={fields}
        onCreate={createWarehouse}
        createLabel={t('createLabel')}
        columns={[
          { header: t('colName'), cell: (w) => w.name },
          { header: t('colLocation'), cell: (w) => w.location ?? '—' },
        ]}
        rows={warehouses}
        rowKey={(w) => w.id}
        onUpdate={updateWarehouse}
        editLabel={t('editLabel')}
        onDelete={deleteWarehouse}
        emptyTitle={t('emptyTitle')}
        emptyDescription={t('emptyDesc')}
      />

      <Card>
        <CardHeader>
          <CardTitle>{t('staffTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isAdmin && warehouses.length > 0 && (
            <form
              action={assignStaffToWarehouse as (formData: FormData) => void}
              className="flex flex-wrap items-end gap-3"
            >
              <div className="grid min-w-40 flex-1 gap-1.5">
                <label className="text-sm font-medium" htmlFor="staff-userId">
                  {t('fieldStaff')}
                </label>
                <select
                  id="staff-userId"
                  name="userId"
                  required
                  className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-xs outline-none"
                >
                  {team.teamMembers.map((m) => (
                    <option key={m.user.id} value={m.user.id}>
                      {m.user.name || m.user.email}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid min-w-40 flex-1 gap-1.5">
                <label className="text-sm font-medium" htmlFor="staff-warehouseId">
                  {t('fieldWarehouse')}
                </label>
                <select
                  id="staff-warehouseId"
                  name="warehouseId"
                  required
                  className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-xs outline-none"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>
              <SubmitButton>{t('assignLabel')}</SubmitButton>
            </form>
          )}
          <DataTable
            rows={assignments}
            rowKey={(a) => a.id}
            columns={[
              { header: t('colStaff'), cell: (a) => a.userName || a.userEmail },
              { header: t('colWarehouse'), cell: (a) => a.warehouseName },
              ...(isAdmin
                ? [
                    {
                      header: '',
                      className: 'w-12 text-right',
                      cell: (a: (typeof assignments)[number]) => (
                        <form action={unassignStaff as (formData: FormData) => void}>
                          <input type="hidden" name="id" value={a.id} />
                          <SubmitButton variant="ghost" size="sm">
                            {t('unassignLabel')}
                          </SubmitButton>
                        </form>
                      ),
                    },
                  ]
                : []),
            ]}
            empty={
              <EmptyState
                title={t('staffEmptyTitle')}
                description={t('staffEmptyDesc')}
                className="border-none"
              />
            }
          />
        </CardContent>
      </Card>
    </section>
  );
}
