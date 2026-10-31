import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { getAttention } from '../../lib/api';
import type { AttentionItem, AttentionSummary, AttentionType } from '../../types';
import { NeedsAttention } from './NeedsAttention';

// Keep the real getErrorMessage; replace only what would hit the network.
vi.mock('../../lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/api')>()),
  getAttention: vi.fn(),
}));

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

// Shaped like a row of GET /stats/attention (a reply waiting on us, by default).
const item = (over: Partial<AttentionItem> = {}): AttentionItem => ({
  type: 'reply_waiting',
  entity_id: 'conv-daniela',
  creator_id: 'cr-daniela',
  creator_name: 'Daniela Cruz',
  campaign_id: 'camp-reset',
  campaign_name: 'Clean Skin Reset: UGC Program',
  since: daysAgo(11),
  detail: 'Replied 11 days ago',
  ...over,
});

const counts = (over: Partial<AttentionSummary['counts']> = {}): AttentionSummary['counts'] => ({
  reply_waiting: 0,
  offer_unsigned: 0,
  address_needed: 0,
  deliverable_overdue: 0,
  send_failed: 0,
  ...over,
});

// The app keeps query data fresh for 60s (src/lib/queryClient.ts); tests that reopen
// the card depend on it.
const newClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 60_000 } } });

function renderCard(campaignId?: string, queryClient = newClient()) {
  const card = (id?: string) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <NeedsAttention campaignId={id} />
      </MemoryRouter>
    </QueryClientProvider>
  );
  const view = render(card(campaignId));
  return {
    // The dashboard's campaign selector changing.
    selectCampaign: (id?: string) => view.rerender(card(id)),
    close: () => view.unmount(),
  };
}

// The count chips in order, each as [label, count].
const chips = () =>
  within(screen.getByRole('list', { name: 'Counts by type' }))
    .getAllByRole('listitem')
    .map((li) => [li.children[0].textContent, li.children[1].textContent]);

const EMPTY = 'Nothing needs you right now.';

describe('NeedsAttention', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders counts and links each item type to its record', async () => {
    // The counts are the backend's totals (its list is capped at 50), so they can
    // run ahead of the rows; they are distinct here so a swapped chip would show.
    vi.mocked(getAttention).mockResolvedValue({
      counts: counts({
        reply_waiting: 3,
        offer_unsigned: 2,
        address_needed: 1,
        deliverable_overdue: 4,
        send_failed: 5,
      }),
      items: [
        item(),
        item({
          type: 'offer_unsigned',
          entity_id: 'part-marcus',
          creator_id: 'cr-marcus',
          creator_name: 'Marcus Bell',
          campaign_id: 'camp-fall',
          campaign_name: 'Fall Flavor Drop: Apple Cider Fizz',
          since: daysAgo(9),
          detail: 'Offer sent 9 days ago, not signed',
        }),
        item({
          type: 'address_needed',
          entity_id: 'ship-mei',
          creator_id: 'cr-mei',
          creator_name: 'Mei Lin Zhou',
          since: daysAgo(8),
          detail: 'Address requested 8 days ago',
        }),
        item({
          type: 'deliverable_overdue',
          entity_id: 'content-theo',
          creator_id: 'cr-theo',
          creator_name: 'Theo Ashford',
          campaign_id: 'camp-zero',
          campaign_name: 'Zero Sugar Launch Seeding',
          since: daysAgo(3),
          detail: 'Due Oct 28',
        }),
        item({
          type: 'send_failed',
          entity_id: 'cr-brianna',
          creator_id: 'cr-brianna',
          creator_name: 'Brianna Cole',
          since: daysAgo(10),
          detail: 'Email failed to send 10 days ago',
        }),
      ],
    });
    renderCard();

    expect(await screen.findByText('Replies waiting')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Needs attention' })).toBeInTheDocument();
    expect(chips()).toEqual([
      ['Replies waiting', '3'],
      ['Offers not signed', '2'],
      ['Addresses needed', '1'],
      ['Overdue deliverables', '4'],
      ['Failed emails', '5'],
    ]);

    // Each row opens the record its type is about.
    const link = (name: string) => screen.getByRole('link', { name: new RegExp(name) });
    expect(link('Daniela Cruz')).toHaveAttribute('href', '/conversations?thread=conv-daniela');
    expect(link('Marcus Bell')).toHaveAttribute('href', '/partnerships/part-marcus');
    expect(link('Mei Lin Zhou')).toHaveAttribute('href', '/shipments/ship-mei');
    expect(link('Theo Ashford')).toHaveAttribute('href', '/content/content-theo');
    expect(link('Brianna Cole')).toHaveAttribute('href', '/creators/cr-brianna');

    // A row says who, which campaign, what, and how long ago.
    const row = within(link('Daniela Cruz'));
    expect(row.getByText('Clean Skin Reset: UGC Program')).toBeInTheDocument();
    expect(row.getByText('Replied 11 days ago')).toBeInTheDocument();
    expect(row.getByText('11d ago')).toBeInTheDocument();
    expect(within(link('Marcus Bell')).getByText('9d ago')).toBeInTheDocument();
    expect(screen.queryByText(EMPTY)).not.toBeInTheDocument();
  });

  it('empty state when no items', async () => {
    vi.mocked(getAttention).mockResolvedValue({ counts: counts(), items: [] });
    renderCard();

    expect(await screen.findByText(EMPTY)).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByText('Replies waiting')).not.toBeInTheDocument();
  });

  it('lists a creator whose email failed in two campaigns once per campaign', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    // send_failed rows are keyed by the creator, so both rows share type and entity_id.
    const failed = (campaignId: string, campaignName: string) =>
      item({
        type: 'send_failed',
        entity_id: 'cr-omar',
        creator_id: 'cr-omar',
        creator_name: 'Omar Haddad',
        campaign_id: campaignId,
        campaign_name: campaignName,
        detail: 'Email failed to send 7 days ago',
      });
    vi.mocked(getAttention).mockResolvedValue({
      counts: counts({ send_failed: 2 }),
      items: [
        failed('camp-fall', 'Fall Flavor Drop'),
        failed('camp-zero', 'Zero Sugar Launch Seeding'),
      ],
    });
    renderCard();

    const rows = await screen.findAllByRole('link', { name: /Omar Haddad/ });
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText('Fall Flavor Drop')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Zero Sugar Launch Seeding')).toBeInTheDocument();
    // React reports siblings that share a key; the row key has to include the campaign.
    const logged = consoleError.mock.calls.map((args) => args.map(String).join(' ')).join('\n');
    expect(logged).not.toMatch(/same key/);
    consoleError.mockRestore();
  });

  it('skips an item type it does not know instead of failing the page', async () => {
    vi.mocked(getAttention).mockResolvedValue({
      counts: counts({ reply_waiting: 1 }),
      items: [
        item({
          type: 'meeting_unconfirmed' as unknown as AttentionType,
          entity_id: 'meet-1',
          creator_name: 'Newtype Creator',
        }),
        item(),
      ],
    });
    renderCard();

    expect(await screen.findByRole('link', { name: /Daniela Cruz/ })).toBeInTheDocument();
    expect(screen.queryByText('Newtype Creator')).not.toBeInTheDocument();
  });

  it('asks for the selected campaign, or all of them', async () => {
    vi.mocked(getAttention).mockResolvedValue({ counts: counts(), items: [] });

    renderCard('camp-fall');
    await screen.findByText(EMPTY);
    expect(getAttention).toHaveBeenCalledWith('camp-fall');
  });

  it('asks for every campaign when none is selected', async () => {
    vi.mocked(getAttention).mockResolvedValue({ counts: counts(), items: [] });

    renderCard();
    await screen.findByText(EMPTY);
    expect(getAttention).toHaveBeenCalledWith(undefined);
  });

  it('shows the list of the campaign selected, not the previous one', async () => {
    vi.mocked(getAttention).mockImplementation(async (campaignId) =>
      campaignId === 'camp-zero'
        ? {
            counts: counts({ reply_waiting: 1 }),
            items: [item({ entity_id: 'conv-amara', creator_name: 'Amara Okafor' })],
          }
        : { counts: counts(), items: [] },
    );
    const card = renderCard();
    await screen.findByText(EMPTY);

    card.selectCampaign('camp-zero');

    expect(await screen.findByRole('link', { name: /Amara Okafor/ })).toBeInTheDocument();
    expect(screen.queryByText(EMPTY)).not.toBeInTheDocument();
    card.selectCampaign(undefined);
    expect(await screen.findByText(EMPTY)).toBeInTheDocument();
  });

  it('checks again each time the dashboard is opened, even within the stale window', async () => {
    vi.mocked(getAttention).mockResolvedValue({ counts: counts(), items: [] });
    const queryClient = newClient();

    const first = renderCard(undefined, queryClient);
    await screen.findByText(EMPTY);
    first.close();
    expect(getAttention).toHaveBeenCalledTimes(1);

    // Someone dealt with a reply in the meantime; the next visit has to see that.
    vi.mocked(getAttention).mockResolvedValue({
      counts: counts({ reply_waiting: 1 }),
      items: [item()],
    });
    renderCard(undefined, queryClient);

    expect(await screen.findByRole('link', { name: /Daniela Cruz/ })).toBeInTheDocument();
    expect(getAttention).toHaveBeenCalledTimes(2);
  });

  it('shows the ten longest-waiting rows and expands to the rest', async () => {
    const items = Array.from({ length: 12 }, (_, i) =>
      item({
        entity_id: `conv-${i + 1}`,
        creator_name: `Creator ${i + 1}`,
        since: daysAgo(20 - i),
      }),
    );
    vi.mocked(getAttention).mockResolvedValue({ counts: counts({ reply_waiting: 12 }), items });
    renderCard();

    expect(await screen.findAllByRole('link')).toHaveLength(10);
    expect(screen.getByRole('link', { name: /Creator 10\b/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Creator 11\b/ })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Show all 12' }));
    expect(screen.getAllByRole('link')).toHaveLength(12);

    await userEvent.click(screen.getByRole('button', { name: 'Show fewer' }));
    expect(screen.getAllByRole('link')).toHaveLength(10);
  });

  it('has no expand button or note when everything already fits', async () => {
    vi.mocked(getAttention).mockResolvedValue({
      counts: counts({ reply_waiting: 1 }),
      items: [item()],
    });
    renderCard();

    await screen.findByRole('link', { name: /Daniela Cruz/ });
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByText(/longest-waiting/)).not.toBeInTheDocument();
  });

  it('says so when the backend listed fewer rows than the counts add up to', async () => {
    // The backend lists at most 50 and counts everything.
    const items = Array.from({ length: 50 }, (_, i) =>
      item({ entity_id: `conv-${i + 1}`, creator_name: `Creator ${i + 1}` }),
    );
    vi.mocked(getAttention).mockResolvedValue({
      counts: counts({ reply_waiting: 40, send_failed: 23 }),
      items,
    });
    renderCard();

    expect(
      await screen.findByText('The list holds the 50 longest-waiting of 63.'),
    ).toBeInTheDocument();
    // The button counts what it will reveal, not the backend total.
    expect(screen.getByRole('button', { name: 'Show all 50' })).toBeInTheDocument();
  });

  it('says the list could not load, instead of claiming nothing needs attention, and retries', async () => {
    vi.mocked(getAttention)
      .mockRejectedValueOnce({ success: false, error: 'Attention service unavailable' })
      .mockResolvedValue({ counts: counts(), items: [] });
    renderCard();

    expect(await screen.findByText('Attention service unavailable')).toBeInTheDocument();
    expect(screen.queryByText(EMPTY)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText(EMPTY)).toBeInTheDocument();
    expect(screen.queryByText('Attention service unavailable')).not.toBeInTheDocument();
  });
});
