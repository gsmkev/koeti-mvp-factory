import { afterAll, beforeAll, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { putFile, readLocalFile, deleteFile, storageDriver } from './index';

let dir: string;
beforeAll(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'koeti-storage-'));
  process.env.UPLOADS_DIR = dir;
  delete process.env.BLOB_READ_WRITE_TOKEN;
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

it('local driver roundtrip: put → read → delete', async () => {
  expect(storageDriver()).toBe('local');
  const stored = await putFile('teams/1/logo.png', Buffer.from('png-bytes'), {
    contentType: 'image/png',
  });
  expect(stored.pathname).toMatch(/^teams\/1\/logo-[0-9a-f]{8}\.png$/);
  expect(stored.url).toBe(`/api/files/${stored.pathname}`);

  const read = await readLocalFile(stored.pathname);
  expect(read?.body.toString()).toBe('png-bytes');
  expect(read?.contentType).toBe('image/png');

  await deleteFile(stored);
  expect(await readLocalFile(stored.pathname)).toBeNull();
});

it('rejects path traversal', async () => {
  expect(await readLocalFile('../../etc/passwd')).toBeNull();
});
