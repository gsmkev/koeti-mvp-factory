'use client';
// Page — route /dashboard/team.

import { Avatar, AvatarFallback, AvatarImage } from '@koeti/ui';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@koeti/ui';
import { customerPortalAction } from '@/lib/payments/actions';
import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { TeamDataWithMembers, User } from '@/lib/db/schema';
import { removeTeamMember } from '@/app/(login)/actions';
import { createEmployee } from './actions';
import useSWR, { mutate } from 'swr';
import { Suspense } from 'react';
import { Input } from '@koeti/ui';
import { RadioGroup, RadioGroupItem } from '@koeti/ui';
import { Label, PageHeader, SubmitButton } from '@koeti/ui';
import { PlusCircle } from 'lucide-react';

type ActionState = {
  error?: string;
  success?: string;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Map a stored role slug to its translated label; unknown roles (e.g.
// superadmin) fall back to the raw slug rather than a missing-key error.
function roleLabel(t: (key: string) => string, role: string) {
  const keys: Record<string, string> = {
    viewer: 'roleViewer',
    member: 'roleMember',
    admin: 'roleAdmin',
    owner: 'roleOwner',
  };
  return keys[role] ? t(keys[role]) : role;
}

function SubscriptionSkeleton() {
  const t = useTranslations('team');
  return (
    <Card className="mb-8 h-[140px]">
      <CardHeader>
        <CardTitle>{t('subscriptionCard')}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function ManageSubscription() {
  const t = useTranslations('team');
  const tc = useTranslations('common');
  const { data: teamData } = useSWR<TeamDataWithMembers>('/api/team', fetcher);

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>{t('subscriptionCard')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div className="mb-4 sm:mb-0">
              <p className="font-medium">
                {t('currentPlan', { plan: teamData?.planName || tc('free') })}
              </p>
              <p className="text-sm text-muted-foreground">
                {teamData?.subscriptionStatus === 'active'
                  ? t('billedMonthly')
                  : teamData?.subscriptionStatus === 'trialing'
                    ? t('trialPeriod')
                    : t('noSubscription')}
              </p>
            </div>
            <form action={customerPortalAction}>
              <SubmitButton variant="outline" pendingText={t('opening')}>
                {t('manageSubscription')}
              </SubmitButton>
            </form>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TeamMembersSkeleton() {
  const t = useTranslations('team');
  return (
    <Card className="mb-8 h-[140px]">
      <CardHeader>
        <CardTitle>{t('membersCard')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="animate-pulse space-y-4 mt-1">
          <div className="flex items-center space-x-4">
            <div className="size-8 rounded-full bg-muted"></div>
            <div className="space-y-2">
              <div className="h-4 w-32 bg-muted rounded"></div>
              <div className="h-3 w-14 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TeamMembers() {
  const t = useTranslations('team');
  const { data: teamData } = useSWR<TeamDataWithMembers>('/api/team', fetcher);
  const [removeState, removeAction] = useActionState<ActionState, FormData>(removeTeamMember, {});

  // Never show the synthetic "usuario@fiado.local" suffix — fall back to
  // just the "usuario" part if no name was set.
  const getUserDisplayName = (user: Pick<User, 'id' | 'name' | 'email'>) => {
    return user.name || user.email?.split('@')[0] || '';
  };

  if (!teamData?.teamMembers?.length) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>{t('membersCard')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{t('noMembers')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>{t('membersCard')}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {teamData.teamMembers.map((member, index) => (
            <li key={member.id} className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Avatar>
                  {/* 
                    This app doesn't save profile images, but here
                    is how you'd show them:

                    <AvatarImage
                      src={member.user.image || ''}
                      alt={getUserDisplayName(member.user)}
                    />
                  */}
                  <AvatarFallback>
                    {getUserDisplayName(member.user)
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{getUserDisplayName(member.user)}</p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {roleLabel(t, member.role)}
                  </p>
                </div>
              </div>
              {index > 1 ? (
                <form action={removeAction}>
                  <input type="hidden" name="memberId" value={member.id} />
                  <SubmitButton variant="outline" size="sm" pendingText={t('removing')}>
                    {t('remove')}
                  </SubmitButton>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
        {removeState?.error && <p className="text-destructive mt-4">{removeState.error}</p>}
      </CardContent>
    </Card>
  );
}

function CreateEmployeeSkeleton() {
  const t = useTranslations('team');
  return (
    <Card className="h-[260px]">
      <CardHeader>
        <CardTitle>{t('inviteCard')}</CardTitle>
      </CardHeader>
    </Card>
  );
}

// Reemplaza la invitación por email: el dueño crea la cuenta del empleado
// ahí mismo (usuario + contraseña que le da en persona) — nadie necesita
// correo ni aceptar un enlace. RBAC reducido a dos roles reales para una
// despensa: quién vende y quién administra (viewer/owner no se ofrecen).
function CreateEmployee() {
  const t = useTranslations('team');
  const { data: user } = useSWR<User>('/api/user', fetcher);
  // `user.role` is the GLOBAL role column (only ever distinguishes
  // superadmin) — the caller's role in THIS team lives on teamMembers.role,
  // so it has to come from /api/team instead (pre-existing bug in the
  // template's cosmetic gate: it always read the wrong field, so this form
  // stayed disabled for every real owner/admin).
  const { data: team } = useSWR<TeamDataWithMembers>('/api/team', fetcher);
  const teamRole = team?.teamMembers?.find((m) => m.user.id === user?.id)?.role;
  const canManage = teamRole === 'owner' || teamRole === 'admin' || user?.role === 'superadmin';
  const [state, action] = useActionState<ActionState, FormData>(async (_prev, formData) => {
    const result = (await createEmployee(formData)) ?? {};
    if (!result.error) mutate('/api/team');
    return result;
  }, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('inviteCard')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <div>
            <Label htmlFor="name" className="mb-2">
              {t('employeeName')}
            </Label>
            <Input
              id="name"
              name="name"
              placeholder={t('employeeNamePlaceholder')}
              required
              disabled={!canManage}
            />
          </div>
          <div>
            <Label htmlFor="usuario" className="mb-2">
              {t('employeeUsuario')}
            </Label>
            <Input
              id="usuario"
              name="usuario"
              placeholder={t('employeeUsuarioPlaceholder')}
              required
              disabled={!canManage}
            />
          </div>
          <div>
            <Label htmlFor="password" className="mb-2">
              {t('employeePassword')}
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              minLength={8}
              placeholder={t('employeePasswordPlaceholder')}
              required
              disabled={!canManage}
            />
          </div>
          <div>
            <Label>{t('role')}</Label>
            <RadioGroup
              defaultValue="member"
              name="role"
              className="flex flex-wrap gap-x-4"
              disabled={!canManage}
            >
              <div className="flex items-center space-x-2 mt-2">
                <RadioGroupItem value="member" id="member" />
                <Label htmlFor="member">{t('roleMember')}</Label>
              </div>
              <div className="flex items-center space-x-2 mt-2">
                <RadioGroupItem value="admin" id="admin" />
                <Label htmlFor="admin">{t('roleAdmin')}</Label>
              </div>
            </RadioGroup>
          </div>
          {state?.error && <p className="text-destructive">{state.error}</p>}
          {state?.success && <p className="text-success">{state.success}</p>}
          <SubmitButton pendingText={t('inviting')} disabled={!canManage}>
            <PlusCircle className="mr-2 h-4 w-4" />
            {t('inviteMember')}
          </SubmitButton>
        </form>
      </CardContent>
      {!canManage && (
        <CardFooter>
          <p className="text-sm text-muted-foreground">{t('adminOnlyInvite')}</p>
        </CardFooter>
      )}
    </Card>
  );
}

export default function SettingsPage() {
  const t = useTranslations('team');
  return (
    <section className="flex-1 space-y-6 p-4 lg:p-8">
      <PageHeader title={t('title')} />
      <Suspense fallback={<SubscriptionSkeleton />}>
        <ManageSubscription />
      </Suspense>
      <Suspense fallback={<TeamMembersSkeleton />}>
        <TeamMembers />
      </Suspense>
      <Suspense fallback={<CreateEmployeeSkeleton />}>
        <CreateEmployee />
      </Suspense>
    </section>
  );
}
