import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Content from './Content';

// The deliverables the page's data hook returns; each test sets what it needs.
const data = vi.hoisted(() => ({ contents: [] as unknown[] }));

vi.mock('../hooks/queries', () => ({
  useContents: () => ({ data: data.contents, isLoading: false }),
  useCampaigns: () => ({ data: [] }),
}));
vi.mock('../hooks/useInvalidate', () => ({ useInvalidate: () => vi.fn() }));

const renderPage = () =>
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Content />
    </MemoryRouter>,
  );

describe('Content', () => {
  beforeEach(() => {
    data.contents = [];
  });

  // /analytics is no longer in the sidebar, so this link is how people reach it.
  it('links to the by-creator deliverables view', () => {
    renderPage();
    expect(screen.getByRole('link', { name: 'View by creator' })).toHaveAttribute(
      'href',
      '/analytics',
    );
  });

  // Laptop widths: Actions stays pinned, user data is not forced to uppercase and
  // dates do not break across lines.
  it('pins Actions, keeps dates on one line and shows names as typed', () => {
    data.contents = [
      {
        id: 'd-1',
        creator_id: 'c-1',
        campaign_id: 'k-1',
        status: 'pending',
        platform: 'instagram',
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
    expect(screen.getByText('Marisol Vega').closest('tr')?.lastElementChild).toHaveClass(
      'col-sticky-end',
    );
  });
});
