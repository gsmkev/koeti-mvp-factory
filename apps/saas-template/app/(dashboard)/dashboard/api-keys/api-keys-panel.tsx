'use client'

import { useActionState, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Check, Copy, KeyRound } from 'lucide-react'
import type { ApiKey } from '@koeti/db'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DataTable,
  EmptyState,
  Input,
  Label,
  PageHeader,
  SubmitButton,
} from '@koeti/ui'
import { createApiKey, revokeApiKey } from './actions'

type CreateState = { key?: string; error?: string }
type RevokeState = { success?: string; error?: string }

function OneTimeKey({ value }: { value: string }) {
  const t = useTranslations('apiKeys')
  const [copied, setCopied] = useState(false)

  return (
    <div className="space-y-2 rounded-lg border bg-muted/50 p-4">
      <p className="text-sm font-medium">{t('oneTimeWarning')}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 overflow-x-auto rounded-md bg-background px-3 py-2 font-mono text-sm">
          {value}
        </code>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={t('copyAria')}
          onClick={async () => {
            await navigator.clipboard.writeText(value)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          }}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? t('copied') : t('copy')}
        </Button>
      </div>
    </div>
  )
}

export function ApiKeysPanel({ keys }: { keys: ApiKey[] }) {
  const t = useTranslations('apiKeys')
  const [createState, createAction] = useActionState<CreateState, FormData>(createApiKey, {})
  const [revokeState, revokeAction] = useActionState<RevokeState, FormData>(revokeApiKey, {})

  return (
    <section className="flex-1 space-y-6 p-4 lg:p-8">
      <PageHeader title={t('title')} description={t('description')} />

      <Card>
        <CardHeader>
          <CardTitle>{t('createCard')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" action={createAction}>
            <div>
              <Label htmlFor="name" className="mb-2">
                {t('name')}
              </Label>
              <Input
                id="name"
                name="name"
                placeholder={t('namePlaceholder')}
                maxLength={100}
                required
              />
              <p className="mt-1 text-xs text-muted-foreground">{t('nameHint')}</p>
            </div>
            {createState.error && (
              <p className="text-destructive text-sm">{createState.error}</p>
            )}
            {createState.key && <OneTimeKey value={createState.key} />}
            <SubmitButton pendingText={t('creating')}>{t('create')}</SubmitButton>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('yourKeys')}</CardTitle>
        </CardHeader>
        <CardContent>
          {revokeState.error && (
            <p className="text-destructive mb-4 text-sm">{revokeState.error}</p>
          )}
          <DataTable
            columns={[
              { header: t('colName'), cell: (k: ApiKey) => k.name },
              {
                header: t('colKey'),
                cell: (k: ApiKey) => (
                  <code className="font-mono text-xs">{k.keyPrefix}…</code>
                ),
              },
              {
                header: t('colCreated'),
                cell: (k: ApiKey) => new Date(k.createdAt).toLocaleDateString(),
              },
              {
                header: t('colLastUsed'),
                cell: (k: ApiKey) =>
                  k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : t('never'),
              },
              {
                header: t('colStatus'),
                cell: (k: ApiKey) =>
                  k.revokedAt ? (
                    <Badge variant="outline">{t('revoked')}</Badge>
                  ) : (
                    <Badge variant="secondary">{t('active')}</Badge>
                  ),
              },
              {
                header: '',
                className: 'text-right',
                cell: (k: ApiKey) =>
                  k.revokedAt ? null : (
                    <form
                      action={revokeAction}
                      onSubmit={(e) => {
                        if (!confirm(t('revokeConfirm', { name: k.name }))) {
                          e.preventDefault()
                        }
                      }}
                      className="inline"
                    >
                      <input type="hidden" name="id" value={k.id} />
                      <Button type="submit" variant="ghost" size="sm" className="text-destructive">
                        {t('revoke')}
                      </Button>
                    </form>
                  ),
              },
            ]}
            rows={keys}
            rowKey={(k) => k.id}
            empty={
              <EmptyState
                icon={KeyRound}
                title={t('emptyTitle')}
                description={t('emptyDesc')}
              />
            }
          />
        </CardContent>
      </Card>
    </section>
  )
}
