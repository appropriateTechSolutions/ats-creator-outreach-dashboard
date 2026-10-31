import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { ToastProvider } from '../contexts/ToastContext';
import { buildThreads, filterThreads } from '../lib/inboxThreads';
import type { Creator, ThreadMessage } from '../types';
import Conversations from './Conversations';

const state = vi.hoisted(() => ({
  creators: [] as unknown[],
  messages: {} as Record<string, unknown[]>,
  requestedThreads: new Set<string>(),
}));

vi.mock('../hooks/queries', () => ({
  useConversations: () => ({ data: state.creators, isLoading: false, refetch: vi.fn() }),
  useConversationThread: (id?: string) => {
    if (id) state.requestedThreads.add(id);
    return { data: id ? (state.messages[id] ?? []) : [], isLoading: false };
  },
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
  state.requestedThreads = new Set();
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
    // Still one step for the creator, from the same engine.
    expect(screen.getByRole('link', { name: 'Draft offer' })).toHaveAttribute(
      'href',
      '/creators/cr-marcus',
    );
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
