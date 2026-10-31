import { getErrorMessage } from './api';
import type { Campaign, Creator } from '../types';

// ─── Outreach sends: what the user is told, and which campaign an email is for ───

/** The campaign links a creator row carries (list rows have both, detail rows only `campaign_id`). */
type CampaignLinks = Pick<Creator, 'campaign_id'> & Partial<Pick<Creator, 'campaign_ids'>>;

/** Backend wording for "no mailbox could be found for this sender". */
const MISSING_MAILBOX = /no mail credentials|smtp|email_user|email_pass/i;

const MISSING_MAILBOX_MESSAGE =
  "Creator approved, but the email wasn't sent: no sending mailbox is configured for your account. Ask an admin to add your SMTP settings.";

/**
 * What to tell the user when approve-and-send was rejected. The backend answers
 * with its own plain-language reason (`error`), so that is shown as-is — except
 * for an approved-but-unsent creator whose mailbox is missing, which gets the
 * fix spelled out instead of a list of unset environment variables.
 *
 * Only `OUTREACH_SEND_FAILED` is rewritten: it is the one code that guarantees the
 * creator was approved, so no other error is made to say so.
 */
export function sendFailureMessage(err: unknown): string {
  const message = getErrorMessage(err, 'The email was not sent. Please try again.');
  const code = err && typeof err === 'object' ? (err as { code?: unknown }).code : undefined;
  return code === 'OUTREACH_SEND_FAILED' && MISSING_MAILBOX.test(message)
    ? MISSING_MAILBOX_MESSAGE
    : message;
}

/** Confirmation once an email has really gone out. Names the recipient only when known. */
export function emailSentMessage(email?: string | null): string {
  const to = email?.trim();
  return to ? `Email sent to ${to}` : 'Email sent';
}

const campaignIdsOf = (creator: CampaignLinks): string[] => [
  ...new Set([
    ...(creator.campaign_ids ?? []),
    ...(creator.campaign_id ? [creator.campaign_id] : []),
  ]),
];

/**
 * The campaign an approval from a creator list belongs to, when it isn't a guess:
 * the campaign the list is already scoped to, else the creator's only campaign.
 * A creator in several campaigns yields `undefined` — the list can't tell which one
 * the user means, and the backend then falls back to the most recent link.
 *
 * Use the same value for the email preview and the approve call so what the user
 * reviews is what gets logged.
 */
export function outreachCampaignId(
  creator: CampaignLinks | null | undefined,
  scopedCampaignId?: string | null,
): string | undefined {
  if (scopedCampaignId) return scopedCampaignId;
  if (!creator) return undefined;
  const ids = campaignIdsOf(creator);
  return ids.length === 1 ? ids[0] : undefined;
}

/** Names of the campaigns a creator is in; ids with no known campaign are skipped, never shown raw. */
export function campaignNamesFor(
  creator: CampaignLinks,
  campaigns: Pick<Campaign, 'id' | 'name'>[],
): string[] {
  const nameById = new Map(campaigns.map((c) => [c.id, c.name]));
  return campaignIdsOf(creator)
    .map((id) => nameById.get(id))
    .filter((name): name is string => !!name);
}
