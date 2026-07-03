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
        Copia tu API key ahora — no volverá a mostrarse.
      </p>
      <div className="flex items-center gap-2">
        <code className="flex-1 overflow-x-auto rounded-md bg-background px-3 py-2 font-mono text-sm">
          {value}
        </code>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="Copiar API key"
          onClick={async () => {
            await navigator.clipboard.writeText(value)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          }}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? 'Copiada' : 'Copiar'}
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
        description="Tokens Bearer para que otras apps y scripts llamen a la API de esta app."
      />

      <Card>
        <CardHeader>
          <CardTitle>Crear API Key</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" action={createAction}>
            <div>
              <Label htmlFor="name" className="mb-2">
                Nombre
              </Label>
              <Input
                id="name"
                name="name"
                placeholder="p. ej. integracion-reportes"
                maxLength={100}
                required
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Qué usará esta key — para saber qué deja de funcionar al revocarla.
              </p>
            </div>
            {createState.error && (
              <p className="text-destructive text-sm">{createState.error}</p>
            )}
            {createState.key && <OneTimeKey value={createState.key} />}
            <SubmitButton pendingText="Creando...">Crear key</SubmitButton>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tus Keys</CardTitle>
        </CardHeader>
        <CardContent>
          {revokeState.error && (
            <p className="text-destructive mb-4 text-sm">{revokeState.error}</p>
          )}
          <DataTable
            columns={[
              { header: 'Nombre', cell: (k: ApiKey) => k.name },
              {
                header: 'Key',
                cell: (k: ApiKey) => (
                  <code className="font-mono text-xs">{k.keyPrefix}…</code>
                ),
              },
              {
                header: 'Creada',
                cell: (k: ApiKey) => new Date(k.createdAt).toLocaleDateString(),
              },
              {
                header: 'Último uso',
                cell: (k: ApiKey) =>
                  k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : 'Nunca',
              },
              {
                header: 'Estado',
                cell: (k: ApiKey) =>
                  k.revokedAt ? (
                    <Badge variant="outline">Revocada</Badge>
                  ) : (
                    <Badge variant="secondary">Activa</Badge>
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
                        if (!confirm(`¿Revocar "${k.name}"? Todo lo que la use dejará de funcionar de inmediato.`)) {
                          e.preventDefault()
                        }
                      }}
                      className="inline"
                    >
                      <input type="hidden" name="id" value={k.id} />
                      <Button type="submit" variant="ghost" size="sm" className="text-destructive">
                        Revocar
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
                title="Aún no hay API keys"
                description="Crea una key para que otra app o script llame a la API de esta app."
              />
            }
          />
        </CardContent>
      </Card>
    </section>
  )
}
