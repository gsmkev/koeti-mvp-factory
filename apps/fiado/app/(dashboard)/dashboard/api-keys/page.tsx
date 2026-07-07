// Page — route /dashboard/api-keys.
import { ShieldAlert } from 'lucide-react';
import { isSuperadmin } from '@koeti/auth';
import { EmptyState } from '@koeti/ui';
import { getTranslations } from 'next-intl/server';
import { getApiKeys, getTeamForUser, getUser } from '@/lib/db/queries';
import { ApiKeysPanel } from './api-keys-panel';

// ponytail: API keys are for scripting/MVP-to-MVP integration, not something
// a despensa owner ever needs — gated to SUPERADMIN_EMAIL only, same as
// /dashboard/admin (also intentionally left out of the nav for everyone else).
export default async function ApiKeysPage() {
  const user = await getUser();
  const t = await getTranslations('admin');
  if (!user || !isSuperadmin(user)) {
    return (
      <section className="flex-1 p-4 lg:p-8">
        <EmptyState icon={ShieldAlert} title={t('onlyTitle')} description={t('onlyDesc')} />
      </section>
    );
  }

  const team = await getTeamForUser();
  if (!team) throw new Error('Team not found');
  const keys = await getApiKeys(team.id);
  return <ApiKeysPanel keys={keys} />;
}
