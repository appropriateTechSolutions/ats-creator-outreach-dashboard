import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ComponentProps } from 'react';
import { ConfirmProvider } from '../../contexts/ConfirmContext';
import { CreatorPartnershipsSection } from './CreatorPartnershipsSection';
import type { Creator, CreatorContent, Partnership, Shipment } from '../../types';

const maya = {
  id: 'creator-maya',
  handle: 'mayaeatsatx',
  full_name: 'Maya Ortiz',
  review_status: 'approved',
  lifecycle_status: 'engaged',
  latest_outreach: null,
} as unknown as Creator;

function partnership(overrides: Record<string, unknown> = {}): Partnership {
  return {
    id: 'p-fall',
    creator_id: 'creator-maya',
    campaign_id: 'campaign-fall',
    status: 'offer_sent',
    offer_type: 'hybrid',
    flat_fee: '1200.00',
    currency: 'USD',
    created_at: '2026-10-13T00:00:00Z',
    updated_at: '2026-10-13T00:00:00Z',
    Campaign: { id: 'campaign-fall', name: 'Fall Flavor Drop' },
    ...overrides,
  } as unknown as Partnership;
}

type Props = ComponentProps<typeof CreatorPartnershipsSection>;

function renderSection(overrides: Partial<Props> = {}) {
  const props: Props = {
    creator: maya,
    partnerships: [partnership()],
    shipments: [],
    contents: [],
    partnershipsLoading: false,
    handlePartnershipAction: vi.fn().mockResolvedValue(undefined),
    openOfferModal: vi.fn(),
    openShipmentModal: vi.fn(),
    openEditModal: vi.fn(),
    ...overrides,
  };
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ConfirmProvider>
        <CreatorPartnershipsSection {...props} />
      </ConfirmProvider>
    </MemoryRouter>,
  );
  return props;
}

describe('CreatorPartnershipsSection', () => {
  it('confirms "Mark accepted for creator" with the fee before accepting', async () => {
    const props = renderSection();
    expect(screen.queryByRole('button', { name: /accept offer/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Mark accepted for creator' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Mark accepted for creator?')).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        'Only do this if the creator agreed outside the offer link. This commits $1,200.00.',
      ),
    ).toBeInTheDocument();
    expect(props.handlePartnershipAction).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Mark accepted' }));
    await waitFor(() =>
      expect(props.handlePartnershipAction).toHaveBeenCalledWith('p-fall', 'accept'),
    );
  });

  it('does not accept when the confirmation is cancelled', async () => {
    const props = renderSection();
    fireEvent.click(screen.getByRole('button', { name: 'Mark accepted for creator' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(props.handlePartnershipAction).not.toHaveBeenCalled();
  });

  it('shows the waiting step for an open offer', () => {
    renderSection();
    expect(screen.getByText('Awaiting signature')).toBeInTheDocument();
  });

  it('offers no Activate once the product has shipped or arrived', () => {
    renderSection({
      partnerships: [
        partnership({ id: 'p-shipped', status: 'product_shipped' }),
        partnership({ id: 'p-delivered', status: 'product_delivered' }),
      ],
    });
    expect(screen.queryByRole('button', { name: /activate/i })).not.toBeInTheDocument();
    expect(screen.getByText('Awaiting delivery')).toBeInTheDocument();
    expect(screen.getByText('Awaiting content')).toBeInTheDocument();
  });

  it('runs each row’s engine step', async () => {
    const shipment = {
      id: 'ship-1',
      partnership_id: 'p-ship',
      status: 'pending',
    } as unknown as Shipment;
    const draft = {
      id: 'content-1',
      partnership_id: 'p-live',
      status: 'pending',
    } as unknown as CreatorContent;
    const props = renderSection({
      partnerships: [
        partnership({ id: 'p-accepted', status: 'accepted', shipment_included: false }),
        partnership({ id: 'p-needs-ship', status: 'accepted', shipment_included: true }),
        partnership({ id: 'p-qualified', status: 'qualified' }),
        partnership({ id: 'p-live', status: 'content_pending' }),
      ],
      shipments: [shipment],
      contents: [draft],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Activate partnership' }));
    await waitFor(() =>
      expect(props.handlePartnershipAction).toHaveBeenCalledWith('p-accepted', 'activate'),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Add shipment' }));
    expect(props.openShipmentModal).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'p-needs-ship' }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Draft offer' }));
    expect(props.openOfferModal).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'p-qualified' }),
    );

    expect(screen.getByRole('button', { name: 'Add draft URL' })).toBeInTheDocument();
  });

  it('leads with the partnership step for a creator still under review', () => {
    renderSection({
      creator: { ...maya, review_status: 'hold', lifecycle_status: 'engaged' } as Creator,
      partnerships: [partnership({ status: 'qualified' })],
    });
    expect(screen.getByRole('button', { name: 'Draft offer' })).toBeInTheDocument();
    expect(screen.queryByText('Review creator')).not.toBeInTheDocument();
  });

  it('shows the campaign name as written and the fee as money', () => {
    renderSection();
    expect(screen.getByText('Fall Flavor Drop')).not.toHaveClass('uppercase');
    expect(screen.getByText('$1,200.00')).toBeInTheDocument();
  });
});
