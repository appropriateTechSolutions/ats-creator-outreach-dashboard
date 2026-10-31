import { clickable } from '../../lib/a11y';
import { hasRole, ROLE_GROUPS } from '../../lib/constants';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Instagram,
  Youtube,
  Activity,
  Check,
  X,
  Star,
  Users,
  RefreshCw,
  Send,
  Clock,
  Handshake,
} from 'lucide-react';
import { StatusBadge } from '../ui/StatusBadge';
import { ScoreBadge } from '../ui/ScoreBadge';
import { InfoTip } from '../ui/InfoTip';
import { Button } from '../ui/Button';
import {
  canReachOut,
  isWaitingForFollowUp,
  type NextAction,
  type NextActionKey,
} from '../../lib/nextAction';
import type { CreatorContent, Partnership, Shipment } from '../../types';

interface CreatorProfileHeaderProps {
  creator: any;
  currentUser: any;
  fromPath: string | null;
  fromLabel: string | null;
  fromCampaignId: string | null;
  fromMyCreators: boolean;
  setLightboxOpen: (v: boolean) => void;
  handleReview: (action: 'approve' | 'reject' | 'shortlist' | 'revoke') => Promise<void>;
  handleFindSimilar: () => void;
  findingSimilar: boolean;
  handleSendDM: () => void;
  /** Sends (or re-sends) the first outreach email. */
  handleSendOutreach: () => void;
  sendingEmail: boolean;
  handleSyncCreator: () => void;
  syncingProfile: boolean;
  /** getNextAction for the creator's current partnership — the header's primary button. */
  nextAction: NextAction;
  onNextAction: (key: NextActionKey, payload?: unknown) => void;
  nextActionBusy?: boolean;
  /** The partnership the profile leads with (pickCurrentPartnership), its shipment and deliverables. */
  partnership: Partnership | null;
  partnershipShipment: Shipment | null;
  partnershipContents: CreatorContent[];
}

const CAPTION = 'text-[10px] font-normal text-gray-400 uppercase tracking-widest';
const SECONDARY = 'min-h-[32px] text-xs font-normal';

// Deliverables still owed (not live, not called off).
const SETTLED_DELIVERABLES: ReadonlySet<string> = new Set(['published', 'cancelled', 'rejected']);

function deliverablesSummary(contents: CreatorContent[]): string {
  if (contents.length === 0) return 'None yet';
  const open = contents.filter((c) => !SETTLED_DELIVERABLES.has(c.status));
  // due_date is a DATEONLY string; parse it as a local calendar day.
  const nextDue = open
    .map((c) => c.due_date?.slice(0, 10))
    .filter((d): d is string => !!d)
    .sort()[0];
  const count = `${open.length} of ${contents.length} due`;
  return nextDue ? `${count} · next ${format(parseISO(nextDue), 'MMM d, yyyy')}` : count;
}

export function CreatorProfileHeader({
  creator,
  currentUser,
  fromPath,
  fromLabel,
  fromCampaignId,
  fromMyCreators,
  setLightboxOpen,
  handleReview,
  handleFindSimilar,
  findingSimilar,
  handleSendDM,
  handleSendOutreach,
  sendingEmail,
  handleSyncCreator,
  syncingProfile,
  nextAction,
  onNextAction,
  nextActionBusy = false,
  partnership,
  partnershipShipment,
  partnershipContents,
}: CreatorProfileHeaderProps) {
  const canManage = hasRole(currentUser?.role, ROLE_GROUPS.MANAGE_CREATORS);
  // Outreach email, follow-ups and DMs belong to first contact: no partnership yet,
  // creator not past "contacted".
  const reachOut = canReachOut(creator, !!partnership);
  // The engine's primary already covers sending and follow-ups; a manual (re)send
  // stays available otherwise, except while a follow-up is scheduled.
  const showEmailOutreach =
    reachOut &&
    !!creator.email &&
    nextAction.key !== 'outreach' &&
    nextAction.key !== 'follow_up' &&
    !isWaitingForFollowUp(creator.latest_outreach);
  const inShortlist =
    creator.review_status === 'shortlisted' || creator.review_status === 'pending_review';
  const partnershipOpen =
    !!partnership && !['completed', 'rejected', 'inactive'].includes(partnership.status);
  // Nothing to show for `none`; a review step has no controls for a creator marked
  // not responsive (as before), so its block goes too rather than a bare caption.
  const showNextStep =
    nextAction.key !== 'none' &&
    !(nextAction.key === 'review' && creator.lifecycle_status === 'not_respond');

  return (
    <>
      {/* Print-only Branded Header */}
      <div className="hidden print:flex items-center justify-between border-b-2 border-gray-900 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <span className="text-3xl font-extrabold tracking-widest text-primary-600 font-outfit">
            ATS
          </span>
          <span className="text-xs text-gray-400 uppercase tracking-widest border-l pl-3 border-gray-300 font-medium">
            Outreach Platform
          </span>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-gray-800 uppercase tracking-wider">
            Influencer Demographics Report
          </p>
          <p className="text-xs text-gray-400">{new Date().toLocaleDateString()}</p>
        </div>
      </div>

      {fromPath ? (
        <Link
          to={fromPath}
          className="no-print inline-flex items-center text-[10px] font-normal text-gray-400 hover:text-primary-600 transition-colors group tracking-widest uppercase mb-1"
        >
          <ArrowLeft size={14} className="mr-1 group-hover:-translate-x-1 transition-transform" />{' '}
          BACK TO {fromLabel || 'CONTENT'}
        </Link>
      ) : fromCampaignId ? (
        <Link
          to={`/campaigns/${fromCampaignId}`}
          className="no-print inline-flex items-center text-[10px] font-normal text-gray-400 hover:text-primary-600 transition-colors group tracking-widest uppercase mb-1"
        >
          <ArrowLeft size={14} className="mr-1 group-hover:-translate-x-1 transition-transform" />{' '}
          BACK TO CAMPAIGN
        </Link>
      ) : fromMyCreators || creator?.lifecycle_status === 'engaged' ? (
        <Link
          to="/my-creators"
          className="no-print inline-flex items-center text-[10px] font-normal text-gray-400 hover:text-primary-600 transition-colors group tracking-widest uppercase mb-1"
        >
          <ArrowLeft size={14} className="mr-1 group-hover:-translate-x-1 transition-transform" />{' '}
          BACK TO MY CREATORS
        </Link>
      ) : (
        <Link
          to="/creators"
          className="no-print inline-flex items-center text-[10px] font-normal text-gray-400 hover:text-primary-600 transition-colors group tracking-widest uppercase mb-1"
        >
          <ArrowLeft size={14} className="mr-1 group-hover:-translate-x-1 transition-transform" />{' '}
          BACK TO DIRECTORY
        </Link>
      )}

      <div className="bg-gradient-to-r from-gray-50 to-white px-6 sm:px-8 py-8 border-b border-gray-100 flex flex-col lg:flex-row items-start gap-6 rounded-t-[12px]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 min-w-0 flex-1">
          <div
            {...clickable(() => creator.profile_pic && setLightboxOpen(true))}
            className={`w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-primary-600 text-white flex items-center justify-center font-normal text-5xl sm:text-6xl uppercase shadow-xl shadow-primary-500/30 ring-4 ring-white font-outfit shrink-0 overflow-hidden ${creator.profile_pic ? 'cursor-zoom-in' : ''}`}
          >
            {creator.profile_pic ? (
              <img
                src={creator.profile_pic}
                alt={creator.full_name || creator.handle || ''}
                loading="lazy"
                className="w-full h-full object-cover"
              />
            ) : (
              creator.handle?.charAt(0)
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-normal text-gray-900 font-outfit uppercase tracking-tight truncate leading-tight">
              {creator.full_name || 'No full name provided'}
            </h1>
            <div className="mt-1">
              <a
                href={(() => {
                  const igProfile = creator.profiles?.find(
                    (p: any) => p.platform.toLowerCase() === 'instagram',
                  );
                  if (igProfile?.profile_url) return igProfile.profile_url;
                  if (creator.profile_url && !creator.profile_url.includes('scontent'))
                    return creator.profile_url;
                  return `https://instagram.com/${creator.handle?.replace(/^@/, '')}`;
                })()}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary-600 transition-colors flex items-center gap-2 group"
              >
                <span className="text-gray-500 font-medium text-lg truncate">
                  @{creator.handle?.replace(/^@/, '')}
                </span>
                <ExternalLink
                  size={18}
                  className="text-gray-300 group-hover:text-primary-400 transition-colors shrink-0"
                />
              </a>
            </div>
            <div className="flex flex-wrap gap-4 mt-3">
              {creator.has_instagram && (
                <a
                  href={
                    creator.profiles?.find((p: any) => p.platform.toLowerCase() === 'instagram')
                      ?.profile_url || `https://instagram.com/${creator.handle?.replace(/^@/, '')}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#E1306C] hover:scale-105 transition-transform flex items-center gap-1"
                >
                  <Instagram size={16} />
                  <span className="text-xs font-normal">Instagram</span>
                </a>
              )}
              {creator.has_youtube && (
                <a
                  href={
                    creator.profiles?.find((p: any) => p.platform.toLowerCase() === 'youtube')
                      ?.profile_url || `https://youtube.com/@${creator.handle?.replace(/^@/, '')}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#FF0000] hover:scale-105 transition-transform flex items-center gap-1"
                >
                  <Youtube size={16} />
                  <span className="text-xs font-normal">YouTube</span>
                </a>
              )}
              {creator.has_tiktok && (
                <a
                  href={
                    creator.profiles?.find((p: any) => p.platform.toLowerCase() === 'tiktok')
                      ?.profile_url || `https://tiktok.com/@${creator.handle?.replace(/^@/, '')}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="text-gray-900 hover:scale-105 transition-transform flex items-center gap-1"
                >
                  <Activity size={16} />
                  <span className="text-xs font-normal">TikTok</span>
                </a>
              )}
            </div>

            {canManage && creator.review_status === 'rejected' && (
              <div className="no-print flex items-center gap-2.5 mt-4">
                <button
                  onClick={() => handleReview('revoke')}
                  className="px-3 py-1.5 rounded-lg text-xs font-normal uppercase tracking-wider bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors font-outfit"
                  title="Revoke Rejection"
                >
                  Revoke Rejection
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col items-start lg:items-end gap-3 w-full lg:w-auto">
          <StatusBadge
            status={
              ['contacted', 'replied', 'engaged', 'qualified', 'converted', 'not_respond'].includes(
                creator.lifecycle_status || '',
              )
                ? creator.lifecycle_status
                : (creator.review_status as any) || 'pending'
            }
          />
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs font-normal text-gray-400 uppercase">Readiness:</span>
            <InfoTip text="Readiness score (0–100) estimates how well this creator fits the campaign and how likely they are to convert — based on audience size, engagement, niche/category match, and profile completeness. Higher is better." />
            <ScoreBadge score={creator.outreach_readiness_score || 0} />
          </div>
          {canManage && (
            <div className="no-print flex flex-col gap-2 w-full lg:w-64 mt-1">
              {showNextStep && <p className={CAPTION}>Next step</p>}
              {!showNextStep ? null : nextAction.key === 'review' ? (
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-gray-700">{nextAction.label}</p>
                  <Button
                    className="w-full"
                    icon={<Check size={14} aria-hidden="true" />}
                    onClick={() => handleReview('approve')}
                  >
                    Approve &amp; send outreach
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className={SECONDARY}
                      icon={
                        <Star
                          size={14}
                          aria-hidden="true"
                          fill={inShortlist ? 'currentColor' : 'none'}
                        />
                      }
                      title={inShortlist ? 'Remove from shortlist' : 'Move to the review queue'}
                      onClick={() => handleReview(inShortlist ? 'revoke' : 'shortlist')}
                    >
                      {inShortlist ? 'Shortlisted' : 'Shortlist'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className={SECONDARY}
                      icon={<X size={14} aria-hidden="true" />}
                      onClick={() => handleReview('reject')}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ) : nextAction.kind === 'action' ? (
                <Button
                  className="w-full"
                  loading={
                    nextActionBusy ||
                    (sendingEmail &&
                      (nextAction.key === 'outreach' || nextAction.key === 'follow_up'))
                  }
                  onClick={() => onNextAction(nextAction.key, nextAction.payload)}
                >
                  {nextAction.label}
                </Button>
              ) : (
                <p className="w-full min-h-[40px] inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-600">
                  {nextAction.kind === 'waiting' ? (
                    <Clock size={14} aria-hidden="true" />
                  ) : (
                    <Check size={14} aria-hidden="true" />
                  )}
                  {nextAction.label}
                </p>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                {reachOut && (
                  <Button
                    variant="outline"
                    size="sm"
                    className={SECONDARY}
                    icon={<Instagram size={14} aria-hidden="true" />}
                    onClick={handleSendDM}
                  >
                    Send DM
                  </Button>
                )}
                {showEmailOutreach && (
                  <Button
                    variant="outline"
                    size="sm"
                    className={SECONDARY}
                    icon={<Send size={14} aria-hidden="true" />}
                    loading={sendingEmail}
                    disabled={creator.review_status === 'rejected'}
                    onClick={handleSendOutreach}
                  >
                    {creator.latest_outreach ? 'Resend outreach' : 'Send outreach'}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className={SECONDARY}
                  icon={<Users size={14} aria-hidden="true" />}
                  loading={findingSimilar}
                  onClick={handleFindSimilar}
                >
                  {findingSimilar ? 'Searching…' : 'Find similar'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className={SECONDARY}
                  icon={<RefreshCw size={14} aria-hidden="true" />}
                  loading={syncingProfile}
                  onClick={handleSyncCreator}
                >
                  {syncingProfile ? 'Syncing…' : 'Sync profile'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {partnership && (
        <section
          aria-labelledby="current-partnership-heading"
          className="px-6 sm:px-8 py-5 border-b border-gray-100 bg-white"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 id="current-partnership-heading" className={`${CAPTION} flex items-center gap-2`}>
              <Handshake size={12} className="text-primary-600" aria-hidden="true" />
              {partnershipOpen ? 'Current partnership' : 'Latest partnership'}
            </h2>
            <Link
              to={`/partnerships/${partnership.id}`}
              state={{ fromCreatorId: creator.id }}
              className="no-print inline-flex items-center gap-1 text-xs text-primary-700 hover:text-primary-800 hover:underline"
            >
              Open partnership
              <ArrowRight size={12} aria-hidden="true" />
            </Link>
          </div>
          <dl className="grid grid-cols-2 md:grid-cols-[2fr_1fr_1fr_1fr_1.5fr] gap-x-6 gap-y-4">
            <div className="col-span-2 md:col-span-1 min-w-0">
              <dt className={CAPTION}>Campaign</dt>
              <dd className="mt-1 text-sm text-gray-900 break-words">
                <Link
                  to={`/campaigns/${partnership.campaign_id}`}
                  className="hover:text-primary-700 hover:underline"
                >
                  {partnership.Campaign?.name ?? 'Campaign'}
                </Link>
              </dd>
            </div>
            <div>
              <dt className={CAPTION}>Status</dt>
              <dd className="mt-1">
                <StatusBadge status={partnership.status} />
              </dd>
            </div>
            <div>
              <dt className={CAPTION}>Next step</dt>
              <dd className="mt-1 text-sm text-gray-900">{nextAction.label}</dd>
            </div>
            <div>
              <dt className={CAPTION}>Shipment</dt>
              <dd className="mt-1 text-sm text-gray-600">
                {partnershipShipment ? (
                  <StatusBadge status={partnershipShipment.status} />
                ) : partnership.shipment_included ? (
                  'Not created yet'
                ) : (
                  'Not included'
                )}
              </dd>
            </div>
            <div>
              <dt className={CAPTION}>Deliverables</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {deliverablesSummary(partnershipContents)}
              </dd>
            </div>
          </dl>
        </section>
      )}
    </>
  );
}
