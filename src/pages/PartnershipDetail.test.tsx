import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ToastProvider } from '../contexts/ToastContext';
import { ConfirmProvider } from '../contexts/ConfirmContext';
import PartnershipDetail from './PartnershipDetail';

const state = vi.hoisted(() => ({
  partnership: null as unknown,
  creator: null as unknown,
}));

const api = vi.hoisted(() => ({
  markQualified: vi.fn(),
  markAccepted: vi.fn(),
  activatePartnership: vi.fn(),
  completePartnership: vi.fn(),
  rejectPartnership: vi.fn(),
  updatePartnership: vi.fn(),
}));

vi.mock('../hooks/queries', () => ({
  usePartnership: () => ({ data: state.partnership, isLoading: false, refetch: vi.fn() }),
  useCreator: () => ({ data: state.creator }),
}));
vi.mock('../lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/api')>()),
  ...api,
}));
// The shared offer/shipment modals pull in their own data; they are not under test.
vi.mock('../components/workflow/OfferModal', () => ({ OfferModal: () => null }));
vi.mock('../components/workflow/ShipmentModal', () => ({ ShipmentModal: () => null }));

const CREATOR = {
  id: 'creator-1',
  handle: 'marcusbell',
  full_name: 'Marcus Bell',
  email: 'marcus@example.com',
  lifecycle_status: 'engaged',
};

function partnership(overrides: Record<string, unknown> = {}) {
  return {
    id: 'p-1',
    creator_id: 'creator-1',
    campaign_id: 'camp-1',
    status: 'offer_sent',
    offer_type: 'hybrid',
    flat_fee: '900.00',
    currency: 'USD',
    shipment_included: true,
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
    Creator: CREATOR,
    Campaign: { id: 'camp-1', name: 'Fall Flavor Drop' },
    content: [],
    shipments: [],
    conversation: null,
    ...overrides,
  };
}

function renderPage() {
  return render(
    <MemoryRouter
      initialEntries={['/partnerships/p-1']}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ToastProvider>
        <ConfirmProvider>
          <Routes>
            <Route path="/partnerships/:id" element={<PartnershipDetail />} />
          </Routes>
        </ConfirmProvider>
      </ToastProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  Object.values(api).forEach((fn) => fn.mockReset());
  state.partnership = partnership();
  state.creator = { ...CREATOR, review_status: 'approved' };
});

describe('PartnershipDetail', () => {
  it('links the creator and the campaign from the header', () => {
    renderPage();
    expect(screen.getByRole('link', { name: 'Marcus Bell' })).toHaveAttribute(
      'href',
      '/creators/creator-1',
    );
    expect(screen.getByRole('link', { name: 'Fall Flavor Drop' })).toHaveAttribute(
      'href',
      '/campaigns/camp-1',
    );
  });

  it('confirms "Mark accepted for creator" with the fee before accepting', async () => {
    api.markAccepted.mockResolvedValue({});
    renderPage();
    expect(screen.queryByRole('button', { name: /accept offer/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Mark accepted for creator' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Mark accepted for creator?')).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        'Only do this if the creator agreed outside the offer link. This commits $900.00.',
      ),
    ).toBeInTheDocument();
    expect(api.markAccepted).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Mark accepted' }));
    await waitFor(() => expect(api.markAccepted).toHaveBeenCalledWith('p-1'));
  });

  it('does not accept when the confirmation is cancelled', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Mark accepted for creator' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(api.markAccepted).not.toHaveBeenCalled();
  });

  it('says product-only when the offer has no fee', async () => {
    state.partnership = partnership({ flat_fee: null, offer_type: 'free_product' });
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Mark accepted for creator' }));
    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByText(
        'Only do this if the creator agreed outside the offer link. This commits the product-only offer.',
      ),
    ).toBeInTheDocument();
  });

  it('shows the waiting step for an open offer', () => {
    renderPage();
    expect(screen.getByText('Awaiting signature')).toBeInTheDocument();
  });

  it("leads with the partnership's step, not the creator review", () => {
    state.partnership = partnership({ status: 'accepted' });
    state.creator = { ...CREATOR, review_status: 'hold' };
    renderPage();
    expect(screen.getByRole('button', { name: 'Add shipment' })).toBeInTheDocument();
    expect(screen.queryByText('Review creator')).not.toBeInTheDocument();
  });

  it('lists deliverables, shipments and the latest message with their links', () => {
    state.partnership = partnership({
      status: 'live',
      content: [
        {
          id: 'content-1',
          platform: 'instagram',
          content_type: 'instagram_reel',
          due_date: '2026-11-12',
          status: 'pending',
        },
      ],
      shipments: [
        {
          id: 'ship-1',
          status: 'product_shipped',
          carrier: 'UPS',
          tracking_number: '1Z999',
          tracking_url: 'https://track.example/1Z999',
          created_at: '2026-10-02T00:00:00Z',
        },
      ],
      conversation: {
        id: 'conv-1',
        latest_inbound_message: 'Loved the samples, posting Friday!',
        latest_inbound_at: '2026-10-30T15:00:00Z',
      },
    });
    renderPage();

    const deliverables = screen.getByRole('region', { name: 'Deliverables' });
    expect(within(deliverables).getByText('Instagram reel')).toBeInTheDocument();
    expect(within(deliverables).getByText('Nov 12, 2026')).toBeInTheDocument();
    expect(within(deliverables).getByRole('link', { name: /open/i })).toHaveAttribute(
      'href',
      '/content/content-1',
    );

    const shipments = screen.getByRole('region', { name: 'Shipments' });
    expect(within(shipments).getByText('Product shipped')).toBeInTheDocument();
    expect(within(shipments).getByRole('link', { name: /UPS 1Z999/ })).toHaveAttribute(
      'href',
      'https://track.example/1Z999',
    );
    expect(within(shipments).getByRole('link', { name: /open/i })).toHaveAttribute(
      'href',
      '/shipments/ship-1',
    );

    const message = screen.getByRole('region', { name: 'Latest message' });
    expect(within(message).getByText(/Loved the samples/)).toBeInTheDocument();
    expect(within(message).getByRole('link', { name: 'Open conversation' })).toHaveAttribute(
      'href',
      '/conversations?thread=conv-1',
    );
  });

  it("shows the backend's message when an edit fails", async () => {
    api.updatePartnership.mockRejectedValue({
      success: false,
      error: 'end_date must be after start_date',
    });
    renderPage();
    fireEvent.click(screen.getByTitle('Edit parameters'));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save Parameters' }));
    expect(await screen.findByText(/end_date must be after start_date/)).toBeInTheDocument();
    expect(screen.queryByText(/object Object/)).not.toBeInTheDocument();
  });
});
