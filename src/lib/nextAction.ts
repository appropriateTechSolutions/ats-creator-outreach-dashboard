import type { Creator, CreatorContent, OutreachLog, Partnership, Shipment } from '../types';

// ─── One engine for "what should happen next with this creator" ────────
// The Creators list, the creator profile header, the partnership page and the inbox
// all ask this module, so a creator never shows "Update shipment" in one place and
// "Follow-up #2" in another. Keys are the `onAction` strings the Creators list's
// handleWorkflowAction already understands; the `awaiting_*` keys are waiting states
// (no action) — consumers render any `kind: 'waiting'` step from its label.

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
  | 'none'
  // Waiting states added in fix round 1 (controller ruling).
  | 'awaiting_meeting'
  | 'awaiting_delivery'
  | 'awaiting_content';

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

function wait(key: NextActionKey, label: string): NextAction {
  return { key, label, kind: 'waiting' };
}

function followUp(creator: Creator): NextAction {
  const number = (creator.latest_outreach?.follow_up_count ?? 0) + 1;
  const isFinal = number >= MAX_FOLLOW_UPS;
  return act('follow_up', isFinal ? 'Send final follow-up' : `Send follow-up #${number}`, {
    messageType: isFinal ? 'final_ping' : `followup_${number}`,
  });
}

// Any sign the creator has written back: the reply flag the inbox sync sets on the
// outreach logs (list + profile), an inbound message on their conversation (profile
// + inbox), or a `replied` lifecycle.
function hasReplied(creator: Creator): boolean {
  return (
    creator.lifecycle_status === 'replied' ||
    !!creator.latest_outreach?.response_received ||
    !!creator.conversation?.latest_inbound_at ||
    !!creator.conversation?.latest_inbound_message
  );
}

const SUBMITTED: ReadonlySet<string> = new Set(['submitted']);
const PENDING: ReadonlySet<string> = new Set(['pending', 'revision_requested']);
const APPROVED: ReadonlySet<string> = new Set(['approved']);

// The earliest-due deliverable in `statuses` (undated last, then list order), so every
// surface targets the same item whatever order its API returned them in.
function firstDue(
  contents: CreatorContent[],
  statuses: ReadonlySet<string>,
): CreatorContent | undefined {
  const due = (c: CreatorContent) => c.due_date?.slice(0, 10) || '9999-12-31';
  return contents
    .filter((c) => statuses.has(c.status))
    .reduce<CreatorContent | undefined>(
      (best, c) => (!best || due(c) < due(best) ? c : best),
      undefined,
    );
}

// The deliverable that needs the operator next: a draft to review, then a draft URL
// to log, then a live URL.
function contentAction(contents: CreatorContent[]): NextAction | null {
  const submitted = firstDue(contents, SUBMITTED);
  if (submitted) return act('review_content', 'Review draft', submitted);
  const pending = firstDue(contents, PENDING);
  if (pending) return act('add_draft_url', 'Add draft URL', pending);
  const approved = firstDue(contents, APPROVED);
  if (approved) return act('add_live_url', 'Add live URL', approved);
  return null;
}

/**
 * The single next step for a creator, optionally in the context of one partnership
 * (pass that partnership's shipment and deliverables, not the creator's).
 *
 * Order follows the old WorkflowActionEngine tree, plus: every unreviewed status
 * is `review`; `offer_sent` waits on the creator's signature; a follow-up is only
 * offered to a contacted creator with no partnership. Fix round 1 (controller
 * ruling): `activate` only from `accepted` (the only status ALLOWED_TRANSITIONS lets
 * reach `activated`); `engaged` drafts an offer once the creator has replied;
 * shipping, meeting and content stages each get a step.
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

  if (!partnership && lifecycle === 'contacted') {
    return followUpDue ? followUp(creator) : wait('awaiting_reply', 'Awaiting reply');
  }

  if (
    status === 'replied' ||
    status === 'in_discussion' ||
    (!partnership && lifecycle === 'replied')
  )
    return act('draft_offer', 'Draft offer');

  switch (status) {
    case 'engaged':
      return hasReplied(creator)
        ? act('draft_offer', 'Draft offer')
        : wait('awaiting_reply', 'Awaiting reply');
    case 'meeting_scheduled':
      return wait('awaiting_meeting', 'Meeting scheduled');
    case 'qualified':
      return act('draft_offer', 'Draft offer');
    case 'negotiating':
      return act('draft_offer', 'Reply');
    case 'offer_sent':
      return wait('awaiting_signature', 'Awaiting signature');
    case 'accepted':
      if (partnership?.shipment_included) {
        return shipment
          ? act('view_shipments', 'Update shipment', shipment)
          : act('add_shipment', 'Add shipment');
      }
      return act('activate', 'Activate partnership');
    case 'product_shipped':
      return wait('awaiting_delivery', 'Awaiting delivery');
    case 'product_delivered': {
      const pending = firstDue(contents, PENDING);
      return pending
        ? act('add_draft_url', 'Add draft URL', pending)
        : wait('awaiting_content', 'Awaiting content');
    }
    case 'activated': {
      const submitted = firstDue(contents, SUBMITTED);
      if (submitted) return act('review_content', 'Review draft', submitted);
      const pending = firstDue(contents, PENDING);
      if (pending) return act('add_draft_url', 'Add draft URL', pending);
      return act('complete', 'Complete partnership');
    }
    case 'content_pending': {
      const pending = firstDue(contents, PENDING);
      if (pending) return act('add_draft_url', 'Add draft URL', pending);
      return contentAction(contents) ?? wait('awaiting_content', 'Awaiting content');
    }
    case 'content_submitted': {
      const submitted = firstDue(contents, SUBMITTED);
      if (submitted) return act('review_content', 'Review draft', submitted);
      return contentAction(contents) ?? wait('awaiting_content', 'Awaiting content');
    }
    case 'content_approved': {
      const approved = firstDue(contents, APPROVED);
      if (approved) return act('add_live_url', 'Add live URL', approved);
      return contentAction(contents) ?? act('complete', 'Complete partnership');
    }
    case 'live':
      return contentAction(contents) ?? act('complete', 'Complete partnership');
    case 'completed': {
      const approved = firstDue(contents, APPROVED);
      if (approved) return act('add_live_url', 'Add live URL', approved);
      return { key: 'done', label: 'Completed', kind: 'done' };
    }
    default:
      return { key: 'none', label: 'No next step', kind: 'done' };
  }
}

/**
 * The next step on a partnership's own page. The creator-level gates (review first,
 * then first outreach) belong to the creator's profile and list row; once a
 * partnership exists its page leads with the partnership's step. So a creator whose
 * review_status is still hold/shortlisted (or missing from the payload) gets that
 * step instead of "Review creator" / "Send outreach".
 */
export function getPartnershipNextAction(input: {
  creator: Creator;
  partnership: Partnership;
  shipment?: Shipment | null;
  contents?: CreatorContent[];
}): NextAction {
  const step = getNextAction(input);
  if (step.key !== 'review' && step.key !== 'outreach') return step;
  const lifecycle = input.creator.lifecycle_status ?? '';
  return getNextAction({
    ...input,
    creator: {
      ...input.creator,
      review_status: 'approved',
      // A partnership means the creator is past first contact.
      lifecycle_status: NOT_CONTACTED.has(lifecycle) || !lifecycle ? 'engaged' : lifecycle,
    } as Creator,
  });
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

/** What pickCurrentPartnership needs to work out each partnership's next step. */
export interface PickContext {
  creator: Creator;
  /** The creator's shipments (any partnership). */
  shipments?: readonly Shipment[] | null;
  /** The creator's deliverables (any partnership). */
  contents?: readonly CreatorContent[] | null;
  followUpDue?: boolean;
}

/**
 * The partnership a creator's profile and list row lead with. Open partnerships
 * whose next step is an action come first — real pending work ahead of ones whose
 * only step is "Complete partnership" — then open ones that are waiting; most
 * advanced first within each, newest on a tie. Closed ones (completed / rejected /
 * inactive) only when nothing is open: the newest.
 */
export function pickCurrentPartnership<P extends Partnership>(
  partnerships: readonly P[] | null | undefined,
  context: PickContext,
): P | null {
  if (!partnerships || partnerships.length === 0) return null;
  const open = partnerships.filter((p) => !CLOSED.has(p.status));
  if (open.length === 0) return newest(partnerships);

  const urgency = (p: P): number => {
    const step = getNextAction({
      creator: context.creator,
      partnership: p,
      shipment: pickPartnershipShipment(p, context.shipments),
      contents: pickPartnershipContents(p, context.contents),
      followUpDue: context.followUpDue,
    });
    if (step.kind !== 'action') return 0;
    return step.key === 'complete' ? 1 : 2;
  };

  return open
    .map((p) => ({ p, urgency: urgency(p) }))
    .reduce((best, cur) => {
      if (cur.urgency !== best.urgency) return cur.urgency > best.urgency ? cur : best;
      const ahead = stage(cur.p.status) - stage(best.p.status);
      if (ahead !== 0) return ahead > 0 ? cur : best;
      return createdTime(cur.p) > createdTime(best.p) ? cur : best;
    }).p;
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
