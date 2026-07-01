import { describe, it, expect } from 'vitest';
import {
  getFollowers,
  getEngagement,
  isQualifiedCreator,
  matchesStatusFilter,
} from './creatorFilters';
import type { Creator } from '../types';

const mk = (o: Partial<Creator>): Creator => o as Creator;

describe('getFollowers', () => {
  it('prefers followers_count over followers', () => {
    expect(getFollowers(mk({ followers_count: 5000, followers: 10 }))).toBe(5000);
  });
  it('falls back to followers when count is absent', () => {
    expect(getFollowers(mk({ followers: 2000 }))).toBe(2000);
  });
  it('falls back to the max profile follower count', () => {
    expect(
      getFollowers(
        mk({
          profiles: [
            { platform: 'instagram', followers: 100 },
            { platform: 'youtube', followers: 900 },
          ] as Creator['profiles'],
        }),
      ),
    ).toBe(900);
  });
  it('returns 0 when there is no signal', () => {
    expect(getFollowers(mk({}))).toBe(0);
  });
});

describe('getEngagement', () => {
  it('prefers the direct engagement_rate', () => {
    expect(getEngagement(mk({ engagement_rate: 4.2 }))).toBe(4.2);
  });
  it('falls back to the max profile engagement', () => {
    expect(
      getEngagement(
        mk({ profiles: [{ platform: 'instagram', engagement_rate: 2.5 }] as Creator['profiles'] }),
      ),
    ).toBe(2.5);
  });
});

describe('isQualifiedCreator', () => {
  it('qualifies a creator with real data above the follower floor', () => {
    expect(isQualifiedCreator(mk({ followers_count: 2000 }))).toBe(true);
  });
  it('rejects a creator below the follower floor', () => {
    expect(isQualifiedCreator(mk({ followers_count: 500 }))).toBe(false);
  });
  it('rejects a creator with no public signal', () => {
    expect(isQualifiedCreator(mk({}))).toBe(false);
  });
});

describe('matchesStatusFilter', () => {
  it('treats hold/pending/unset review status as "Discovered" (hold)', () => {
    expect(matchesStatusFilter(mk({ review_status: 'hold' }), 'hold')).toBe(true);
    expect(matchesStatusFilter(mk({}), 'hold')).toBe(true);
  });
  it('excludes non-responsive creators from hold', () => {
    expect(
      matchesStatusFilter(mk({ review_status: 'hold', lifecycle_status: 'not_respond' }), 'hold'),
    ).toBe(false);
  });
  it('matches the not_respond bucket by lifecycle', () => {
    expect(matchesStatusFilter(mk({ lifecycle_status: 'not_respond' }), 'not_respond')).toBe(true);
  });
  it('treats replied as engaged', () => {
    expect(matchesStatusFilter(mk({ lifecycle_status: 'replied' }), 'engaged')).toBe(true);
  });
  it('falls back to a direct review_status match', () => {
    expect(matchesStatusFilter(mk({ review_status: 'approved' }), 'approved')).toBe(true);
    expect(matchesStatusFilter(mk({ review_status: 'approved' }), 'rejected')).toBe(false);
  });
});
