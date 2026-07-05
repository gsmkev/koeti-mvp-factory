// Tests for rbac.
import { afterEach, describe, expect, it } from 'vitest';
import { isSuperadmin, roleAtLeast } from './rbac';

describe('roleAtLeast', () => {
  it('respects the hierarchy viewer < member < admin < owner', () => {
    expect(roleAtLeast('owner', 'admin')).toBe(true);
    expect(roleAtLeast('admin', 'admin')).toBe(true);
    expect(roleAtLeast('member', 'admin')).toBe(false);
    expect(roleAtLeast('viewer', 'member')).toBe(false);
    expect(roleAtLeast('member', 'viewer')).toBe(true);
  });

  it('rejects unknown or missing roles', () => {
    expect(roleAtLeast('superuser', 'viewer')).toBe(false);
    expect(roleAtLeast(null, 'viewer')).toBe(false);
    expect(roleAtLeast(undefined, 'viewer')).toBe(false);
  });
});

describe('isSuperadmin', () => {
  const original = process.env.SUPERADMIN_EMAIL;
  afterEach(() => {
    if (original === undefined) delete process.env.SUPERADMIN_EMAIL;
    else process.env.SUPERADMIN_EMAIL = original;
  });

  it('matches users.role', () => {
    expect(isSuperadmin({ email: 'a@b.c', role: 'superadmin' })).toBe(true);
    expect(isSuperadmin({ email: 'a@b.c', role: 'owner' })).toBe(false);
  });

  it('matches SUPERADMIN_EMAIL when set', () => {
    process.env.SUPERADMIN_EMAIL = 'boss@example.com';
    expect(isSuperadmin({ email: 'boss@example.com', role: 'member' })).toBe(true);
    expect(isSuperadmin({ email: 'other@example.com', role: 'member' })).toBe(false);
    delete process.env.SUPERADMIN_EMAIL;
    expect(isSuperadmin({ email: 'boss@example.com', role: 'member' })).toBe(false);
  });
});
