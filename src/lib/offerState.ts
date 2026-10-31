// Which screen the public offer page shows for a partnership's status.
//
// The statuses are the backend's PARTNERSHIP_STATUSES (domain/partnershipStatus.ts).
// The accepted group is `accepted` plus every status ALLOWED_TRANSITIONS can reach
// from it. `negotiating` is what a creator's own feedback sets, so it is "feedback
// sent", not a refusal; `rejected` is the declined proposal; `inactive` (the
// operator shelved the partnership) is no longer available. Everything else stays
// open.
export type OfferState = 'open' | 'accepted' | 'feedback_sent' | 'declined' | 'unavailable';

const ACCEPTED_OR_LATER: ReadonlySet<string> = new Set([
  'accepted',
  'activated',
  'product_shipped',
  'product_delivered',
  'content_pending',
  'content_submitted',
  'content_approved',
  'live',
  'completed',
]);

export function getOfferState(status: string | null | undefined): OfferState {
  if (!status) return 'open';
  if (ACCEPTED_OR_LATER.has(status)) return 'accepted';
  if (status === 'rejected') return 'declined';
  if (status === 'inactive') return 'unavailable';
  if (status === 'negotiating') return 'feedback_sent';
  return 'open';
}
