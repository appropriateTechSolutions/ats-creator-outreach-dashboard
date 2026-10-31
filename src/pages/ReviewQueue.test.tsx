import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../contexts/ToastContext';
import { getAllCreators, getCampaigns, previewOutreach, reviewLead } from '../lib/api';
import type { Campaign, Creator } from '../types';
import ReviewQueue from './ReviewQueue';

// Keep the real getErrorMessage; replace only what would hit the network.
vi.mock('../lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/api')>()),
  getAllCreators: vi.fn(),
  getCampaigns: vi.fn(),
  reviewLead: vi.fn(),
  previewOutreach: vi.fn(),
}));

const NO_MAILBOX =
  "Creator approved, but the email wasn't sent: no sending mailbox is configured for your account. Ask an admin to add your SMTP settings.";

// Shaped like a row of GET /creators.
const creator = (over: Partial<Creator>): Creator =>
  ({
    id: 'jonah',
    handle: 'jonahfitz.food',
    full_name: 'Jonah Fitzgerald',
    email: 'collabs@jonahfitzfood.example',
    review_status: 'shortlisted',
    lifecycle_status: 'new',
    has_instagram: true,
    profiles: [],
    followers: 24000,
    engagement_rate: 3.2,
    relevance_score: 80,
    campaign_id: 'fall',
    campaign_ids: ['fall'],
    ...over,
  }) as Creator;

const jonah = creator({});
const sofia = creator({
  id: 'sofia',
  handle: 'sofiasnacks',
  full_name: 'Sofia Marchetti',
  email: 'sofia.marchetti@inbox.example',
  campaign_id: 'fall',
  campaign_ids: ['fall', 'holiday'],
  relevance_score: 70,
});

const campaigns = [
  { id: 'fall', name: 'Fall Flavor Drop' },
  { id: 'holiday', name: 'Holiday Gifting Guide 2026' },
] as Campaign[];

const preview = (over: Record<string, unknown> = {}) => ({
  subject: 'Fall Flavor Drop x Creator',
  body: 'We would love to send you a case.',
  to: null,
  from_email: 'outreach@quitequila.example',
  ...over,
});

function renderQueue() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <ReviewQueue />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

// Open the preview modal for a creator's row.
async function openApprove(name: string) {
  const row = (await screen.findByRole('link', { name })).closest('tr') as HTMLElement;
  await userEvent.click(within(row).getByTitle('Approve & Send Outreach'));
}

// Exact name: each row's approve icon is also titled "Approve & Send Outreach".
const sendButton = () => screen.getByRole('button', { name: 'Send Outreach' });

describe('ReviewQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAllCreators).mockResolvedValue([jonah, sofia]);
    vi.mocked(getCampaigns).mockResolvedValue(campaigns);
    vi.mocked(previewOutreach).mockResolvedValue(preview({ to: 'collabs@jonahfitzfood.example' }));
    vi.mocked(reviewLead).mockResolvedValue({ success: true });
  });

  it('shows the campaign names under each creator', async () => {
    renderQueue();

    expect(await screen.findByText('Fall Flavor Drop')).toBeInTheDocument();
    // A creator in several campaigns lists them all.
    expect(screen.getByText('Fall Flavor Drop, Holiday Gifting Guide 2026')).toBeInTheDocument();
  });

  it('approves for the only campaign on the row and says who the email went to', async () => {
    renderQueue();
    await openApprove('Jonah Fitzgerald');

    await screen.findByText('From: outreach@quitequila.example');
    expect(previewOutreach).toHaveBeenCalledWith('jonah', 'fall', undefined);
    await userEvent.click(sendButton());

    await waitFor(() => expect(reviewLead).toHaveBeenCalledTimes(1));
    expect(reviewLead).toHaveBeenCalledWith(
      'jonah',
      'approve',
      'Fall Flavor Drop x Creator',
      'We would love to send you a case.',
      undefined,
      'collabs@jonahfitzfood.example',
      'fall',
    );
    expect(await screen.findByText('Email sent to collabs@jonahfitzfood.example')).toBeVisible();
  });

  it('does not pick a campaign for a creator that is in several', async () => {
    vi.mocked(previewOutreach).mockResolvedValue(preview({ to: 'sofia.marchetti@inbox.example' }));
    renderQueue();
    await openApprove('Sofia Marchetti');

    await screen.findByText(/^From:/);
    expect(previewOutreach).toHaveBeenCalledWith('sofia', undefined, undefined);
    await userEvent.click(sendButton());

    await waitFor(() => expect(reviewLead).toHaveBeenCalledTimes(1));
    expect(vi.mocked(reviewLead).mock.calls[0][6]).toBeUndefined();
  });

  it('reports a failed send, keeps the edited draft and refreshes the creators', async () => {
    // The backend approves first and then fails the send, so after the refetch the
    // creator is "approved" and no longer in the queue.
    vi.mocked(reviewLead).mockImplementation(async () => {
      vi.mocked(getAllCreators).mockResolvedValue([
        { ...jonah, review_status: 'approved' } as Creator,
        sofia,
      ]);
      throw {
        success: false,
        code: 'OUTREACH_SEND_FAILED',
        error:
          'Creator approved, but the email was not sent: No mail credentials configured. Details: User SMTP Host missing',
      };
    });
    renderQueue();
    await openApprove('Jonah Fitzgerald');
    await screen.findByText(/^From:/);
    const subject = screen.getByLabelText('Subject Line');
    await userEvent.clear(subject);
    await userEvent.type(subject, 'My own subject');
    const loadsBefore = vi.mocked(getAllCreators).mock.calls.length;

    await userEvent.click(sendButton());

    // The reason is on screen, in plain words, and nothing says it was sent.
    expect(await screen.findByText(NO_MAILBOX)).toBeVisible();
    expect(screen.queryByText(/^Email sent to/)).not.toBeInTheDocument();
    // Creators were reloaded, and the approved row left the queue...
    await waitFor(() =>
      expect(vi.mocked(getAllCreators).mock.calls.length).toBeGreaterThan(loadsBefore),
    );
    await waitFor(() =>
      expect(screen.queryByRole('link', { name: 'Jonah Fitzgerald' })).not.toBeInTheDocument(),
    );
    // ...but the open draft is untouched and can be retried.
    expect(screen.getByLabelText('Subject Line')).toHaveValue('My own subject');
    expect(previewOutreach).toHaveBeenCalledTimes(1);
    expect(sendButton()).toBeEnabled();
  });
});
