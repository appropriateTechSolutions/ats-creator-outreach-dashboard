import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { ToastProvider } from '../contexts/ToastContext';
import { buildThreads, filterThreads } from '../lib/inboxThreads';
import { queryKeys } from '../lib/queryKeys';
import type { Creator, Partnership, ThreadMessage } from '../types';
import Conversations from './Conversations';

const state = vi.hoisted(() => ({
  creators: [] as unknown[],
  messages: {} as Record<string, unknown[]>,
  // Full partnership records by id, as GET /partnerships/:id returns them.
  partnerships: {} as Record<string, unknown>,
  requestedThreads: new Set<string>(),
  requestedPartnerships: new Set<string>(),
  invalidate: vi.fn(),
}));

const api = vi.hoisted(() => ({ syncConversations: vi.fn() }));

vi.mock('../hooks/queries', () => ({
  useConversations: () => ({ data: state.creators, isLoading: false }),
  useConversationThread: (id?: string) => {
    if (id) state.requestedThreads.add(id);
    return { data: id ? (state.messages[id] ?? []) : [], isLoading: false };
  },
  // Not loaded (data undefined) until the test registers the record.
  usePartnership: (id?: string) => {
    if (id) state.requestedPartnerships.add(id);
    return { data: id ? state.partnerships[id] : undefined };
  },
}));
vi.mock('../hooks/useInvalidate', () => ({ useInvalidate: () => state.invalidate }));
// Keep the real getErrorMessage; replace only what would hit the network.
vi.mock('../lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/api')>()),
  ...api,
}));

interface Spec {
  creatorId: string;
  name: string | null;
  handle: string;
  conversationId: string;
  campaignId: string;
  campaign: string;
  waiting: boolean;
  inboundAt: string;
  message: string;
  partnership: { id: string; status: string } | null;
}

// Shaped like a row of GET /conversations: the creator with `conversation` (the first
// of `conversations`), each carrying the campaign and the B3 fields.
function creator(spec: Spec, overrides: Record<string, unknown> = {}): Creator {
  const conversation = {
    id: spec.conversationId,
    campaign_id: spec.campaignId,
    latest_channel: 'email',
    latest_inbound_message: spec.message,
    latest_inbound_at: spec.inboundAt,
    qualification_status: 'unreviewed',
    Campaign: { id: spec.campaignId, name: spec.campaign, client_id: 'client-1' },
    last_outbound_at: '2026-10-01T12:00:00.000Z',
    waiting_on_us: spec.waiting,
    partnership: spec.partnership,
  };
  return {
    id: spec.creatorId,
    handle: spec.handle,
    full_name: spec.name,
    email: `${spec.handle}@example.com`,
    review_status: 'approved',
    lifecycle_status: 'engaged',
    conversation,
    conversations: [conversation],
    ...overrides,
  } as unknown as Creator;
}

const AMARA: Spec = {
  creatorId: 'cr-amara',
  name: 'Amara Okafor',
  handle: 'amaraholistic',
  conversationId: 'conv-amara',
  campaignId: 'camp-zero',
  campaign: 'Zero Sugar Launch Seeding',
  waiting: true,
  inboundAt: '2026-10-23T23:51:47.000Z',
  message: 'Sounds good. No rush, but I have limited availability in November.',
  partnership: { id: 'p-amara', status: 'negotiating' },
};
const MARCUS: Spec = {
  creatorId: 'cr-marcus',
  name: 'Marcus Bell',
  handle: 'marcusmixes',
  conversationId: 'conv-marcus',
  campaignId: 'camp-fall',
  campaign: 'Fall Flavor Drop',
  waiting: true,
  inboundAt: '2026-10-21T19:20:39.000Z',
  message: 'Got it, the offer looks good so far.',
  partnership: { id: 'p-marcus', status: 'offer_sent' },
};
const MAYA: Spec = {
  creatorId: 'cr-maya',
  name: 'Maya Ortiz',
  handle: 'mayaeatsatx',
  conversationId: 'conv-maya',
  campaignId: 'camp-fall',
  campaign: 'Fall Flavor Drop',
  waiting: false,
  inboundAt: '2026-10-28T21:25:57.000Z',
  message: 'Posting the reel on Friday, thanks again!',
  partnership: { id: 'p-maya', status: 'live' },
};
const CALEB: Spec = {
  creatorId: 'cr-caleb',
  name: 'Caleb Strand',
  handle: 'calebcooksbbq',
  conversationId: 'conv-caleb',
  campaignId: 'camp-summer',
  campaign: 'Summer Sips 2026',
  waiting: false,
  inboundAt: '2026-10-02T20:01:08.000Z',
  message: 'No thanks, I am not taking on beverage partnerships right now.',
  partnership: { id: 'p-caleb', status: 'rejected' },
};

// API order is deliberately not the display order.
const ALL = () => [creator(MARCUS), creator(MAYA), creator(AMARA), creator(CALEB)];

// Shaped like GET /partnerships/:id: the full record, with its shipments and deliverables.
function fullPartnership(spec: Spec, over: Record<string, unknown> = {}): Partnership {
  return {
    id: spec.partnership!.id,
    creator_id: spec.creatorId,
    campaign_id: spec.campaignId,
    status: spec.partnership!.status,
    shipment_included: false,
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-01T00:00:00.000Z',
    content: [],
    shipments: [],
    ...over,
  } as unknown as Partnership;
}

function message(over: Partial<ThreadMessage> & Pick<ThreadMessage, 'id'>): ThreadMessage {
  return {
    direction: 'inbound',
    channel: 'email',
    message_text: '',
    message_time: '2026-10-21T19:20:39.000Z',
    subject: null,
    source: 'message',
    ...over,
  };
}

function Where() {
  const { pathname, search } = useLocation();
  return <output aria-label="Current URL">{pathname + search}</output>;
}

function renderInbox(url = '/conversations') {
  return render(
    <MemoryRouter
      initialEntries={[url]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ToastProvider>
        <Conversations />
        <Where />
      </ToastProvider>
    </MemoryRouter>,
  );
}

const list = () => screen.getByRole('list', { name: 'Conversations' });
const rows = () => within(list()).getAllByRole('listitem');
const rowTexts = () => rows().map((li) => li.textContent);
const searchBox = () => screen.getByRole('searchbox', { name: 'Search conversations' });

beforeEach(() => {
  state.creators = ALL();
  state.messages = {};
  state.partnerships = Object.fromEntries(
    [AMARA, MARCUS, MAYA, CALEB].map((spec) => [spec.partnership!.id, fullPartnership(spec)]),
  );
  state.requestedThreads = new Set();
  state.requestedPartnerships = new Set();
  state.invalidate.mockReset();
  api.syncConversations.mockReset();
});

describe('Conversations page', () => {
  it('search matches campaign name', async () => {
    renderInbox();
    expect(rows()).toHaveLength(4);

    // Only Amara's campaign contains this; her name, handle and message do not.
    fireEvent.change(searchBox(), { target: { value: 'zero sugar' } });

    await waitFor(() => expect(rows()).toHaveLength(1));
    expect(rows()[0]).toHaveTextContent('Amara Okafor');
  });

  it('waiting filter shows only waiting_on_us threads', () => {
    renderInbox();
    const waiting = screen.getByRole('button', { name: 'Waiting on us (2)' });
    const all = screen.getByRole('button', { name: 'All' });
    expect(all).toHaveAttribute('aria-pressed', 'true');
    expect(waiting).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(waiting);

    expect(waiting).toHaveAttribute('aria-pressed', 'true');
    expect(all).toHaveAttribute('aria-pressed', 'false');
    expect(rowTexts()).toEqual([
      expect.stringContaining('Amara Okafor'),
      expect.stringContaining('Marcus Bell'),
    ]);

    fireEvent.click(all);
    expect(rows()).toHaveLength(4);
  });

  it('thread query param selects the thread', () => {
    // Last in the default order, so auto-selecting the first row cannot explain it.
    state.messages['conv-caleb'] = [
      message({ id: 'm1', message_text: 'No thanks, not for me.', message_time: CALEB.inboundAt }),
    ];
    renderInbox('/conversations?thread=conv-caleb');

    expect(screen.getByRole('heading', { level: 2, name: 'Caleb Strand' })).toBeInTheDocument();
    expect(screen.getByText('No thanks, not for me.')).toBeInTheDocument();
    expect(state.requestedThreads).toEqual(new Set(['conv-caleb']));
    const selected = within(list()).getByRole('button', { name: /Caleb Strand/ });
    expect(selected).toHaveAttribute('aria-current', 'true');
    expect(screen.getByLabelText('Current URL')).toHaveTextContent(
      '/conversations?thread=conv-caleb',
    );
  });

  it('opens on the first thread when the URL names none, and keeps the choice in the URL', () => {
    renderInbox();
    // Waiting threads lead, so the first is Amara's.
    expect(screen.getByRole('heading', { level: 2, name: 'Amara Okafor' })).toBeInTheDocument();
    expect(screen.getByLabelText('Current URL')).toHaveTextContent(
      '/conversations?thread=conv-amara',
    );

    fireEvent.click(within(list()).getByRole('button', { name: /Maya Ortiz/ }));

    expect(screen.getByRole('heading', { level: 2, name: 'Maya Ortiz' })).toBeInTheDocument();
    expect(screen.getByLabelText('Current URL')).toHaveTextContent(
      '/conversations?thread=conv-maya',
    );
  });

  it('says so when the thread in the URL is not in the inbox', () => {
    renderInbox('/conversations?thread=gone');

    expect(screen.getByText(/isn't in your inbox/)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument();
    expect(state.requestedThreads.size).toBe(0);
    // It does not quietly open some other conversation.
    expect(screen.getByLabelText('Current URL')).toHaveTextContent('/conversations?thread=gone');
  });

  it('search waits for a pause in typing before filtering', async () => {
    renderInbox();
    fireEvent.change(searchBox(), { target: { value: 'maya' } });
    expect(rows()).toHaveLength(4);

    await waitFor(() => expect(rows()).toHaveLength(1));
    expect(rows()[0]).toHaveTextContent('Maya Ortiz');
  });

  it('search matches the creator name, the handle and the last message', async () => {
    renderInbox();

    fireEvent.change(searchBox(), { target: { value: 'MARCUS BELL' } });
    await waitFor(() => expect(rows()).toHaveLength(1));
    expect(rows()[0]).toHaveTextContent('Marcus Bell');

    fireEvent.change(searchBox(), { target: { value: '@calebcooks' } });
    await waitFor(() => expect(rows()[0]).toHaveTextContent('Caleb Strand'));
    expect(rows()).toHaveLength(1);

    fireEvent.change(searchBox(), { target: { value: 'limited availability' } });
    await waitFor(() => expect(rows()[0]).toHaveTextContent('Amara Okafor'));
    expect(rows()).toHaveLength(1);
  });

  it('explains an empty result instead of showing a blank list', async () => {
    renderInbox();
    fireEvent.change(searchBox(), { target: { value: 'no such thing' } });

    expect(await screen.findByText('No matching conversations')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Conversations' })).not.toBeInTheDocument();
  });

  it('lists threads waiting on us first, each marked with a dot', () => {
    renderInbox();

    expect(rowTexts()).toEqual([
      expect.stringContaining('Amara Okafor'),
      expect.stringContaining('Marcus Bell'),
      expect.stringContaining('Maya Ortiz'),
      expect.stringContaining('Caleb Strand'),
    ]);
    const marker = (row: HTMLElement) => within(row).queryByRole('img', { name: 'Waiting on us' });
    const [amara, marcus, maya, caleb] = rows();
    expect(marker(amara)).toBeInTheDocument();
    expect(marker(marcus)).toBeInTheDocument();
    expect(marker(maya)).not.toBeInTheDocument();
    expect(marker(caleb)).not.toBeInTheDocument();
  });

  it('shows the creator name and campaign in each row, not a repeated subject', () => {
    state.creators = [creator({ ...MARCUS, name: null })];
    renderInbox();

    const [row] = rows();
    // No full name: falls back to the handle.
    expect(row).toHaveTextContent('@marcusmixes');
    expect(row).toHaveTextContent('Fall Flavor Drop');
    expect(row).toHaveTextContent('Got it, the offer looks good so far.');
    expect(screen.queryByText(/Re: Collab Opportunity/)).not.toBeInTheDocument();
  });

  it('titles the page Inbox', () => {
    renderInbox();
    expect(screen.getByRole('heading', { level: 1, name: 'Inbox' })).toBeInTheDocument();
  });

  it('links the thread header to the creator, campaign, partnership and next step', () => {
    renderInbox('/conversations?thread=conv-marcus');

    // The list rows are buttons, so each of these links can only be the thread header's.
    expect(screen.getByRole('link', { name: 'Marcus Bell' })).toHaveAttribute(
      'href',
      '/creators/cr-marcus',
    );
    expect(screen.getByRole('link', { name: 'Fall Flavor Drop' })).toHaveAttribute(
      'href',
      '/campaigns/camp-fall',
    );
    // The partnership status badge, in the Ledger's sentence-case wording.
    expect(screen.getByRole('link', { name: 'Offer sent' })).toHaveAttribute(
      'href',
      '/partnerships/p-marcus',
    );
    // The shared next-step engine's label for an offer out, linked to the profile.
    expect(screen.getByRole('link', { name: 'Awaiting signature' })).toHaveAttribute(
      'href',
      '/creators/cr-marcus',
    );
  });

  it("leads the header with the partnership's step, not the creator review", () => {
    state.creators = [creator(MARCUS, { review_status: 'hold' })];
    renderInbox('/conversations?thread=conv-marcus');

    expect(screen.getByRole('link', { name: 'Awaiting signature' })).toBeInTheDocument();
    expect(screen.queryByText('Review creator')).not.toBeInTheDocument();
  });

  it('falls back to the conversation status when there is no partnership', () => {
    state.creators = [creator({ ...MARCUS, partnership: null }, { lifecycle_status: 'replied' })];
    renderInbox('/conversations?thread=conv-marcus');

    expect(screen.getByText('Unreviewed')).toBeInTheDocument();
    const partnershipLinks = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('href')?.startsWith('/partnerships/'));
    expect(partnershipLinks).toHaveLength(0);
    // Still one step for the creator, from the same engine, with nothing to load for it.
    expect(screen.getByRole('link', { name: 'Draft offer' })).toHaveAttribute(
      'href',
      '/creators/cr-marcus',
    );
    expect(state.requestedPartnerships.size).toBe(0);
  });

  it('header next step uses the full partnership record', () => {
    // The list only says "accepted". The full record knows the offer ships product and a
    // shipment is already pending, so the partnership page leads with "Update shipment"
    // (from the list alone this would read "Activate partnership").
    const accepted: Spec = { ...MARCUS, partnership: { id: 'p-accepted', status: 'accepted' } };
    state.creators = [creator(accepted)];
    state.partnerships = {
      'p-accepted': fullPartnership(accepted, {
        shipment_included: true,
        shipments: [
          {
            id: 'ship-1',
            partnership_id: 'p-accepted',
            campaign_id: accepted.campaignId,
            status: 'pending',
            created_at: '2026-10-02T00:00:00.000Z',
          },
        ],
      }),
    };
    renderInbox('/conversations?thread=conv-marcus');

    expect(screen.getByRole('link', { name: 'Update shipment' })).toHaveAttribute(
      'href',
      '/creators/cr-marcus',
    );
    expect(screen.queryByText('Activate partnership')).not.toBeInTheDocument();
    // Only the open thread's partnership is loaded.
    expect(state.requestedPartnerships).toEqual(new Set(['p-accepted']));
  });

  it("header next step uses the partnership's deliverables", () => {
    // Live, with a draft waiting for review: the list's status alone would say "Complete".
    const live: Spec = { ...MARCUS, partnership: { id: 'p-live', status: 'live' } };
    state.creators = [creator(live)];
    state.partnerships = {
      'p-live': fullPartnership(live, {
        content: [
          {
            id: 'content-1',
            partnership_id: 'p-live',
            campaign_id: live.campaignId,
            status: 'submitted',
            due_date: '2026-11-12',
          },
        ],
      }),
    };
    renderInbox('/conversations?thread=conv-marcus');

    expect(screen.getByRole('link', { name: 'Review draft' })).toHaveAttribute(
      'href',
      '/creators/cr-marcus',
    );
    expect(screen.queryByText('Complete partnership')).not.toBeInTheDocument();
  });

  it('shows the status badge but no next step while the partnership loads', () => {
    state.partnerships = {};
    renderInbox('/conversations?thread=conv-marcus');

    expect(screen.getByRole('link', { name: 'Offer sent' })).toHaveAttribute(
      'href',
      '/partnerships/p-marcus',
    );
    expect(screen.queryByText(/Next step/)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Awaiting signature' })).not.toBeInTheDocument();
  });

  it('header status follows the full partnership record', () => {
    // The list was fetched before the offer was accepted.
    state.partnerships['p-marcus'] = fullPartnership(MARCUS, { status: 'accepted' });
    renderInbox('/conversations?thread=conv-marcus');

    expect(screen.getByRole('link', { name: 'Offer accepted' })).toHaveAttribute(
      'href',
      '/partnerships/p-marcus',
    );
    expect(screen.queryByRole('link', { name: 'Offer sent' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Activate partnership' })).toBeInTheDocument();
  });

  it('shows an outreach email we sent on our side with its subject line', () => {
    state.messages['conv-marcus'] = [
      message({
        id: 'log-1',
        direction: 'outbound',
        source: 'outreach_log',
        subject: 'Collaboration Offer: Fall Flavor Drop',
        message_text: 'Hi Marcus, here is the offer we discussed.',
        message_time: '2026-10-20T15:00:00.000Z',
      }),
      message({
        id: 'msg-1',
        message_text: 'Thanks, reading the terms tonight.',
        message_time: '2026-10-21T19:20:39.000Z',
      }),
    ];
    renderInbox('/conversations?thread=conv-marcus');

    const subject = screen.getByText('Collaboration Offer: Fall Flavor Drop');
    const sent = subject.parentElement as HTMLElement;
    expect(sent.parentElement).toHaveClass('justify-end');
    expect(sent).toHaveTextContent('You');
    expect(sent).toHaveTextContent('Hi Marcus, here is the offer we discussed.');

    // The creator's reply sits on the other side, under their name, with no subject line.
    const reply = screen.getByText('Thanks, reading the terms tonight.')
      .parentElement as HTMLElement;
    expect(reply.parentElement).toHaveClass('justify-start');
    expect(reply).toHaveTextContent('Marcus Bell');
  });
});

describe('Sync Inbox', () => {
  const sync = () => fireEvent.click(screen.getByRole('button', { name: 'Sync Inbox' }));

  it.each([
    [{ newMessages: 3, errors: [] }, 'Sync complete! Pulled 3 new messages.'],
    [{ newMessages: 1, errors: [] }, 'Sync complete! Pulled 1 new message.'],
    [{ newMessages: 0, errors: [] }, 'Sync complete! Pulled 0 new messages.'],
    // An older response shape: `synced` still counts when `newMessages` is absent.
    [{ synced: 2 }, 'Sync complete! Pulled 2 new messages.'],
    [{ newMessages: 4, synced: 9 }, 'Sync complete! Pulled 4 new messages.'],
  ])('reports the pulled count from %j', async (result, toast) => {
    api.syncConversations.mockResolvedValue(result);
    renderInbox('/conversations?thread=conv-marcus');

    sync();

    expect(await screen.findByText(toast)).toBeInTheDocument();
  });

  it('refreshes the conversations, the open thread and its partnership after a sync', async () => {
    api.syncConversations.mockResolvedValue({ newMessages: 2, errors: [] });
    renderInbox('/conversations?thread=conv-marcus');
    expect(state.invalidate).not.toHaveBeenCalled();

    sync();

    await waitFor(() => expect(state.invalidate).toHaveBeenCalledTimes(1));
    // ['conversations'] is a prefix of every thread's key, so it covers the open thread.
    const keys = state.invalidate.mock.calls[0];
    expect(keys).toEqual([queryKeys.conversations.all, queryKeys.partnerships.root]);
    expect(queryKeys.conversations.thread('conv-marcus').slice(0, 1)).toEqual(keys[0]);
  });

  it("shows the backend's reason when the sync fails, and refreshes nothing", async () => {
    api.syncConversations.mockRejectedValue({
      success: false,
      error: 'Mail account is not configured',
    });
    renderInbox('/conversations?thread=conv-marcus');

    sync();

    expect(await screen.findByText('Mail account is not configured')).toBeInTheDocument();
    expect(state.invalidate).not.toHaveBeenCalled();
  });
});

describe('inbox threads', () => {
  it('builds one thread per conversation, so a creator in two campaigns appears twice', () => {
    const second = {
      ...creator(MARCUS).conversation!,
      id: 'conv-marcus-zero',
      latest_inbound_at: '2026-10-25T10:00:00.000Z',
      Campaign: { id: 'camp-zero', name: 'Zero Sugar Launch Seeding', client_id: 'client-1' },
      waiting_on_us: false,
    };
    const both = creator(MARCUS);
    both.conversations = [both.conversation!, second];

    const threads = buildThreads([both]);

    expect(threads.map((t) => t.id)).toEqual(['conv-marcus', 'conv-marcus-zero']);
    expect(threads.map((t) => t.campaign?.name)).toEqual([
      'Fall Flavor Drop',
      'Zero Sugar Launch Seeding',
    ]);
  });

  it('skips conversations the creator never wrote in, and reads `conversation` alone', () => {
    const silent = creator(AMARA, { conversations: undefined });
    silent.conversation = { ...silent.conversation!, latest_inbound_message: null };
    const legacy = creator(CALEB, { conversations: undefined });

    expect(buildThreads([silent, legacy]).map((t) => t.id)).toEqual(['conv-caleb']);
  });

  it('filters by waiting and search together', () => {
    const threads = buildThreads(ALL());

    expect(filterThreads(threads, { waitingOnly: true, search: 'fall' }).map((t) => t.id)).toEqual([
      'conv-marcus',
    ]);
    expect(filterThreads(threads, { search: '   ' })).toHaveLength(4);
    expect(filterThreads(threads, { search: '@' })).toHaveLength(4);
  });
});
