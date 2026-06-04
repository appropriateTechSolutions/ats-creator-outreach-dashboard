import type { Creator } from '../types';

// ─── Canonical creator metric + qualification helpers ─────────────────
// These define what counts as a "qualified" creator. The Creators page, the
// Dashboard KPI, and the Dashboard Outreach Queue all import from here so the
// "total creators" figure is computed identically everywhere instead of each
// view applying its own (divergent) filter.

export const getFollowers = (c: Creator): number => {
  if (typeof c.followers_count === 'number') return c.followers_count;
  const fromProfiles = c.profiles?.map(p => p.followers || 0) ?? [];
  return fromProfiles.length ? Math.max(...fromProfiles) : 0;
};

export const getEngagement = (c: Creator): number => {
  if (typeof c.engagement_rate === 'number') return c.engagement_rate;
  const fromProfiles = c.profiles?.map(p => Number(p.engagement_rate) || 0) ?? [];
  return fromProfiles.length > 0 ? Math.max(...fromProfiles) : 0;
};

// True if the creator has any real public profile data worth showing.
export const hasPublicProfileSignal = (c: Creator): boolean => {
  const hasProfileMetrics = c.profiles?.some(profile =>
    (profile.followers || 0) > 0 ||
    (profile.avg_likes || 0) > 0 ||
    (profile.avg_comments || 0) > 0 ||
    (profile.engagement_rate || 0) > 0
  );

  return Boolean(
    c.bio?.trim() ||
    getFollowers(c) > 0 ||
    (c.avg_likes || 0) > 0 ||
    (c.avg_comments || 0) > 0 ||
    getEngagement(c) > 0 ||
    hasProfileMetrics
  );
};

// Minimum followers for a creator to be counted/listed.
export const MIN_QUALIFIED_FOLLOWERS = 1000;

// The single definition of a "qualified" creator used for all total-creator
// counts: has real profile data and clears the follower floor.
export const isQualifiedCreator = (c: Creator): boolean =>
  hasPublicProfileSignal(c) && getFollowers(c) >= MIN_QUALIFIED_FOLLOWERS;

// The single definition of each lifecycle/status bucket. Shared by the Creators
// directory filter and the Dashboard queue cards so a "Discovered"/"Shortlisted"
// /etc. count means exactly the same thing in every view. `statusId` matches the
// filter chip ids used on the Creators page.
export const matchesStatusFilter = (c: Creator, statusId: string): boolean => {
  switch (statusId) {
    case 'hold':
      return (c.review_status === 'hold' || !c.review_status || c.review_status === 'pending') && c.lifecycle_status !== 'not_respond';
    case 'pending':
      return (c.review_status === 'pending_review' || c.review_status === 'shortlisted') && c.lifecycle_status !== 'not_respond';
    case 'not_respond':
      return c.lifecycle_status === 'not_respond';
    case 'contacted':
      return c.lifecycle_status === 'contacted' || c.latest_outreach?.delivery_status === 'sent';
    case 'failed':
      return c.lifecycle_status === 'failed' || c.latest_outreach?.delivery_status === 'failed';
    default:
      return c.review_status === statusId;
  }
};
