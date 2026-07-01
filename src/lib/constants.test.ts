import { describe, it, expect } from 'vitest';
import { hasRole, ROLE_GROUPS } from './constants';

describe('hasRole', () => {
  it('is true when the role belongs to the group', () => {
    expect(hasRole('admin', ROLE_GROUPS.ADMINS)).toBe(true);
    expect(hasRole('analyst', ROLE_GROUPS.INTERNAL)).toBe(true);
  });
  it('is false when the role is outside the group', () => {
    expect(hasRole('operator', ROLE_GROUPS.ADMINS)).toBe(false);
    expect(hasRole('client_marketing', ROLE_GROUPS.INTERNAL)).toBe(false);
  });
  it('is false for a null or undefined role', () => {
    expect(hasRole(null, ROLE_GROUPS.INTERNAL)).toBe(false);
    expect(hasRole(undefined, ROLE_GROUPS.INTERNAL)).toBe(false);
  });
});
