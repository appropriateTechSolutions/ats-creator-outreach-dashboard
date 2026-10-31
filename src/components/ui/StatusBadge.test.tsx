import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StatusBadge } from './StatusBadge';
import { PARTNERSHIP_STATUSES } from '../../lib/partnershipFilters';

// Statuses the badge is fed from other tables (creator review, shipments, content).
const OTHER_STATUSES = [
  'hold',
  'pending_review',
  'shortlisted',
  'not_respond',
  'address_requested',
  'ready_to_ship',
  'revision_requested',
  'pending',
  'submitted',
  'approved',
  'published',
];

function renderBadge(status: string) {
  const { container, unmount } = render(<StatusBadge status={status} />);
  const badge = container.firstElementChild as HTMLElement;
  const result = { label: badge.textContent ?? '', className: badge.className };
  unmount();
  return result;
}

describe('StatusBadge', () => {
  it('accepted and engaged badges differ', () => {
    const accepted = renderBadge('accepted');
    const engaged = renderBadge('engaged');
    expect(accepted.label).toBe('Offer accepted');
    expect(engaged.label).toBe('Engaged');
    expect(accepted.className).not.toBe(engaged.className);
  });

  it('no badge label contains an underscore', () => {
    for (const status of [...PARTNERSHIP_STATUSES, ...OTHER_STATUSES]) {
      const { label } = renderBadge(status);
      expect(label, status).not.toContain('_');
      // Sentence case: a capital first letter, nothing capitalised after it.
      expect(label.charAt(0), status).toBe(label.charAt(0).toUpperCase());
      expect(label.slice(1), status).toBe(label.slice(1).toLowerCase());
    }
  });

  it('gives every partnership status its own label', () => {
    const labels = PARTNERSHIP_STATUSES.map((s) => renderBadge(s).label);
    expect(new Set(labels).size).toBe(PARTNERSHIP_STATUSES.length);
  });

  it('uses the pipeline wording for offer and content stages', () => {
    render(
      <>
        <StatusBadge status="offer_sent" />
        <StatusBadge status="negotiating" />
        <StatusBadge status="live" />
        <StatusBadge status="content_pending" />
      </>,
    );
    for (const label of ['Offer sent', 'Negotiating', 'Live', 'Content pending']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });
});
