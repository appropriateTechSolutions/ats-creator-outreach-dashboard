import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ToastProvider } from '../contexts/ToastContext';
import { ConfirmProvider } from '../contexts/ConfirmContext';
import {
  deleteCampaign,
  getCampaignActivities,
  getCampaignContentPerformance,
  getCampaignFunnel,
  previewOutreach,
  reviewLead,
} from '../lib/api';
import type { Campaign, Creator } from '../types';
import CampaignDetail from './CampaignDetail';

// The signed-in role; tests that care about role gating change it.
const auth = vi.hoisted(() => ({ role: 'super_admin' }));
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', role: auth.role } }),
}));
vi.mock('../contexts/DiscoveryContext', () => ({
  useDiscovery: () => ({
    startDiscovery: vi.fn(),
    isDiscovering: () => false,
    subscribe: () => () => {},
  }),
}));

const campaign = {
  id: 'fall',
  name: 'Fall Flavor Drop',
  status: 'active',
  category: 'Food & Beverage',
  keywords: [],
  city: 'Austin',
  state: 'TX',
  country: 'US',
} as unknown as Campaign;

// Sofia is also in the Holiday campaign; this page is Fall.
const sofia = {
  id: 'sofia',
  handle: 'sofiasnacks',
  full_name: 'Sofia Marchetti',
  email: 'sofia.marchetti@inbox.example',
  review_status: 'shortlisted',
  lifecycle_status: 'new',
  has_instagram: true,
  profiles: [],
  followers: 104000,
  engagement_rate: 1.5,
  campaign_id: 'holiday',
  campaign_ids: ['holiday', 'fall'],
} as unknown as Creator;

vi.mock('../hooks/queries', () => ({
  useCampaign: () => ({ data: campaign, isLoading: false }),
  useCampaignLeads: () => ({ data: [sofia], isLoading: false }),
  useBrands: () => ({ data: [] }),
}));

// Keep the real getErrorMessage; replace only what would hit the network.
vi.mock('../lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/api')>()),
  reviewLead: vi.fn(),
  previewOutreach: vi.fn(),
  deleteCampaign: vi.fn(),
  getCampaignFunnel: vi.fn(),
  getCampaignContentPerformance: vi.fn(),
  getCampaignActivities: vi.fn(),
}));

const NO_MAILBOX =
  "Creator approved, but the email wasn't sent: no sending mailbox is configured for your account. Ask an admin to add your SMTP settings.";

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
  render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ConfirmProvider>
          <MemoryRouter
            initialEntries={['/campaigns/fall']}
            future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
          >
            <Routes>
              <Route path="/campaigns/:id" element={<CampaignDetail />} />
              <Route path="/campaigns" element={<h1>All campaigns</h1>} />
            </Routes>
          </MemoryRouter>
        </ConfirmProvider>
      </ToastProvider>
    </QueryClientProvider>,
  );
  return { invalidate };
}

// Exact name: each row's approve icon is also titled "Approve & Send Outreach".
const sendButton = () => screen.getByRole('button', { name: 'Send Outreach' });

async function openApprove() {
  const row = (await screen.findByRole('button', { name: 'Sofia Marchetti' })).closest(
    'tr',
  ) as HTMLElement;
  await userEvent.click(within(row).getByTitle('Approve & Send Outreach'));
  await screen.findByText('From: outreach@quitequila.example');
}

describe('CampaignDetail approve', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.role = 'super_admin';
    vi.mocked(getCampaignFunnel).mockResolvedValue({});
    vi.mocked(getCampaignContentPerformance).mockResolvedValue({} as never);
    vi.mocked(getCampaignActivities).mockResolvedValue([]);
    vi.mocked(previewOutreach).mockResolvedValue({
      subject: 'Fall Flavor Drop x Sofia',
      body: 'We would love to send you a case.',
      to: 'sofia.marchetti@inbox.example',
      from_email: 'outreach@quitequila.example',
    });
    vi.mocked(reviewLead).mockResolvedValue({ success: true });
  });

  it('pins the leads table Actions column and shows names as typed, not forced uppercase', async () => {
    renderPage();
    const name = await screen.findByRole('button', { name: 'Sofia Marchetti' });

    expect(name).not.toHaveClass('uppercase');
    expect(screen.getByRole('columnheader', { name: 'Actions' })).toHaveClass('col-sticky-end');
    expect((name.closest('tr') as HTMLElement).lastElementChild).toHaveClass('col-sticky-end');
  });

  it('sends this campaign for a creator who is also in another one', async () => {
    renderPage();
    await openApprove();

    // The preview and the approval are both for the campaign being viewed.
    expect(previewOutreach).toHaveBeenCalledWith('sofia', 'fall', 'initial');
    await userEvent.click(sendButton());

    await waitFor(() => expect(reviewLead).toHaveBeenCalledTimes(1));
    expect(reviewLead).toHaveBeenCalledWith(
      'sofia',
      'approve',
      'Fall Flavor Drop x Sofia',
      'We would love to send you a case.',
      'initial',
      'sofia.marchetti@inbox.example',
      'fall',
    );
    expect(await screen.findByText('Email sent to sofia.marchetti@inbox.example')).toBeVisible();
  });

  it('reports a failed send with the reason, reloads the leads and keeps the dialog for a retry', async () => {
    vi.mocked(reviewLead).mockRejectedValue({
      success: false,
      code: 'OUTREACH_SEND_FAILED',
      error:
        'Creator approved, but the email was not sent: No mail credentials configured. Details: User SMTP Host missing',
    });
    const { invalidate } = renderPage();
    await openApprove();

    await userEvent.click(sendButton());

    expect(await screen.findByText(NO_MAILBOX)).toBeVisible();
    expect(screen.queryByText(/^Email sent to/)).not.toBeInTheDocument();
    // The creator was approved even though the email failed: leads and creators reload.
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['campaigns', 'fall', 'leads'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['creators'] });
    // Retry stays possible, and the failure is reported once.
    expect(sendButton()).toBeEnabled();
    expect(screen.getAllByText(NO_MAILBOX)).toHaveLength(1);
  });
});

describe('CampaignDetail header actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.role = 'super_admin';
    vi.mocked(getCampaignFunnel).mockResolvedValue({});
    vi.mocked(getCampaignContentPerformance).mockResolvedValue({} as never);
    vi.mocked(getCampaignActivities).mockResolvedValue([]);
    vi.mocked(deleteCampaign).mockResolvedValue(undefined as never);
  });

  const openMoreMenu = async () =>
    userEvent.click(await screen.findByRole('button', { name: 'More campaign actions' }));

  it('has no floating Edit or Delete buttons over the page', async () => {
    renderPage();
    await screen.findByRole('heading', { name: 'Fall Flavor Drop' });

    expect(document.querySelector('button.fixed')).toBeNull();
    // Delete is not on the page until the More menu opens.
    expect(screen.queryByRole('button', { name: 'Delete campaign' })).toBeNull();
    expect(screen.queryByRole('menuitem', { name: 'Delete campaign' })).toBeNull();
  });

  it('shows the campaign name as typed, not forced uppercase', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Fall Flavor Drop' })).not.toHaveClass(
      'uppercase',
    );
  });

  it('Edit sits with the header actions and opens the edit form', async () => {
    renderPage();
    const edit = await screen.findByRole('button', { name: 'Edit campaign' });
    expect(edit.closest('.fixed')).toBeNull();
    // Same group as the other header actions.
    expect(edit.parentElement).toContainElement(
      screen.getByRole('button', { name: /run ai discovery/i }),
    );

    await userEvent.click(edit);
    expect(await screen.findByRole('dialog', { name: 'Edit Campaign Parameters' })).toBeVisible();
  });

  it('Delete lives in the More menu and asks first: cancelling deletes nothing', async () => {
    renderPage();
    await openMoreMenu();
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Delete campaign' }));

    const dialog = await screen.findByRole('dialog', { name: 'Delete campaign?' });
    expect(within(dialog).getByText('Fall Flavor Drop')).toBeVisible();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(deleteCampaign).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Fall Flavor Drop' })).toBeVisible();
  });

  it('deletes the campaign once confirmed, then returns to the campaign list', async () => {
    renderPage();
    await openMoreMenu();
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Delete campaign' }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete campaign?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete campaign' }));

    await waitFor(() => expect(deleteCampaign).toHaveBeenCalledWith('fall'));
    expect(await screen.findByRole('heading', { name: 'All campaigns' })).toBeVisible();
  });

  it('reports a failed delete with the backend message and stays on the campaign', async () => {
    vi.mocked(deleteCampaign).mockRejectedValue({
      success: false,
      error: 'Campaign has partnerships',
    });
    renderPage();
    await openMoreMenu();
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Delete campaign' }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete campaign?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete campaign' }));

    expect(await screen.findByText('Campaign has partnerships')).toBeVisible();
    expect(screen.queryByText('[object Object]')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Fall Flavor Drop' })).toBeVisible();
  });

  it.each([
    ['super_admin', { edit: true, more: true }],
    ['client_admin', { edit: true, more: true }],
    ['operator', { edit: true, more: false }],
    ['client_marketing', { edit: true, more: false }],
    ['client_viewer', { edit: false, more: false }],
  ])('keeps role gating for %s', async (role, expected) => {
    auth.role = role;
    renderPage();
    await screen.findByRole('heading', { name: 'Fall Flavor Drop' });

    expect(screen.queryByRole('button', { name: 'Edit campaign' }) !== null).toBe(expected.edit);
    expect(screen.queryByRole('button', { name: 'More campaign actions' }) !== null).toBe(
      expected.more,
    );
  });
});
