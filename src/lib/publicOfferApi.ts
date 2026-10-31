import type { OfferSummaryPartnership } from '../components/offer/OfferSummary';
import { getErrorMessage } from './api';

// The three calls behind the public offer page (/accept-offer/:id). They use fetch,
// not the shared axios client: the creator is not logged in, and the client's auth
// interceptors don't apply.
//
// Every call carries the signed link from the email (?token=&exp=). The backend's
// requireOfferToken reads them from the query string or the body; the query string
// is used here so the GET and both POSTs send them the same way.
//
// Every failure is thrown as an Error whose message is already fit to show a creator,
// so callers only need `getErrorMessage(err)`.

export interface OfferLink {
  token?: string | null;
  exp?: string | null;
}

/** GET /partnerships/public/:id: the partnership row plus Campaign, Creator and content. */
export interface PublicOffer extends OfferSummaryPartnership {
  status: string;
  shipment_included?: boolean | null;
  Campaign?: { name?: string | null; product_offer_notes?: string | null } | null;
  Creator?: {
    full_name?: string | null;
    handle?: string | null;
    profile_pic?: string | null;
    // getPartnershipPublic does not select these today; the page pre-fills from them if it ever does.
    shipping_address_line1?: string | null;
    shipping_address_line2?: string | null;
    shipping_city?: string | null;
    shipping_state?: string | null;
    shipping_zip?: string | null;
    shipping_country?: string | null;
  } | null;
}

const RATE_LIMITED_MESSAGE = 'Too many attempts. Please wait a few minutes and try again.';
const EXPIRED_LINK_MESSAGE = 'This link has expired. Please ask your contact at Qui for a new one.';
const UNREACHABLE_MESSAGE = "We couldn't reach the server. Check your connection and try again.";

function publicUrl(path: string, link: OfferLink): string {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081/api';
  const query = new URLSearchParams();
  if (link.token) query.set('token', link.token);
  if (link.exp) query.set('exp', link.exp);
  const search = query.toString();
  return `${apiUrl}/partnerships/public/${path}${search ? `?${search}` : ''}`;
}

// The backend's rate limiter (429, RATE_LIMITED) and link check (403, INVALID_OFFER_LINK)
// answer with `error: { code, message }`, an object. Pass `body.error` (not the whole
// body) to getErrorMessage so it unwraps the message instead of returning its fallback.
function failureMessage(status: number, body: { error?: unknown } | null): string {
  const code = (body?.error as { code?: unknown } | undefined)?.code;
  if (status === 429 || code === 'RATE_LIMITED') return RATE_LIMITED_MESSAGE;
  if (status === 403 || code === 'INVALID_OFFER_LINK') return EXPIRED_LINK_MESSAGE;
  return getErrorMessage(body?.error);
}

async function request<T>(path: string, link: OfferLink, post?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(
      publicUrl(path, link),
      post === undefined
        ? undefined
        : {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(post),
          },
    );
  } catch {
    throw new Error(UNREACHABLE_MESSAGE);
  }
  // A proxy or CDN error page isn't JSON; treat it as an empty body.
  const body = await res.json().catch(() => null);
  if (body?.success) return body.data as T;
  throw new Error(failureMessage(res.status, body));
}

export async function fetchPublicOffer(id: string, link: OfferLink): Promise<PublicOffer> {
  const offer = await request<PublicOffer | null>(id, link);
  if (!offer) throw new Error('Proposal not found');
  return offer;
}

export const acceptPublicOffer = (id: string, link: OfferLink, form: unknown): Promise<void> =>
  request<void>(`${id}/accept`, link, form);

export const rejectPublicOffer = (id: string, link: OfferLink, feedback: string): Promise<void> =>
  request<void>(`${id}/reject`, link, { feedback });
