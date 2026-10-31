import { useId } from 'react';
import { format } from 'date-fns';
import { formatMoney } from '../../lib/formatters';

// The slice of GET /partnerships/public/:id this summary reads. A full
// CreatorPartnership satisfies it; it is spelled out here because the payload
// arrives as untyped JSON and Sequelize sends DECIMAL columns (flat_fee,
// affiliate_percentage) as strings, e.g. "600.00".
export interface OfferSummaryDeliverable {
  id?: string;
  platform: string;
  content_type: string;
  due_date?: string | null;
  status?: string;
}

export interface OfferSummaryPartnership {
  flat_fee?: number | string | null;
  currency?: string | null;
  affiliate_enabled?: boolean | null;
  affiliate_percentage?: number | string | null;
  affiliate_code?: string | null;
  content?: OfferSummaryDeliverable[] | null;
  // The public offer payload sends Campaign { id, name, product_offer_notes }; the
  // notes are the product line below (the whole offer when it is product-only), and
  // the block is hidden when a campaign has none.
  Campaign?: { product_offer_notes?: string | null } | null;
}

const PLATFORM_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  blog: 'Blog',
  website: 'Website',
  other: 'Other',
};

// The format half of content_type; the platform half is shown separately.
const CONTENT_TYPE_LABELS: Record<string, string> = {
  instagram_reel: 'Reel',
  instagram_story: 'Story',
  instagram_post: 'Post',
  youtube_video: 'Video',
  youtube_short: 'Short',
  tiktok_video: 'Video',
  blog_post: 'Post',
  other: 'Other',
};

const sentenceCase = (value: string): string => {
  const text = value.replace(/_/g, ' ').trim().toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const toNumber = (value: number | string | null | undefined): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const formatPercent = (value: number): string =>
  `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value)}%`;

// due_date is a calendar date ("2026-11-12"). `new Date("2026-11-12")` is UTC
// midnight, which anyone west of Greenwich sees as the day before, so build the
// date from its parts instead.
const formatDueDate = (value: string | null | undefined): string | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');
  if (!match) return null;
  return format(new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])), 'MMM d, yyyy');
};

// "Instagram · Reel · Due Nov 12, 2026". Unknown platforms / types are
// humanised rather than shown as raw enum values.
const describeDeliverable = (d: OfferSummaryDeliverable): string => {
  const platform = PLATFORM_LABELS[d.platform] ?? sentenceCase(d.platform);
  const prefix = `${d.platform}_`;
  const type =
    CONTENT_TYPE_LABELS[d.content_type] ??
    sentenceCase(
      d.content_type.startsWith(prefix) ? d.content_type.slice(prefix.length) : d.content_type,
    );
  const due = formatDueDate(d.due_date);
  return [platform, type === platform ? null : type, due ? `Due ${due}` : 'No due date set']
    .filter(Boolean)
    .join(' · ');
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-gray-100 py-2 last:border-b-0">
      <dt className="text-sm text-gray-600">{label}</dt>
      <dd className="text-right text-base font-semibold text-gray-900 break-words">{value}</dd>
    </div>
  );
}

/**
 * What the creator is agreeing to, shown on the public offer page before they
 * sign: compensation, deliverables and (when the API sends one) the product.
 */
export function OfferSummary({ partnership }: { partnership: OfferSummaryPartnership }) {
  const headingId = useId();

  const flatFee = toNumber(partnership.flat_fee);
  const hasFlatFee = flatFee !== null && flatFee > 0;

  // OfferModal leaves the old affiliate columns in place when affiliate is
  // switched off, so they only count while affiliate_enabled is set.
  const affiliateOn = !!partnership.affiliate_enabled;
  const rate = affiliateOn ? toNumber(partnership.affiliate_percentage) : null;
  const hasRate = rate !== null && rate > 0;
  const promoCode = affiliateOn ? (partnership.affiliate_code?.trim() ?? '') : '';

  // No fee and no affiliate terms: the product is the whole offer. Never "$0.00".
  const productOnly = !hasFlatFee && !hasRate && !promoCode;

  // A cancelled deliverable is no longer asked of the creator.
  const deliverables = (partnership.content ?? []).filter((d) => d.status !== 'cancelled');
  const product = partnership.Campaign?.product_offer_notes?.trim() ?? '';

  return (
    <section
      aria-labelledby={headingId}
      className="mb-8 space-y-5 rounded-xl border border-gray-200 bg-white p-5"
    >
      <h2 id={headingId} className="text-lg font-semibold text-gray-900 border-b pb-2">
        Offer summary
      </h2>

      <div>
        <h3 className="text-sm font-semibold text-gray-700">Compensation</h3>
        {productOnly ? (
          <p className="mt-1 text-base font-semibold text-gray-900">Product only</p>
        ) : (
          <dl className="mt-1">
            {hasFlatFee && (
              <Row label="Flat fee" value={formatMoney(flatFee, partnership.currency)} />
            )}
            {hasRate && <Row label="Commission rate" value={formatPercent(rate)} />}
            {promoCode && <Row label="Promo code" value={promoCode} />}
          </dl>
        )}
      </div>

      {deliverables.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700">Deliverables</h3>
          <ul className="mt-1">
            {deliverables.map((d, i) => (
              <li
                key={d.id ?? i}
                className="border-b border-gray-100 py-2 text-base text-gray-900 last:border-b-0"
              >
                {describeDeliverable(d)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {product && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700">Product</h3>
          <p className="mt-1 text-base text-gray-900">{product}</p>
        </div>
      )}
    </section>
  );
}
