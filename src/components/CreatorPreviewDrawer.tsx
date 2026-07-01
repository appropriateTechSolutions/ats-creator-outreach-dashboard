import { logger } from '../lib/logger';
import { clickable } from '../lib/a11y';
import { toast } from '../lib/toast';
import { cleanMessageText } from '../lib/formatters';
import { hasRole, ROLE_GROUPS } from '../lib/constants';
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Drawer } from './ui/Drawer';
import { Button } from './ui/Button';
import { StatusBadge } from './ui/StatusBadge';
import { ScoreBadge } from './ui/ScoreBadge';
import { Card } from './ui/Card';
import { LoadingState } from './ui/LoadingState';
import { OutreachPreviewModal } from './ui/OutreachPreviewModal';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { ImageLightbox } from './ui/ImageLightbox';
import { InfoTip } from './ui/InfoTip';
import { useAuth } from '../contexts/AuthContext';
import {
  getCreatorById,
  sendSingleOutreach,
  linkAffiliate,
  findSimilarCreators,
  previewOutreach,
  getPartnerships,
  getCreatorActivities,
  getShipments,
  updateShipment,
} from '../lib/api';
import { format } from 'date-fns';
import {
  Instagram,
  Youtube,
  Activity,
  MapPin,
  Sparkles,
  ExternalLink,
  ArrowRight,
  Check,
  Mail,
  FileText,
  Users,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  Link as LinkIcon,
  Copy,
  Calendar,
  TrendingUp,
  MousePointer2,
  ShoppingCart,
  DollarSign,
  ArrowUpRight,
  Clock,
  UserCheck,
  Send,
  RefreshCw,
  Coins,
  Truck,
  Edit3,
} from 'lucide-react';
import type { Creator } from '../types';

// Best available engagement rate for a creator (creator-level, else max across profiles).
const getEngagement = (c: Creator): number => {
  if (typeof c.engagement_rate === 'number') return c.engagement_rate;
  const fromProfiles = c.profiles?.map((p) => Number(p.engagement_rate) || 0) ?? [];
  return fromProfiles.length > 0 ? Math.max(...fromProfiles) : 0;
};

interface CreatorPreviewDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  creator: Creator | null;
  campaignId: string;
  onActionComplete?: () => void;
}

export function CreatorPreviewDrawer({
  isOpen,
  onClose,
  creator,
  campaignId,
  onActionComplete,
}: CreatorPreviewDrawerProps) {
  const { user: currentUser } = useAuth();
  const [expandedPlatforms, setExpandedPlatforms] = useState<Record<string, boolean>>({});
  const [matchExpanded, setMatchExpanded] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [findingSimilar, setFindingSimilar] = useState(false);
  const [outreachModalOpen, setOutreachModalOpen] = useState(false);
  const [outreachModalMessageType, setOutreachModalMessageType] = useState<string>('initial');

  // Full Creator State for Conversation & Outreach logs
  const [loadingFull, setLoadingFull] = useState(false);
  const [fullCreator, setFullCreator] = useState<Creator | null>(null);

  // CRM Section State
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'partnerships' | 'shipments' | 'activities'>(
    'partnerships',
  );
  const [partnerships, setPartnerships] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [creatorShipments, setCreatorShipments] = useState<any[]>([]);
  const [partnershipsLoading, setPartnershipsLoading] = useState(false);

  // Affiliate Form State
  const [isAffiliateModalOpen, setIsAffiliateModalOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [affiliateFormData, setAffiliateFormData] = useState({
    code: '',
    link: '',
  });

  const loadCrmData = async (id: string) => {
    setPartnershipsLoading(true);
    try {
      const [partsList, actsList, shipments] = await Promise.all([
        getPartnerships(),
        getCreatorActivities(id),
        getShipments({ creator_id: id }),
      ]);
      setPartnerships(
        partsList.filter(
          (p: any) =>
            String(p.creator_id) === String(id) ||
            String(p.creatorId) === String(id) ||
            String(p.Creator?.id) === String(id),
        ),
      );
      setActivities(actsList);
      setCreatorShipments(shipments);
    } catch (err) {
      logger.error('Failed to load CRM data:', err);
    } finally {
      setPartnershipsLoading(false);
    }
  };

  // Load full details dynamically when drawer opens
  useEffect(() => {
    if (isOpen && creator?.id) {
      setLoadingFull(true);
      loadCrmData(creator.id);
      getCreatorById(creator.id)
        .then((data) => {
          setFullCreator(data);
        })
        .catch((err) => {
          logger.error('Error loading full creator details for preview drawer:', err);
          setFullCreator(null);
        })
        .finally(() => {
          setLoadingFull(false);
        });
    } else {
      setFullCreator(null);
    }
  }, [isOpen, creator?.id]);

  if (!creator) return null;

  const activeCreator = fullCreator || creator;

  const refreshFullCreator = () => {
    if (!creator.id) return;
    setLoadingFull(true);
    getCreatorById(creator.id)
      .then((data) => {
        setFullCreator(data);
      })
      .catch((err) => {
        logger.error('Error refreshing creator details:', err);
      })
      .finally(() => {
        setLoadingFull(false);
      });
  };

  const togglePlatform = (key: string) => {
    setExpandedPlatforms((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Helper to clean up email signatures and quoted replies
  const isFollowUpDue = () => {
    const latest = activeCreator.latest_outreach || (activeCreator as any).latestOutreach;
    if (!latest) return false;
    if (latest.is_dismissed || latest.response_received || !latest.next_followup_at) return false;
    if (latest.follow_up_count >= 3) return false;
    return new Date(latest.next_followup_at) < new Date();
  };

  const isWaitingForFollowUp = () => {
    const latest = activeCreator.latest_outreach || (activeCreator as any).latestOutreach;
    if (!latest) return false;
    if (latest.is_dismissed || latest.response_received || !latest.next_followup_at) return false;
    if (latest.follow_up_count >= 3) return false;
    return new Date(latest.next_followup_at) >= new Date();
  };

  const handleSendOutreach = () => {
    let type = 'initial';
    const latest = activeCreator.latest_outreach || (activeCreator as any).latestOutreach;
    if (isFollowUpDue()) {
      const followUpNumber = (latest?.follow_up_count || 0) + 1;
      type = followUpNumber >= 3 ? 'final_ping' : `followup_${followUpNumber}`;
    }

    setOutreachModalMessageType(type);
    setOutreachModalOpen(true);
  };

  const getInstagramHandle = () => {
    const igProfile = activeCreator.profiles?.find((p) => p.platform.toLowerCase() === 'instagram');
    const directHandle = igProfile?.handle || activeCreator.handle;
    if (directHandle) return directHandle.replace(/^@/, '').trim();

    const profileUrl = igProfile?.profile_url || activeCreator.profile_url;
    if (!profileUrl) return '';

    try {
      const url = new URL(profileUrl);
      return url.pathname.split('/').filter(Boolean)[0] || '';
    } catch {
      return '';
    }
  };

  const handleSendDM = async () => {
    let bodyText = '';
    try {
      const preview = await previewOutreach(activeCreator.id, campaignId);
      bodyText = preview?.body || '';
    } catch (err) {
      logger.error('Failed to load outreach preview for DM:', err);
    }

    if (bodyText) {
      try {
        await navigator.clipboard.writeText(bodyText);
      } catch (clipErr) {
        logger.error('Clipboard copy failed:', clipErr);
      }
    }

    const instagramHandle = getInstagramHandle();
    let url = instagramHandle
      ? `https://ig.me/m/${encodeURIComponent(instagramHandle)}`
      : 'https://www.instagram.com/direct/inbox/';

    if (bodyText && instagramHandle) {
      url += `?text=${encodeURIComponent(bodyText)}`;
    }

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleConfirmSendOutreach = async (
    customSubject?: string,
    customBody?: string,
    messageType?: string,
  ) => {
    setSendingEmail(true);
    try {
      await sendSingleOutreach(
        activeCreator.id,
        campaignId,
        customSubject,
        customBody,
        messageType,
      );
      toast.success('Outreach email sent successfully!');
      setOutreachModalOpen(false);
      refreshFullCreator(); // Refresh conversation logs instantly!
      if (onActionComplete) onActionComplete();
    } catch (err) {
      toast.error('Failed to send outreach: ' + err);
      throw err;
    } finally {
      setSendingEmail(false);
    }
  };

  const handleFindSimilar = async () => {
    setFindingSimilar(true);
    try {
      const res: any = await findSimilarCreators(activeCreator.id, campaignId);
      toast.success(
        `✅ Success: ${res.message || '10 similar influencers found and added to this campaign!'}`,
      );
      if (onActionComplete) onActionComplete();
    } catch (err: any) {
      toast.error(err || 'Failed to find similar influencers.');
    } finally {
      setFindingSimilar(false);
    }
  };

  const handleLinkAffiliate = async () => {
    setActionLoading(true);
    try {
      await linkAffiliate({
        creator_id: activeCreator.id,
        campaign_id: campaignId,
        affiliate_code: affiliateFormData.code,
        affiliate_link: affiliateFormData.link,
      });
      setIsAffiliateModalOpen(false);
      toast.success('Affiliate assets linked successfully!');
      refreshFullCreator(); // Refresh affiliate state instantly!
      if (onActionComplete) onActionComplete();
    } catch (err) {
      toast.error('Failed to link affiliate info: ' + err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Affiliate tracking code copied to clipboard!');
  };

  // Parse scoring_notes safely
  let scoringNotes = activeCreator.scoring_notes || (activeCreator as any).scoringNotes;
  if (typeof scoringNotes === 'string') {
    try {
      scoringNotes = JSON.parse(scoringNotes);
    } catch {
      scoringNotes = {};
    }
  }
  const breakdown = (scoringNotes as any)?.initial_breakdown || {};

  const platformsList = [
    {
      key: 'instagram',
      label: 'Instagram',
      icon: <Instagram size={14} className="text-pink-600" />,
    },
    { key: 'youtube', label: 'YouTube', icon: <Youtube size={14} className="text-red-600" /> },
    { key: 'tiktok', label: 'TikTok', icon: <Activity size={14} className="text-black" /> },
  ];

  // Sort conversation messages
  const messages = [...(activeCreator.conversation?.messages || [])].sort(
    (a: any, b: any) =>
      new Date(a.message_time || a.messageTime || Date.now()).getTime() -
      new Date(b.message_time || b.messageTime || Date.now()).getTime(),
  );

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        title="Creator Preview"
        footer={
          <Link
            to={`/creators/${activeCreator.id}`}
            state={{ fromCampaignId: campaignId }}
            className="block"
          >
            <Button
              className="w-full h-12 uppercase tracking-widest text-[11px] font-normal"
              icon={<ArrowRight size={16} />}
            >
              Open Full Profile
            </Button>
          </Link>
        }
      >
        <div className="space-y-8 pb-8">
          {/* Header Section */}
          <div className="flex items-center gap-4">
            <div
              {...clickable(() => activeCreator.profile_pic && setLightboxOpen(true))}
              className={`w-16 h-16 rounded-full bg-primary-600 text-white flex flex-shrink-0 items-center justify-center font-normal text-2xl uppercase shadow-md font-outfit overflow-hidden ring-2 ring-white ${activeCreator.profile_pic ? 'cursor-zoom-in' : ''}`}
            >
              {activeCreator.profile_pic ? (
                <img
                  src={activeCreator.profile_pic}
                  alt={activeCreator.full_name || activeCreator.handle || ''}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              ) : (
                activeCreator.handle?.charAt(0)
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-xl font-normal text-gray-900 font-outfit uppercase tracking-tight truncate leading-tight">
                {activeCreator.full_name || 'No full name'}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <a
                  href={(() => {
                    const igProfile = activeCreator.profiles?.find(
                      (p) => p.platform.toLowerCase() === 'instagram',
                    );
                    if (igProfile?.profile_url) return igProfile.profile_url;
                    if (
                      activeCreator.profile_url &&
                      !activeCreator.profile_url.includes('scontent')
                    )
                      return activeCreator.profile_url;
                    return `https://instagram.com/${activeCreator.handle?.replace(/^@/, '')}`;
                  })()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-500 font-medium text-sm truncate hover:text-primary-600 transition-colors flex items-center gap-1 group"
                >
                  <span>@{activeCreator.handle?.replace(/^@/, '')}</span>
                  <ExternalLink
                    size={14}
                    className="text-gray-300 group-hover:text-primary-400 transition-colors shrink-0"
                  />
                </a>
              </div>
            </div>
          </div>

          {/* Status & Scores */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex flex-col items-center justify-center text-center">
              <p className="text-[9px] text-gray-400 uppercase tracking-widest mb-1.5 font-normal">
                Status
              </p>
              <StatusBadge
                status={
                  [
                    'contacted',
                    'replied',
                    'engaged',
                    'qualified',
                    'converted',
                    'not_respond',
                  ].includes(activeCreator.lifecycle_status || '')
                    ? activeCreator.lifecycle_status
                    : (activeCreator.review_status as any) || 'pending'
                }
              />
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex flex-col items-center justify-center text-center">
              <p className="text-[9px] text-gray-400 uppercase tracking-widest mb-1.5 font-normal inline-flex items-center justify-center gap-1">
                Relevance
                <InfoTip text="How closely this creator matches the campaign's niche, location and target audience (0–100). Higher means a better fit." />
              </p>
              <ScoreBadge score={activeCreator.relevance_score || 0} />
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex flex-col items-center justify-center text-center">
              <p className="text-[9px] text-gray-400 uppercase tracking-widest mb-1.5 font-normal inline-flex items-center justify-center gap-1">
                Engagement
                <InfoTip text="Average engagement rate — likes and comments as a share of followers. A higher rate means a more active, responsive audience." />
              </p>
              {(() => {
                const eng = getEngagement(activeCreator);
                const tone =
                  eng >= 3
                    ? 'text-success-700 bg-success-50'
                    : eng >= 1
                      ? 'text-warning-700 bg-warning-50'
                      : 'text-gray-500 bg-gray-100';
                const dot =
                  eng >= 3 ? 'bg-success-500' : eng >= 1 ? 'bg-warning-500' : 'bg-gray-400';
                return (
                  <span
                    className={`inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-sm font-normal font-outfit ${tone}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${dot}`}></span>
                    {eng > 0 ? `${eng.toFixed(2)}%` : 'N/A'}
                  </span>
                );
              })()}
            </div>
          </div>

          {/* Action Buttons */}
          {hasRole(currentUser?.role, ROLE_GROUPS.MANAGE_CREATORS) && (
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-primary-100 text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2 h-11 uppercase text-[10px] tracking-widest font-normal"
                onClick={handleFindSimilar}
                disabled={findingSimilar}
              >
                {findingSimilar ? (
                  <RefreshCw size={14} className="animate-spin text-primary-600" />
                ) : (
                  <Users size={14} className="text-primary-600" />
                )}
                {findingSimilar ? 'Searching...' : 'Find Similar'}
              </Button>
              <Button
                className="flex-1 bg-pink-600 hover:bg-pink-700 shadow-xl shadow-pink-500/20 text-white flex items-center justify-center gap-2 h-11 uppercase text-[10px] tracking-widest font-normal transition-all"
                onClick={handleSendDM}
              >
                <Instagram size={14} />
                Send DM
              </Button>
              {activeCreator.email && (
                <Button
                  className={`flex-1 ${
                    isFollowUpDue()
                      ? 'bg-amber-600 hover:bg-amber-700 shadow-lg shadow-amber-500/40 animate-pulse text-white'
                      : isWaitingForFollowUp()
                        ? 'bg-emerald-50 text-emerald-700 cursor-not-allowed shadow-none border border-emerald-200'
                        : 'bg-primary-600 hover:bg-primary-700 shadow-primary-500/20 text-white'
                  } shadow-xl flex items-center justify-center gap-2 h-11 uppercase text-[10px] tracking-widest font-normal transition-all`}
                  onClick={handleSendOutreach}
                  disabled={
                    sendingEmail ||
                    activeCreator.review_status === 'rejected' ||
                    isWaitingForFollowUp()
                  }
                >
                  {sendingEmail ? (
                    <RefreshCw size={14} className="animate-spin text-white" />
                  ) : isFollowUpDue() ? (
                    <Clock size={14} />
                  ) : isWaitingForFollowUp() ? (
                    <Check size={14} className="text-emerald-600" />
                  ) : (
                    <Send size={14} />
                  )}
                  {isFollowUpDue()
                    ? `Follow-up #${((activeCreator.latest_outreach || (activeCreator as any).latestOutreach)?.follow_up_count || 0) + 1}`
                    : isWaitingForFollowUp()
                      ? 'Sent · Awaiting Reply'
                      : activeCreator.latest_outreach || (activeCreator as any).latestOutreach
                        ? 'Resend'
                        : 'Send Outreach'}
                </Button>
              )}
            </div>
          )}

          {/* Summary Block */}
          <div className="p-4 bg-primary-50/30 rounded-xl border border-primary-100/50">
            <h4 className="text-[10px] font-normal text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
              <Sparkles size={12} className="text-primary-600" /> AI Summary
            </h4>
            <p className="text-sm text-gray-700 leading-relaxed italic border-l-2 border-primary-200 pl-3">
              {activeCreator.summary || 'AI summary not available for this lead.'}
            </p>
          </div>

          {/* Bio, Direct Contact & Location */}
          <div className="space-y-4 pt-1">
            <div className="flex gap-3">
              <div className="mt-1 text-primary-600 shrink-0">
                <FileText size={16} />
              </div>
              <div>
                <h4 className="text-[10px] font-normal text-gray-400 uppercase tracking-widest mb-0.5">
                  About / Bio
                </h4>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {activeCreator.bio || 'No biography provided.'}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="mt-1 text-primary-600 shrink-0">
                <Mail size={16} />
              </div>
              <div className="flex-1">
                <h4 className="text-[10px] font-normal text-gray-400 uppercase tracking-widest mb-0.5">
                  Direct Contact
                </h4>
                <div
                  className={`p-3 rounded-lg text-sm font-normal ${
                    activeCreator.email
                      ? 'text-gray-800 bg-transparent'
                      : 'text-amber-700 bg-amber-50 border border-amber-200'
                  }`}
                >
                  {activeCreator.email || 'Email hidden or not found'}
                </div>
                {activeCreator.has_email && (
                  <span className="text-[9px] text-green-600 font-normal flex items-center gap-1 mt-0.5">
                    <Check size={10} /> Verified Email
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <div className="mt-1 text-primary-600 shrink-0">
                <MapPin size={16} />
              </div>
              <div>
                <h4 className="text-[10px] font-normal text-gray-400 uppercase tracking-widest mb-0.5">
                  Target Location
                </h4>
                <p className="text-sm font-normal text-gray-800 capitalize">
                  {activeCreator.city
                    ? `${activeCreator.city}${activeCreator.state ? `, ${activeCreator.state}` : ''}${activeCreator.country ? `, ${activeCreator.country}` : ''}`
                    : 'Location Unknown'}
                </p>
              </div>
            </div>
          </div>

          {/* Active Platforms */}
          <div>
            <h4 className="text-[10px] font-normal text-gray-400 uppercase tracking-widest mb-3">
              Active Platforms
            </h4>
            <div className="flex gap-4">
              {activeCreator.has_instagram && (
                <a
                  href={
                    activeCreator.profiles?.find((p) => p.platform.toLowerCase() === 'instagram')
                      ?.profile_url ||
                    `https://instagram.com/${activeCreator.handle?.replace(/^@/, '')}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-[#E1306C] hover:scale-105 transition-transform cursor-pointer"
                >
                  <Instagram size={18} />
                  <span className="text-xs font-medium uppercase tracking-wider">Instagram</span>
                </a>
              )}
              {activeCreator.has_youtube && (
                <a
                  href={
                    activeCreator.profiles?.find((p) => p.platform.toLowerCase() === 'youtube')
                      ?.profile_url ||
                    `https://youtube.com/@${activeCreator.handle?.replace(/^@/, '')}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-[#FF0000] hover:scale-105 transition-transform cursor-pointer"
                >
                  <Youtube size={18} />
                  <span className="text-xs font-medium uppercase tracking-wider">YouTube</span>
                </a>
              )}
              {activeCreator.has_tiktok && (
                <a
                  href={
                    activeCreator.profiles?.find((p) => p.platform.toLowerCase() === 'tiktok')
                      ?.profile_url ||
                    `https://tiktok.com/@${activeCreator.handle?.replace(/^@/, '')}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-gray-900 hover:scale-105 transition-transform cursor-pointer"
                >
                  <Activity size={18} />
                  <span className="text-xs font-medium uppercase tracking-wider">TikTok</span>
                </a>
              )}
            </div>
          </div>

          {/* Platform-wise Score Breakdown */}
          <div className="border-t border-gray-100 pt-6">
            <h4 className="text-[10px] font-normal text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
              <UserCheck size={14} className="text-primary-600" /> Score Breakdown
            </h4>
            <div className="space-y-4">
              {platformsList.map((platform) => {
                const pData = breakdown[platform.key];
                const hasPlatform = activeCreator[`has_${platform.key}` as keyof Creator];

                if (!pData && !hasPlatform) return null;

                const score = pData?.score || 0;
                const profile = activeCreator.profiles?.find(
                  (p) => p.platform.toLowerCase() === platform.key,
                );
                const isExpanded = expandedPlatforms[platform.key];

                return (
                  <div
                    key={platform.key}
                    className="bg-gray-50 border border-gray-200 rounded-xl p-4 shadow-sm"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2 font-normal text-gray-800 text-xs uppercase tracking-wide">
                        {platform.icon} {platform.label}
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className={`text-sm font-normal ${
                            score >= 70
                              ? 'text-green-600'
                              : score >= 40
                                ? 'text-primary-600'
                                : 'text-gray-500'
                          }`}
                        >
                          {score}{' '}
                          <span className="text-[10px] text-gray-400 font-medium">/ 100</span>
                        </div>
                        <button
                          onClick={() => togglePlatform(platform.key)}
                          className="p-1 hover:bg-gray-200 rounded-full transition-colors text-gray-400"
                        >
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </div>
                    </div>

                    {profile && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-gray-200/50">
                        <div className="flex flex-col items-center justify-center text-center bg-white rounded-lg border border-gray-100 py-2.5 px-1">
                          <p className="text-[9px] font-normal text-gray-400 uppercase tracking-widest mb-1">
                            Followers
                          </p>
                          <p className="text-sm font-normal text-gray-900">
                            {profile.followers?.toLocaleString() || 'N/A'}
                          </p>
                        </div>
                        <div className="flex flex-col items-center justify-center text-center bg-white rounded-lg border border-gray-100 py-2.5 px-1">
                          <p className="text-[9px] font-normal text-gray-400 uppercase tracking-widest mb-1">
                            Engagement
                          </p>
                          <p className="text-sm font-normal text-gray-900">
                            {profile.engagement_rate
                              ? `${Number(profile.engagement_rate).toFixed(2)}%`
                              : 'N/A'}
                          </p>
                        </div>
                        <div className="flex flex-col items-center justify-center text-center bg-white rounded-lg border border-gray-100 py-2.5 px-1">
                          <p className="text-[9px] font-normal text-gray-400 uppercase tracking-widest mb-1">
                            Avg Likes
                          </p>
                          <p className="text-sm font-normal text-gray-900">
                            {profile.avg_likes?.toLocaleString() || 'N/A'}
                          </p>
                        </div>
                        <div className="flex flex-col items-center justify-center text-center bg-white rounded-lg border border-gray-100 py-2.5 px-1">
                          <p className="text-[9px] font-normal text-gray-400 uppercase tracking-widest mb-1">
                            Avg Comments
                          </p>
                          <p className="text-sm font-normal text-gray-900">
                            {profile.avg_comments?.toLocaleString() || 'N/A'}
                          </p>
                        </div>
                      </div>
                    )}

                    {isExpanded && (
                      <div className="animate-[fadeIn_0.2s_ease]">
                        {pData?.breakdown ? (
                          <div className="space-y-1.5 mt-3 pt-3 border-t border-gray-200/50">
                            {Object.entries(pData.breakdown).map(([key, val]) => (
                              <div
                                key={key}
                                className="flex justify-between items-center text-[11px]"
                              >
                                <span className="text-gray-500 capitalize">
                                  {key.replace(/_/g, ' ')}
                                </span>
                                <span className="font-normal text-gray-700">
                                  +{val as number} points
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[10px] text-gray-400 italic mt-3 pt-3 border-t border-gray-200/50">
                            No algorithm points available.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Match Breakdown */}
          <div className="border-t border-gray-100 pt-6">
            <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-normal text-gray-900 uppercase tracking-widest">
                  Total Relevance Match
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-normal text-primary-600">
                    {Math.round(Number(activeCreator.relevance_score) || 0)}%
                  </span>
                  <button
                    onClick={() => setMatchExpanded(!matchExpanded)}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-400"
                  >
                    {matchExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>
              </div>

              {matchExpanded && (
                <div className="space-y-2 pl-3 border-l-2 border-primary-100 animate-[fadeIn_0.2s_ease]">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 font-medium">City Match</span>
                    <span className="font-normal text-gray-900">
                      {Number(activeCreator.relevance_score) >= 33 ? '+33.3%' : '0%'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 font-medium">Niche Match</span>
                    <span className="font-normal text-gray-900">
                      {Number(activeCreator.relevance_score) >= 66 ? '+33.3%' : '0%'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 font-medium">Keyword Match</span>
                    <span className="font-normal text-gray-900">
                      {Number(activeCreator.relevance_score) >= 67
                        ? `+${(Number(activeCreator.relevance_score) - 66.6).toFixed(1)}%`
                        : Number(activeCreator.relevance_score) > 33 &&
                            Number(activeCreator.relevance_score) < 66
                          ? `+${(Number(activeCreator.relevance_score) - 33.3).toFixed(1)}%`
                          : '0%'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Conversation History */}
          <div className="border-t border-gray-100 pt-6">
            <h4 className="text-[10px] font-normal text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <MessageCircle size={14} className="text-primary-600" /> Conversation History
            </h4>
            <div className="max-h-[300px] overflow-y-auto p-4 rounded-xl bg-gray-50 border border-gray-200/60 space-y-4">
              {loadingFull ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2 text-gray-400">
                  <RefreshCw size={18} className="animate-spin text-primary-500" />
                  <span className="text-xs font-outfit uppercase tracking-wider text-[10px]">
                    Loading conversations...
                  </span>
                </div>
              ) : messages.length === 0 &&
                (!activeCreator.outreach_logs || activeCreator.outreach_logs.length === 0) &&
                (!(activeCreator as any).OutreachLogs ||
                  (activeCreator as any).OutreachLogs.length === 0) ? (
                <div className="text-center py-6 text-gray-400 italic text-xs">
                  No outreach or conversations found.
                </div>
              ) : (
                <div className="space-y-4 animate-[fadeIn_0.2s_ease]">
                  {(() => {
                    const combined = [
                      ...(
                        activeCreator.outreach_logs ||
                        (activeCreator as any).OutreachLogs ||
                        []
                      ).map((log: any) => {
                        const logTime =
                          log.sent_at ||
                          log.sentAt ||
                          log.created_at ||
                          log.createdAt ||
                          Date.now();
                        return {
                          type: 'outreach',
                          direction: 'outbound',
                          channel: log.channel,
                          subject: log.subject_line,
                          text: log.message_content,
                          time: new Date(logTime).getTime(),
                        };
                      }),
                      ...messages.map((msg: any) => ({
                        type: 'message',
                        direction: msg.direction,
                        channel: msg.channel,
                        subject: null as string | null,
                        text: msg.message_text,
                        time: new Date(msg.message_time || msg.messageTime || Date.now()).getTime(),
                      })),
                    ].sort((a, b) => a.time - b.time);

                    return combined.map((item, idx) => (
                      <div
                        key={idx}
                        className={`flex flex-col ${item.direction === 'inbound' ? 'items-start mr-auto' : 'items-end ml-auto'} max-w-[90%]`}
                      >
                        <div
                          className={`p-3 rounded-xl shadow-sm text-xs ${
                            item.direction === 'inbound'
                              ? 'bg-white text-gray-900 rounded-tl-none border border-gray-200'
                              : 'bg-indigo-600 text-white rounded-tr-none'
                          }`}
                        >
                          <p
                            className={`text-[9px] font-black uppercase tracking-widest mb-1 flex items-center gap-1 ${
                              item.direction === 'inbound' ? 'text-gray-500' : 'text-indigo-100'
                            }`}
                          >
                            {item.direction === 'inbound' ? 'Influencer' : 'ATS Agent'}
                          </p>
                          {item.subject && (
                            <p className="font-bold border-b pb-1 mb-1 border-gray-200">
                              Sub: {item.subject}
                            </p>
                          )}
                          <p className="whitespace-pre-wrap leading-relaxed font-medium">
                            {item.type === 'message'
                              ? cleanMessageText(item.text)
                              : item.text || 'Outreach sent.'}
                          </p>
                        </div>
                        <span className="text-[8px] text-gray-400 mt-1 font-semibold">
                          {new Date(item.time).toLocaleString()}
                        </span>
                      </div>
                    ));
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* Conditional rendering for engaged creators */}
          {[
            'engaged',
            'qualified',
            'offered',
            'accepted',
            'activated',
            'converted',
            'completed',
          ].includes(activeCreator.lifecycle_status || '') && (
            <>
              {/* Meeting Options */}
              <div className="border-t border-gray-100 pt-6">
                <h4 className="text-[10px] font-normal text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Calendar size={14} className="text-primary-600" /> Meeting Options
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-center bg-primary-50/40 rounded-xl border border-primary-100/60 py-4 flex-col gap-1">
                    <p className="text-[9px] text-primary-400 uppercase tracking-widest font-normal">
                      No meeting scheduled
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toast.info('Meeting Scheduler Integration Coming Soon')}
                    className="w-full flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 hover:bg-primary-50 hover:border-primary-200 hover:text-primary-700 shadow-sm text-[10px] uppercase tracking-widest rounded-xl py-2.5 transition-colors font-normal"
                  >
                    <Calendar size={14} className="text-primary-600" />
                    <span>Schedule Meeting</span>
                  </button>
                </div>
              </div>

              {/* Affiliate Assets */}
              <div className="border-t border-gray-100 pt-6">
                <h4 className="text-[10px] font-normal text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <LinkIcon size={14} className="text-primary-600" /> Affiliate Info
                </h4>
                {activeCreator.affiliate_code ||
                activeCreator.affiliate_link ||
                (activeCreator as any).AffiliateTracking?.affiliate_code ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <div>
                        <p className="text-[9px] font-normal text-gray-400 uppercase tracking-widest">
                          Tracking Code
                        </p>
                        <p className="text-xs font-normal text-gray-900 font-outfit uppercase">
                          {activeCreator.affiliate_code ||
                            (activeCreator as any).AffiliateTracking?.affiliate_code ||
                            '---'}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          handleCopyCode(
                            activeCreator.affiliate_code ||
                              (activeCreator as any).AffiliateTracking?.affiliate_code,
                          )
                        }
                        className="text-primary-500 hover:text-primary-700 p-1.5 hover:bg-primary-50 rounded-lg transition-colors"
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                    {hasRole(currentUser?.role, ROLE_GROUPS.MANAGE_CREATORS) && (
                      <Button
                        variant="outline"
                        className="w-full text-[10px] uppercase tracking-widest font-normal h-10"
                        onClick={() => {
                          setAffiliateFormData({
                            code:
                              activeCreator.affiliate_code ||
                              (activeCreator as any).AffiliateTracking?.affiliate_code ||
                              '',
                            link:
                              activeCreator.affiliate_link ||
                              (activeCreator as any).AffiliateTracking?.affiliate_link ||
                              '',
                          });
                          setIsAffiliateModalOpen(true);
                        }}
                      >
                        Manage Assets
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-col items-center justify-center bg-gray-50 rounded-xl border border-dashed border-gray-200 py-4 gap-1">
                      <LinkIcon size={18} className="text-gray-300" />
                      <p className="text-[9px] text-gray-400 uppercase tracking-widest">
                        No assets linked
                      </p>
                    </div>
                    {hasRole(currentUser?.role, ROLE_GROUPS.MANAGE_CREATORS) && (
                      <Button
                        className="w-full bg-primary-600 hover:bg-primary-700 shadow-md text-[10px] uppercase tracking-widest font-normal h-10"
                        onClick={() => {
                          setAffiliateFormData({ code: '', link: '' });
                          setIsAffiliateModalOpen(true);
                        }}
                      >
                        Link Assets
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* ROI Performance Metrics */}
              <div className="border-t border-gray-100 pt-6">
                <h4 className="text-[10px] font-normal text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <TrendingUp size={14} className="text-primary-600" /> Affiliate Performance
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                    <p className="text-[9px] font-normal text-gray-400 uppercase tracking-widest flex items-center gap-1">
                      <MousePointer2 size={10} /> Clicks
                    </p>
                    <p className="text-base font-normal text-gray-900 font-outfit">
                      {activeCreator.AffiliateTracking?.clicks || 0}
                    </p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                    <p className="text-[9px] font-normal text-gray-400 uppercase tracking-widest flex items-center gap-1">
                      <ShoppingCart size={10} /> Sales
                    </p>
                    <p className="text-base font-normal text-gray-900 font-outfit">
                      {activeCreator.AffiliateTracking?.conversions || 0}
                    </p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                    <p className="text-[9px] font-normal text-gray-400 uppercase tracking-widest flex items-center gap-1">
                      <DollarSign size={10} /> Revenue
                    </p>
                    <p className="text-base font-normal text-emerald-600 font-outfit">
                      $
                      {Number(
                        activeCreator.AffiliateTracking?.revenue_generated || 0,
                      ).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                    <p className="text-[9px] font-normal text-gray-400 uppercase tracking-widest flex items-center gap-1">
                      <ArrowUpRight size={10} /> Commission
                    </p>
                    <p className="text-base font-normal text-primary-600 font-outfit">
                      $
                      {Number(activeCreator.AffiliateTracking?.commission_owed || 0).toLocaleString(
                        undefined,
                        { minimumFractionDigits: 2 },
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        <Card className="no-print">
          <div className="border-b border-gray-100 bg-white rounded-t-[12px] flex items-center justify-between px-6 pt-4">
            {(['partnerships', 'shipments', 'activities'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`pb-4 text-xs font-bold uppercase tracking-widest border-b-2 transition-all cursor-pointer outline-none ${
                  activeTab === tab
                    ? 'border-primary-600 text-primary-700'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                {tab === 'partnerships'
                  ? `Campaign Partnerships (${partnerships.length})`
                  : tab === 'shipments'
                    ? `Shipments (${creatorShipments.length})`
                    : `Activity Timeline (${activities.length})`}
              </button>
            ))}
          </div>

          {activeTab === 'partnerships' && (
            <div className="p-6">
              {partnershipsLoading ? (
                <LoadingState message="Syncing partnerships..." />
              ) : partnerships.length === 0 ? (
                <div className="text-center py-12 text-gray-400 italic text-sm font-outfit">
                  No campaign partnerships found for this creator yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[700px]">
                    <thead>
                      <tr className="text-[10px] font-normal text-gray-400 uppercase tracking-widest border-b border-gray-100 bg-gray-50/50">
                        <th className="px-4 py-3">Campaign</th>
                        <th className="px-4 py-3 text-center">Status</th>
                        <th className="px-4 py-3 text-center">Tier</th>
                        <th className="px-4 py-3">Offer parameters</th>
                        <th className="px-4 py-3 text-center">Start Date</th>
                        <th className="px-4 py-3 text-center">End Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {partnerships.map((p) => (
                        <tr
                          key={p.id}
                          onClick={() =>
                            navigate(`/partnerships/${p.id}`, {
                              state: { fromCreatorId: activeCreator.id },
                            })
                          }
                          className="hover:bg-primary-50/10 transition-colors cursor-pointer"
                        >
                          <td className="px-4 py-4 align-middle">
                            <div className="text-xs font-normal text-gray-900 font-outfit uppercase tracking-tight">
                              {p.Campaign?.name}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center align-middle">
                            <StatusBadge status={p.status} />
                          </td>
                          <td className="px-4 py-4 text-center align-middle">
                            <span className="px-2 py-0.5 rounded text-[10px] font-normal bg-gray-100 text-gray-600 uppercase tracking-wider">
                              {p.creator_tier?.replace('_', ' ') || 'unknown'}
                            </span>
                          </td>
                          <td className="px-4 py-4 align-middle text-xs">
                            {p.offer_type ? (
                              <div className="space-y-1">
                                <div className="font-medium text-gray-800 uppercase flex items-center gap-1">
                                  <Coins size={10} className="text-amber-500" />{' '}
                                  {p.offer_type.replace('_', ' ')}
                                </div>
                                {p.flat_fee > 0 && (
                                  <div className="text-gray-500">
                                    ${p.flat_fee} {p.currency}
                                  </div>
                                )}
                                {p.affiliate_enabled && (
                                  <div className="text-primary-600 bg-primary-50/50 border border-primary-100/50 rounded px-1.5 py-0.5 inline-block text-[9px] uppercase font-mono mt-0.5">
                                    Code: {p.affiliate_code || '---'} ({p.affiliate_percentage || 0}
                                    %)
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400 italic">No offer drafted</span>
                            )}
                          </td>
                          <td className="px-4 py-4 text-center align-middle text-[11px] text-gray-500 font-mono">
                            {p.start_date ? format(new Date(p.start_date), 'MMM d, yyyy') : '---'}
                          </td>
                          <td className="px-4 py-4 text-center align-middle text-[11px] text-gray-500 font-mono">
                            {p.end_date ? format(new Date(p.end_date), 'MMM d, yyyy') : '---'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'shipments' && (
            <div className="p-6 space-y-4">
              {creatorShipments.length === 0 ? (
                <div className="text-center py-12 text-gray-400 italic text-sm font-outfit">
                  No shipments dispatched to this creator yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[800px]">
                    <thead>
                      <tr className="text-[10px] font-normal text-gray-400 uppercase tracking-widest border-b border-gray-100 bg-gray-50/50">
                        <th className="px-4 py-3">Campaign</th>
                        <th className="px-4 py-3">Product Name</th>
                        <th className="px-4 py-3">Recipient</th>
                        <th className="px-4 py-3 text-center">Status</th>
                        <th className="px-4 py-3">Tracking</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 bg-white">
                      {creatorShipments.map((s) => (
                        <tr
                          key={s.id}
                          onClick={() =>
                            navigate(`/shipments/${s.id}`, {
                              state: { fromCreatorId: activeCreator.id },
                            })
                          }
                          className="hover:bg-primary-50/10 transition-colors cursor-pointer"
                        >
                          <td className="px-4 py-4 align-middle text-xs font-medium text-gray-800">
                            {s.Campaign?.name}
                          </td>
                          <td className="px-4 py-4 align-middle">
                            <div className="text-xs font-medium text-gray-800">
                              {s.product_name}
                            </div>
                            <div className="text-[10px] text-gray-400">
                              Qty: {s.quantity} {s.product_sku ? `(SKU: ${s.product_sku})` : ''}
                            </div>
                          </td>
                          <td className="px-4 py-4 align-middle">
                            <div className="text-xs text-gray-800">{s.recipient_name}</div>
                            <div
                              className="text-[10px] text-gray-500 truncate max-w-[180px]"
                              title={s.shipping_address_line1}
                            >
                              {s.shipping_address_line1}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center align-middle">
                            <StatusBadge status={s.status} />
                          </td>
                          <td className="px-4 py-4 align-middle">
                            {s.tracking_number ? (
                              <div>
                                <div className="text-xs font-mono font-medium text-gray-800 flex items-center gap-1">
                                  <Truck size={10} className="text-gray-400" /> {s.carrier}:{' '}
                                  {s.tracking_number}
                                </div>
                                {s.tracking_url && (
                                  <a
                                    href={s.tracking_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[10px] text-primary-600 hover:underline inline-flex items-center gap-0.5 mt-0.5"
                                  >
                                    Track <ExternalLink size={8} />
                                  </a>
                                )}
                              </div>
                            ) : (
                              <span className="text-[10px] text-gray-400 italic">
                                No tracking info
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'activities' && (
            <div className="p-6">
              {activities.length === 0 ? (
                <div className="text-center py-12 text-gray-400 italic text-sm font-outfit">
                  No activities logged for this creator yet.
                </div>
              ) : (
                <div className="flow-root animate-[fadeIn_0.2s_ease]">
                  <ul className="-mb-8">
                    {activities.map((act, actIdx) => (
                      <li key={act.id}>
                        <div className="relative pb-8">
                          {actIdx !== activities.length - 1 ? (
                            <span
                              className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                              aria-hidden="true"
                            />
                          ) : null}
                          <div className="relative flex space-x-3">
                            <div>
                              <span className="h-8 w-8 rounded-full bg-primary-50 border border-primary-100 flex items-center justify-center text-primary-600 shadow-sm">
                                <Activity size={14} />
                              </span>
                            </div>
                            <div className="flex-1 min-w-0 pt-1.5 flex justify-between space-x-4">
                              <div>
                                <p className="text-xs text-gray-800 font-medium">
                                  {act.description}{' '}
                                  {act.Campaign && (
                                    <span className="font-semibold text-gray-900 uppercase tracking-tight text-[11px]">
                                      ({act.Campaign.name})
                                    </span>
                                  )}
                                </p>
                                {act.metadata && Object.keys(act.metadata).length > 0 && (
                                  <div className="mt-1 text-[10px] text-gray-400 font-mono">
                                    {JSON.stringify(act.metadata)}
                                  </div>
                                )}
                              </div>
                              <div className="text-right text-[10px] whitespace-nowrap text-gray-400 font-mono">
                                {format(
                                  new Date(act.created_at || act.createdAt),
                                  'MMM d, yyyy HH:mm',
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </Card>
      </Drawer>

      <ImageLightbox
        src={lightboxOpen ? activeCreator.profile_pic || null : null}
        alt={activeCreator.full_name || activeCreator.handle || ''}
        onClose={() => setLightboxOpen(false)}
      />

      {outreachModalOpen && (
        <OutreachPreviewModal
          creatorId={activeCreator.id}
          campaignId={campaignId}
          messageType={outreachModalMessageType}
          isOpen={outreachModalOpen}
          onClose={() => setOutreachModalOpen(false)}
          onSend={handleConfirmSendOutreach}
        />
      )}

      {/* Link Affiliate Modal */}
      {isAffiliateModalOpen && (
        <Modal
          isOpen={isAffiliateModalOpen}
          onClose={() => setIsAffiliateModalOpen(false)}
          title="Link Affiliate Assets"
        >
          <div className="space-y-4 p-4">
            <div>
              <label
                htmlFor="creatorpreviewdrawer-2001"
                className="block text-xs font-normal text-gray-500 uppercase tracking-widest mb-1.5 font-outfit"
              >
                Affiliate Code *
              </label>
              <Input
                id="creatorpreviewdrawer-2001"
                required
                value={affiliateFormData.code}
                onChange={(e) =>
                  setAffiliateFormData({ ...affiliateFormData, code: e.target.value })
                }
                placeholder="e.g. ATS_INFLUENCER_10"
              />
            </div>
            <div>
              <label
                htmlFor="creatorpreviewdrawer-2002"
                className="block text-xs font-normal text-gray-500 uppercase tracking-widest mb-1.5 font-outfit"
              >
                Affiliate Link
              </label>
              <Input
                id="creatorpreviewdrawer-2002"
                value={affiliateFormData.link}
                onChange={(e) =>
                  setAffiliateFormData({ ...affiliateFormData, link: e.target.value })
                }
                placeholder="https://brand.com/discount?code=..."
              />
            </div>
            <div className="flex justify-end gap-3 pt-3 border-t">
              <Button
                variant="outline"
                onClick={() => setIsAffiliateModalOpen(false)}
                className="uppercase tracking-widest text-[10px] font-normal"
              >
                Cancel
              </Button>
              <Button
                onClick={handleLinkAffiliate}
                disabled={actionLoading || !affiliateFormData.code}
                className="bg-primary-600 hover:bg-primary-700 text-white uppercase tracking-widest text-[10px] font-normal"
              >
                {actionLoading ? 'Saving...' : 'Link Assets'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
