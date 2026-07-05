// @koeti/storage — file uploads with two drivers behind one call:
//   • Vercel Blob when BLOB_READ_WRITE_TOKEN is set (production).
//   • Local disk (.uploads/) otherwise — dev and CI work offline.
// Callers key files under a team prefix (`teams/<teamId>/…`) so access checks
// are a string prefix match. See .claude/rules/uploads.md for the app wiring.
//
// ponytail: local files get a public-but-unguessable name (random suffix),
// same model as Vercel Blob 'public' access. Move to Blob private access +
// signed URLs if an app ever stores genuinely sensitive documents.
import { randomUUID } from 'node:crypto';
import { mkdir, readFile as fsRead, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

export interface StoredFile {
  /** Storage key — persist this to delete/serve the file later. */
  pathname: string;
  /** Browser-loadable URL (absolute for Blob, app-relative /api/files/… for local). */
  url: string;
  contentType: string;
  size: number;
}

export function storageDriver(): 'vercel-blob' | 'local' {
  return process.env.BLOB_READ_WRITE_TOKEN ? 'vercel-blob' : 'local';
}

const localRoot = () => process.env.UPLOADS_DIR || '.uploads';

// `name-a1b2c3d4.ext` — unguessable, keeps the extension for content-type serving.
function withRandomSuffix(pathname: string) {
  const ext = path.extname(pathname);
  return `${pathname.slice(0, pathname.length - ext.length)}-${randomUUID().slice(0, 8)}${ext}`;
}

export async function putFile(
  pathname: string,
  body: Buffer | ArrayBuffer,
  { contentType }: { contentType: string },
): Promise<StoredFile> {
  const buf = Buffer.isBuffer(body) ? body : Buffer.from(body);
  if (storageDriver() === 'vercel-blob') {
    const { put } = await import('@vercel/blob');
    const blob = await put(pathname, buf, {
      access: 'public',
      contentType,
      addRandomSuffix: true,
    });
    return { pathname: blob.pathname, url: blob.url, contentType, size: buf.length };
  }
  const key = withRandomSuffix(pathname);
  const file = path.join(localRoot(), key);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, buf);
  await writeFile(`${file}.meta`, JSON.stringify({ contentType }));
  return { pathname: key, url: `/api/files/${key}`, contentType, size: buf.length };
}

/** Local-driver read, for the app's GET /api/files/[...path] serving route. */
export async function readLocalFile(
  pathname: string,
): Promise<{ body: Buffer; contentType: string } | null> {
  const file = path.join(localRoot(), path.normalize(pathname));
  // normalize + containment check: no ../ escape out of the uploads dir
  if (path.relative(localRoot(), file).startsWith('..')) return null;
  try {
    const [body, meta] = await Promise.all([
      fsRead(file),
      fsRead(`${file}.meta`, 'utf8').then(
        (m) => JSON.parse(m) as { contentType?: string },
        () => ({}) as { contentType?: string },
      ),
    ]);
    return { body, contentType: meta.contentType || 'application/octet-stream' };
  } catch {
    return null;
  }
}

export async function deleteFile(fileOrUrl: StoredFile | string): Promise<void> {
  const ref = typeof fileOrUrl === 'string' ? fileOrUrl : fileOrUrl.pathname;
  if (storageDriver() === 'vercel-blob') {
    const { del } = await import('@vercel/blob');
    await del(ref);
    return;
  }
  const pathname = ref.replace(/^\/api\/files\//, '');
  const file = path.join(localRoot(), path.normalize(pathname));
  if (path.relative(localRoot(), file).startsWith('..')) return;
  await Promise.allSettled([unlink(file), unlink(`${file}.meta`)]);
}
