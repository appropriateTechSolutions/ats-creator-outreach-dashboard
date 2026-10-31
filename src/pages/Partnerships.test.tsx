import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom';
import { ToastProvider } from '../contexts/ToastContext';
import { ConfirmProvider } from '../contexts/ConfirmContext';
import { activatePartnership, completePartnership, markQualified } from '../lib/api';
import { filterPartnerships, PARTNERSHIP_STATUSES } from '../lib/partnershipFilters';
import type { Creator, CreatorContent, Partnership, Shipment } from '../types';
import Partnerships from './Partnerships';

const row = (id: string, status: string, name = id, extra: Record<string, unknown> = {}) =>
  ({
    id,
    status,
    creator_id: `c-${id}`,
    campaign_id: 'camp-1',
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
    Creator: { id: `c-${id}`, handle: name.toLowerCase(), full_name: name },
    Campaign: { id: 'camp-1', name: 'Fall Flavor Drop' },
    ...extra,
  }) as unknown as Partnership;

const shipment = (id: string, partnershipId: string): Shipment =>
  ({
    id,
    creator_id: `c-${partnershipId}`,
    campaign_id: 'camp-1',
    partnership_id: partnershipId,
    product_name: 'Apple Cider Fizz',
    status: 'pending',
    created_at: '2026-10-02T00:00:00Z',
    updated_at: '2026-10-02T00:00:00Z',
  }) as Shipment;

const deliverable = (id: string, partnershipId: string, status: string): CreatorContent =>
  ({
    id,
    creator_id: `c-${partnershipId}`,
    campaign_id: 'camp-1',
    partnership_id: partnershipId,
    platform: 'instagram',
    content_type: 'instagram_reel',
    status,
    due_date: '2026-11-10',
    created_at: '2026-10-03T00:00:00Z',
    updated_at: '2026-10-03T00:00:00Z',
  }) as CreatorContent;

const ROWS = [
  row('p1', 'offer_sent', 'Marcus Bell'),
  row('p2', 'accepted', 'Maya Ortiz'),
  row('p3', 'live', 'Miles Okonkwo'),
  row('p4', 'completed', 'Molly Kessler'),
  row('p5', 'rejected', 'Caleb Strand'),
  row('p6', 'inactive', 'Andre Williams'),
  row('p7', 'engaged', 'Dylan Reyes'),
];

// What the page's data hooks return; each test sets what it needs.
const data = vi.hoisted(() => ({
  partnerships: [] as unknown[],
  shipments: [] as unknown[],
  contents: [] as unknown[],
  creators: [] as unknown[],
}));

vi.mock('../hooks/queries', () => ({
  usePartnerships: () => ({ data: data.partnerships, isLoading: false }),
  useShipments: () => ({ data: data.shipments, isLoading: false }),
  useContents: () => ({ data: data.contents, isLoading: false }),
  useAllCreators: () => ({ data: data.creators, isLoading: false }),
  useCampaigns: () => ({ data: [] }),
}));
vi.mock('../hooks/useInvalidate', () => ({ useInvalidate: () => vi.fn() }));

// Keep the real getErrorMessage; replace only what would hit the network.
vi.mock('../lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/api')>()),
  activatePartnership: vi.fn(),
  completePartnership: vi.fn(),
  markQualified: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  data.partnerships = ROWS;
  data.shipments = [];
  data.contents = [];
  data.creators = [];
});

// Stand-ins for the pages a row action navigates to.
function Landed({ label }: { label: string }) {
  const { id } = useParams();
  return <p>{`${label} ${id}`}</p>;
}

function renderPage() {
  return render(
    <MemoryRouter
      initialEntries={['/partnerships']}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ToastProvider>
        <ConfirmProvider>
          <Routes>
            <Route path="/partnerships" element={<Partnerships />} />
            <Route path="/shipments/:id" element={<Landed label="Shipment" />} />
            <Route path="/content/:id" element={<Landed label="Deliverable" />} />
          </Routes>
        </ConfirmProvider>
      </ToastProvider>
    </MemoryRouter>,
  );
}

const rowOf = (name: string) => screen.getByText(name).closest('tr') as HTMLElement;
// The row's last cell: its actions (the status badge, in another cell, can say the same words).
const actionsOf = (name: string) => rowOf(name).lastElementChild as HTMLElement;

describe('filterPartnerships', () => {
  it('default filter shows offer_sent and accepted, hides completed', () => {
    const { rows, closedHidden } = filterPartnerships(ROWS, { status: 'open' });
    const statuses = rows.map((p) => p.status);
    expect(statuses).toContain('offer_sent');
    expect(statuses).toContain('accepted');
    expect(statuses).toContain('engaged');
    expect(statuses).toContain('live');
    expect(statuses).not.toContain('completed');
    expect(statuses).not.toContain('rejected');
    expect(statuses).not.toContain('inactive');
    expect(closedHidden).toBe(3);
  });

  it('"all" keeps closed partnerships and hides nothing', () => {
    const { rows, closedHidden } = filterPartnerships(ROWS, { status: 'all' });
    expect(rows).toHaveLength(ROWS.length);
    expect(closedHidden).toBe(0);
  });

  it('a single status shows only that status', () => {
    const { rows, closedHidden } = filterPartnerships(ROWS, { status: 'completed' });
    expect(rows.map((p) => p.id)).toEqual(['p4']);
    expect(closedHidden).toBe(0);
  });

  it('counts only closed rows that match the other filters', () => {
    const { rows, closedHidden } = filterPartnerships(ROWS, { status: 'open', search: 'molly' });
    expect(rows).toHaveLength(0);
    expect(closedHidden).toBe(1);
  });

  it('knows the 18 backend statuses', () => {
    expect(PARTNERSHIP_STATUSES).toHaveLength(18);
  });
});

describe('Partnerships page', () => {
  it('opens on the open pipeline and offers to show the closed rows', () => {
    renderPage();
    expect(screen.getByText('Marcus Bell')).toBeInTheDocument();
    expect(screen.getByText('Maya Ortiz')).toBeInTheDocument();
    expect(screen.queryByText('Molly Kessler')).not.toBeInTheDocument();

    const hint = screen.getByText(/3 closed hidden/);
    fireEvent.click(within(hint).getByRole('button', { name: 'Show all' }));

    expect(screen.getByText('Molly Kessler')).toBeInTheDocument();
    expect(screen.queryByText(/closed hidden/)).not.toBeInTheDocument();
  });

  it('labels the status filter options without raw enums', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Filters/ }));
    const select = screen.getByLabelText('Status') as HTMLSelectElement;
    const options = Array.from(select.options).map((o) => o.textContent ?? '');
    expect(options.slice(0, 2)).toEqual(['Open (default)', 'All']);
    expect(options).toContain('Offer accepted');
    expect(options).toHaveLength(2 + 18);
    for (const label of options) expect(label).not.toContain('_');
    expect(new Set(options).size).toBe(options.length);
  });
});

// The list's per-row action comes from the same engine as the partnership page, so a
// row never offers "Activate" where the page says "Awaiting delivery".
describe('Partnerships row actions', () => {
  const only = (...rows: Partnership[]) => {
    data.partnerships = rows;
  };

  it('accepted + ships product + no shipment yet → "Add shipment" (never "Create Shipment" or "Activate")', () => {
    only(row('p1', 'accepted', 'Yusuf Adeyemi', { shipment_included: true }));
    renderPage();

    const r = actionsOf('Yusuf Adeyemi');
    expect(within(r).getByRole('button', { name: 'Add shipment' })).toBeInTheDocument();
    expect(within(r).queryByRole('button', { name: /create shipment|activate/i })).toBeNull();
  });

  it('accepted + shipment exists → "Update shipment", which opens that shipment', async () => {
    only(row('p1', 'accepted', 'Mei Lin', { shipment_included: true }));
    data.shipments = [shipment('s-1', 'p1')];
    renderPage();

    await userEvent.click(
      within(actionsOf('Mei Lin')).getByRole('button', { name: 'Update shipment' }),
    );

    expect(await screen.findByText('Shipment s-1')).toBeInTheDocument();
  });

  it('accepted without a product shipment → "Activate partnership", which activates it', async () => {
    only(row('p1', 'accepted', 'Keisha Thompson', { shipment_included: false }));
    renderPage();

    const r = actionsOf('Keisha Thompson');
    expect(within(r).queryByRole('button', { name: /shipment/i })).toBeNull();
    await userEvent.click(within(r).getByRole('button', { name: 'Activate partnership' }));

    expect(activatePartnership).toHaveBeenCalledWith('p1');
  });

  it.each([
    ['product_shipped', 'Awaiting delivery'],
    ['product_delivered', 'Awaiting content'],
    ['offer_sent', 'Awaiting signature'],
    ['meeting_scheduled', 'Meeting scheduled'],
    ['engaged', 'Awaiting reply'],
  ])('%s → no primary button, says "%s"', (status, label) => {
    only(row('p1', status, 'Ethan Cho'));
    renderPage();

    const r = actionsOf('Ethan Cho');
    expect(within(r).getByText(label)).toBeInTheDocument();
    expect(within(r).queryByRole('button', { name: /activate|complete|shipment/i })).toBeNull();
  });

  it('activated → reviews a submitted draft first, completes only when nothing is pending', async () => {
    only(row('p1', 'activated', 'Amara Okafor'), row('p2', 'activated', 'Tessa Whitfield'));
    data.contents = [deliverable('ct-1', 'p1', 'submitted')];
    renderPage();

    const busy = actionsOf('Amara Okafor');
    expect(within(busy).queryByRole('button', { name: 'Complete partnership' })).toBeNull();

    const clear = actionsOf('Tessa Whitfield');
    await userEvent.click(within(clear).getByRole('button', { name: 'Complete partnership' }));
    expect(completePartnership).toHaveBeenCalledWith('p2');

    await userEvent.click(within(busy).getByRole('button', { name: 'Review draft' }));
    expect(await screen.findByText('Deliverable ct-1')).toBeInTheDocument();
  });

  it('qualified → "Draft offer"', () => {
    only(row('p1', 'qualified', 'Priya Menon'));
    renderPage();
    expect(
      within(actionsOf('Priya Menon')).getByRole('button', { name: 'Draft offer' }),
    ).toBeVisible();
  });

  it('engaged → a creator who has replied gets "Draft offer", like the partnership page', () => {
    only(row('p1', 'engaged', 'Dylan Reyes'), row('p2', 'engaged', 'Omar Haddad'));
    // Only the full creator record (GET /creators) knows who has written back.
    data.creators = [{ id: 'c-p1', lifecycle_status: 'replied' } as Creator];
    renderPage();

    expect(
      within(actionsOf('Dylan Reyes')).getByRole('button', { name: 'Draft offer' }),
    ).toBeVisible();
    expect(within(actionsOf('Omar Haddad')).getByText('Awaiting reply')).toBeVisible();
  });

  it('keeps the secondary actions: Qualify, Resend offer, edit and reject', async () => {
    only(
      row('p1', 'engaged', 'Dylan Reyes'),
      row('p2', 'offer_sent', 'Marcus Bell'),
      row('p3', 'live', 'Miles Okonkwo'),
    );
    renderPage();

    await userEvent.click(
      within(actionsOf('Dylan Reyes')).getByRole('button', { name: 'Qualify' }),
    );
    expect(markQualified).toHaveBeenCalledWith('p1');

    expect(
      within(actionsOf('Marcus Bell')).getByRole('button', { name: 'Resend offer' }),
    ).toBeVisible();
    expect(
      within(actionsOf('Miles Okonkwo')).queryByRole('button', { name: 'Qualify' }),
    ).toBeNull();
    for (const name of ['Dylan Reyes', 'Marcus Bell', 'Miles Okonkwo']) {
      expect(within(actionsOf(name)).getByTitle('Edit parameters')).toBeVisible();
      expect(within(actionsOf(name)).getByTitle('Reject partnership')).toBeVisible();
    }
  });

  it('offers no reject on a completed partnership', () => {
    only(row('p1', 'completed', 'Molly Kessler'));
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Show all' }));

    const r = actionsOf('Molly Kessler');
    expect(within(r).getByTitle('Edit parameters')).toBeVisible();
    expect(within(r).queryByTitle('Reject partnership')).toBeNull();
  });
});

// Laptop widths: the Actions column stays pinned, and user data is not forced to
// uppercase (names wrapped over three lines) or broken across lines (dates).
describe('Partnerships table layout', () => {
  it("pins the Actions header and every row's actions cell to the right edge", () => {
    renderPage();
    expect(screen.getByRole('columnheader', { name: 'Actions' })).toHaveClass('col-sticky-end');

    const rows = document.querySelectorAll('tbody tr');
    expect(rows.length).toBeGreaterThan(0);
    for (const tr of rows) {
      expect(tr.lastElementChild).toHaveClass('col-sticky-end');
    }
    // Only that column is pinned.
    expect(document.querySelectorAll('thead .col-sticky-end')).toHaveLength(1);
  });

  it('shows names, handles and campaign names as typed, not forced uppercase', () => {
    renderPage();
    for (const el of [
      screen.getByText('Marcus Bell'),
      screen.getByText('@marcus bell'),
      screen.getAllByText('Fall Flavor Drop')[0] as HTMLElement,
    ]) {
      expect(el).not.toHaveClass('uppercase');
    }
    // Column headers keep their small-caps treatment.
    expect(screen.getByRole('columnheader', { name: 'Creator' }).closest('tr')).toHaveClass(
      'uppercase',
    );
  });

  it('keeps each date on one line', () => {
    data.partnerships = [
      row('p1', 'accepted', 'Maya Ortiz', {
        start_date: '2026-11-03T12:00:00Z',
        end_date: '2026-12-01T12:00:00Z',
      }),
    ];
    renderPage();
    expect(screen.getByText('Nov 3, 2026').closest('td')).toHaveClass('whitespace-nowrap');
    expect(screen.getByText('Dec 1, 2026').closest('td')).toHaveClass('whitespace-nowrap');
  });
});
