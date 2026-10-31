import type { Partnership, PartnershipStatus } from '../types';

// Exactly the backend's PARTNERSHIP_STATUSES (domain/partnershipStatus.ts), in
// pipeline order. The status filter offers these after "Open" and "All".
export const PARTNERSHIP_STATUSES: readonly PartnershipStatus[] = [
  'engaged',
  'replied',
  'in_discussion',
  'meeting_scheduled',
  'qualified',
  'offer_sent',
  'negotiating',
  'accepted',
  'activated',
  'product_shipped',
  'product_delivered',
  'content_pending',
  'content_submitted',
  'content_approved',
  'live',
  'completed',
  'rejected',
  'inactive',
];

// No onward transitions (the backend's ALLOWED_TRANSITIONS maps these to []).
export const CLOSED_PARTNERSHIP_STATUSES: ReadonlySet<string> = new Set([
  'completed',
  'rejected',
  'inactive',
]);

/** "open" (the default) hides closed partnerships; "all" hides nothing. */
export type PartnershipStatusFilter = 'open' | 'all' | PartnershipStatus;

export interface PartnershipFilters {
  status: PartnershipStatusFilter;
  search?: string;
  campaignId?: string;
  tier?: string;
  offerType?: string;
  startDate?: string;
  endDate?: string;
}

type FilterableRow = Pick<
  Partnership,
  'status' | 'campaign_id' | 'creator_tier' | 'offer_type' | 'start_date' | 'Creator' | 'Campaign'
> & { createdAt?: string | null };

function matchesOtherFilters(p: FilterableRow, f: PartnershipFilters): boolean {
  if (f.search) {
    const q = f.search.toLowerCase();
    const matchCreator =
      p.Creator?.handle?.toLowerCase().includes(q) ||
      p.Creator?.full_name?.toLowerCase().includes(q);
    const matchCampaign = p.Campaign?.name?.toLowerCase().includes(q);
    if (!matchCreator && !matchCampaign) return false;
  }
  if (f.campaignId && p.campaign_id !== f.campaignId) return false;
  if (f.tier && p.creator_tier !== f.tier) return false;
  if (f.offerType && p.offer_type !== f.offerType) return false;

  if (f.startDate || f.endDate) {
    const date = p.start_date
      ? new Date(p.start_date)
      : p.createdAt
        ? new Date(p.createdAt)
        : new Date();
    if (f.startDate) {
      const start = new Date(f.startDate);
      start.setHours(0, 0, 0, 0);
      if (date < start) return false;
    }
    if (f.endDate) {
      const end = new Date(f.endDate);
      end.setHours(23, 59, 59, 999);
      if (date > end) return false;
    }
  }
  return true;
}

/**
 * The Partnerships list. `closedHidden` counts the rows that match every other
 * filter but are hidden only because the status filter is "open".
 */
export function filterPartnerships<P extends FilterableRow>(
  partnerships: readonly P[],
  filters: PartnershipFilters,
): { rows: P[]; closedHidden: number } {
  const rows: P[] = [];
  let closedHidden = 0;
  for (const p of partnerships) {
    if (!matchesOtherFilters(p, filters)) continue;
    if (filters.status === 'open') {
      if (CLOSED_PARTNERSHIP_STATUSES.has(p.status)) {
        closedHidden += 1;
        continue;
      }
    } else if (filters.status !== 'all' && p.status !== filters.status) {
      continue;
    }
    rows.push(p);
  }
  return { rows, closedHidden };
}
