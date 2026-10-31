// Sentence-case labels for the status enums StatusBadge and the status filters show.
// Every partnership status (domain/partnershipStatus.ts) has its own wording, so no
// two stages read the same. Anything not listed falls back to its value with
// underscores turned into spaces and only the first letter capitalised.
const STATUS_LABELS: Readonly<Record<string, string>> = {
  // Partnership pipeline
  engaged: 'Engaged',
  replied: 'Replied',
  in_discussion: 'In discussion',
  meeting_scheduled: 'Meeting scheduled',
  qualified: 'Qualified',
  offer_sent: 'Offer sent',
  negotiating: 'Negotiating',
  accepted: 'Offer accepted',
  activated: 'Activated',
  product_shipped: 'Product shipped',
  product_delivered: 'Product delivered',
  content_pending: 'Content pending',
  content_submitted: 'Content submitted',
  content_approved: 'Content approved',
  live: 'Live',
  completed: 'Completed',
  rejected: 'Rejected',
  inactive: 'Inactive',
  // Creator review / lifecycle, shipments, records
  hold: 'Discovered',
  pending_review: 'Shortlisted',
  shortlisted: 'Shortlisted',
  not_respond: 'Not responsive',
  pending: 'Pending',
  address_requested: 'Address requested',
  ready_to_ship: 'Ready to ship',
  archived: 'Inactive',
};

export function getStatusLabel(status: string | null | undefined): string {
  if (!status) return '—';
  const known = STATUS_LABELS[status];
  if (known) return known;
  const words = status.replace(/_/g, ' ').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
