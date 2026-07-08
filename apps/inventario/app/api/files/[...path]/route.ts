// API route (GET) — /api/files/teams/<teamId>/…. Serves local-driver uploads
// in dev/CI; in production @koeti/storage returns absolute Vercel Blob URLs
// that never hit this route. Access = your team's prefix only.
import path from 'node:path';
import { readLocalFile } from '@koeti/storage';
import { getTeamFromApiKey } from '@/lib/auth/api-key';
import { getTeamForUser } from '@/lib/db/queries';

export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  // Normalize BEFORE the ownership check: a raw `teams/1/../2/x` would pass a
  // naive prefix check and resolve into another tenant's directory.
  const pathname = path.posix.normalize((await params).path.join('/'));
  const team = (await getTeamFromApiKey(request)) ?? (await getTeamForUser());
  if (!team) return new Response('Unauthorized', { status: 401 });
  if (pathname.split('/').includes('..') || !pathname.startsWith(`teams/${team.id}/`)) {
    return new Response('Not found', { status: 404 });
  }

  const file = await readLocalFile(pathname);
  if (!file) return new Response('Not found', { status: 404 });
  return new Response(new Uint8Array(file.body), {
    headers: { 'content-type': file.contentType, 'cache-control': 'private, max-age=3600' },
  });
}
