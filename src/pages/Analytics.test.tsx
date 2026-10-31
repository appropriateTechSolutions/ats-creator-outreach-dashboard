import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Analytics from './Analytics';

// The deliverables the page's data hook returns; each test sets what it needs.
const data = vi.hoisted(() => ({ contents: [] as unknown[] }));

vi.mock('../hooks/queries', () => ({
  useContents: () => ({ data: data.contents, isLoading: false }),
}));

const renderPage = () =>
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Analytics />
    </MemoryRouter>,
  );

describe('Analytics', () => {
  beforeEach(() => {
    data.contents = [];
  });

  // The route stays /analytics, but the page is a deliverables list, so it says so.
  it('is titled "Deliverables by creator"', () => {
    renderPage();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Deliverables by creator' }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/analytics performance/i)).not.toBeInTheDocument();
  });

  // Laptop widths: Actions stays pinned, user data is not forced to uppercase and
  // the due date reads as one line ("Nov 12, 2026"), not "Nov 12," over "2026".
  it('pins Actions, keeps the due date on one line and shows names as typed', () => {
    data.contents = [
      {
        id: 'd-1',
        creator_id: 'c-1',
        campaign_id: 'k-1',
        status: 'pending',
        content_type: 'instagram_reel',
        due_date: '2026-11-12T12:00:00Z',
        Creator: { id: 'c-1', full_name: 'Marisol Vega', handle: 'marisolwellness' },
        Campaign: { id: 'k-1', name: 'Zero Sugar Launch Seeding' },
      },
    ];
    renderPage();

    for (const text of ['Marisol Vega', '@marisolwellness', 'Zero Sugar Launch Seeding']) {
      expect(screen.getByText(text)).not.toHaveClass('uppercase');
    }
    expect(screen.getByText('Nov 12, 2026')).toHaveClass('whitespace-nowrap');
    expect(screen.getByRole('columnheader', { name: 'Actions' })).toHaveClass('col-sticky-end');
    expect(screen.getByRole('button', { name: 'View Details' }).closest('td')).toHaveClass(
      'col-sticky-end',
    );
  });
});
