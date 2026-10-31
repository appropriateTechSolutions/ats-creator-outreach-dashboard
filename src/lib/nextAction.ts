import type { Creator, CreatorContent, OutreachLog, Partnership, Shipment } from '../types';

// ─── One engine for "what should happen next with this creator" ────────
// The Creators list, the creator profile header, the partnership page and the inbox
// all ask this module, so a creator never shows "Update shipment" in one place and
// "Follow-up #2" in another. Keys are the `onAction` strings the Creators list's
// handleWorkflowAction already understands.

export type NextActionKey =
  | 'review'
  | 'outreach'
  | 'follow_up'
  | 'awaiting_reply'
  | 'draft_offer'
  | 'view_discussion'
  | 'view_feedback'
  | 'awaiting_signature'
  | 'add_shipment'
  | 'view_shipments'
  | 'activate'
  | 'review_content'
  | 'add_draft_url'
  | 'add_live_url'
  | 'complete'
  | 'done'
  | 'none';

export interface NextAction {
  key: NextActionKey;
  label: string;
  kind: 'action' | 'waiting' | 'done';
  payload?: unknown;
}

// Review statuses that still need a human decision. `new` is a legacy value the
// backend no longer writes (its default is `pending_review`).
const NEEDS_REVIEW: ReadonlySet<string> = new Set(['hold', 'shortlisted', 'pending_review', 'new']);

// Lifecycle stages before any outreach went out (creators.lifecycle_status enum).
const NOT_CONTACTED: ReadonlySet<string> = new Set(['new', 'enriched', 'shortlisted']);

// The backend's PARTNERSHIP_STATUSES (domain/partnershipStatus.ts) in pipeline order;
// the index is how far along a partnership is.
const PIPELINE: readonly string[] = [
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
];

// Statuses with no onward transitions (ALLOWED_TRANSITIONS maps them to []).
const CLOSED: ReadonlySet<string> = new Set(['completed', 'rejected', 'inactive']);

const MAX_FOLLOW_UPS = 3;

type FollowUpFields = Pick<
  OutreachLog,
  'is_dismissed' | 'response_received' | 'next_followup_at' | 'follow_up_count'
>;

/** A scheduled follow-up whose time has come (never a 4th one, never after a reply). */
export function isFollowUpDue(
  latest: FollowUpFields | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!latest || latest.is_dismissed || latest.response_received || !latest.next_followup_at)
    return false;
  if ((latest.follow_up_count ?? 0) >= MAX_FOLLOW_UPS) return false;
  return new Date(latest.next_followup_at).getTime() < now.getTime();
}

/** A follow-up is scheduled but not due yet. */
export function isWaitingForFollowUp(
  latest: FollowUpFields | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!latest || latest.is_dismissed || latest.response_received || !latest.next_followup_at)
    return false;
  if ((latest.follow_up_count ?? 0) >= MAX_FOLLOW_UPS) return false;
  return new Date(latest.next_followup_at).getTime() >= now.getTime();
}

/**
 * First-contact tools (outreach email, follow-ups, Instagram DM) only make sense
 * before a creator has replied or a partnership exists.
 */
export function canReachOut(
  creator: Pick<Creator, 'lifecycle_status'>,
  hasPartnership: boolean,
): boolean {
  const lifecycle = creator.lifecycle_status ?? '';
  return !hasPartnership && (NOT_CONTACTED.has(lifecycle) || lifecycle === 'contacted');
}

function act(key: NextActionKey, label: string, payload?: unknown): NextAction {
  return payload === undefined
    ? { key, label, kind: 'action' }
    : { key, label, kind: 'action', payload };
}

function followUp(creator: Creator): NextAction {
  const number = (creator.latest_outreach?.follow_up_count ?? 0) + 1;
  const isFinal = number >= MAX_FOLLOW_UPS;
  return act('follow_up', isFinal ? 'Send final follow-up' : `Send follow-up #${number}`, {
    messageType: isFinal ? 'final_ping' : `followup_${number}`,
  });
}

/**
 * The single next step for a creator, optionally in the context of one partnership
 * (pass that partnership's shipment and deliverables, not the creator's).
 *
 * Order follows the old WorkflowActionEngine tree, plus: every unreviewed status
 * is `review`; `offer_sent` waits on the creator's signature; a follow-up is only
 * offered to a contacted creator with no partnership. A creator-level `replied`
 * lifecycle only counts while no partnership is further along than `engaged`.
 */
export function getNextAction(input: {
  creator: Creator;
  partnership?: Partnership | null;
  shipment?: Shipment | null;
  contents?: CreatorContent[];
  followUpDue?: boolean;
}): NextAction {
  const {
    creator,
    partnership = null,
    shipment = null,
    contents = [],
    followUpDue = false,
  } = input;
  const review = creator.review_status;
  const lifecycle = creator.lifecycle_status ?? '';
  const status = partnership?.status;

  if (!review || NEEDS_REVIEW.has(review)) return act('review', 'Review creator');

  if (review === 'approved' && NOT_CONTACTED.has(lifecycle))
    return act('outreach', 'Send outreach');

  if ((!partnership || status === 'engaged') && lifecycle === 'contacted') {
    if (!partnership && followUpDue) return followUp(creator);
    return { key: 'awaiting_reply', label: 'Awaiting reply', kind: 'waiting' };
  }

  if (
    status === 'replied' ||
    status === 'in_discussion' ||
    (lifecycle === 'replied' && (!partnership || status === 'engaged'))
  )
    return act('draft_offer', 'Draft offer');

  switch (status) {
    case 'qualified':
      return act('draft_offer', 'Draft offer');
    case 'negotiating':
      return act('draft_offer', 'Reply');
    case 'offer_sent':
      return { key: 'awaiting_signature', label: 'Awaiting signature', kind: 'waiting' };
    case 'accepted':
    case 'engaged':
      if (partnership?.shipment_included) {
        return shipment
          ? act('view_shipments', 'Update shipment', shipment)
          : act('add_shipment', 'Add shipment');
      }
      return act('activate', 'Activate partnership');
    case 'product_shipped':
    case 'product_delivered':
      return act('activate', 'Activate partnership');
    case 'activated': {
      const submitted = contents.find((c) => c.status === 'submitted');
      if (submitted) return act('review_content', 'Review draft', submitted);
      const pending = contents.find(
        (c) => c.status === 'pending' || c.status === 'revision_requested',
      );
      if (pending) return act('add_draft_url', 'Add draft URL', pending);
      return act('complete', 'Complete partnership');
    }
    case 'completed': {
      const approved = contents.find((c) => c.status === 'approved');
      if (approved) return act('add_live_url', 'Add live URL', approved);
      return { key: 'done', label: 'Completed', kind: 'done' };
    }
    default:
      return { key: 'none', label: 'No next step', kind: 'done' };
  }
}

// ─── Choosing the inputs ───────────────────────────────────────────────
// Every surface must feed the engine the same partnership, shipment and
// deliverables, or the "one engine" promise breaks again.

type Dated = { created_at?: string | null; createdAt?: string | null };

const createdTime = (row: Dated): number => {
  const time = Date.parse(row.created_at ?? row.createdAt ?? '');
  return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time;
};

const stage = (status: string | null | undefined): number =>
  status ? PIPELINE.indexOf(status) : -1;

function newest<T extends Dated>(rows: readonly T[]): T | null {
  return rows.reduce<T | null>(
    (best, row) => (best === null || createdTime(row) > createdTime(best) ? row : best),
    null,
  );
}

/**
 * The partnership a creator's profile and list row lead with: the most advanced
 * one that is still open; when every partnership is closed, the newest one.
 */
export function pickCurrentPartnership<P extends { status?: string | null } & Dated>(
  partnerships: readonly P[] | null | undefined,
): P | null {
  if (!partnerships || partnerships.length === 0) return null;
  const open = partnerships.filter((p) => !CLOSED.has(p.status ?? ''));
  if (open.length === 0) return newest(partnerships);
  return open.reduce((best, p) => {
    const ahead = stage(p.status) - stage(best.status);
    if (ahead !== 0) return ahead > 0 ? p : best;
    return createdTime(p) > createdTime(best) ? p : best;
  });
}

type PartnershipRef = { id: string; campaign_id?: string | null };

/** The partnership's newest shipment (an unlinked one for the same campaign as a fallback). */
export function pickPartnershipShipment<
  S extends { partnership_id?: string | null; campaign_id?: string | null } & Dated,
>(
  partnership: PartnershipRef | null | undefined,
  shipments: readonly S[] | null | undefined,
): S | null {
  if (!partnership || !shipments || shipments.length === 0) return null;
  const linked = shipments.filter((s) => s.partnership_id === partnership.id);
  if (linked.length > 0) return newest(linked);
  return newest(
    shipments.filter((s) => !s.partnership_id && s.campaign_id === partnership.campaign_id),
  );
}

/** The partnership's deliverables (unlinked ones for the same campaign count too). */
export function pickPartnershipContents<
  C extends { partnership_id?: string | null; campaign_id?: string | null },
>(partnership: PartnershipRef | null | undefined, contents: readonly C[] | null | undefined): C[] {
  if (!partnership || !contents || contents.length === 0) return [];
  return contents.filter((c) =>
    c.partnership_id
      ? c.partnership_id === partnership.id
      : c.campaign_id === partnership.campaign_id,
  );
}
