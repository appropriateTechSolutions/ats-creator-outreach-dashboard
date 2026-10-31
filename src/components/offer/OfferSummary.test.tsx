import { render, screen, within } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { OfferSummary, type OfferSummaryPartnership } from './OfferSummary';

// Shaped like GET /partnerships/public/:id. Sequelize returns DECIMAL columns as
// strings ("600.00"), so the fee and the affiliate % arrive as strings.
const deliverable = (
  over: Partial<NonNullable<OfferSummaryPartnership['content']>[number]> = {},
) => ({
  id: 'c1',
  platform: 'instagram',
  content_type: 'instagram_reel',
  due_date: '2026-11-12',
  status: 'pending',
  ...over,
});

const offer = (over: Partial<OfferSummaryPartnership> = {}): OfferSummaryPartnership => ({
  flat_fee: '600.00',
  currency: 'USD',
  affiliate_enabled: true,
  affiliate_percentage: '12.00',
  affiliate_code: 'KEISHA12',
  content: [
    deliverable(),
    deliverable({ id: 'c2', content_type: 'instagram_post', due_date: '2026-11-18' }),
  ],
  Campaign: { product_offer_notes: null },
  ...over,
});

const productOnly = (over: Partial<OfferSummaryPartnership> = {}) =>
  offer({
    flat_fee: null,
    affiliate_enabled: false,
    affiliate_percentage: null,
    affiliate_code: null,
    content: [],
    ...over,
  });

const summary = () => screen.getByRole('region', { name: 'Offer summary' });

describe('OfferSummary', () => {
  it('renders flat fee, affiliate code and deliverables', () => {
    render(<OfferSummary partnership={offer()} />);

    const region = summary();
    expect(within(region).getByRole('heading', { name: 'Compensation' })).toBeInTheDocument();
    expect(within(region).getByText('Flat fee')).toBeInTheDocument();
    expect(within(region).getByText('$600.00')).toBeInTheDocument();
    expect(within(region).getByText('Commission rate')).toBeInTheDocument();
    expect(within(region).getByText('12%')).toBeInTheDocument();
    expect(within(region).getByText('Promo code')).toBeInTheDocument();
    expect(within(region).getByText('KEISHA12')).toBeInTheDocument();

    expect(within(region).getByRole('heading', { name: 'Deliverables' })).toBeInTheDocument();
    const items = within(within(region).getByRole('list')).getAllByRole('listitem');
    expect(items.map((li) => li.textContent)).toEqual([
      'Instagram · Reel · Due Nov 12, 2026',
      'Instagram · Post · Due Nov 18, 2026',
    ]);

    // Paid offer: never claims it is product only, never leaks enum strings.
    expect(region).not.toHaveTextContent('Product only');
    expect(region).not.toHaveTextContent(/instagram_reel|instagram_post/);
  });

  it('renders product-only offer without fee', () => {
    render(<OfferSummary partnership={productOnly()} />);

    const region = summary();
    expect(within(region).getByText('Product only')).toBeInTheDocument();
    expect(region).not.toHaveTextContent('$');
    expect(region).not.toHaveTextContent('0.00');
    expect(within(region).queryByText('Flat fee')).not.toBeInTheDocument();
    expect(within(region).queryByText('Commission rate')).not.toBeInTheDocument();
    expect(within(region).queryByText('Promo code')).not.toBeInTheDocument();
    // No deliverables on the offer: no empty heading or empty list either.
    expect(within(region).queryByRole('heading', { name: 'Deliverables' })).not.toBeInTheDocument();
    expect(within(region).queryByRole('list')).not.toBeInTheDocument();
  });

  it('treats a zero flat fee as no fee', () => {
    for (const zero of ['0.00', 0, null, undefined]) {
      const { unmount } = render(<OfferSummary partnership={productOnly({ flat_fee: zero })} />);
      expect(within(summary()).getByText('Product only')).toBeInTheDocument();
      expect(summary()).not.toHaveTextContent('$');
      unmount();
    }
  });

  it('renders a flat-fee-only offer without commission lines', () => {
    render(
      <OfferSummary
        partnership={offer({
          flat_fee: '3950.00',
          affiliate_enabled: false,
          affiliate_percentage: null,
          affiliate_code: null,
        })}
      />,
    );

    const region = summary();
    expect(within(region).getByText('$3,950.00')).toBeInTheDocument();
    expect(within(region).queryByText('Commission rate')).not.toBeInTheDocument();
    expect(within(region).queryByText('Promo code')).not.toBeInTheDocument();
    expect(region).not.toHaveTextContent('Product only');
  });

  it('renders an affiliate-only offer with no flat fee line', () => {
    render(
      <OfferSummary
        partnership={productOnly({
          affiliate_enabled: true,
          affiliate_percentage: '10.00',
          affiliate_code: 'MOLLY10',
        })}
      />,
    );

    const region = summary();
    expect(within(region).getByText('10%')).toBeInTheDocument();
    expect(within(region).getByText('MOLLY10')).toBeInTheDocument();
    expect(within(region).queryByText('Flat fee')).not.toBeInTheDocument();
    expect(region).not.toHaveTextContent('Product only');
  });

  it('ignores stale affiliate values when affiliate is not enabled', () => {
    // OfferModal leaves the old affiliate columns in place when affiliate is switched off.
    render(
      <OfferSummary
        partnership={productOnly({
          affiliate_enabled: false,
          affiliate_percentage: '12.00',
          affiliate_code: 'STALE12',
        })}
      />,
    );

    const region = summary();
    expect(region).not.toHaveTextContent('STALE12');
    expect(region).not.toHaveTextContent('12%');
    expect(within(region).getByText('Product only')).toBeInTheDocument();
  });

  it('does not invent a commission rate when only a promo code is set', () => {
    for (const noRate of [null, undefined, '0.00', 0]) {
      const { unmount } = render(
        <OfferSummary
          partnership={productOnly({
            affiliate_enabled: true,
            affiliate_percentage: noRate,
            affiliate_code: 'ONLYCODE',
          })}
        />,
      );

      const region = summary();
      expect(within(region).getByText('ONLYCODE')).toBeInTheDocument();
      expect(within(region).queryByText('Commission rate')).not.toBeInTheDocument();
      expect(region).not.toHaveTextContent('0%');
      expect(region).not.toHaveTextContent('null');
      unmount();
    }
  });

  it('keeps fractional commission rates and uses the offer currency', () => {
    render(
      <OfferSummary
        partnership={offer({
          flat_fee: '69416.00',
          currency: 'INR',
          affiliate_percentage: '12.50',
        })}
      />,
    );

    const region = summary();
    expect(within(region).getByText('₹69,416.00')).toBeInTheDocument();
    expect(within(region).getByText('12.5%')).toBeInTheDocument();
  });

  it('lists a deliverable without a due date and skips cancelled ones', () => {
    render(
      <OfferSummary
        partnership={offer({
          content: [
            deliverable({
              id: 'a',
              platform: 'youtube',
              content_type: 'youtube_short',
              due_date: null,
            }),
            deliverable({
              id: 'b',
              platform: 'tiktok',
              content_type: 'tiktok_video',
              status: 'cancelled',
            }),
            deliverable({
              id: 'c',
              platform: 'blog',
              content_type: 'blog_post',
              due_date: '2026-12-01',
            }),
          ],
        })}
      />,
    );

    const items = within(within(summary()).getByRole('list')).getAllByRole('listitem');
    expect(items.map((li) => li.textContent)).toEqual([
      'YouTube · Short · No due date set',
      'Blog · Post · Due Dec 1, 2026',
    ]);
  });

  it('hides the deliverables heading when every deliverable is cancelled', () => {
    render(
      <OfferSummary partnership={offer({ content: [deliverable({ status: 'cancelled' })] })} />,
    );

    expect(
      within(summary()).queryByRole('heading', { name: 'Deliverables' }),
    ).not.toBeInTheDocument();
  });

  it('never shows a raw enum for a platform or content type it does not know', () => {
    render(
      <OfferSummary
        partnership={offer({
          content: [
            deliverable({
              id: 'a',
              platform: 'tiktok',
              content_type: 'tiktok_live',
              due_date: null,
            }),
            deliverable({
              id: 'b',
              platform: 'snapchat',
              content_type: 'snapchat_story',
              due_date: null,
            }),
            // Platform and type are both "Other": say it once.
            deliverable({ id: 'c', platform: 'other', content_type: 'other', due_date: null }),
          ],
        })}
      />,
    );

    const items = within(within(summary()).getByRole('list')).getAllByRole('listitem');
    expect(items.map((li) => li.textContent)).toEqual([
      'TikTok · Live · No due date set',
      'Snapchat · Story · No due date set',
      'Other · No due date set',
    ]);
    expect(summary()).not.toHaveTextContent(/tiktok_live|snapchat_story/);
  });

  it('shows the campaign product when the payload includes it', () => {
    render(
      <OfferSummary
        partnership={productOnly({ Campaign: { product_offer_notes: 'Zero Sugar sampler pack' } })}
      />,
    );

    const region = summary();
    expect(within(region).getByRole('heading', { name: 'Product' })).toBeInTheDocument();
    expect(within(region).getByText('Zero Sugar sampler pack')).toBeInTheDocument();
  });

  it('omits the product block when the payload has no product field', () => {
    for (const Campaign of [
      null,
      undefined,
      {},
      { product_offer_notes: null },
      { product_offer_notes: '  ' },
    ]) {
      const { unmount } = render(<OfferSummary partnership={offer({ Campaign })} />);
      expect(within(summary()).queryByRole('heading', { name: 'Product' })).not.toBeInTheDocument();
      unmount();
    }
  });
});

describe('OfferSummary due dates', () => {
  // The API sends DATEONLY values ("2026-11-12"). Parsing one with `new Date(str)` is UTC
  // midnight, which a US creator would see as the day before. Pin a US zone to prove it.
  beforeAll(() => {
    vi.stubEnv('TZ', 'America/Los_Angeles');
  });
  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it('shows the calendar date the API sent, not the day before', () => {
    render(
      <OfferSummary
        partnership={offer({
          content: [
            deliverable({ due_date: '2026-11-12' }),
            deliverable({ id: 'c2', due_date: '2026-11-12T00:00:00.000Z' }),
          ],
        })}
      />,
    );

    const items = within(within(summary()).getByRole('list')).getAllByRole('listitem');
    expect(items.map((li) => li.textContent)).toEqual([
      'Instagram · Reel · Due Nov 12, 2026',
      'Instagram · Reel · Due Nov 12, 2026',
    ]);
  });
});
