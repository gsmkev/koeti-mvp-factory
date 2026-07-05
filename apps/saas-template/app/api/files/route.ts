// API route (POST) — /api/files. Team-scoped file upload.
// Session (dashboard form) or API key Bearer (another MVP / script). Files land
// under teams/<id>/ in @koeti/storage (Vercel Blob in prod, .uploads/ in dev).
// Store the returned `url` in your entity's column; see .claude/rules/uploads.md.
import { putFile } from '@koeti/storage';
import { apiRateLimitOk, getTeamFromApiKey } from '@/lib/auth/api-key';
import { getTeamForUser } from '@/lib/db/queries';

const MAX_BYTES = 10 * 1024 * 1024; // 10MB — raise per app if a use case demands it
const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'text/csv',
  'text/plain',
]);

export async function POST(request: Request) {
  if (!apiRateLimitOk(request)) return new Response('Too many requests', { status: 429 });
  const team = (await getTeamFromApiKey(request)) ?? (await getTeamForUser());
  if (!team) return new Response('Unauthorized', { status: 401 });

  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) return new Response('Missing "file" form field', { status: 400 });
  if (file.size > MAX_BYTES) return new Response('File too large (max 10MB)', { status: 413 });
  if (!ALLOWED_TYPES.has(file.type)) {
    return new Response(`Unsupported content type: ${file.type}`, { status: 415 });
  }

  const safeName = (file.name || 'file').replace(/[^\w.-]/g, '_').slice(-100);
  const stored = await putFile(`teams/${team.id}/${safeName}`, await file.arrayBuffer(), {
    contentType: file.type,
  });
  return Response.json(stored, { status: 201 });
}
