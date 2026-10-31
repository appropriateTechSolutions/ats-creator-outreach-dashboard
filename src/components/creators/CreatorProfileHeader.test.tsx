import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { ComponentProps } from 'react';
import { CreatorProfileHeader } from './CreatorProfileHeader';
import type { NextAction } from '../../lib/nextAction';
import type { CreatorContent, Partnership, Shipment } from '../../types';

const operator = { id: 'u1', role: 'operator', user_type: 'internal' };

const maya = {
  id: 'creator-maya',
  handle: 'mayaeatsatx',
  full_name: 'Maya Ortiz',
  email: 'collabs@mayaeatsatx.example',
  review_status: 'approved',
  lifecycle_status: 'engaged',
  has_instagram: true,
  profiles: [],
  latest_outreach: null,
};

const fall = {
  id: 'fall',
  creator_id: 'creator-maya',
  campaign_id: 'campaign-fall',
  status: 'accepted',
  shipment_included: true,
  created_at: '2026-10-13T00:00:00Z',
  updated_at: '2026-10-13T00:00:00Z',
  Campaign: { id: 'campaign-fall', name: 'Fall Flavor Drop' },
} as unknown as Partnership;

const pendingShipment = {
  id: 'shipment-fall',
  status: 'pending',
  partnership_id: 'fall',
} as unknown as Shipment;

const deliverables = [
  { id: 'c1', status: 'pending', due_date: '2026-11-18' },
  { id: 'c2', status: 'pending', due_date: '2026-11-12' },
] as unknown as CreatorContent[];

type Props = ComponentProps<typeof CreatorProfileHeader>;

function renderHeader(overrides: Partial<Props> = {}) {
  const props: Props = {
    creator: maya,
    currentUser: operator,
    fromPath: null,
    fromLabel: null,
    fromCampaignId: null,
    fromMyCreators: false,
    setLightboxOpen: vi.fn(),
    handleReview: vi.fn().mockResolvedValue(undefined),
    handleFindSimilar: vi.fn(),
    findingSimilar: false,
    handleSendDM: vi.fn(),
    handleSendOutreach: vi.fn(),
    sendingEmail: false,
    handleSyncCreator: vi.fn(),
    syncingProfile: false,
    nextAction: { key: 'none', label: 'No next step', kind: 'done' },
    onNextAction: vi.fn(),
    partnership: null,
    partnershipShipment: null,
    partnershipContents: [],
    ...overrides,
  };
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <CreatorProfileHeader {...props} />
    </MemoryRouter>,
  );
  return props;
}

const updateShipment: NextAction = {
  key: 'view_shipments',
  label: 'Update shipment',
  kind: 'action',
  payload: pendingShipment,
};

describe('CreatorProfileHeader', () => {
  it("leads with the partnership's next step and drops first-contact buttons", async () => {
    const props = renderHeader({
      nextAction: updateShipment,
      partnership: fall,
      partnershipShipment: pendingShipment,
      partnershipContents: deliverables,
    });

    await userEvent.click(screen.getByRole('button', { name: 'Update shipment' }));
    expect(props.onNextAction).toHaveBeenCalledWith('view_shipments', pendingShipment);

    expect(screen.queryByRole('button', { name: /send dm/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /outreach|follow-up/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Find similar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sync profile' })).toBeInTheDocument();
  });

  it('shows the current partnership card', () => {
    renderHeader({
      nextAction: updateShipment,
      partnership: fall,
      partnershipShipment: pendingShipment,
      partnershipContents: deliverables,
    });

    const card = screen.getByRole('region', { name: 'Current partnership' });
    expect(within(card).getByRole('link', { name: 'Fall Flavor Drop' })).toHaveAttribute(
      'href',
      '/campaigns/campaign-fall',
    );
    expect(within(card).getByRole('link', { name: /open partnership/i })).toHaveAttribute(
      'href',
      '/partnerships/fall',
    );
    expect(within(card).getByText('Update shipment')).toBeInTheDocument();
    expect(within(card).getByText('Pending')).toBeInTheDocument();
    expect(within(card).getByText('2 of 2 due · next Nov 12, 2026')).toBeInTheDocument();
  });

  it("shows the partnership's own next step in the card for a creator still under review", () => {
    renderHeader({
      creator: { ...maya, review_status: 'hold', lifecycle_status: 'new' },
      nextAction: { key: 'review', label: 'Review creator', kind: 'action' },
      partnership: { ...fall, status: 'offer_sent' } as Partnership,
    });

    const card = screen.getByRole('region', { name: 'Current partnership' });
    expect(within(card).getByText('Awaiting signature')).toBeInTheDocument();
    expect(within(card).queryByText('Review creator')).not.toBeInTheDocument();
  });

  it("shows the creator's name as written", () => {
    renderHeader();
    expect(screen.getByRole('heading', { level: 1, name: 'Maya Ortiz' })).not.toHaveClass(
      'uppercase',
    );
  });

  it('offers the follow-up and a DM while a contacted creator has no partnership', async () => {
    const props = renderHeader({
      creator: { ...maya, lifecycle_status: 'contacted' },
      nextAction: {
        key: 'follow_up',
        label: 'Send follow-up #2',
        kind: 'action',
        payload: { messageType: 'followup_2' },
      },
    });

    await userEvent.click(screen.getByRole('button', { name: 'Send follow-up #2' }));
    expect(props.onNextAction).toHaveBeenCalledWith('follow_up', { messageType: 'followup_2' });
    expect(screen.getByRole('button', { name: /send dm/i })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /partnership/i })).not.toBeInTheDocument();
  });

  it('turns a review step into approve, shortlist and reject', async () => {
    const props = renderHeader({
      creator: { ...maya, review_status: 'hold', lifecycle_status: 'new' },
      nextAction: { key: 'review', label: 'Review creator', kind: 'action' },
    });

    expect(screen.getByText('Review creator')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /approve & send outreach/i }));
    expect(props.handleReview).toHaveBeenCalledWith('approve');
    await userEvent.click(screen.getByRole('button', { name: 'Reject' }));
    expect(props.handleReview).toHaveBeenCalledWith('reject');
    await userEvent.click(screen.getByRole('button', { name: 'Shortlist' }));
    expect(props.handleReview).toHaveBeenCalledWith('shortlist');
  });

  it('hides the next step for a review step on a not-responsive creator', () => {
    renderHeader({
      creator: { ...maya, review_status: 'hold', lifecycle_status: 'not_respond' },
      nextAction: { key: 'review', label: 'Review creator', kind: 'action' },
    });

    expect(screen.queryByText('Next step')).not.toBeInTheDocument();
    expect(screen.queryByText('Review creator')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument();
  });

  it('shows no next-step block when there is nothing to do', () => {
    renderHeader({
      creator: { ...maya, lifecycle_status: 'not_respond' },
      nextAction: { key: 'none', label: 'No next step', kind: 'done' },
    });

    expect(screen.queryByText('Next step')).not.toBeInTheDocument();
    expect(screen.queryByText('No next step')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Find similar' })).toBeInTheDocument();
  });

  it('shows a waiting step as status text, not a button', () => {
    renderHeader({
      nextAction: { key: 'awaiting_signature', label: 'Awaiting signature', kind: 'waiting' },
      partnership: { ...fall, status: 'offer_sent' } as Partnership,
    });

    expect(screen.queryByRole('button', { name: /awaiting signature/i })).not.toBeInTheDocument();
    expect(screen.getAllByText('Awaiting signature').length).toBeGreaterThan(0);
  });
});
