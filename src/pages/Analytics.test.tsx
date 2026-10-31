import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Analytics from './Analytics';

vi.mock('../hooks/queries', () => ({
  useContents: () => ({ data: [], isLoading: false }),
}));

describe('Analytics', () => {
  // The route stays /analytics, but the page is a deliverables list, so it says so.
  it('is titled "Deliverables by creator"', () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Analytics />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole('heading', { level: 1, name: 'Deliverables by creator' }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/analytics performance/i)).not.toBeInTheDocument();
  });
});
