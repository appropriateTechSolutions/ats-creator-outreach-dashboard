import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OutreachPreviewModal } from './OutreachPreviewModal';
import { previewOutreach } from '../../lib/api';
import { toast } from '../../lib/toast';

vi.mock('../../lib/api', () => ({ previewOutreach: vi.fn() }));
vi.mock('../../lib/toast', () => ({
  toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn(), info: vi.fn(), show: vi.fn() },
}));
vi.mock('../../lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const NO_MAILBOX = "No sending mailbox is configured, so this email can't be sent.";

// Shaped like GET /outreach/preview.
const preview = (over: Record<string, unknown> = {}) => ({
  subject: 'Fall Flavor Drop x Maya',
  body: 'Hi Maya, we would love to send you a case.',
  to: 'collabs@mayaeatsatx.example',
  from_email: 'outreach@quitequila.example',
  ...over,
});

function renderModal(over: Partial<React.ComponentProps<typeof OutreachPreviewModal>> = {}) {
  const props = {
    creatorId: 'creator-maya',
    campaignId: 'campaign-fall',
    isOpen: true,
    onClose: vi.fn(),
    onSend: vi.fn().mockResolvedValue(undefined),
    ...over,
  };
  const view = render(<OutreachPreviewModal {...props} />);
  return { ...props, ...view };
}

const sendButton = () => screen.getByRole('button', { name: /send outreach/i });

describe('OutreachPreviewModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows from address and disables send when from_email is null', async () => {
    // A configured mailbox: the sender is named and sending is allowed.
    vi.mocked(previewOutreach).mockResolvedValueOnce(preview());
    const withMailbox = renderModal();

    expect(await screen.findByText('From: outreach@quitequila.example')).toBeInTheDocument();
    expect(screen.queryByText(NO_MAILBOX)).not.toBeInTheDocument();
    expect(sendButton()).toBeEnabled();
    withMailbox.unmount();

    // No mailbox: say so, and do not offer a send that cannot work.
    vi.mocked(previewOutreach).mockResolvedValueOnce(preview({ from_email: null }));
    renderModal();

    expect(await screen.findByText(NO_MAILBOX)).toBeInTheDocument();
    expect(screen.queryByText(/^From:/)).not.toBeInTheDocument();
    expect(sendButton()).toBeDisabled();
  });

  it('names the shared Apps Script relay instead of printing the sentinel', async () => {
    vi.mocked(previewOutreach).mockResolvedValueOnce(preview({ from_email: 'apps-script' }));
    renderModal();

    expect(
      await screen.findByText('From: Shared Google mailbox (Apps Script)'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/apps-script/)).not.toBeInTheDocument();
    expect(sendButton()).toBeEnabled();
  });

  it('does not claim a missing mailbox when the preview could not be loaded', async () => {
    vi.mocked(previewOutreach).mockRejectedValueOnce(new Error('boom'));
    renderModal();

    await waitFor(() => expect(sendButton()).toBeEnabled());
    expect(screen.queryByText(NO_MAILBOX)).not.toBeInTheDocument();
    expect(screen.queryByText(/^From:/)).not.toBeInTheDocument();
  });

  it('hands the edited email to onSend and closes once it is sent', async () => {
    vi.mocked(previewOutreach).mockResolvedValueOnce(preview());
    const { onSend, onClose } = renderModal({ messageType: 'initial' });
    await screen.findByText(/^From:/);

    await userEvent.click(sendButton());

    expect(onSend).toHaveBeenCalledWith(
      'Fall Flavor Drop x Maya',
      'Hi Maya, we would love to send you a case.',
      'initial',
      'collabs@mayaeatsatx.example',
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('stays open for a retry and leaves the failure toast to the caller', async () => {
    vi.mocked(previewOutreach).mockResolvedValueOnce(preview());
    const onSend = vi.fn().mockRejectedValue(new Error('send failed'));
    const { onClose } = renderModal({ onSend });
    await screen.findByText(/^From:/);

    await userEvent.click(sendButton());

    await waitFor(() => expect(onSend).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(sendButton()).toBeEnabled());
    expect(onClose).not.toHaveBeenCalled();
    // The caller knows what failed (approve vs send) and reports it once; a second,
    // generic toast from the modal would only bury the reason.
    expect(toast.error).not.toHaveBeenCalled();
  });
});
