import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../contexts/ToastContext';
import { ConfirmProvider } from '../contexts/ConfirmContext';
import { filterPartnerships, PARTNERSHIP_STATUSES } from '../lib/partnershipFilters';
import type { Partnership } from '../types';
import Partnerships from './Partnerships';

const row = (id: string, status: string, name = id): Partnership =>
  ({
    id,
    status,
    creator_id: `c-${id}`,
    campaign_id: 'camp-1',
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
    Creator: { id: `c-${id}`, handle: name.toLowerCase(), full_name: name },
    Campaign: { id: 'camp-1', name: 'Fall Flavor Drop' },
  }) as unknown as Partnership;

const ROWS = [
  row('p1', 'offer_sent', 'Marcus Bell'),
  row('p2', 'accepted', 'Maya Ortiz'),
  row('p3', 'live', 'Miles Okonkwo'),
  row('p4', 'completed', 'Molly Kessler'),
  row('p5', 'rejected', 'Caleb Strand'),
  row('p6', 'inactive', 'Andre Williams'),
  row('p7', 'engaged', 'Dylan Reyes'),
];

vi.mock('../hooks/queries', () => ({
  usePartnerships: () => ({ data: ROWS, isLoading: false }),
  useCampaigns: () => ({ data: [] }),
}));
vi.mock('../hooks/useInvalidate', () => ({ useInvalidate: () => vi.fn() }));

function renderPage() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastProvider>
        <ConfirmProvider>
          <Partnerships />
        </ConfirmProvider>
      </ToastProvider>
    </MemoryRouter>,
  );
}

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
