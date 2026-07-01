import { clickable } from '../../lib/a11y';
import { hasRole, ROLE_GROUPS } from '../../lib/constants';
import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
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
} from 'lucide-react';
import { Card } from '../ui/Card';
import { StatusBadge } from '../ui/StatusBadge';
import { ScoreBadge } from '../ui/ScoreBadge';
import { InfoTip } from '../ui/InfoTip';
import { Button } from '../ui/Button';
import { LoadingState } from '../ui/LoadingState';

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
  handleSendOutreach: () => void;
  sendingEmail: boolean;
  isFollowUpDue: () => boolean;
  isWaitingForFollowUp: () => boolean;
  handleSyncCreator: () => void;
  syncingProfile: boolean;
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
  isFollowUpDue,
  isWaitingForFollowUp,
  handleSyncCreator,
  syncingProfile,
}: CreatorProfileHeaderProps) {
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

            {hasRole(currentUser?.role, ROLE_GROUPS.MANAGE_CREATORS) && (
              <div className="no-print flex items-center gap-2.5 mt-4">
                {creator.review_status === 'rejected' && (
                  <button
                    onClick={() => handleReview('revoke')}
                    className="px-3 py-1.5 rounded-lg text-xs font-normal uppercase tracking-wider bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors font-outfit"
                    title="Revoke Rejection"
                  >
                    Revoke Rejection
                  </button>
                )}
                {creator.review_status !== 'approved' &&
                  creator.review_status !== 'rejected' &&
                  creator.lifecycle_status !== 'not_respond' && (
                    <>
                      <button
                        onClick={() => handleReview('approve')}
                        className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors flex items-center justify-center shadow-sm"
                        title="Approve & Send Outreach"
                      >
                        <Check size={18} />
                      </button>
                      <button
                        onClick={() => handleReview('reject')}
                        className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors flex items-center justify-center shadow-sm"
                        title="Reject"
                      >
                        <X size={18} />
                      </button>
                      <button
                        onClick={() =>
                          handleReview(
                            creator.review_status === 'shortlisted' ||
                              creator.review_status === 'pending_review'
                              ? 'revoke'
                              : 'shortlist',
                          )
                        }
                        className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors flex items-center justify-center shadow-sm"
                        title={
                          creator.review_status === 'shortlisted' ||
                          creator.review_status === 'pending_review'
                            ? 'Remove from Shortlist'
                            : 'Shortlist → Move to Review Queue'
                        }
                      >
                        <Star
                          size={18}
                          fill={
                            creator.review_status === 'shortlisted' ||
                            creator.review_status === 'pending_review'
                              ? 'currentColor'
                              : 'none'
                          }
                        />
                      </button>
                    </>
                  )}
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
          {hasRole(currentUser?.role, ROLE_GROUPS.MANAGE_CREATORS) && (
            <div className="no-print flex flex-col gap-2 w-full mt-1">
              <Button
                variant="outline"
                className="w-full border-primary-100 text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2 h-10 uppercase text-[10px] tracking-widest font-normal"
                onClick={handleFindSimilar}
                disabled={findingSimilar}
              >
                {findingSimilar ? (
                  <RefreshCw size={13} className="animate-spin text-primary-600" />
                ) : (
                  <Users size={13} className="text-primary-600" />
                )}
                {findingSimilar ? 'Searching...' : 'Find Similar'}
              </Button>
              <Button
                className="w-full bg-pink-600 hover:bg-pink-700 shadow-pink-500/20 text-white flex items-center justify-center gap-2 h-10 uppercase text-[10px] tracking-widest font-normal transition-all shadow-sm"
                onClick={handleSendDM}
              >
                <Instagram size={13} />
                Send DM
              </Button>
              {creator.email && (
                <Button
                  className={`w-full ${
                    isFollowUpDue()
                      ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/40 animate-pulse text-white'
                      : isWaitingForFollowUp()
                        ? 'bg-emerald-50 text-emerald-700 cursor-not-allowed border border-emerald-200'
                        : 'bg-primary-600 hover:bg-primary-700 shadow-primary-500/20 text-white'
                  } flex items-center justify-center gap-2 h-10 uppercase text-[10px] tracking-widest font-normal transition-all shadow-sm`}
                  onClick={handleSendOutreach}
                  disabled={
                    sendingEmail || creator.review_status === 'rejected' || isWaitingForFollowUp()
                  }
                >
                  {sendingEmail ? (
                    <LoadingState mini />
                  ) : isFollowUpDue() ? (
                    <Clock size={13} />
                  ) : isWaitingForFollowUp() ? (
                    <Check size={13} className="text-emerald-600" />
                  ) : (
                    <Send size={13} />
                  )}
                  {isFollowUpDue()
                    ? `Follow-up #${(creator.latest_outreach?.follow_up_count || 0) + 1}`
                    : isWaitingForFollowUp()
                      ? 'Sent · Awaiting Reply'
                      : creator.latest_outreach
                        ? 'Resend'
                        : 'Send Outreach'}
                </Button>
              )}
              <Button
                variant="outline"
                className="w-full border-gray-200 text-gray-750 hover:bg-gray-50 flex items-center justify-center gap-2 h-10 uppercase text-[10px] tracking-widest font-normal transition-all"
                onClick={handleSyncCreator}
                disabled={syncingProfile}
              >
                {syncingProfile ? (
                  <RefreshCw size={13} className="animate-spin text-primary-600" />
                ) : (
                  <RefreshCw size={13} className="text-gray-550" />
                )}
                {syncingProfile ? 'Syncing...' : 'Sync Profile'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
