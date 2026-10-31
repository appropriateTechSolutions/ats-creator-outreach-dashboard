import { describe, expect, it } from 'vitest';
import { getOfferState } from './offerState';

// PARTNERSHIP_STATUSES from the backend's domain/partnershipStatus.ts, which is the
// vocabulary the public API can actually return.
const BACKEND_STATUSES = [
  'engaged',
  'replied',
  'in_discussion',
  'meeting_scheduled',
  'qualified',
  'offer_sent',
  'negotiating',
  'accepted',
  'activated',
  'product_shipped',
  'product_delivered',
  'content_pending',
  'content_submitted',
  'content_approved',
  'live',
  'completed',
  'rejected',
  'inactive',
] as const;

describe('getOfferState', () => {
  it('treats accepted and every later status as accepted', () => {
    const accepted = [
      'accepted',
      'activated',
      'product_shipped',
      'product_delivered',
      'content_pending',
      'content_submitted',
      'content_approved',
      'live',
      'completed',
    ];
    for (const status of accepted) expect(getOfferState(status), status).toBe('accepted');
  });

  it('treats rejected as declined', () => {
    expect(getOfferState('rejected')).toBe('declined');
  });

  it('keeps negotiating as feedback sent, not declined', () => {
    expect(getOfferState('negotiating')).toBe('feedback_sent');
  });

  it('leaves every status before the offer is answered open', () => {
    for (const status of [
      'engaged',
      'replied',
      'in_discussion',
      'meeting_scheduled',
      'qualified',
      'offer_sent',
    ]) {
      expect(getOfferState(status), status).toBe('open');
    }
  });

  it('treats inactive as unavailable, not open', () => {
    expect(getOfferState('inactive')).toBe('unavailable');
  });

  it('puts every status the backend can send in exactly the expected group', () => {
    const groups = { open: 0, accepted: 0, feedback_sent: 0, declined: 0, unavailable: 0 };
    for (const status of BACKEND_STATUSES) groups[getOfferState(status)] += 1;
    // 6 early, 9 accepted-or-later, negotiating, rejected, inactive.
    expect(groups).toEqual({ open: 6, accepted: 9, feedback_sent: 1, declined: 1, unavailable: 1 });
  });

  it('no longer recognises statuses the backend never sends', () => {
    // These three were in the old page check but are not in PARTNERSHIP_STATUSES.
    for (const status of ['offer_accepted', 'contract_signed', 'active']) {
      expect(getOfferState(status), status).toBe('open');
    }
  });

  it('treats a missing status as open', () => {
    expect(getOfferState(null)).toBe('open');
    expect(getOfferState(undefined)).toBe('open');
    expect(getOfferState('')).toBe('open');
  });
});
