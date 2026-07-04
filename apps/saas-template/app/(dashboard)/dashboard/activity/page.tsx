import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  PageHeader,
} from '@koeti/ui';
import {
  Settings,
  LogOut,
  UserPlus,
  Lock,
  UserCog,
  AlertCircle,
  UserMinus,
  Mail,
  CheckCircle,
  type LucideIcon,
} from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { ActivityType } from '@/lib/db/schema';
import { getActivityLogs } from '@/lib/db/queries';

type T = Awaited<ReturnType<typeof getTranslations>>;

const iconMap: Record<ActivityType, LucideIcon> = {
  [ActivityType.SIGN_UP]: UserPlus,
  [ActivityType.SIGN_IN]: UserCog,
  [ActivityType.SIGN_OUT]: LogOut,
  [ActivityType.UPDATE_PASSWORD]: Lock,
  [ActivityType.DELETE_ACCOUNT]: UserMinus,
  [ActivityType.UPDATE_ACCOUNT]: Settings,
  [ActivityType.CREATE_TEAM]: UserPlus,
  [ActivityType.REMOVE_TEAM_MEMBER]: UserMinus,
  [ActivityType.INVITE_TEAM_MEMBER]: Mail,
  [ActivityType.ACCEPT_INVITATION]: CheckCircle,
};

function getRelativeTime(t: T, date: Date) {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return t('justNow');
  if (diffInSeconds < 3600)
    return t('minutesAgo', { count: Math.floor(diffInSeconds / 60) });
  if (diffInSeconds < 86400)
    return t('hoursAgo', { count: Math.floor(diffInSeconds / 3600) });
  if (diffInSeconds < 604800)
    return t('daysAgo', { count: Math.floor(diffInSeconds / 86400) });
  return date.toLocaleDateString();
}

const actionKey: Record<ActivityType, string> = {
  [ActivityType.SIGN_UP]: 'actionSignUp',
  [ActivityType.SIGN_IN]: 'actionSignIn',
  [ActivityType.SIGN_OUT]: 'actionSignOut',
  [ActivityType.UPDATE_PASSWORD]: 'actionUpdatePassword',
  [ActivityType.DELETE_ACCOUNT]: 'actionDeleteAccount',
  [ActivityType.UPDATE_ACCOUNT]: 'actionUpdateAccount',
  [ActivityType.CREATE_TEAM]: 'actionCreateTeam',
  [ActivityType.REMOVE_TEAM_MEMBER]: 'actionRemoveTeamMember',
  [ActivityType.INVITE_TEAM_MEMBER]: 'actionInviteTeamMember',
  [ActivityType.ACCEPT_INVITATION]: 'actionAcceptInvitation',
};

function formatAction(t: T, action: ActivityType): string {
  return t(actionKey[action] ?? 'actionUnknown');
}

export default async function ActivityPage() {
  const logs = await getActivityLogs();
  const t = await getTranslations('activity');

  return (
    <section className="flex-1 space-y-6 p-4 lg:p-8">
      <PageHeader title={t('title')} />
      <Card>
        <CardHeader>
          <CardTitle>{t('recentActivity')}</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length > 0 ? (
            <ul className="space-y-4">
              {logs.map((log) => {
                const Icon = iconMap[log.action as ActivityType] || Settings;
                const formattedAction = formatAction(
                  t,
                  log.action as ActivityType
                );

                return (
                  <li key={log.id} className="flex items-center space-x-4">
                    <div className="bg-accent rounded-full p-2">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {formattedAction}
                        {log.ipAddress && ` ${t('fromIp', { ip: log.ipAddress })}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {getRelativeTime(t, new Date(log.timestamp))}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState
              icon={AlertCircle}
              title={t('emptyTitle')}
              description={t('emptyDesc')}
              className="border-none"
            />
          )}
        </CardContent>
      </Card>
    </section>
  );
}
