import { cleanMessageText } from './formatters';
import { getNextAction, getPartnershipNextAction, type NextAction } from './nextAction';
import type { Creator, CreatorConversation, Partnership } from '../types';

// ─── The Inbox's threads ───────────────────────────────────────────────
// GET /conversations lists creators, each with their conversations (one per campaign).
// The Inbox lists the conversations — a "thread" is one creator × campaign — so a creator
// in two campaigns shows up twice and `?thread=<conversation id>` can always name the
// thread it means.

export interface InboxThread {
  /** The conversation's id: what `?thread=` carries and GET /conversations/:id takes. */
  id: string;
  creator: Creator;
  conversation: CreatorConversation;
  /** Full name, else "@handle". */
  creatorName: string;
  /** The creator's handle without a leading "@". */
  handle: string;
  campaign: { id: string; name: string } | null;
  /** The creator's latest message with quoted replies and signatures stripped. */
  lastMessage: string;
  lastInboundAt: string | null;
  /** The creator wrote last and we have not answered (computed by the backend). */
  waitingOnUs: boolean;
}

export interface ThreadFilters {
  search?: string;
  waitingOnly?: boolean;
}

const bareHandle = (creator: Pick<Creator, 'handle'>): string =>
  (creator.handle ?? '').replace(/^@/, '');

function creatorDisplayName(creator: Pick<Creator, 'full_name' | 'handle'>): string {
  const name = creator.full_name?.trim();
  if (name) return name;
  const handle = bareHandle(creator);
  return handle ? `@${handle}` : 'Unknown creator';
}

const timeOf = (iso: string | null): number => {
  const time = iso ? Date.parse(iso) : NaN;
  return Number.isNaN(time) ? 0 : time;
};

/**
 * Threads in the default order: the ones waiting on us first, then newest reply first
 * within each group. Only conversations the creator has actually written in.
 */
export function buildThreads(creators: readonly Creator[]): InboxThread[] {
  const threads: InboxThread[] = [];
  for (const creator of creators) {
    // `conversation` is `conversations[0]`; read it alone only when the list is absent.
    const conversations = creator.conversations?.length
      ? creator.conversations
      : creator.conversation
        ? [creator.conversation]
        : [];
    for (const conversation of conversations) {
      const raw = conversation.latest_inbound_message;
      if (!raw) continue;
      threads.push({
        id: conversation.id,
        creator,
        conversation,
        creatorName: creatorDisplayName(creator),
        handle: bareHandle(creator),
        campaign: conversation.Campaign
          ? { id: conversation.Campaign.id, name: conversation.Campaign.name }
          : null,
        lastMessage: cleanMessageText(raw).trim() || raw.trim(),
        lastInboundAt: conversation.latest_inbound_at,
        waitingOnUs: conversation.waiting_on_us === true,
      });
    }
  }
  // Array#sort is stable, so equal timestamps keep the API's order.
  return threads.sort(
    (a, b) =>
      Number(b.waitingOnUs) - Number(a.waitingOnUs) ||
      timeOf(b.lastInboundAt) - timeOf(a.lastInboundAt),
  );
}

/**
 * Narrows threads to those waiting on us and/or matching `search`: a case-insensitive
 * substring of the creator's name, handle (with or without "@"), the campaign name or
 * the latest message. A blank search matches everything.
 */
export function filterThreads(
  threads: readonly InboxThread[],
  { search = '', waitingOnly = false }: ThreadFilters,
): InboxThread[] {
  const query = search.trim().toLowerCase().replace(/^@/, '');
  return threads.filter((thread) => {
    if (waitingOnly && !thread.waitingOnUs) return false;
    if (!query) return true;
    return [thread.creatorName, thread.handle, thread.campaign?.name, thread.lastMessage].some(
      (field) => field?.toLowerCase().includes(query),
    );
  });
}

/**
 * The next step shown in a thread's header, from the same engine as the Creators list
 * and the profile. With a partnership it leads with the partnership's own step, not the
 * creator-level review/outreach gates.
 *
 * The list carries only the partnership's id and status, so steps that also depend on its
 * shipment or deliverables (accepted → shipment; the content stages) are the engine's
 * answer without them — the partnership page, which has them, can name a different step.
 */
export function getThreadNextAction(thread: InboxThread): NextAction {
  // The row's `conversation` is its first one; the engine should see this thread's.
  const creator = { ...thread.creator, conversation: thread.conversation } as Creator;
  const ref = thread.conversation.partnership;
  if (!ref) return getNextAction({ creator });
  const partnership = {
    id: ref.id,
    status: ref.status,
    creator_id: thread.creator.id,
    campaign_id: thread.conversation.campaign_id ?? thread.campaign?.id ?? '',
  } as Partnership;
  return getPartnershipNextAction({ creator, partnership });
}
