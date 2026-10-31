import { describe, expect, it } from 'vitest';
import {
  campaignNamesFor,
  emailSentMessage,
  outreachCampaignId,
  sendFailureMessage,
} from './outreach';

// The response interceptor rejects with the backend envelope itself.
const envelope = (error: string, code?: string) => ({ success: false, code, error });

const NO_MAILBOX =
  "Creator approved, but the email wasn't sent: no sending mailbox is configured for your account. Ask an admin to add your SMTP settings.";

describe('sendFailureMessage', () => {
  it('shows the backend reason as-is', () => {
    const reason = 'Creator approved, but the email was not sent: Creator has no email address';
    expect(sendFailureMessage(envelope(reason, 'OUTREACH_SEND_FAILED'))).toBe(reason);
  });

  it('keeps the backend message when the creator is not linked to a campaign', () => {
    const message = 'This creator is not linked to a campaign, so no outreach email was sent.';
    expect(sendFailureMessage(envelope(message, 'NO_CAMPAIGN'))).toBe(message);
  });

  it.each([
    'No mail credentials configured. Details: User SMTP Host missing, .env EMAIL_USER missing',
    '.env EMAIL_PASS missing',
    'EMAIL_USER is not set',
    'SMTP connection refused',
    'smtp timeout',
  ])('explains a missing mailbox in plain words: %s', (reason) => {
    const error = `Creator approved, but the email was not sent: ${reason}`;
    expect(sendFailureMessage(envelope(error, 'OUTREACH_SEND_FAILED'))).toBe(NO_MAILBOX);
  });

  it('does not say the creator was approved for errors that are not send failures', () => {
    // No OUTREACH_SEND_FAILED code: the approval may never have happened.
    expect(sendFailureMessage(envelope('SMTP settings could not be read'))).toBe(
      'SMTP settings could not be read',
    );
    expect(sendFailureMessage(envelope('Creator not found', 'NOT_FOUND'))).toBe(
      'Creator not found',
    );
  });

  it('handles plain errors, strings and unknowns without leaking [object Object]', () => {
    expect(sendFailureMessage(new Error('Network Error'))).toBe('Network Error');
    expect(sendFailureMessage('Boom')).toBe('Boom');
    expect(sendFailureMessage(undefined)).toBe('The email was not sent. Please try again.');
    expect(sendFailureMessage({ success: false })).toBe(
      'The email was not sent. Please try again.',
    );
  });
});

describe('emailSentMessage', () => {
  it('names the recipient', () => {
    expect(emailSentMessage('collabs@mayaeatsatx.example')).toBe(
      'Email sent to collabs@mayaeatsatx.example',
    );
  });

  it('does not invent a recipient', () => {
    expect(emailSentMessage(null)).toBe('Email sent');
    expect(emailSentMessage(undefined)).toBe('Email sent');
    expect(emailSentMessage('  ')).toBe('Email sent');
  });
});

describe('outreachCampaignId', () => {
  it('uses the only campaign a creator is in', () => {
    expect(outreachCampaignId({ campaign_id: 'fall', campaign_ids: ['fall'] })).toBe('fall');
  });

  it('copes with rows that only carry campaign_id', () => {
    expect(outreachCampaignId({ campaign_id: 'fall' })).toBe('fall');
    expect(outreachCampaignId({ campaign_id: 'fall', campaign_ids: [] })).toBe('fall');
  });

  it('does not guess between several campaigns', () => {
    expect(
      outreachCampaignId({ campaign_id: 'fall', campaign_ids: ['fall', 'holiday'] }),
    ).toBeUndefined();
  });

  it('prefers the campaign the page is already scoped to', () => {
    expect(
      outreachCampaignId({ campaign_id: 'fall', campaign_ids: ['fall', 'holiday'] }, 'holiday'),
    ).toBe('holiday');
  });

  it('returns nothing for a creator with no campaign or no creator', () => {
    expect(outreachCampaignId({ campaign_id: null, campaign_ids: [] })).toBeUndefined();
    expect(outreachCampaignId(undefined)).toBeUndefined();
    expect(outreachCampaignId(undefined, 'fall')).toBe('fall');
  });
});

describe('campaignNamesFor', () => {
  const campaigns = [
    { id: 'fall', name: 'Fall Flavor Drop' },
    { id: 'holiday', name: 'Holiday Gifting Guide 2026' },
  ];

  it('lists the names of every campaign the creator is in', () => {
    expect(
      campaignNamesFor({ campaign_id: 'fall', campaign_ids: ['fall', 'holiday'] }, campaigns),
    ).toEqual(['Fall Flavor Drop', 'Holiday Gifting Guide 2026']);
  });

  it('skips campaigns it cannot name rather than printing an id', () => {
    expect(
      campaignNamesFor({ campaign_id: 'fall', campaign_ids: ['gone', 'fall'] }, campaigns),
    ).toEqual(['Fall Flavor Drop']);
  });

  it('falls back to campaign_id and tolerates no campaigns at all', () => {
    expect(campaignNamesFor({ campaign_id: 'holiday' }, campaigns)).toEqual([
      'Holiday Gifting Guide 2026',
    ]);
    expect(campaignNamesFor({ campaign_id: null, campaign_ids: [] }, campaigns)).toEqual([]);
    expect(campaignNamesFor({ campaign_id: 'fall', campaign_ids: ['fall'] }, [])).toEqual([]);
  });
});
