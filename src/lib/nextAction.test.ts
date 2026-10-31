import { describe, expect, it } from 'vitest';
import {
  canReachOut,
  getNextAction,
  getPartnershipNextAction,
  isFollowUpDue,
  isWaitingForFollowUp,
  pickCurrentPartnership,
  pickPartnershipContents,
  pickPartnershipShipment,
  type NextActionKey,
} from './nextAction';
import type { Creator, CreatorContent, OutreachLog, Partnership, Shipment } from '../types';

const NOW = new Date('2026-10-31T12:00:00Z');

function makeCreator(overrides: Partial<Creator> = {}): Creator {
  return {
    id: 'creator-1',
    handle: 'maya',
    full_name: 'Maya Ortiz',
    email: 'maya@example.com',
    bio: null,
    city: null,
    state: null,
    country: null,
    category: null,
    has_email: true,
    has_instagram: true,
    outreach_readiness_score: null,
    relevance_score: null,
    scoring_notes: null,
    review_status: 'approved',
    lifecycle_status: 'new',
    campaign_id: 'campaign-1',
    campaign_ids: ['campaign-1'],
    assigned_status: 'approved',
    meetings: [],
    affiliate: null,
    outreach_logs: [],
    conversation: null,
    profiles: [],
    ...overrides,
  };
}

function makePartnership(overrides: Partial<Partnership> = {}): Partnership {
  return {
    id: 'partnership-1',
    creator_id: 'creator-1',
    campaign_id: 'campaign-1',
    status: 'engaged',
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
    ...overrides,
  };
}

function makeShipment(overrides: Partial<Shipment> = {}): Shipment {
  return {
    id: 'shipment-1',
    creator_id: 'creator-1',
    campaign_id: 'campaign-1',
    partnership_id: 'partnership-1',
    product_name: 'Apple Cider Fizz',
    status: 'pending',
    created_at: '2026-10-02T00:00:00Z',
    updated_at: '2026-10-02T00:00:00Z',
    ...overrides,
  };
}

function makeContent(overrides: Partial<CreatorContent> = {}): CreatorContent {
  return {
    id: 'content-1',
    creator_id: 'creator-1',
    campaign_id: 'campaign-1',
    partnership_id: 'partnership-1',
    platform: 'instagram',
    content_type: 'instagram_reel',
    status: 'pending',
    views: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    saves: 0,
    clicks: 0,
    created_at: '2026-10-03T00:00:00Z',
    updated_at: '2026-10-03T00:00:00Z',
    ...overrides,
  };
}

function makeOutreach(overrides: Partial<OutreachLog> = {}): OutreachLog {
  return {
    id: 'log-1',
    campaign_id: 'campaign-1',
    creator_id: 'creator-1',
    channel: 'email',
    message_type: 'initial',
    follow_up_count: 0,
    next_followup_at: '2026-10-20T00:00:00Z',
    is_dismissed: false,
    response_received: false,
    delivery_status: 'sent',
    sent_at: '2026-10-18T00:00:00Z',
    ...overrides,
  };
}

describe('getNextAction', () => {
  it('hold creator → review', () => {
    const action = getNextAction({
      creator: makeCreator({ review_status: 'hold', lifecycle_status: 'new' }),
    });
    expect(action).toMatchObject({ key: 'review', label: 'Review creator', kind: 'action' });
  });

  it('approved + new → outreach', () => {
    const action = getNextAction({
      creator: makeCreator({ review_status: 'approved', lifecycle_status: 'new' }),
    });
    expect(action).toMatchObject({ key: 'outreach', label: 'Send outreach', kind: 'action' });
  });

  it('contacted, no partnership, follow-up due → follow_up', () => {
    const action = getNextAction({
      creator: makeCreator({
        lifecycle_status: 'contacted',
        latest_outreach: makeOutreach({ follow_up_count: 1 }),
      }),
      partnership: null,
      followUpDue: true,
    });
    expect(action).toMatchObject({ key: 'follow_up', label: 'Send follow-up #2', kind: 'action' });
    expect(action.payload).toEqual({ messageType: 'followup_2' });
  });

  it('accepted partnership with shipment pending → view_shipments, never follow_up', () => {
    const shipment = makeShipment({ status: 'pending' });
    const action = getNextAction({
      // The Maya Ortiz bug: her outreach log still says a follow-up is "due", but she
      // has an accepted deal with a pending shipment — the deal wins.
      creator: makeCreator({
        lifecycle_status: 'contacted',
        latest_outreach: makeOutreach({ follow_up_count: 1 }),
      }),
      partnership: makePartnership({ status: 'accepted', shipment_included: true }),
      shipment,
      followUpDue: true,
    });
    expect(action).toMatchObject({
      key: 'view_shipments',
      label: 'Update shipment',
      kind: 'action',
    });
    expect(action.payload).toBe(shipment);
  });

  it('offer_sent → awaiting_signature', () => {
    const action = getNextAction({
      creator: makeCreator({ lifecycle_status: 'engaged' }),
      partnership: makePartnership({ status: 'offer_sent' }),
    });
    expect(action).toEqual({
      key: 'awaiting_signature',
      label: 'Awaiting signature',
      kind: 'waiting',
    });
  });

  it('activated with submitted content → review_content', () => {
    const submitted = makeContent({ id: 'content-2', status: 'submitted' });
    const action = getNextAction({
      creator: makeCreator({ lifecycle_status: 'converted' }),
      partnership: makePartnership({ status: 'activated' }),
      contents: [makeContent({ status: 'pending' }), submitted],
    });
    expect(action).toMatchObject({ key: 'review_content', label: 'Review draft', kind: 'action' });
    expect(action.payload).toBe(submitted);
  });

  it('completed with nothing pending → done', () => {
    const action = getNextAction({
      creator: makeCreator({ lifecycle_status: 'converted' }),
      partnership: makePartnership({ status: 'completed' }),
      contents: [makeContent({ status: 'published' })],
    });
    expect(action).toEqual({ key: 'done', label: 'Completed', kind: 'done' });
  });

  it('treats every unreviewed review status (and a missing one) as review', () => {
    for (const review_status of ['hold', 'shortlisted', 'pending_review', 'new', null] as const) {
      expect(
        getNextAction({ creator: makeCreator({ review_status }) }).key,
        String(review_status),
      ).toBe('review');
    }
  });

  it('waits for a reply while a contacted creator has no follow-up due', () => {
    const action = getNextAction({
      creator: makeCreator({ lifecycle_status: 'contacted' }),
      followUpDue: false,
    });
    expect(action).toEqual({ key: 'awaiting_reply', label: 'Awaiting reply', kind: 'waiting' });
  });

  it('never suggests a follow-up once a partnership exists', () => {
    const action = getNextAction({
      creator: makeCreator({ lifecycle_status: 'contacted' }),
      partnership: makePartnership({ status: 'engaged' }),
      followUpDue: true,
    });
    expect(action.key).toBe('awaiting_reply');
  });

  it('labels the third follow-up as the final one', () => {
    const action = getNextAction({
      creator: makeCreator({
        lifecycle_status: 'contacted',
        latest_outreach: makeOutreach({ follow_up_count: 2 }),
      }),
      followUpDue: true,
    });
    expect(action).toMatchObject({ key: 'follow_up', label: 'Send final follow-up' });
    expect(action.payload).toEqual({ messageType: 'final_ping' });
  });

  it('keeps the existing order for the middle of the pipeline', () => {
    const creator = makeCreator({ lifecycle_status: 'engaged' });
    const cases: Array<[Partial<Partnership>, NextActionKey, string]> = [
      [{ status: 'replied' }, 'draft_offer', 'Draft offer'],
      [{ status: 'in_discussion' }, 'draft_offer', 'Draft offer'],
      [{ status: 'qualified' }, 'draft_offer', 'Draft offer'],
      [{ status: 'negotiating' }, 'draft_offer', 'Reply'],
    ];
    for (const [partnership, key, label] of cases) {
      const action = getNextAction({ creator, partnership: makePartnership(partnership) });
      expect(action, String(partnership.status)).toMatchObject({ key, label, kind: 'action' });
    }
  });

  it('meeting_scheduled → waiting "Meeting scheduled"', () => {
    const action = getNextAction({
      creator: makeCreator({ lifecycle_status: 'qualified' }),
      partnership: makePartnership({ status: 'meeting_scheduled' }),
    });
    expect(action).toEqual({
      key: 'awaiting_meeting',
      label: 'Meeting scheduled',
      kind: 'waiting',
    });
  });

  it('engaged → draft offer once the creator has replied, else awaiting reply', () => {
    const partnership = makePartnership({ status: 'engaged' });
    const replies: Array<[string, Partial<Creator>]> = [
      ['outreach log', { latest_outreach: makeOutreach({ response_received: true }) }],
      [
        'inbound message',
        {
          conversation: {
            id: 'conv-1',
            latest_channel: 'email',
            latest_inbound_message: 'Count me in!',
            latest_inbound_at: '2026-10-25T00:00:00Z',
            detected_intent: 'interested',
            interested: true,
            qualification_status: 'in_progress',
          },
        },
      ],
      ['lifecycle', { lifecycle_status: 'replied' }],
    ];
    for (const [signal, overrides] of replies) {
      const creator = makeCreator({ lifecycle_status: 'engaged', ...overrides });
      expect(getNextAction({ creator, partnership }), signal).toMatchObject({
        key: 'draft_offer',
        label: 'Draft offer',
        kind: 'action',
      });
    }
    expect(
      getNextAction({ creator: makeCreator({ lifecycle_status: 'engaged' }), partnership }),
    ).toEqual({ key: 'awaiting_reply', label: 'Awaiting reply', kind: 'waiting' });
  });

  it('accepted → the shipment step when product ships, else activate', () => {
    const creator = makeCreator({ lifecycle_status: 'engaged' });
    expect(
      getNextAction({
        creator,
        partnership: makePartnership({ status: 'accepted', shipment_included: true }),
      }),
    ).toMatchObject({ key: 'add_shipment', label: 'Add shipment' });
    expect(
      getNextAction({
        creator,
        partnership: makePartnership({ status: 'accepted', shipment_included: false }),
      }),
    ).toMatchObject({ key: 'activate', label: 'Activate partnership' });
  });

  it('product_shipped → waiting "Awaiting delivery"', () => {
    const action = getNextAction({
      creator: makeCreator({ lifecycle_status: 'engaged' }),
      partnership: makePartnership({ status: 'product_shipped', shipment_included: true }),
      shipment: makeShipment({ status: 'shipped' }),
      contents: [makeContent({ status: 'pending' })],
    });
    expect(action).toEqual({
      key: 'awaiting_delivery',
      label: 'Awaiting delivery',
      kind: 'waiting',
    });
  });

  it('product_delivered → add_draft_url with pending content, else waiting "Awaiting content"', () => {
    const creator = makeCreator({ lifecycle_status: 'engaged' });
    const partnership = makePartnership({ status: 'product_delivered', shipment_included: true });
    const shipment = makeShipment({ status: 'delivered' });
    const pending = makeContent({ status: 'pending' });
    expect(getNextAction({ creator, partnership, shipment, contents: [pending] })).toMatchObject({
      key: 'add_draft_url',
      payload: pending,
    });
    expect(getNextAction({ creator, partnership, shipment, contents: [] })).toEqual({
      key: 'awaiting_content',
      label: 'Awaiting content',
      kind: 'waiting',
    });
  });

  it('content_pending → add_draft_url for the earliest-due pending or revision item', () => {
    const later = makeContent({ id: 'later', status: 'pending', due_date: '2026-11-18' });
    const sooner = makeContent({
      id: 'sooner',
      status: 'revision_requested',
      due_date: '2026-11-12',
    });
    const action = getNextAction({
      creator: makeCreator({ lifecycle_status: 'converted' }),
      partnership: makePartnership({ status: 'content_pending' }),
      contents: [later, makeContent({ id: 'done', status: 'published' }), sooner],
    });
    expect(action).toMatchObject({ key: 'add_draft_url', label: 'Add draft URL', payload: sooner });
  });

  it('content_submitted → review_content', () => {
    const submitted = makeContent({ id: 'draft', status: 'submitted' });
    const action = getNextAction({
      creator: makeCreator({ lifecycle_status: 'converted' }),
      partnership: makePartnership({ status: 'content_submitted' }),
      contents: [makeContent({ status: 'revision_requested' }), submitted],
    });
    expect(action).toMatchObject({
      key: 'review_content',
      label: 'Review draft',
      payload: submitted,
    });
  });

  it('content_approved → add_live_url', () => {
    const approved = makeContent({ id: 'ok', status: 'approved' });
    const action = getNextAction({
      creator: makeCreator({ lifecycle_status: 'converted' }),
      partnership: makePartnership({ status: 'content_approved' }),
      contents: [makeContent({ status: 'submitted' }), approved],
    });
    expect(action).toMatchObject({ key: 'add_live_url', label: 'Add live URL', payload: approved });
  });

  it('live → complete when nothing is pending, otherwise the content action', () => {
    const creator = makeCreator({ lifecycle_status: 'converted' });
    const partnership = makePartnership({ status: 'live' });
    expect(
      getNextAction({
        creator,
        partnership,
        contents: [makeContent({ status: 'published' }), makeContent({ status: 'rejected' })],
      }),
    ).toMatchObject({ key: 'complete', label: 'Complete partnership', kind: 'action' });
    const approved = makeContent({ status: 'approved' });
    expect(getNextAction({ creator, partnership, contents: [approved] })).toMatchObject({
      key: 'add_live_url',
      payload: approved,
    });
    const submitted = makeContent({ status: 'submitted' });
    expect(getNextAction({ creator, partnership, contents: [approved, submitted] })).toMatchObject({
      key: 'review_content',
      payload: submitted,
    });
  });

  it('activate is offered only for accepted', () => {
    const statuses: Array<Partnership['status']> = [
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
    ];
    const creator = makeCreator({
      lifecycle_status: 'engaged',
      latest_outreach: makeOutreach({ response_received: true }),
    });
    const offeringActivate = statuses.filter((status) =>
      [true, false].some(
        (shipment_included) =>
          getNextAction({
            creator,
            partnership: makePartnership({ status, shipment_included }),
            shipment: shipment_included ? makeShipment({ status: 'delivered' }) : null,
          }).key === 'activate',
      ),
    );
    expect(offeringActivate).toEqual(['accepted']);
  });

  it('works through deliverables on an activated partnership, then completes it', () => {
    const creator = makeCreator({ lifecycle_status: 'converted' });
    const partnership = makePartnership({ status: 'activated' });
    const pending = makeContent({ status: 'revision_requested' });
    expect(getNextAction({ creator, partnership, contents: [pending] })).toMatchObject({
      key: 'add_draft_url',
      label: 'Add draft URL',
      payload: pending,
    });
    expect(
      getNextAction({ creator, partnership, contents: [makeContent({ status: 'published' })] }),
    ).toMatchObject({ key: 'complete', label: 'Complete partnership' });
  });

  it('asks for the live URL when a completed partnership has approved content', () => {
    const approved = makeContent({ status: 'approved' });
    const action = getNextAction({
      creator: makeCreator({ lifecycle_status: 'converted' }),
      partnership: makePartnership({ status: 'completed' }),
      contents: [approved],
    });
    expect(action).toMatchObject({ key: 'add_live_url', label: 'Add live URL', payload: approved });
  });

  it('lets the partnership win over a creator lifecycle of replied', () => {
    const action = getNextAction({
      creator: makeCreator({ lifecycle_status: 'replied' }),
      partnership: makePartnership({ status: 'offer_sent' }),
    });
    expect(action.key).toBe('awaiting_signature');
    expect(getNextAction({ creator: makeCreator({ lifecycle_status: 'replied' }) }).key).toBe(
      'draft_offer',
    );
  });

  it('returns none, with a neutral label, when nothing applies', () => {
    for (const creator of [
      makeCreator({ review_status: 'rejected', lifecycle_status: 'rejected' }),
      makeCreator({ lifecycle_status: 'not_respond' }),
    ]) {
      expect(getNextAction({ creator })).toEqual({
        key: 'none',
        label: 'No next step',
        kind: 'done',
      });
    }
  });

  it('uses sentence case for every label', () => {
    const creator = makeCreator({ lifecycle_status: 'converted' });
    const labels = [
      getNextAction({ creator: makeCreator({ review_status: 'hold' }) }).label,
      getNextAction({ creator: makeCreator() }).label,
      getNextAction({ creator, partnership: makePartnership({ status: 'accepted' }) }).label,
      getNextAction({
        creator,
        partnership: makePartnership({ status: 'accepted', shipment_included: true }),
        shipment: makeShipment(),
      }).label,
      getNextAction({ creator, partnership: makePartnership({ status: 'offer_sent' }) }).label,
      getNextAction({ creator, partnership: makePartnership({ status: 'activated' }) }).label,
    ];
    for (const label of labels) {
      // First letter upper case; nothing else capitalised except the URL acronym.
      expect(label, label).toMatch(/^[A-Z][^A-Z]*(URL)?$/);
    }
  });
});

describe('isFollowUpDue', () => {
  it('is due once next_followup_at has passed', () => {
    expect(isFollowUpDue(makeOutreach({ next_followup_at: '2026-10-30T00:00:00Z' }), NOW)).toBe(
      true,
    );
    expect(isFollowUpDue(makeOutreach({ next_followup_at: '2026-11-02T00:00:00Z' }), NOW)).toBe(
      false,
    );
  });

  it('is never due after a reply, a dismissal, three follow-ups or without a schedule', () => {
    for (const overrides of [
      { response_received: true },
      { is_dismissed: true },
      { follow_up_count: 3 },
      { next_followup_at: null },
    ]) {
      expect(isFollowUpDue(makeOutreach(overrides), NOW), JSON.stringify(overrides)).toBe(false);
    }
    expect(isFollowUpDue(null, NOW)).toBe(false);
  });

  it('is waiting, not due, while the follow-up is still scheduled', () => {
    const scheduled = makeOutreach({ next_followup_at: '2026-11-02T00:00:00Z' });
    expect(isWaitingForFollowUp(scheduled, NOW)).toBe(true);
    expect(
      isWaitingForFollowUp(makeOutreach({ next_followup_at: '2026-10-30T00:00:00Z' }), NOW),
    ).toBe(false);
  });
});

describe('canReachOut', () => {
  it('allows outreach, follow-ups and DMs only before a reply or a partnership', () => {
    for (const lifecycle_status of ['new', 'enriched', 'shortlisted', 'contacted'] as const) {
      expect(canReachOut(makeCreator({ lifecycle_status }), false), lifecycle_status).toBe(true);
      expect(
        canReachOut(makeCreator({ lifecycle_status }), true),
        `${lifecycle_status} + deal`,
      ).toBe(false);
    }
    for (const lifecycle_status of [
      'replied',
      'engaged',
      'converted',
      'not_respond',
      'rejected',
    ] as const) {
      expect(canReachOut(makeCreator({ lifecycle_status }), false), lifecycle_status).toBe(false);
    }
  });
});

describe('pickCurrentPartnership', () => {
  // An approved creator who is past first contact and has not replied anywhere.
  const context = { creator: makeCreator({ lifecycle_status: 'engaged' }) };

  it('prefers open partnerships with an action, most advanced first', () => {
    const completed = makePartnership({
      id: 'summer',
      status: 'completed',
      created_at: '2026-09-23T00:00:00Z',
    });
    const waiting = makePartnership({
      id: 'zero',
      status: 'offer_sent',
      created_at: '2026-10-20T00:00:00Z',
    });
    const qualified = makePartnership({
      id: 'holiday',
      status: 'qualified',
      created_at: '2026-10-22T00:00:00Z',
    });
    const accepted = makePartnership({
      id: 'fall',
      status: 'accepted',
      created_at: '2026-10-13T00:00:00Z',
    });
    expect(pickCurrentPartnership([completed, waiting, qualified, accepted], context)?.id).toBe(
      'fall',
    );
  });

  it('pick prefers an open partnership with pending work over a live one', () => {
    // Anika Shah: a newer live deal with everything published, and an activated deal
    // whose deliverables are still due.
    const live = makePartnership({
      id: 'live',
      status: 'live',
      created_at: '2026-10-05T00:00:00Z',
    });
    const activated = makePartnership({
      id: 'activated',
      status: 'activated',
      created_at: '2026-10-02T00:00:00Z',
    });
    const contents = [
      makeContent({ partnership_id: 'live', status: 'published' }),
      makeContent({ partnership_id: 'activated', status: 'pending' }),
    ];
    expect(pickCurrentPartnership([live, activated], { ...context, contents })?.id).toBe(
      'activated',
    );
  });

  it('falls back to any open partnership, then the newest closed one', () => {
    const completed = makePartnership({
      id: 'old',
      status: 'completed',
      created_at: '2026-09-01T00:00:00Z',
    });
    const rejected = makePartnership({
      id: 'new',
      status: 'rejected',
      created_at: '2026-10-01T00:00:00Z',
    });
    const offerSent = makePartnership({
      id: 'open',
      status: 'offer_sent',
      created_at: '2026-08-01T00:00:00Z',
    });
    expect(pickCurrentPartnership([completed, offerSent, rejected], context)?.id).toBe('open');
    expect(pickCurrentPartnership([completed, rejected], context)?.id).toBe('new');
    expect(pickCurrentPartnership([], context)).toBeNull();
  });
});

describe('partnership shipment and deliverables', () => {
  const partnership = makePartnership({ id: 'fall', campaign_id: 'campaign-fall' });

  it('takes the shipment linked to the partnership, not the creator’s newest one', () => {
    const fallShipment = makeShipment({
      id: 's-fall',
      partnership_id: 'fall',
      created_at: '2026-10-01T00:00:00Z',
    });
    const otherShipment = makeShipment({
      id: 's-summer',
      partnership_id: 'summer',
      created_at: '2026-10-09T00:00:00Z',
    });
    expect(pickPartnershipShipment(partnership, [otherShipment, fallShipment])?.id).toBe('s-fall');
    expect(pickPartnershipShipment(partnership, [otherShipment])).toBeNull();
  });

  it('falls back to an unlinked shipment for the same campaign', () => {
    const legacy = makeShipment({
      id: 's-legacy',
      partnership_id: null,
      campaign_id: 'campaign-fall',
    });
    expect(pickPartnershipShipment(partnership, [legacy])?.id).toBe('s-legacy');
  });

  it('keeps only the partnership’s deliverables', () => {
    const mine = makeContent({ id: 'c-fall', partnership_id: 'fall' });
    const unlinked = makeContent({
      id: 'c-legacy',
      partnership_id: null,
      campaign_id: 'campaign-fall',
    });
    const other = makeContent({
      id: 'c-summer',
      partnership_id: 'summer',
      campaign_id: 'campaign-summer',
    });
    expect(pickPartnershipContents(partnership, [mine, unlinked, other]).map((c) => c.id)).toEqual([
      'c-fall',
      'c-legacy',
    ]);
    expect(pickPartnershipContents(null, [mine])).toEqual([]);
  });
});

describe('getPartnershipNextAction', () => {
  it('uses the partnership step when the creator is still unreviewed', () => {
    const step = getPartnershipNextAction({
      creator: makeCreator({ review_status: 'hold', lifecycle_status: 'engaged' }),
      partnership: makePartnership({ status: 'offer_sent' }),
    });
    expect(step).toMatchObject({ key: 'awaiting_signature', kind: 'waiting' });
  });

  it('uses the partnership step when no review status came with the creator', () => {
    const step = getPartnershipNextAction({
      creator: makeCreator({ review_status: null, lifecycle_status: 'new' }),
      partnership: makePartnership({ status: 'accepted', shipment_included: true }),
    });
    expect(step.key).toBe('add_shipment');
  });

  it('matches getNextAction for a reviewed creator', () => {
    const input = {
      creator: makeCreator({ review_status: 'approved', lifecycle_status: 'engaged' }),
      partnership: makePartnership({ status: 'activated' }),
    };
    expect(getPartnershipNextAction(input)).toEqual(getNextAction(input));
  });
});
