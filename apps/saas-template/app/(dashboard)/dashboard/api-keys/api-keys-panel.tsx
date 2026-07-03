'use client'

import { useActionState, useState } from 'react'
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
  const [copied, setCopied] = useState(false)

  return (
    <div className="space-y-2 rounded-lg border bg-muted/50 p-4">
      <p className="text-sm font-medium">
        Copy your API key now — it will not be shown again.
      </p>
      <div className="flex items-center gap-2">
        <code className="flex-1 overflow-x-auto rounded-md bg-background px-3 py-2 font-mono text-sm">
          {value}
        </code>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="Copy API key"
          onClick={async () => {
            await navigator.clipboard.writeText(value)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          }}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
    </div>
  )
}

export function ApiKeysPanel({ keys }: { keys: ApiKey[] }) {
  const [createState, createAction] = useActionState<CreateState, FormData>(createApiKey, {})
  const [revokeState, revokeAction] = useActionState<RevokeState, FormData>(revokeApiKey, {})

  return (
    <section className="flex-1 space-y-6 p-4 lg:p-8">
      <PageHeader
        title="API Keys"
        description="Bearer tokens other apps and scripts use to call this app's API."
      />

      <Card>
        <CardHeader>
          <CardTitle>Create API Key</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" action={createAction}>
            <div>
              <Label htmlFor="name" className="mb-2">
                Name
              </Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g. reporting-integration"
                maxLength={100}
                required
              />
              <p className="mt-1 text-xs text-muted-foreground">
                What will use this key — so you know what breaks when you revoke it.
              </p>
            </div>
            {createState.error && (
              <p className="text-destructive text-sm">{createState.error}</p>
            )}
            {createState.key && <OneTimeKey value={createState.key} />}
            <SubmitButton pendingText="Creating...">Create key</SubmitButton>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Keys</CardTitle>
        </CardHeader>
        <CardContent>
          {revokeState.error && (
            <p className="text-destructive mb-4 text-sm">{revokeState.error}</p>
          )}
          <DataTable
            columns={[
              { header: 'Name', cell: (k: ApiKey) => k.name },
              {
                header: 'Key',
                cell: (k: ApiKey) => (
                  <code className="font-mono text-xs">{k.keyPrefix}…</code>
                ),
              },
              {
                header: 'Created',
                cell: (k: ApiKey) => new Date(k.createdAt).toLocaleDateString(),
              },
              {
                header: 'Last used',
                cell: (k: ApiKey) =>
                  k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : 'Never',
              },
              {
                header: 'Status',
                cell: (k: ApiKey) =>
                  k.revokedAt ? (
                    <Badge variant="outline">Revoked</Badge>
                  ) : (
                    <Badge variant="secondary">Active</Badge>
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
                        if (!confirm(`Revoke "${k.name}"? Anything using it stops working immediately.`)) {
                          e.preventDefault()
                        }
                      }}
                      className="inline"
                    >
                      <input type="hidden" name="id" value={k.id} />
                      <Button type="submit" variant="ghost" size="sm" className="text-destructive">
                        Revoke
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
                title="No API keys yet"
                description="Create a key to let another app or script call this app's API."
              />
            }
          />
        </CardContent>
      </Card>
    </section>
  )
}
