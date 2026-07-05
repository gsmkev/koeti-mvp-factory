# File uploads — @koeti/storage

Two drivers behind one call, chosen by env: **Vercel Blob** when
`BLOB_READ_WRITE_TOKEN` is set (production — add the Blob store in the Vercel
dashboard and the token appears), **local disk** (`.uploads/`, gitignored)
otherwise — dev and CI work offline with zero setup.

Every app ships two routes from the template:

- `POST /api/files` — upload. Session or API-key auth, 10MB cap, MIME
  allowlist (images, pdf, csv, txt). Stores under `teams/<teamId>/…` and
  returns `{ pathname, url, contentType, size }`.
- `GET /api/files/[...path]` — serves **local-driver** files only (Blob URLs
  are absolute and never hit it), gated to the caller's own team prefix.

## Attaching a file to an entity

Store the returned `url` (and `pathname` if you'll delete later) in a plain
column — no files table needed:

```ts
// schema: receiptUrl: varchar('receipt_url', { length: 500 })

// client component: upload first, then submit the form with the URL
const body = new FormData();
body.append('file', input.files[0]);
const stored = await fetch('/api/files', { method: 'POST', body }).then((r) => r.json());
// → put stored.url in a hidden field / server action arg
```

From another MVP or a script: `curl -F file=@receipt.pdf -H "Authorization: Bearer koeti_…" https://app.example.com/api/files`.

## Deleting

```ts
import { deleteFile } from '@koeti/storage';
await deleteFile(row.receiptUrl); // accepts a pathname or the stored url
```

## Rules

- **Never widen the MIME allowlist to executables/HTML** — served bytes must
  not be scriptable content on your origin.
- **Keep the `teams/<teamId>/` prefix.** It's the whole access-control model.
- Files are public-but-unguessable (random suffix), same model as Vercel Blob
  `access: 'public'`. Genuinely sensitive documents → switch that app to Blob
  private access + signed URLs; don't build it preemptively.
- Local driver is per-instance disk: fine for dev/CI, not for production —
  production must set `BLOB_READ_WRITE_TOKEN`.
