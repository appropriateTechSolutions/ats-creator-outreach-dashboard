import { describe, it, expect } from 'vitest';
import { queryKeys } from './queryKeys';

describe('queryKeys factory', () => {
  it('exposes stable root arrays', () => {
    expect(queryKeys.creators.all).toEqual(['creators']);
    expect(queryKeys.partnerships.root).toEqual(['partnerships']);
  });

  it('nests detail keys under the root prefix (so root invalidation clears them)', () => {
    expect(queryKeys.creators.detail('123')).toEqual(['creators', '123']);
    expect(queryKeys.creators.detail('123')[0]).toBe(queryKeys.creators.all[0]);
  });

  it('builds the campaign leads key', () => {
    expect(queryKeys.campaigns.leads('c1')).toEqual(['campaigns', 'c1', 'leads']);
  });
});
