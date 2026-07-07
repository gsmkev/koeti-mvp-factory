// Page — route /dashboard/api-keys.
import { getApiKeys, getTeamForUser } from '@/lib/db/queries';
import { ApiKeysPanel } from './api-keys-panel';

export default async function ApiKeysPage() {
  const team = await getTeamForUser();
  if (!team) throw new Error('Team not found');
  const keys = await getApiKeys(team.id);
  return <ApiKeysPanel keys={keys} />;
}
