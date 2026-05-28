import { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { getCreatorById, getCampaignById, reviewLead, sendSingleOutreach, linkAffiliate, findSimilarCreators, previewOutreach, regenerateCreatorSummary } from '../lib/api';
import type { Creator, Campaign } from '../types';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { ScoreBadge } from '../components/ui/ScoreBadge';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Button } from '../components/ui/Button';
import { ArrowLeft, Instagram, Youtube, UserCheck, Activity, Check, X, Mail, MapPin, ExternalLink, FileText, Users, Send, RefreshCw, Sparkles, MessageCircle, ChevronDown, ChevronUp, Link as LinkIcon, Copy, Tag, Calendar, TrendingUp, MousePointer2, ShoppingCart, DollarSign, ArrowUpRight, Clock } from 'lucide-react';
import { OutreachPreviewModal } from '../components/ui/OutreachPreviewModal';
import { LoadingState } from '../components/ui/LoadingState';
import { useAuth } from '../contexts/AuthContext';

export default function CreatorDetail() {
  const { user: currentUser } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [creator, setCreator] = useState<Creator | null>(null);
  const [, setCampaign] = useState<Campaign | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [outreachModalOpen, setOutreachModalOpen] = useState(false);
  const [outreachModalMessageType, setOutreachModalMessageType] = useState<string>('initial');
  const [expandedPlatforms, setExpandedPlatforms] = useState<Record<string, boolean>>({});
  const [matchExpanded, setMatchExpanded] = useState(false);
  const [findingSimilar, setFindingSimilar] = useState(false);
  const [regeneratingSummary, setRegeneratingSummary] = useState(false);

  // Affiliate Form State
  const [isAffiliateModalOpen, setIsAffiliateModalOpen] = useState(false);
  const [affiliateFormData, setAffiliateFormData] = useState({
    code: '',
    link: ''
  });

  const togglePlatform = (key: string) => {
    setExpandedPlatforms(prev => ({ ...prev, [key]: !prev[key] }));
  };


  // Helper to clean up email signatures and quoted replies
  const cleanMessageText = (text: string) => {
    if (!text) return '';
    // Normalize all line endings first and remove carriage returns
    const normalizedText = text.replace(/\r/g, '');
    const lines = normalizedText.split('\n');
    const cleanedLines = [];
    
    for (let line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine && cleanedLines.length === 0) continue; 

      // Aggressive stop for any common email reply headers
      // We look for these anywhere in the line now for maximum safety
      if (
        /^\s*(On|From|Sent|To|Subject):/i.test(trimmedLine) || 
        /wrote:$/i.test(trimmedLine) ||
        trimmedLine.includes('Original Message') ||
        trimmedLine.startsWith('---') ||
        trimmedLine.startsWith('___')
      ) {
        break;
      }
      
      // Skip quoted lines
      if (trimmedLine.startsWith('>') || trimmedLine.startsWith('>>')) {
        continue;
      }
      
      cleanedLines.push(line);
    }
    
    return cleanedLines.join('\n').trim();
  };

  const loadData = () => {
    if (!id) return;
    setLoading(true);
    
    getCreatorById(id)
      .then(async (data) => {
        setCreator(data);
        
        // Use the messages already bundled in the creator data
        if (data.conversation?.messages) {
          // Sort messages by time ASC
          const sorted = [...data.conversation.messages].sort((a: any, b: any) => 
            new Date(a.message_time).getTime() - new Date(b.message_time).getTime()
          );
          setMessages(sorted);
        }

        if (data.campaign_id) {
          try {
            const camp = await getCampaignById(data.campaign_id);
            setCampaign(camp);
          } catch (e) {
            console.error('No campaign found for lead');
          }
        }
      })
      .catch((err) => {
        console.error(err);
        setError(err.toString());
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleReview = async (action: 'approve' | 'reject' | 'shortlist' | 'revoke') => {
    if (!creator) return;

    if (action === 'approve') {
      handleSendOutreach();
      return;
    }

    const previousCreator = { ...creator };

    // Optimistically update the UI state immediately
    setCreator(prev => {
      if (!prev) return null;
      if (action === 'revoke') {
        return { ...prev, review_status: 'hold', lifecycle_status: 'new' };
      } else if (action === 'reject') {
        return { ...prev, review_status: 'rejected' };
      } else if (action === 'shortlist') {
        return { ...prev, review_status: 'shortlisted' };
      }
      return prev;
    });

    try {
      await reviewLead(creator.id, action);
      loadData();
    } catch (err) {
      setCreator(previousCreator); // Revert state on error
      alert('Action failed: ' + err);
    }
  };

  const handleSendOutreach = () => {
    if (!creator) return;

    let type = 'initial';
    if (isFollowUpDue()) {
      const followUpNumber = (creator.latest_outreach?.follow_up_count || 0) + 1;
      type = followUpNumber >= 3 ? 'final_ping' : `followup_${followUpNumber}`;
    }

    setOutreachModalMessageType(type);
    setOutreachModalOpen(true);
  };

  const getInstagramHandle = () => {
    if (!creator) return '';

    const igProfile = creator.profiles?.find(p => p.platform.toLowerCase() === 'instagram');
    const directHandle = igProfile?.handle || creator.handle;
    if (directHandle) return directHandle.replace(/^@/, '').trim();

    const profileUrl = igProfile?.profile_url || creator.profile_url;
    if (!profileUrl) return '';

    try {
      const url = new URL(profileUrl);
      return url.pathname.split('/').filter(Boolean)[0] || '';
    } catch {
      return '';
    }
  };

  const handleSendDM = async () => {
    if (!creator) return;

    let bodyText = '';
    try {
      const preview = await previewOutreach(creator.id, creator.campaign_id || undefined);
      bodyText = preview?.body || '';
    } catch (err) {
      console.error('Failed to load outreach preview for DM:', err);
    }

    if (bodyText) {
      try {
        await navigator.clipboard.writeText(bodyText);
      } catch (clipErr) {
        console.error('Clipboard copy failed:', clipErr);
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

  const handleConfirmSendOutreach = async (customSubject?: string, customBody?: string, messageType?: string) => {
    if (!creator) return;
    setSendingEmail(true);
    try {
      await sendSingleOutreach(creator.id, creator.campaign_id || undefined, customSubject, customBody, messageType);
      alert('Outreach email sent successfully!');
      loadData();
    } catch (err) {
      alert('Failed to send outreach: ' + err);
      throw err;
    } finally {
      setSendingEmail(false);
    }
  };

  const isFollowUpDue = () => {
    const latest = creator?.latest_outreach;
    if (!latest) return false;
    if (latest.is_dismissed || latest.response_received || !latest.next_followup_at) return false;
    if ((latest.follow_up_count ?? 0) >= 3) return false; // Never suggest a 4th follow-up
    return new Date(latest.next_followup_at) < new Date();
  };

  const isWaitingForFollowUp = () => {
    const latest = creator?.latest_outreach;
    if (!latest) return false;
    if (latest.is_dismissed || latest.response_received || !latest.next_followup_at) return false;
    if ((latest.follow_up_count ?? 0) >= 3) return false;
    return new Date(latest.next_followup_at) >= new Date();
  };

  const handleRegenerateSummary = async () => {
    if (!creator || regeneratingSummary) return;
    setRegeneratingSummary(true);
    try {
      const res = await regenerateCreatorSummary(creator.id);
      setCreator(prev => prev ? { ...prev, notes: res.notes } : prev);
    } catch (err: any) {
      alert(err?.message || err || 'Failed to regenerate summary.');
    } finally {
      setRegeneratingSummary(false);
    }
  };

  const handleFindSimilar = async () => {
    if (!creator || !creator.campaign_id) {
      alert("This creator must be part of a campaign to find similar influencers.");
      return;
    }
    
    setFindingSimilar(true);
    try {
      const res: any = await findSimilarCreators(creator.id, creator.campaign_id);
      alert(`✅ Success: ${res.message || '10 similar influencers found and added to this campaign!'}`);
    } catch (err: any) {
      alert(err || "Failed to find similar influencers.");
    } finally {
      setFindingSimilar(false);
    }
  };

  const handleLinkAffiliate = async () => {
    if (!creator || !creator.campaign_id) return;
    setActionLoading(true);
    try {
      await linkAffiliate({
        creator_id: creator.id,
        campaign_id: creator.campaign_id,
        affiliate_code: affiliateFormData.code,
        affiliate_link: affiliateFormData.link
      });
      setIsAffiliateModalOpen(false);
      loadData();
    } catch (err) {
      alert('Failed to link affiliate info: ' + err);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-20">
        <LoadingState message="Loading Creator Profile..." />
      </div>
    );
  }

  if (error || !creator) {
    return (
      <div className="p-12 text-center">
        <div className="text-error-500 font-normal text-lg mb-4">{error || 'Creator not found.'}</div>
        <Link to="/creators" className="text-primary-600 hover:underline">Return to Directory</Link>
      </div>
    );
  }

  // Parse scoring_notes safely (handle both snake_case and camelCase)
  let scoringNotes = creator.scoring_notes || (creator as any).scoringNotes;
  if (typeof scoringNotes === 'string') {
    try { scoringNotes = JSON.parse(scoringNotes); } catch { scoringNotes = {}; }
  }
  const breakdown = (scoringNotes as any)?.initial_breakdown || {};
  
  // Available platforms to check
  const platforms = [
    { key: 'instagram', label: 'Instagram', icon: <Instagram size={14} className="text-pink-600"/> },
    { key: 'youtube', label: 'YouTube', icon: <Youtube size={14} className="text-red-600"/> },
    { key: 'tiktok', label: 'TikTok', icon: <Activity size={14} className="text-black"/> }
  ];

  const location = useLocation();
  const fromCampaignId = (location.state as any)?.fromCampaignId;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-[fadeIn_0.3s_ease] px-4 sm:px-0">
      {fromCampaignId ? (
        <Link to={`/campaigns/${fromCampaignId}`} className="inline-flex items-center text-[10px] font-normal text-gray-400 hover:text-primary-600 transition-colors group tracking-widest uppercase mb-1">
          <ArrowLeft size={14} className="mr-1 group-hover:-translate-x-1 transition-transform" /> BACK TO CAMPAIGN
        </Link>
      ) : (
        <Link to="/creators" className="inline-flex items-center text-[10px] font-normal text-gray-400 hover:text-primary-600 transition-colors group tracking-widest uppercase mb-1">
          <ArrowLeft size={14} className="mr-1 group-hover:-translate-x-1 transition-transform" /> BACK TO DIRECTORY
        </Link>
      )}

      <Card>
        <div className="bg-gradient-to-r from-gray-50 to-white px-6 sm:px-8 py-8 border-b border-gray-100 flex flex-col lg:flex-row items-start gap-6 rounded-t-[12px]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 min-w-0 flex-1">
             <div className="w-20 h-20 rounded-full bg-primary-600 text-white flex items-center justify-center font-normal text-4xl uppercase shadow-lg shadow-primary-500/30 ring-4 ring-white font-outfit shrink-0">
               {creator.handle?.charAt(0)}
             </div>
            <div className="min-w-0">
               <h1 className="text-2xl sm:text-3xl font-normal text-gray-900 font-outfit uppercase tracking-tight truncate leading-tight">
                 {creator.full_name || 'No full name provided'}
               </h1>
               <div className="mt-1">
                 <a 
                  href={
                    (() => {
                      const igProfile = creator.profiles?.find(p => p.platform.toLowerCase() === 'instagram');
                      if (igProfile?.profile_url) return igProfile.profile_url;
                      if (creator.profile_url && !creator.profile_url.includes('scontent')) return creator.profile_url;
                      return `https://instagram.com/${creator.handle?.replace(/^@/, '')}`;
                    })()
                  } 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-primary-600 transition-colors flex items-center gap-2 group"
                >
                  <span className="text-gray-500 font-medium text-lg truncate">@{creator.handle?.replace(/^@/, '')}</span>
                  <ExternalLink size={18} className="text-gray-300 group-hover:text-primary-400 transition-colors shrink-0" />
                </a>
               </div>
              <div className="flex flex-wrap gap-4 mt-3">
                {creator.has_instagram && (
                  <a 
                    href={creator.profiles?.find(p => p.platform.toLowerCase() === 'instagram')?.profile_url || `https://instagram.com/${creator.handle?.replace(/^@/, '')}`} 
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
                    href={creator.profiles?.find(p => p.platform.toLowerCase() === 'youtube')?.profile_url || `https://youtube.com/@${creator.handle?.replace(/^@/, '')}`} 
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
                    href={creator.profiles?.find(p => p.platform.toLowerCase() === 'tiktok')?.profile_url || `https://tiktok.com/@${creator.handle?.replace(/^@/, '')}`} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-gray-900 hover:scale-105 transition-transform flex items-center gap-1"
                  >
                    <Activity size={16} />
                     <span className="text-xs font-normal">TikTok</span>
                  </a>
                )}
              </div>
              
              <div className="flex flex-wrap gap-2 mt-3">
                {[...new Set(creator.category?.split(',').map(c => c.trim()).filter(Boolean))].map((c, index) => (
                   <span key={`${c}-${index}`} className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded text-xs font-normal uppercase tracking-wider">{c}</span>
                ))}
              </div>

              {['super_admin', 'admin', 'operator', 'client_admin', 'client_marketing'].includes(currentUser?.role || '') && (
                <div className="flex items-center gap-2 mt-4">
                  {creator.review_status === 'rejected' && (
                    <button
                      onClick={() => handleReview('revoke')}
                      className="px-3 py-1.5 rounded text-xs font-normal uppercase tracking-wider bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors font-outfit"
                      title="Revoke Rejection"
                    >
                      Revoke
                    </button>
                  )}
                  {creator.review_status !== 'approved' && creator.review_status !== 'rejected' && creator.review_status !== 'shortlisted' && creator.review_status !== 'pending_review' && creator.lifecycle_status !== 'not_respond' && (
                    <>
                      <button 
                        onClick={() => handleReview('approve')}
                        className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors flex items-center justify-center gap-1.5 text-xs font-normal font-outfit uppercase tracking-wider px-3"
                        title="Approve & Send Outreach"
                      >
                        <Check size={14} /> Approve
                      </button>
                      <button 
                        onClick={() => handleReview('reject')}
                        className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors flex items-center justify-center gap-1.5 text-xs font-normal font-outfit uppercase tracking-wider px-3"
                        title="Reject"
                      >
                        <X size={14} /> Reject
                      </button>
                      <button
                        onClick={() => handleReview('shortlist')}
                        className="px-3 py-1.5 rounded-lg text-xs font-normal uppercase tracking-wider bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors font-outfit"
                        title="Shortlist"
                      >
                        Shortlist
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col items-start lg:items-end gap-3 w-full lg:w-auto">
            <StatusBadge status={['not_respond'].includes(creator.lifecycle_status || '') ? creator.lifecycle_status : (creator.review_status as any || 'pending')} />
            <div className="flex items-center gap-2 mt-2">
               <span className="text-xs font-normal text-gray-400 uppercase">Readiness:</span>
               <ScoreBadge score={creator.outreach_readiness_score || 0} />
            </div>
            {['super_admin', 'admin', 'operator', 'client_admin', 'client_marketing'].includes(currentUser?.role || '') && (
              <div className="flex flex-col gap-2 w-full mt-1">
                <Button
                  variant="outline"
                  className="w-full border-primary-100 text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2 h-10 uppercase text-[10px] tracking-widest font-normal"
                  onClick={handleFindSimilar}
                  disabled={findingSimilar}
                >
                  {findingSimilar ? <RefreshCw size={13} className="animate-spin text-primary-600" /> : <Users size={13} className="text-primary-600" />}
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
                        ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/40 animate-pulse'
                        : isWaitingForFollowUp()
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed border border-gray-300'
                          : 'bg-primary-600 hover:bg-primary-700 shadow-primary-500/20 text-white'
                    } flex items-center justify-center gap-2 h-10 uppercase text-[10px] tracking-widest font-normal transition-all shadow-sm`}
                    onClick={handleSendOutreach}
                    disabled={sendingEmail || creator.review_status === 'rejected' || isWaitingForFollowUp()}
                  >
                    {sendingEmail ? <LoadingState mini /> : (isFollowUpDue() ? <Clock size={13} /> : isWaitingForFollowUp() ? <Clock size={13} className="text-gray-400" /> : <Send size={13} />)}
                    {isFollowUpDue()
                      ? `Follow-up #${(creator.latest_outreach?.follow_up_count || 0) + 1}`
                      : isWaitingForFollowUp()
                        ? 'Waiting...'
                        : (creator.latest_outreach ? 'Resend' : 'Send Outreach')}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Creator Insights Section (Summary, Bio, Email, Location) */}
        <div className="px-8 py-6 bg-primary-50/30 border-b border-gray-100">
           <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[10px] font-normal text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <Sparkles size={12} className="text-primary-600" /> SUMMARY
                </h4>
                {['super_admin', 'admin', 'operator', 'client_admin', 'client_marketing'].includes(currentUser?.role || '') && (
                  <button
                    type="button"
                    onClick={handleRegenerateSummary}
                    disabled={regeneratingSummary}
                    className="text-[10px] font-normal text-gray-400 hover:text-primary-600 uppercase tracking-widest flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Regenerate summary using the latest enriched data"
                  >
                    <RefreshCw size={11} className={regeneratingSummary ? 'animate-spin' : ''} />
                    {regeneratingSummary ? 'Regenerating...' : 'Regenerate'}
                  </button>
                )}
              </div>
              <p className="text-sm text-gray-700 leading-relaxed italic border-l-2 border-primary-200 pl-4 whitespace-pre-wrap">
                {regeneratingSummary
                  ? 'Re-analyzing creator with latest data…'
                  : (creator.notes || "AI is analyzing this creator's profile and generating a professional summary...")}
              </p>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="flex gap-3">
                <div className="mt-1 text-primary-600"><FileText size={18} /></div>
                <div>
                  <h4 className="text-[10px] font-normal text-gray-400 uppercase tracking-widest mb-1">About / Bio</h4>
                  <p className="text-sm text-gray-700 leading-relaxed italic">
                    {creator.bio || "No bio available for this creator."}
                  </p>
                </div>
             </div>
             <div className="flex gap-3">
                <div className="mt-1 text-primary-600"><Mail size={18} /></div>
                <div className="flex-1">
                  <h4 className="text-[10px] font-normal text-gray-400 uppercase tracking-widest mb-1">Direct Contact</h4>
                  <div className={`p-3 rounded-lg text-sm font-normal ${
                    creator.email
                      ? 'text-gray-800 bg-transparent'
                      : 'text-amber-700 bg-amber-50 border border-amber-200'
                  }`}>
                    {creator.email || "📧 Email hidden or not found"}
                  </div>
                  {creator.has_email && <span className="text-[10px] text-green-600 font-normal flex items-center gap-1 mt-1"><Check size={10} /> Verified Email</span>}
                </div>
             </div>
             <div className="flex gap-3">
                <div className="mt-1 text-primary-600"><MapPin size={18} /></div>
                <div>
                  <h4 className="text-[10px] font-normal text-gray-400 uppercase tracking-widest mb-1">Target Location</h4>
                  <p className="text-sm font-normal text-gray-800 capitalize">
                    {creator.city ? `${creator.city}${creator.state ? `, ${creator.state}` : ''}${creator.country ? `, ${creator.country}` : ''}` : 'Location unknown'}
                  </p>
                  <span className="text-[10px] text-gray-500 font-medium">Primarily active in this region</span>
                </div>
             </div>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-8">
          
          {/* Platform Wise Scores */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-sm font-normal text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2">
              <UserCheck size={18} className="text-primary-600" /> Platform-wise Score Breakdown
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {platforms.map(platform => {
                const pData = breakdown[platform.key];
                // Display the platform card if data exists OR if the creator has this platform true (even if data is 0)
                const hasPlatform = creator[`has_${platform.key}` as keyof Creator];
                
                if (!pData && !hasPlatform) return null;

                const score = pData?.score || 0;
                const profile = creator.profiles?.find(p => p.platform.toLowerCase() === platform.key);
                
                const isExpanded = expandedPlatforms[platform.key];
                
                return (
                  <div key={platform.key} className="bg-gray-50 border border-gray-200 rounded-xl p-5 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-2 font-normal text-gray-800 text-sm uppercase tracking-wide">
                        {platform.icon} {platform.label}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className={`text-xl font-normal ${
                          score >= 70 ? 'text-green-600' :
                          score >= 40 ? 'text-primary-600' : 'text-gray-500'
                        }`}>
                          {score} <span className="text-xs text-gray-400 font-medium">/ 100</span>
                        </div>
                        <button 
                          onClick={() => togglePlatform(platform.key)}
                          className="p-1 hover:bg-gray-200 rounded-full transition-colors text-gray-400"
                        >
                          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                      </div>
                    </div>

                    {/* Platform Stats */}
                    {profile && (
                      <div className="flex gap-4 mb-4 pb-4 border-b border-gray-200/50">
                        <div className="flex-1">
                          <p className="text-[10px] font-normal text-gray-400 uppercase tracking-widest mb-0.5">Followers</p>
                          <p className="text-sm font-normal text-gray-900 flex items-center gap-1 mb-3">
                            <Users size={12} className="text-gray-400" />
                            {profile.followers?.toLocaleString() || 'N/A'}
                          </p>
                          <p className="text-[10px] font-normal text-gray-400 uppercase tracking-widest mb-0.5">Avg Likes</p>
                          <p className="text-sm font-normal text-gray-900 flex items-center gap-1">
                            {profile.avg_likes?.toLocaleString() || 'N/A'}
                          </p>
                        </div>
                        <div className="flex-1">
                          <p className="text-[10px] font-normal text-gray-400 uppercase tracking-widest mb-0.5">Engagement</p>
                          <p className="text-sm font-normal text-gray-900 mb-3">
                            {profile.engagement_rate ? `${Number(profile.engagement_rate).toFixed(2)}%` : 'N/A'}
                          </p>
                          <p className="text-[10px] font-normal text-gray-400 uppercase tracking-widest mb-0.5">Avg Comments</p>
                          <p className="text-sm font-normal text-gray-900">
                            {profile.avg_comments?.toLocaleString() || 'N/A'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Show detailed logic points if expanded */}
                    {isExpanded && (
                      <div className="animate-[fadeIn_0.2s_ease]">
                        {pData?.breakdown ? (
                          <div className="space-y-2 mt-4 pt-4 border-t border-gray-100">
                            {Object.entries(pData.breakdown).map(([key, val]) => (
                               <div key={key} className="flex justify-between items-center text-xs">
                                 <span className="text-gray-500 capitalize">{key.replace(/_/g, ' ')}</span>
                                 <span className="font-normal text-gray-700">+{val as number} points</span>
                               </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 italic mt-4 pt-4 border-t border-gray-100">No algorithm breakdown points available.</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {Object.keys(breakdown).length === 0 && (
              <div className="bg-gray-50 p-6 rounded-xl border border-dashed border-gray-300 text-center text-gray-500 text-sm">
                 Detailed platform-wise algorithm breakdown was not collected for this lead. Total score: {creator.outreach_readiness_score || 0}/100.
              </div>
            )}
          </div>
          
          <div className="space-y-6">
            <div>
               <h3 className="text-sm font-normal text-gray-900 uppercase tracking-widest mb-4">Match Breakdown</h3>
               <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm space-y-4">
                 
                 <div className="flex justify-between items-center mb-2">
                   <span className="text-xs font-normal text-gray-900 uppercase tracking-widest">Total Match</span>
                   <div className="flex items-center gap-2">
                    <span className="text-xl font-normal text-primary-600">{Math.round(Number(creator.relevance_score) || 0)}%</span>
                    <button 
                      onClick={() => setMatchExpanded(!matchExpanded)}
                      className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-400"
                    >
                      {matchExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                 </div>
                 
                 {matchExpanded && (() => {
                   const rb = (scoringNotes as any)?.relevance_breakdown;
                   if (!rb) {
                     return (
                       <div className="pl-3 border-l-2 border-primary-100 animate-[fadeIn_0.2s_ease] text-xs text-gray-400 italic">
                         Detailed breakdown unavailable for this lead.
                       </div>
                     );
                   }
                   const fmtPct = (p: number) => p > 0 ? `+${p.toFixed(1)}%` : '0%';
                   return (
                     <div className="space-y-3 pl-3 border-l-2 border-primary-100 animate-[fadeIn_0.2s_ease]">
                       {/* City Match */}
                       <div className="flex justify-between items-start gap-3">
                         <div className="flex flex-col">
                           <span className="text-sm text-gray-500 font-medium">City Match</span>
                           {rb.city?.matched && rb.city?.source === 'bio' && (
                             <span className="text-[10px] text-gray-400">matched in bio (partial)</span>
                           )}
                         </div>
                         <span className="text-sm font-normal text-gray-900 whitespace-nowrap">
                           {fmtPct(rb.city?.points || 0)}
                         </span>
                       </div>

                       {/* Niche / Category Match */}
                       <div className="flex justify-between items-start gap-3">
                         <div className="flex flex-col min-w-0">
                           <span className="text-sm text-gray-500 font-medium">Niche Match</span>
                           {Array.isArray(rb.categories?.matched_categories) && rb.categories.matched_categories.length > 0 && (
                             <span className="text-[10px] text-gray-400 truncate">
                               {rb.categories.matched_categories.join(', ')}
                             </span>
                           )}
                         </div>
                         <span className="text-sm font-normal text-gray-900 whitespace-nowrap">
                           {fmtPct(rb.categories?.points || 0)}
                         </span>
                       </div>

                       {/* Keyword Match */}
                       <div className="flex justify-between items-start gap-3">
                         <div className="flex flex-col min-w-0">
                           <span className="text-sm text-gray-500 font-medium">
                             Keyword Match
                             {rb.keywords?.total_keywords > 0 && (
                               <span className="text-[10px] text-gray-400 font-normal ml-1">
                                 ({(rb.keywords?.matched_keywords?.length || 0)}/{rb.keywords.total_keywords})
                               </span>
                             )}
                           </span>
                           {Array.isArray(rb.keywords?.matched_keywords) && rb.keywords.matched_keywords.length > 0 && (
                             <span className="text-[10px] text-gray-400 truncate">
                               {rb.keywords.matched_keywords.join(', ')}
                             </span>
                           )}
                         </div>
                         <span className="text-sm font-normal text-gray-900 whitespace-nowrap">
                           {fmtPct(rb.keywords?.points || 0)}
                         </span>
                       </div>
                     </div>
                   );
                 })()}

                 <p className="text-[10px] text-gray-400 leading-tight mt-4 pt-4 border-t border-gray-100 italic">
                   * Match % determines how well they fit your specific search filters defined in the campaign.
                 </p>
                 
               </div>
            </div>
          </div>

        </div>
      </Card>

      {/* Conversation History Section */}
      <Card>
        <CardHeader className="border-b border-gray-100 flex flex-row items-center justify-between py-4">
          <div className="flex items-center gap-2 font-normal text-gray-900 uppercase tracking-widest text-sm font-outfit">
            <MessageCircle size={18} className="text-primary-600" />
            Conversation History
          </div>
          {creator.conversation?.detected_intent && (
            <div className={`px-3 py-1 rounded-full text-[10px] font-normal uppercase tracking-wider ${
              creator.conversation.detected_intent === 'interested' ? 'bg-green-100 text-green-700' :
              creator.conversation.detected_intent === 'not_interested' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
            }`}>
              Intent: {creator.conversation.detected_intent.replace('_', ' ')}
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[400px] overflow-y-auto p-6 space-y-6 bg-gray-50/50">
            {messages.length === 0 && ((creator as any).OutreachLogs?.length === 0 || !(creator as any).OutreachLogs) ? (
              <div className="text-center py-12 text-gray-400 italic text-sm">
                No outreach messages or replies found for this creator yet.
              </div>
            ) : (
              <div className="space-y-4">
                {(() => {
                  const combined = [
                    ...((creator as any).OutreachLogs || []).map((log: any) => {
                      const logTime = log.sent_at || log.sentAt || log.created_at || log.createdAt || Date.now();
                      return {
                        id: log.id,
                        type: 'outreach',
                        direction: 'outbound',
                        channel: log.channel,
                        subject: log.subject_line,
                        text: log.message_content,
                        time: new Date(logTime).getTime()
                      };
                    }),
                    ...messages.map((msg: any) => ({
                      id: msg.id,
                      type: 'message',
                      direction: msg.direction,
                      channel: msg.channel,
                      text: msg.message_text,
                      time: new Date(msg.message_time || msg.messageTime || Date.now()).getTime()
                    }))
                  ].sort((a, b) => a.time - b.time);

                  return combined.map((item, idx) => (
                    <div key={idx} className={`flex flex-col ${item.direction === 'inbound' ? 'items-start mr-auto' : 'items-end ml-auto'} max-w-[85%]`}>
                      <div className={`p-4 rounded-2xl shadow-md text-sm ${
                        item.direction === 'inbound' 
                          ? 'bg-gray-100 text-gray-900 rounded-tl-none border border-gray-200' 
                          : 'bg-indigo-600 text-white rounded-tr-none'
                      }`}>
                        <p className={`text-[10px] font-black uppercase tracking-widest mb-1.5 flex items-center gap-1 ${
                          item.direction === 'inbound' ? 'text-gray-500' : 'text-indigo-100'
                        }`}>
                          {item.direction === 'inbound' ? (
                            <>
                              {creator.full_name || creator.handle} ({item.channel})
                            </>
                          ) : (
                            <>
                              <Mail size={10} /> {item.type === 'outreach' ? `Outreach Sent (${item.channel})` : 'You (ATS Agent)'}
                            </>
                          )}
                        </p>
                        {item.subject && <p className={`font-bold border-b pb-2 mb-2 ${
                          item.direction === 'inbound' ? 'border-gray-200' : 'border-white/20'
                        }`}>Sub: {item.subject}</p>}
                        <p className="whitespace-pre-wrap leading-relaxed font-medium">
                          {item.type === 'message' ? cleanMessageText(item.text) : (item.text || 'Initial outreach triggered by system.')}
                        </p>
                      </div>
                      <span className="text-[10px] text-gray-500 mt-1.5 font-semibold">
                        {new Date(item.time).toLocaleString()}
                      </span>
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        {/* Meeting Option */}
        <Card className="p-6 flex flex-col">
          <h3 className="text-sm font-normal text-gray-900 uppercase tracking-widest mb-1 flex items-center gap-2">
            <Clock size={16} className="text-primary-600" /> Meeting Options
          </h3>
          <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-4">
            Schedule a call with {creator.full_name?.split(' ')[0]}
          </p>
          <div className="flex-1 flex flex-col justify-between gap-3">
            <div className="flex-1 flex items-center justify-center bg-primary-50/40 rounded-xl border border-primary-100/60 py-6 flex-col gap-2">
              <div className="w-12 h-12 rounded-full bg-white shadow-sm border border-primary-100 flex items-center justify-center">
                <Calendar size={22} className="text-primary-500" />
              </div>
              <p className="text-[9px] text-primary-400 uppercase tracking-widest font-normal">No meeting scheduled</p>
            </div>
            <button
              type="button"
              onClick={() => alert('Meeting Scheduler Integration Coming Soon')}
              className="w-full flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 hover:bg-primary-50 hover:border-primary-200 hover:text-primary-700 shadow-sm text-[10px] uppercase tracking-widest rounded-xl py-2.5 transition-colors font-normal"
            >
              <Calendar size={14} className="text-primary-600" />
              <span>Schedule Meeting</span>
            </button>
          </div>
        </Card>

        {/* Affiliate Activation */}
        <Card className="p-6 flex flex-col">
          <h3 className="text-sm font-normal text-gray-900 uppercase tracking-widest mb-1 flex items-center gap-2">
            <LinkIcon size={16} className="text-primary-600" /> Affiliate Activation
          </h3>
          <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-4">
            Manage tracking code &amp; affiliate link
          </p>
          <div className="flex-1 flex flex-col justify-between gap-3">
            {(creator as any).affiliate_code || (creator as any).affiliate_link ? (
              <>
                <div className="flex-1 flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <div>
                    <p className="text-[9px] font-normal text-gray-400 uppercase tracking-widest mb-0.5">Tracking Code</p>
                    <p className="text-sm font-normal text-gray-900 font-outfit uppercase">{(creator as any).affiliate_code || '---'}</p>
                  </div>
                  <button className="text-primary-500 hover:text-primary-700 p-1.5 hover:bg-primary-50 rounded-lg transition-colors">
                    <Copy size={14} />
                  </button>
                </div>
                {['super_admin', 'admin', 'operator', 'client_admin', 'client_marketing'].includes(currentUser?.role || '') ? (
                  <Button
                    variant="outline"
                    className="w-full text-[10px] uppercase tracking-widest"
                    onClick={() => {
                      setAffiliateFormData({
                        code: (creator as any).affiliate_code || '',
                        link: (creator as any).affiliate_link || ''
                      });
                      setIsAffiliateModalOpen(true);
                    }}
                  >
                    Manage Assets
                  </Button>
                ) : (
                  <p className="text-[9px] text-gray-400 italic text-center mt-2">Read-only access for this section</p>
                )}
              </>
            ) : (
              <>
                <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 rounded-xl border border-dashed border-gray-200 py-5 gap-1">
                  <LinkIcon size={24} className="text-gray-300" />
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest">No assets linked</p>
                </div>
                {['super_admin', 'admin', 'operator', 'client_admin', 'client_marketing'].includes(currentUser?.role || '') ? (
                  <Button
                    className="w-full bg-primary-600 hover:bg-primary-700 shadow-md text-[10px] uppercase tracking-widest"
                    onClick={() => setIsAffiliateModalOpen(true)}
                  >
                    Link Assets
                  </Button>
                ) : (
                  <p className="text-[9px] text-gray-400 italic text-center mt-2">Read-only access for this section</p>
                )}
              </>
            )}
          </div>
        </Card>
      </div>


      {/* ROI Performance Metrics at the bottom */}
      <Card className="p-8 bg-gradient-to-br from-white to-gray-50 border-none shadow-xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-sm font-normal text-gray-900 uppercase tracking-widest flex items-center gap-2">
              <TrendingUp size={18} className="text-primary-600" /> Affiliate ROI Performance
            </h3>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">Real-time tracking for {creator.full_name}</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-[10px] font-normal uppercase tracking-widest border ${
            (creator as any).affiliate_status === 'paid' ? 'bg-green-50 text-green-600 border-green-100' :
            (creator as any).affiliate_status === 'approved' ? 'bg-blue-50 text-blue-600 border-blue-100' :
            'bg-amber-50 text-amber-600 border-amber-100'
          }`}>
            {(creator as any).affiliate_status || 'Pending'}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="space-y-1 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-[9px] font-normal text-gray-400 uppercase tracking-widest flex items-center gap-1">
              <MousePointer2 size={10} /> Total Clicks
            </p>
            <p className="text-2xl font-normal text-gray-900 font-outfit">{(creator as any).AffiliateTracking?.clicks || 0}</p>
          </div>
          <div className="space-y-1 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-[9px] font-normal text-gray-400 uppercase tracking-widest flex items-center gap-1">
              <ShoppingCart size={10} /> Conversions
            </p>
            <p className="text-2xl font-normal text-gray-900 font-outfit">{(creator as any).AffiliateTracking?.conversions || 0}</p>
          </div>
          <div className="space-y-1 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-[9px] font-normal text-gray-400 uppercase tracking-widest flex items-center gap-1">
              <DollarSign size={10} /> Gross Revenue
            </p>
            <p className="text-2xl font-normal text-emerald-600 font-outfit">
              ${Number((creator as any).AffiliateTracking?.revenue_generated || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="space-y-1 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-[9px] font-normal text-gray-400 uppercase tracking-widest flex items-center gap-1">
              <ArrowUpRight size={10} /> Net Payable
            </p>
            <p className="text-2xl font-normal text-primary-600 font-outfit">
              ${Number((creator as any).AffiliateTracking?.commission_owed || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </Card>

      {/* Affiliate Modal */}
      {isAffiliateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/80 backdrop-blur-md p-4">
          <Card className="w-full max-w-md border-none shadow-3xl animate-in zoom-in-95 duration-200 bg-white rounded-2xl">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/30 rounded-t-2xl">
              <h2 className="text-xl font-normal uppercase tracking-tight flex items-center gap-2 text-gray-900 font-outfit">
                <LinkIcon className="text-primary-600" size={24} /> Link Affiliate Assets
              </h2>
              <button onClick={() => setIsAffiliateModalOpen(false)} className="text-gray-400 hover:text-gray-900 p-1 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-normal text-gray-400 uppercase tracking-widest">Affiliate Tracking Code</label>
                <div className="relative">
                  <Tag className="absolute left-4 top-3.5 w-4 h-4 text-gray-400" />
                  <input
                    placeholder="e.g. SAVE20"
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-normal text-gray-900 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all shadow-sm font-outfit uppercase"
                    value={affiliateFormData.code}
                    onChange={(e) => setAffiliateFormData({ ...affiliateFormData, code: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-normal text-gray-400 uppercase tracking-widest">Tracking Link (URL)</label>
                <div className="relative">
                  <LinkIcon className="absolute left-4 top-3.5 w-4 h-4 text-gray-400" />
                  <input
                    placeholder="https://..."
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-normal text-gray-900 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all shadow-sm"
                    value={affiliateFormData.link}
                    onChange={(e) => setAffiliateFormData({ ...affiliateFormData, link: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t border-gray-50">
                <Button type="button" variant="ghost" className="flex-1 font-normal uppercase text-[10px] tracking-widest" onClick={() => setIsAffiliateModalOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleLinkAffiliate}
                  className="flex-[2] bg-primary-600 hover:bg-primary-700 shadow-xl shadow-primary-500/30 font-normal uppercase text-[10px] tracking-widest h-11" 
                  disabled={actionLoading}
                >
                  {actionLoading ? <LoadingState mini /> : 'Save Affiliate Assets'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
      
      <OutreachPreviewModal
        creatorId={creator?.id || ''}
        campaignId={creator?.campaign_id || undefined}
        messageType={outreachModalMessageType}
        isOpen={outreachModalOpen}
        onClose={() => setOutreachModalOpen(false)}
        onSend={handleConfirmSendOutreach}
      />
    </div>
  );
}
