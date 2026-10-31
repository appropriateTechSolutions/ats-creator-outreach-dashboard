import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Content from './Content';

// The page only needs its data hooks to settle on an empty, loaded state.
vi.mock('../hooks/queries', () => ({
  useContents: () => ({ data: [], isLoading: false }),
  useCampaigns: () => ({ data: [] }),
}));
vi.mock('../hooks/useInvalidate', () => ({ useInvalidate: () => vi.fn() }));

describe('Content', () => {
  // /analytics is no longer in the sidebar, so this link is how people reach it.
  it('links to the by-creator deliverables view', () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Content />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'View by creator' })).toHaveAttribute(
      'href',
      '/analytics',
    );
  });
});
