import { useState, useEffect } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { getCreatorById, getCampaignById, reviewLead, sendSingleOutreach, linkAffiliate, findSimilarCreators, previewOutreach, regenerateCreatorSummary, getAudienceAnalytics, uploadMediaKit, getMediaKitUrl, updateCreatorNotes, getPartnerships, getCreatorActivities, markQualified, sendOffer, markAccepted, activatePartnership, completePartnership, rejectPartnership, updatePartnership, getShipments, updateShipment } from '../lib/api';
import type { Creator, Campaign } from '../types';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { ScoreBadge } from '../components/ui/ScoreBadge';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Button } from '../components/ui/Button';
import { ArrowLeft, Instagram, Youtube, UserCheck, Activity, Check, X, Star, Mail, MapPin, ExternalLink, FileText, Users, Send, RefreshCw, Sparkles, MessageCircle, ChevronDown, ChevronUp, Link as LinkIcon, Copy, Tag, Calendar, TrendingUp, MousePointer2, ShoppingCart, DollarSign, ArrowUpRight, Clock, Eye, Download, Coins, Edit3, Truck } from 'lucide-react';
import { OutreachPreviewModal } from '../components/ui/OutreachPreviewModal';
import { LoadingState } from '../components/ui/LoadingState';
import { ImageLightbox } from '../components/ui/ImageLightbox';
import { InfoTip } from '../components/ui/InfoTip';
import { useAuth } from '../contexts/AuthContext';
import { Modal } from '../components/ui/Modal';
import { format } from 'date-fns';

export const getErRating = (followers: number, er: number): { label: string; colorClass: string } | null => {
  if (followers <= 0 || er <= 0) return null;
  
  let goodThreshold = 0;
  let avgLower = 0;
  
  if (followers < 10000) {
    goodThreshold = 6.0;
    avgLower = 3.0;
  } else if (followers < 100000) {
    goodThreshold = 4.0;
    avgLower = 1.5;
  } else if (followers < 500000) {
    goodThreshold = 2.0;
    avgLower = 0.7;
  } else if (followers < 1000000) {
    goodThreshold = 1.5;
    avgLower = 0.5;
  } else {
    goodThreshold = 1.0;
    avgLower = 0.3;
  }
  
  if (er >= goodThreshold) {
    return { label: 'Good ER', colorClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200' };
  } else if (er >= avgLower) {
    return { label: 'Avg ER', colorClass: 'bg-blue-50 text-blue-700 border border-blue-200' };
  } else {
    return { label: 'Below Avg', colorClass: 'bg-rose-50 text-rose-700 border border-rose-200' };
  }
};

export default function CreatorDetail() {
  const { user: currentUser } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
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
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Audience Analytics States
  const [audienceData, setAudienceData] = useState<any>(null);
  const [loadingAudience, setLoadingAudience] = useState(false);
  const [uploadingMediaKit, setUploadingMediaKit] = useState(false);
  const [mediaKitAction, setMediaKitAction] = useState<null | 'view' | 'download'>(null);

  // Affiliate Form State
  const [isAffiliateModalOpen, setIsAffiliateModalOpen] = useState(false);
  const [affiliateFormData, setAffiliateFormData] = useState({
    code: '',
    link: ''
  });

  // Creator Notes States
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  // V3 CRM Tab & Partnership States
  const [activeTab, setActiveTab] = useState<'partnerships' | 'shipments' | 'activities'>('partnerships');
  const [partnerships, setPartnerships] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [creatorShipments, setCreatorShipments] = useState<any[]>([]);
  const [partnershipsLoading, setPartnershipsLoading] = useState(false);

  const [activePartnership, setActivePartnership] = useState<any | null>(null);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [offerForm, setOfferForm] = useState({
    offer_type: 'free_product',
    flat_fee: 0,
    affiliate_enabled: false,
    affiliate_percentage: 0,
    affiliate_code: '',
    affiliate_link: ''
  });

  const [editForm, setEditForm] = useState({
    creator_tier: 'unknown',
    contract_required: false,
    contract_signed: false,
    contract_url: '',
    start_date: '',
    end_date: '',
    activation_notes: '',
    internal_notes: ''
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

  const loadAudienceData = (silent = false) => {
    if (!id) return;
    if (!silent) setLoadingAudience(true);
    getAudienceAnalytics(id)
      .then((res) => {
        setAudienceData(res);
      })
      .catch((err) => {
        console.error('Error loading audience analytics:', err);
      })
      .finally(() => {
        if (!silent) setLoadingAudience(false);
      });
  };

  const loadData = (silent = false) => {
    if (!id) return;
    if (!silent) setLoading(true);
    
    // Also load audience analytics
    loadAudienceData(silent);

    getCreatorById(id)
      .then(async (data) => {
        setCreator(data);
        setNotesValue(data.notes || '');
        
        // Use the messages already bundled in the creator data
        if (data.conversation?.messages) {
          // Sort messages by time ASC
          const sorted = [...data.conversation.messages].sort((a: any, b: any) => 
            new Date(a.message_time).getTime() - new Date(b.message_time).getTime()
          );
          setMessages(sorted);
        }

        try {
          const [partsList, actsList, shipmentsList] = await Promise.all([
            getPartnerships(),
            getCreatorActivities(id),
            getShipments({ creator_id: id })
          ]);
          setPartnerships(partsList.filter((p: any) => String(p.creator_id) === String(id) || String(p.creatorId) === String(id) || String(p.Creator?.id) === String(id)));
          setActivities(actsList);
          setCreatorShipments(shipmentsList);
        } catch (e) {
          console.error('Failed to load V3 partnerships/activities/shipments', e);
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
      .finally(() => {
        if (!silent) setLoading(false);
      });
  };

  const handlePartnershipAction = async (partnershipId: string, action: string) => {
    try {
      setPartnershipsLoading(true);
      if (action === 'qualify') {
        await markQualified(partnershipId);
      } else if (action === 'accept') {
        await markAccepted(partnershipId);
      } else if (action === 'activate') {
        await activatePartnership(partnershipId);
      } else if (action === 'complete') {
        await completePartnership(partnershipId);
      } else if (action === 'reject') {
        if (window.confirm('Are you sure you want to reject this partnership?')) {
          await rejectPartnership(partnershipId);
        } else {
          setPartnershipsLoading(false);
          return;
        }
      }
      await loadData(true);
    } catch (err) {
      alert('Action failed: ' + err);
    } finally {
      setPartnershipsLoading(false);
    }
  };

  const openOfferModal = (p: any) => {
    setActivePartnership(p);
    setOfferForm({
      offer_type: p.offer_type || 'free_product',
      flat_fee: p.flat_fee || 0,
      affiliate_enabled: p.affiliate_enabled || false,
      affiliate_percentage: p.affiliate_percentage || 0,
      affiliate_code: p.affiliate_code || '',
      affiliate_link: p.affiliate_link || ''
    });
    setShowOfferModal(true);
  };

  const submitOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePartnership) return;
    setSubmitting(true);
    try {
      await sendOffer(activePartnership.id, {
        offer_type: offerForm.offer_type,
        flat_fee: Number(offerForm.flat_fee) || undefined,
        affiliate_enabled: offerForm.affiliate_enabled,
        affiliate_percentage: offerForm.affiliate_enabled ? Number(offerForm.affiliate_percentage) : undefined,
        affiliate_code: offerForm.affiliate_enabled ? offerForm.affiliate_code : undefined,
        affiliate_link: offerForm.affiliate_enabled ? offerForm.affiliate_link : undefined
      });
      setShowOfferModal(false);
      await loadData(true);
    } catch (err) {
      alert('Failed to send offer: ' + err);
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (p: any) => {
    setActivePartnership(p);
    setEditForm({
      creator_tier: p.creator_tier || 'unknown',
      contract_required: p.contract_required || false,
      contract_signed: p.contract_signed || false,
      contract_url: p.contract_url || '',
      start_date: p.start_date || '',
      end_date: p.end_date || '',
      activation_notes: p.activation_notes || '',
      internal_notes: p.internal_notes || ''
    });
    setShowEditModal(true);
  };

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePartnership) return;
    setSubmitting(true);
    try {
      await updatePartnership(activePartnership.id, {
        creator_tier: editForm.creator_tier,
        contract_required: editForm.contract_required,
        contract_signed: editForm.contract_signed,
        contract_url: editForm.contract_url || null,
        start_date: editForm.start_date || null,
        end_date: editForm.end_date || null,
        activation_notes: editForm.activation_notes || null,
        internal_notes: editForm.internal_notes || null
      });
      setShowEditModal(false);
      await loadData(true);
    } catch (err) {
      alert('Failed to update details: ' + err);
    } finally {
      setSubmitting(false);
    }
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
      loadData(true);
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

  const handleMediaKitUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !creator) return;

    if (file.type !== 'application/pdf') {
      alert('Only PDF reports or media kits are supported.');
      return;
    }

    setUploadingMediaKit(true);
    try {
      await uploadMediaKit(creator.id, file);
      alert('Media kit PDF uploaded and parsed successfully!');
      loadData(true);
    } catch (err: any) {
      console.error(err);
      alert(err?.error || err?.message || 'Failed to parse media kit PDF.');
    } finally {
      setUploadingMediaKit(false);
    }
  };

  // Open the stored media kit PDF inline in a new tab (preview)
  const handleViewMediaKit = async () => {
    if (!creator || mediaKitAction) return;
    // Open the tab synchronously so the browser doesn't block it as a popup,
    // then point it at the signed URL once we have it.
    const previewWindow = window.open('', '_blank');
    setMediaKitAction('view');
    try {
      const { url } = await getMediaKitUrl(creator.id, false);
      if (previewWindow) previewWindow.location.href = url;
      else window.open(url, '_blank');
    } catch (err: any) {
      previewWindow?.close();
      console.error(err);
      alert(err?.error || err?.message || 'Could not open the media kit.');
    } finally {
      setMediaKitAction(null);
    }
  };

  // Download the stored media kit PDF (forces a save dialog via the signed URL)
  const handleDownloadMediaKit = async () => {
    if (!creator || mediaKitAction) return;
    setMediaKitAction('download');
    try {
      const { url } = await getMediaKitUrl(creator.id, true);
      const a = document.createElement('a');
      a.href = url;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err: any) {
      console.error(err);
      alert(err?.error || err?.message || 'Could not download the media kit.');
    } finally {
      setMediaKitAction(null);
    }
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
      setCreator(prev => prev ? { ...prev, summary: res.summary } : prev);
    } catch (err: any) {
      alert(err?.message || err || 'Failed to regenerate summary.');
    } finally {
      setRegeneratingSummary(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!creator) return;
    setSavingNotes(true);
    try {
      await updateCreatorNotes(creator.id, notesValue);
      setCreator(prev => prev ? { ...prev, notes: notesValue } : prev);
      setIsEditingNotes(false);
    } catch (err: any) {
      alert(err?.message || err || 'Failed to save notes.');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleCancelNotes = () => {
    setNotesValue(creator?.notes || '');
    setIsEditingNotes(false);
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
  const fromMyCreators = (location.state as any)?.fromMyCreators;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-[fadeIn_0.3s_ease] px-4 sm:px-0">
      <style>{`
        @media print {
          /* Hide non-printable layout items */
          aside,
          header,
          nav,
          .no-print,
          .hide-on-print,
          button,
          label,
          input,
          a[href^="http"]:after {
            display: none !important;
          }

          /* Reset layout padding when printing */
          div[class*="lg:pl-64"],
          div[class*="pl-0"],
          main,
          .main-content {
            padding-left: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
            background: transparent !important;
          }

          /* Reset all wrapper backgrounds to transparent to let the white page show */
          body,
          html,
          #root,
          main,
          .main-content,
          div,
          section {
            background-color: transparent !important;
            background: transparent !important;
          }

          body,
          html {
            background-color: #ffffff !important;
            background: #ffffff !important;
            color: black !important;
            font-size: 11pt !important;
          }

          .max-w-5xl {
            max-width: 100% !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          /* Force backgrounds/colors to render on print */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* Print-only Branded Header */}
      <div className="hidden print:flex items-center justify-between border-b-2 border-gray-900 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <span className="text-3xl font-extrabold tracking-widest text-primary-600 font-outfit">ATS</span>
          <span className="text-xs text-gray-400 uppercase tracking-widest border-l pl-3 border-gray-300 font-medium">Outreach Platform</span>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-gray-800 uppercase tracking-wider">Influencer Demographics Report</p>
          <p className="text-xs text-gray-400">{new Date().toLocaleDateString()}</p>
        </div>
      </div>

      {fromCampaignId ? (
        <Link to={`/campaigns/${fromCampaignId}`} className="no-print inline-flex items-center text-[10px] font-normal text-gray-400 hover:text-primary-600 transition-colors group tracking-widest uppercase mb-1">
          <ArrowLeft size={14} className="mr-1 group-hover:-translate-x-1 transition-transform" /> BACK TO CAMPAIGN
        </Link>
      ) : (fromMyCreators || creator?.lifecycle_status === 'engaged') ? (
        <Link to="/my-creators" className="no-print inline-flex items-center text-[10px] font-normal text-gray-400 hover:text-primary-600 transition-colors group tracking-widest uppercase mb-1">
          <ArrowLeft size={14} className="mr-1 group-hover:-translate-x-1 transition-transform" /> BACK TO MY CREATORS
        </Link>
      ) : (
        <Link to="/creators" className="no-print inline-flex items-center text-[10px] font-normal text-gray-400 hover:text-primary-600 transition-colors group tracking-widest uppercase mb-1">
          <ArrowLeft size={14} className="mr-1 group-hover:-translate-x-1 transition-transform" /> BACK TO DIRECTORY
        </Link>
      )}

      <Card>
        <div className="bg-gradient-to-r from-gray-50 to-white px-6 sm:px-8 py-8 border-b border-gray-100 flex flex-col lg:flex-row items-start gap-6 rounded-t-[12px]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 min-w-0 flex-1">
             <div
               onClick={() => creator.profile_pic && setLightboxOpen(true)}
               className={`w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-primary-600 text-white flex items-center justify-center font-normal text-5xl sm:text-6xl uppercase shadow-xl shadow-primary-500/30 ring-4 ring-white font-outfit shrink-0 overflow-hidden ${creator.profile_pic ? 'cursor-zoom-in' : ''}`}
             >
               {creator.profile_pic ? (
                 <img src={creator.profile_pic} alt={creator.full_name || creator.handle || ''} loading="lazy" className="w-full h-full object-cover" />
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
              
              {['super_admin', 'admin', 'operator', 'client_admin', 'client_marketing'].includes(currentUser?.role || '') && (
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
                  {creator.review_status !== 'approved' && creator.review_status !== 'rejected' && creator.lifecycle_status !== 'not_respond' && (
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
                        onClick={() => handleReview((creator.review_status === 'shortlisted' || creator.review_status === 'pending_review') ? 'revoke' : 'shortlist')}
                        className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors flex items-center justify-center shadow-sm"
                        title={(creator.review_status === 'shortlisted' || creator.review_status === 'pending_review') ? "Remove from Shortlist" : "Shortlist → Move to Review Queue"}
                      >
                        <Star size={18} fill={(creator.review_status === 'shortlisted' || creator.review_status === 'pending_review') ? "currentColor" : "none"} />
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col items-start lg:items-end gap-3 w-full lg:w-auto">
            <StatusBadge status={['contacted', 'replied', 'engaged', 'qualified', 'converted', 'not_respond'].includes(creator.lifecycle_status || '') ? creator.lifecycle_status : (creator.review_status as any || 'pending')} />
            <div className="flex items-center gap-2 mt-2">
               <span className="text-xs font-normal text-gray-400 uppercase">Readiness:</span>
               <InfoTip text="Readiness score (0–100) estimates how well this creator fits the campaign and how likely they are to convert — based on audience size, engagement, niche/category match, and profile completeness. Higher is better." />
               <ScoreBadge score={creator.outreach_readiness_score || 0} />
            </div>
            {['super_admin', 'admin', 'operator', 'client_admin', 'client_marketing'].includes(currentUser?.role || '') && (
              <div className="no-print flex flex-col gap-2 w-full mt-1">
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
                        ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/40 animate-pulse text-white'
                        : isWaitingForFollowUp()
                          ? 'bg-emerald-50 text-emerald-700 cursor-not-allowed border border-emerald-200'
                          : 'bg-primary-600 hover:bg-primary-700 shadow-primary-500/20 text-white'
                    } flex items-center justify-center gap-2 h-10 uppercase text-[10px] tracking-widest font-normal transition-all shadow-sm`}
                    onClick={handleSendOutreach}
                    disabled={sendingEmail || creator.review_status === 'rejected' || isWaitingForFollowUp()}
                  >
                    {sendingEmail ? <LoadingState mini /> : (isFollowUpDue() ? <Clock size={13} /> : isWaitingForFollowUp() ? <Check size={13} className="text-emerald-600" /> : <Send size={13} />)}
                    {isFollowUpDue()
                      ? `Follow-up #${(creator.latest_outreach?.follow_up_count || 0) + 1}`
                      : isWaitingForFollowUp()
                        ? 'Sent · Awaiting Reply'
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
                    className="no-print text-[10px] font-normal text-gray-400 hover:text-primary-600 uppercase tracking-widest flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                          <p className="text-sm font-normal text-gray-900 flex items-center gap-1 mb-3">
                            {profile.avg_likes?.toLocaleString() || 'N/A'}
                          </p>
                          <p className="text-[10px] font-normal text-gray-400 uppercase tracking-widest mb-0.5">Posts / Media</p>
                          <p className="text-sm font-normal text-gray-900 flex items-center gap-1">
                            {profile.media_count?.toLocaleString() || 'N/A'}
                          </p>
                        </div>
                        <div className="flex-1">
                          <p className="text-[10px] font-normal text-gray-400 uppercase tracking-widest mb-0.5">Engagement</p>
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-sm font-normal text-gray-900">
                              {profile.engagement_rate ? `${Number(profile.engagement_rate).toFixed(2)}%` : 'N/A'}
                            </span>
                            {profile.engagement_rate && (() => {
                              const rating = getErRating(profile.followers || 0, Number(profile.engagement_rate));
                              return rating && (
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${rating.colorClass}`}>
                                  {rating.label}
                                </span>
                              );
                            })()}
                          </div>
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

      {/* Creator Notes Section */}
      <Card className="mb-6">
        <CardHeader className="border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-4">
          <div className="flex items-center gap-2 font-normal text-gray-900 uppercase tracking-widest text-sm font-outfit">
            <FileText size={18} className="text-primary-600" />
            Creator Notes
          </div>
          {creator && (
            <div className="flex items-center gap-3">
              {isEditingNotes ? (
                <>
                  <button
                    type="button"
                    onClick={handleCancelNotes}
                    className="no-print inline-flex items-center gap-1.5 text-xs font-normal text-gray-500 hover:text-gray-700 transition-colors uppercase tracking-widest font-outfit"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveNotes}
                    disabled={savingNotes}
                    className="no-print inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 hover:text-primary-700 transition-colors uppercase tracking-widest font-outfit disabled:opacity-50"
                  >
                    {savingNotes ? 'Saving...' : 'Save'}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditingNotes(true)}
                  className="no-print inline-flex items-center gap-1.5 text-xs font-normal text-gray-500 hover:text-gray-700 transition-colors uppercase tracking-widest font-outfit"
                >
                  Edit Notes
                </button>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent className="p-6">
          {isEditingNotes ? (
            <textarea
              value={notesValue}
              onChange={(e) => setNotesValue(e.target.value)}
              className="w-full min-h-[120px] p-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 font-sans"
              placeholder="Write some private notes about this creator here..."
            />
          ) : (
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {creator?.notes || (
                <span className="text-gray-400 italic">No notes added yet. Click 'Edit Notes' to add your notes.</span>
              )}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Audience Demographics Section */}
      <Card>
        <CardHeader className="border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-4">
          <div className="flex items-center gap-2 font-normal text-gray-900 uppercase tracking-widest text-sm font-outfit">
            <Activity size={18} className="text-primary-600" />
            Audience Demographics
          </div>
          <div className="flex items-center gap-3">
            {audienceData?.media_kit_url && !audienceData.media_kit_url.startsWith('/uploads/') && (
              <>
                <button
                  type="button"
                  onClick={handleViewMediaKit}
                  disabled={mediaKitAction !== null}
                  title="Open the uploaded media kit PDF in a new tab"
                  className="no-print inline-flex items-center gap-1.5 text-xs font-normal text-gray-500 hover:text-gray-700 transition-colors uppercase tracking-widest font-outfit disabled:opacity-50"
                >
                  {mediaKitAction === 'view' ? <RefreshCw size={14} className="animate-spin" /> : <Eye size={14} />} View
                </button>
                <button
                  type="button"
                  onClick={handleDownloadMediaKit}
                  disabled={mediaKitAction !== null}
                  title="Download the uploaded media kit PDF"
                  className="no-print inline-flex items-center gap-1.5 text-xs font-normal text-primary-600 hover:text-primary-700 transition-colors uppercase tracking-widest font-outfit disabled:opacity-50"
                >
                  {mediaKitAction === 'download' ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />} Download Profile
                </button>
              </>
            )}
            <label className="no-print cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white text-xs font-normal rounded-lg hover:bg-primary-700 transition-colors uppercase tracking-widest font-outfit shadow-sm disabled:opacity-50">
              {uploadingMediaKit ? (
                <>
                  <RefreshCw size={12} className="animate-spin" />
                  Parsing...
                </>
              ) : (
                <>
                  <Send size={12} />
                  Upload Demographics Data
                </>
              )}
              <input 
                type="file" 
                accept=".pdf" 
                className="hidden" 
                onChange={handleMediaKitUpload} 
                disabled={uploadingMediaKit} 
              />
            </label>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {loadingAudience ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <RefreshCw size={24} className="animate-spin text-primary-600 mb-2" />
              <p className="text-sm font-normal">Loading audience analytics...</p>
            </div>
          ) : audienceData?.profile ? (
            <div className="space-y-8">
              {/* Top Row: Gender and Fake Followers */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Gender Split */}
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-5 shadow-sm">
                  <h4 className="flex items-center gap-1.5 text-[10px] font-normal text-gray-400 uppercase tracking-widest mb-4">
                    Gender Distribution
                    <InfoTip text="The estimated male / female split of this creator's audience, based on their follower profiles." />
                  </h4>
                  {(() => {
                    const demos = audienceData.profile.audience_demographics || [];
                    const male = demos.find((d: any) => d.demographic_type === 'gender' && d.gender === 'male');
                    const female = demos.find((d: any) => d.demographic_type === 'gender' && d.gender === 'female');
                    
                    const malePct = male ? Number(male.percentage) * 100 : 0;
                    const femalePct = female ? Number(female.percentage) * 100 : 0;
                    
                    if (malePct === 0 && femalePct === 0) {
                      return <p className="text-sm text-gray-500 italic">No gender data found</p>;
                    }
                    
                    return (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center text-sm font-normal text-gray-700">
                          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Male: {malePct.toFixed(1)}%</span>
                          <span className="flex items-center gap-1.5">Female: {femalePct.toFixed(1)}% <span className="w-2.5 h-2.5 rounded-full bg-pink-500"></span></span>
                        </div>
                        <div className="w-full h-3 rounded-full bg-pink-500 overflow-hidden flex">
                          <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${malePct}%` }}></div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Audience Quality / Fake Followers */}
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-5 shadow-sm">
                  <h4 className="flex items-center gap-1.5 text-[10px] font-normal text-gray-400 uppercase tracking-widest mb-4">
                    Audience Credibility
                    <InfoTip text="An estimate of how genuine this audience is — the share of real, active followers versus fake or inactive accounts." />
                  </h4>
                  {(() => {
                    const quality = audienceData.profile.audience_qualities?.[0];
                    if (!quality) return <p className="text-sm text-gray-500 italic">No quality data found</p>;
                    
                    const fakePct = quality.fake_followers_percent ? Number(quality.fake_followers_percent) * 100 : 0;
                    const realPct = quality.real_percent ? Number(quality.real_percent) * 100 : 0;
                    
                    return (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-white border border-gray-200/50 rounded-lg shadow-sm">
                          <p className="flex items-center justify-center gap-1 text-xs font-normal text-gray-400 uppercase">
                            Fake Followers
                            <InfoTip text="Everyone has fake followers. Up to 25% is perfectly normal." />
                          </p>
                          <p className={`text-xl font-normal mt-1 ${fakePct > 25 ? 'text-red-600' : fakePct > 15 ? 'text-amber-600' : 'text-green-600'}`}>
                            {fakePct.toFixed(1)}%
                          </p>
                        </div>
                        <div className="text-center p-3 bg-white border border-gray-200/50 rounded-lg shadow-sm">
                          <p className="flex items-center justify-center gap-1 text-xs font-normal text-gray-400 uppercase">
                            Real Audience
                            <InfoTip text="The share of followers that appear to be real, active people — higher is better." />
                          </p>
                          <p className="text-xl font-normal text-green-600 mt-1">
                            {realPct.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Middle Row: Age Split & Reachability */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Age Split */}
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-5 shadow-sm">
                  <h4 className="flex items-center gap-1.5 text-[10px] font-normal text-gray-400 uppercase tracking-widest mb-4">
                    Age Distribution
                    <InfoTip text="How this creator's audience breaks down across age ranges. Look for overlap with your target customer." />
                  </h4>
                  <div className="space-y-3">
                    {(() => {
                      const demos = audienceData.profile.audience_demographics || [];
                      const ages = demos.filter((d: any) => d.demographic_type === 'age')
                        .sort((a: any, b: any) => (a.age_range || '').localeCompare(b.age_range || ''));
                      
                      if (ages.length === 0) return <p className="text-sm text-gray-500 italic">No age data found</p>;
                      
                      return ages.map((age: any) => {
                        const pct = Number(age.percentage) * 100;
                        return (
                          <div key={age.id} className="space-y-1">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-gray-500 font-normal">{age.age_range}</span>
                              <span className="font-semibold text-gray-700">{pct.toFixed(1)}%</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-gray-200 overflow-hidden">
                              <div className="h-full bg-primary-600 rounded-full" style={{ width: `${pct}%` }}></div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Reachability */}
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-5 shadow-sm">
                  <h4 className="flex items-center gap-1.5 text-[10px] font-normal text-gray-400 uppercase tracking-widest mb-4">
                    Audience Reachability
                    <InfoTip text="How many accounts each follower follows. People who follow fewer accounts are more likely to actually see this creator's posts." />
                  </h4>
                  <div className="space-y-3">
                    {(() => {
                      const quality = audienceData.profile.audience_qualities?.[0];
                      if (!quality) return <p className="text-sm text-gray-500 italic">No reachability data found</p>;
                      
                      const reachMetrics = [
                        { label: '< 500 followers', val: quality.reachability_0_500 },
                        { label: '500 - 1,000 followers', val: quality.reachability_500_1000 },
                        { label: '1,000 - 1,500 followers', val: quality.reachability_1000_1500 },
                        { label: '> 1,500 followers', val: quality.reachability_1500_plus }
                      ];

                      return reachMetrics.map((r, idx) => {
                        const pct = r.val ? Number(r.val) * 100 : 0;
                        return (
                          <div key={idx} className="space-y-1">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-gray-500 font-normal">{r.label}</span>
                              <span className="font-semibold text-gray-700">{pct.toFixed(1)}%</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-gray-200 overflow-hidden">
                              <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }}></div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>

              {/* Bottom Row: Locations */}
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-5 shadow-sm">
                <h4 className="flex items-center gap-1.5 text-[10px] font-normal text-gray-400 uppercase tracking-widest mb-4">
                  Audience Locations (Top Countries &amp; Cities)
                  <InfoTip text="Where this audience is based. Make sure the top locations match the markets you want to reach." />
                </h4>
                {(() => {
                  const locs = audienceData.profile.audience_locations || [];
                  const countries = locs.filter((l: any) => l.location_type === 'country').slice(0, 5);
                  const cities = locs.filter((l: any) => l.location_type === 'city').slice(0, 5);

                  if (countries.length === 0 && cities.length === 0) {
                    return <p className="text-sm text-gray-500 italic">No location data found</p>;
                  }

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Top Countries */}
                      <div>
                        <h5 className="text-xs font-semibold text-gray-700 uppercase mb-3">Countries</h5>
                        <div className="space-y-2">
                          {countries.map((c: any) => {
                            const pct = Number(c.percentage) * 100;
                            return (
                              <div key={c.id} className="flex justify-between items-center text-xs border-b border-gray-200/50 pb-1.5">
                                <span className="text-gray-600 font-normal">{c.name}</span>
                                <span className="font-semibold text-gray-900">{pct.toFixed(2)}%</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Top Cities */}
                      <div>
                        <h5 className="text-xs font-semibold text-gray-700 uppercase mb-3">Cities</h5>
                        <div className="space-y-2">
                          {cities.map((c: any) => {
                            const pct = Number(c.percentage) * 100;
                            return (
                              <div key={c.id} className="flex justify-between items-center text-xs border-b border-gray-200/50 pb-1.5">
                                <span className="text-gray-600 font-normal">{c.name}</span>
                                <span className="font-semibold text-gray-900">{pct.toFixed(2)}%</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
              <Activity size={32} className="text-gray-300 mb-3" />
              <p className="text-sm font-semibold text-gray-700 uppercase">No Demographics Data Uploaded</p>
              <p className="text-xs text-gray-400 max-w-sm mt-1 mb-4">
                Upload a media kit PDF report (e.g. Modash Report) to automatically parse locations, age ranges, gender distribution, and audience quality using Gemini AI.
              </p>
              <label className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-normal rounded-lg uppercase tracking-wider font-outfit shadow-md transition-colors disabled:opacity-50">
                {uploadingMediaKit ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    Parsing Report...
                  </>
                ) : (
                  <>
                    <Send size={13} />
                    Upload & Parse PDF
                  </>
                )}
                <input 
                  type="file" 
                  accept=".pdf" 
                  className="hidden" 
                  onChange={handleMediaKitUpload} 
                  disabled={uploadingMediaKit} 
                />
              </label>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conversation History Section */}
      <Card className="no-print">
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

      {creator.lifecycle_status === 'engaged' && (
        <>
          <div className="no-print grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
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
          <Card className="no-print p-8 bg-gradient-to-br from-white to-gray-50 border-none shadow-xl">
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
        </>
      )}

      {/* V3 Creator CRM Partnerships & Activities Section */}
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
                    : `Activity Timeline (${activities.length})`
                }
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
                      <th className="px-4 py-3 text-right">Timeline</th>
                      <th className="px-4 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {partnerships.map((p) => (
                      <tr key={p.id} onClick={() => navigate(`/partnerships/${p.id}`, { state: { fromCreatorId: id } })} className="hover:bg-primary-50/10 transition-colors cursor-pointer">
                        <td className="px-4 py-4 align-middle">
                          <div className="text-xs font-semibold text-gray-900 font-outfit uppercase tracking-tight">
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
                                <Coins size={10} className="text-amber-500" /> {p.offer_type.replace('_', ' ')}
                              </div>
                              {p.flat_fee > 0 && <div className="text-gray-500">${p.flat_fee} {p.currency}</div>}
                              {p.affiliate_enabled && (
                                <div className="text-primary-600 bg-primary-50/50 border border-primary-100/50 rounded px-1.5 py-0.5 inline-block text-[9px] uppercase font-mono mt-0.5">
                                  Code: {p.affiliate_code || '---'} ({p.affiliate_percentage || 0}%)
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">No offer drafted</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-right align-middle text-[11px] text-gray-500 font-mono">
                          {p.start_date ? (
                            <div>
                              <div>Start: {format(new Date(p.start_date), 'MMM d, yyyy')}</div>
                              {p.end_date && <div className="text-gray-400 mt-0.5">End: {format(new Date(p.end_date), 'MMM d, yyyy')}</div>}
                            </div>
                          ) : (
                            '---'
                          )}
                        </td>
                        <td className="px-4 py-4 align-middle relative z-10" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-2">
                            {p.status === 'engaged' && (
                              <Button size="sm" className="bg-indigo-600 text-white font-normal uppercase tracking-widest text-[9px] min-h-[28px] px-2" onClick={() => handlePartnershipAction(p.id, 'qualify')}>
                                Qualify
                              </Button>
                            )}
                            {p.status === 'qualified' && (
                              <Button size="sm" className="bg-primary-600 text-white font-normal uppercase tracking-widest text-[9px] min-h-[28px] px-2" onClick={() => openOfferModal(p)}>
                                Send Offer
                              </Button>
                            )}
                            {p.status === 'offer_sent' && (
                              <Button size="sm" className="bg-green-600 text-white font-normal uppercase tracking-widest text-[9px] min-h-[28px] px-2" onClick={() => handlePartnershipAction(p.id, 'accept')}>
                                Accept Offer
                              </Button>
                            )}
                            {['accepted', 'product_shipped', 'product_delivered'].includes(p.status) && (
                              <Button size="sm" className="bg-amber-600 text-white font-normal uppercase tracking-widest text-[9px] min-h-[28px] px-2" onClick={() => handlePartnershipAction(p.id, 'activate')}>
                                Activate
                              </Button>
                            )}
                            {p.status === 'activated' && (
                              <Button size="sm" className="bg-gray-800 text-white font-normal uppercase tracking-widest text-[9px] min-h-[28px] px-2" onClick={() => handlePartnershipAction(p.id, 'complete')}>
                                Complete
                              </Button>
                            )}
                            <button 
                              onClick={() => openEditModal(p)}
                              className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                              title="Edit parameters"
                            >
                              <Edit3 size={14} />
                            </button>
                            {p.status !== 'rejected' && p.status !== 'completed' && (
                              <button 
                                onClick={() => handlePartnershipAction(p.id, 'reject')}
                                className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors font-bold text-sm leading-none"
                                title="Reject partnership"
                              >
                                &times;
                              </button>
                            )}
                          </div>
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
                      <th className="px-4 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 bg-white">
                    {creatorShipments.map((s) => (
                      <tr key={s.id} onClick={() => navigate(`/shipments/${s.id}`, { state: { fromCreatorId: id } })} className="hover:bg-primary-50/10 transition-colors cursor-pointer">
                        <td className="px-4 py-4 align-middle text-xs font-medium text-gray-800">
                          {s.Campaign?.name}
                        </td>
                        <td className="px-4 py-4 align-middle">
                          <div className="text-xs font-medium text-gray-800">{s.product_name}</div>
                          <div className="text-[10px] text-gray-400">Qty: {s.quantity} {s.product_sku ? `(SKU: ${s.product_sku})` : ''}</div>
                        </td>
                        <td className="px-4 py-4 align-middle">
                          <div className="text-xs text-gray-800">{s.recipient_name}</div>
                          <div className="text-[10px] text-gray-500 truncate max-w-[180px]" title={s.shipping_address_line1}>{s.shipping_address_line1}</div>
                        </td>
                        <td className="px-4 py-4 text-center align-middle">
                          <StatusBadge status={s.status} />
                        </td>
                        <td className="px-4 py-4 align-middle">
                          {s.tracking_number ? (
                            <div>
                              <div className="text-xs font-mono font-medium text-gray-800 flex items-center gap-1">
                                <Truck size={10} className="text-gray-400" /> {s.carrier}: {s.tracking_number}
                              </div>
                              {s.tracking_url && (
                                <a href={s.tracking_url} target="_blank" rel="noreferrer" className="text-[10px] text-primary-600 hover:underline inline-flex items-center gap-0.5 mt-0.5">
                                  Track <ExternalLink size={8} />
                                </a>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-gray-400 italic">No tracking info</span>
                          )}
                        </td>
                        <td className="px-4 py-4 align-middle text-center relative z-10" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-2">
                            {s.status === 'pending' && (
                              <Button size="sm" className="bg-indigo-600 text-white font-normal uppercase tracking-widest text-[9px] min-h-[28px] px-2" onClick={() => {
                                updateShipment(s.id, { status: 'shipped' }).then(() => loadData(true));
                              }}>
                                Ship
                              </Button>
                            )}
                            {s.status === 'shipped' && (
                              <Button size="sm" className="bg-green-600 text-white font-normal uppercase tracking-widest text-[9px] min-h-[28px] px-2" onClick={() => {
                                updateShipment(s.id, { status: 'delivered' }).then(() => loadData(true));
                              }}>
                                Deliver
                              </Button>
                            )}
                            <button 
                              onClick={() => {
                                const carrier = prompt("Enter Carrier (e.g. USPS, UPS):", s.carrier || "");
                                const tracking = prompt("Enter Tracking Number:", s.tracking_number || "");
                                const tracking_url = prompt("Enter Tracking URL:", s.tracking_url || "");
                                if (carrier !== null && tracking !== null) {
                                  updateShipment(s.id, { carrier, tracking_number: tracking, tracking_url: tracking_url || undefined }).then(() => loadData(true));
                                }
                              }}
                              className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                              title="Quick Edit Tracking"
                            >
                              <Edit3 size={12} />
                            </button>
                          </div>
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
                          <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
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
                              {format(new Date(act.created_at || act.createdAt), 'MMM d, yyyy HH:mm')}
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
      
      {/* ─── Send Offer Modal ─── */}
      <Modal isOpen={showOfferModal} onClose={() => setShowOfferModal(false)} title="Draft & Send Campaign Offer">
        <form onSubmit={submitOffer} className="space-y-4 font-outfit">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Offer Compensation Type</label>
            <select
              value={offerForm.offer_type}
              onChange={e => setOfferForm(prev => ({ ...prev, offer_type: e.target.value }))}
              className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm"
            >
              <option value="free_product">Free Product</option>
              <option value="affiliate_commission">Affiliate Commission Only</option>
              <option value="flat_fee">Flat Fee</option>
              <option value="hybrid">Hybrid (Flat Fee + Affiliate)</option>
            </select>
          </div>

          {(offerForm.offer_type === 'flat_fee' || offerForm.offer_type === 'hybrid') && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Flat Fee Amount (USD)</label>
              <input
                type="number"
                value={offerForm.flat_fee}
                onChange={e => setOfferForm(prev => ({ ...prev, flat_fee: Number(e.target.value) }))}
                className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm"
                min="0"
              />
            </div>
          )}

          <div className="flex items-center gap-2 py-2">
            <input
              type="checkbox"
              id="affiliate_enabled_creator"
              checked={offerForm.affiliate_enabled}
              onChange={e => setOfferForm(prev => ({ ...prev, affiliate_enabled: e.target.checked }))}
              className="rounded text-primary-600 focus:ring-primary-500 h-4 w-4 border-gray-300"
            />
            <label htmlFor="affiliate_enabled_creator" className="text-sm text-gray-700 select-none">Enable Affiliate Parameters</label>
          </div>

          {offerForm.affiliate_enabled && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border border-dashed border-gray-100 rounded-xl p-4 bg-gray-50/50">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Percentage (%)</label>
                <input
                  type="number"
                  value={offerForm.affiliate_percentage}
                  onChange={e => setOfferForm(prev => ({ ...prev, affiliate_percentage: Number(e.target.value) }))}
                  className="w-full bg-white border border-gray-200 rounded-lg p-2 text-sm"
                  min="0"
                  max="100"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Promo Code</label>
                <input
                  type="text"
                  value={offerForm.affiliate_code}
                  onChange={e => setOfferForm(prev => ({ ...prev, affiliate_code: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-lg p-2 text-sm uppercase font-mono"
                  placeholder="CODE20"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Tracking URL</label>
                <input
                  type="text"
                  value={offerForm.affiliate_link}
                  onChange={e => setOfferForm(prev => ({ ...prev, affiliate_link: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-lg p-2 text-sm"
                  placeholder="https://..."
                />
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="outline" className="flex-1 font-normal text-xs uppercase tracking-widest" onClick={() => setShowOfferModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-normal text-xs uppercase tracking-widest">
              {submitting ? 'Sending Offer...' : 'Send Offer Proposal'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ─── Edit Partnership Modal ─── */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Update Partnership Profile">
        <form onSubmit={submitEdit} className="space-y-4 font-outfit">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Creator Tier Size</label>
              <select
                value={editForm.creator_tier}
                onChange={e => setEditForm(prev => ({ ...prev, creator_tier: e.target.value }))}
                className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm"
              >
                <option value="unknown">Unknown</option>
                <option value="nano">Nano (&lt;10k)</option>
                <option value="micro">Micro (10k-50k)</option>
                <option value="mid_tier">Mid Tier (50k-100k)</option>
                <option value="macro">Macro (100k-500k)</option>
                <option value="celebrity">Celebrity (500k+)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Contract Signature Link</label>
              <input
                type="text"
                value={editForm.contract_url}
                onChange={e => setEditForm(prev => ({ ...prev, contract_url: e.target.value }))}
                className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm"
                placeholder="https://docusign.com/..."
              />
            </div>
          </div>

          <div className="flex gap-6 py-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="contract_required_creator"
                checked={editForm.contract_required}
                onChange={e => setEditForm(prev => ({ ...prev, contract_required: e.target.checked }))}
                className="rounded text-primary-600 focus:ring-primary-500 h-4 w-4 border-gray-300"
              />
              <label htmlFor="contract_required_creator" className="text-sm text-gray-700 select-none">Contract Required</label>
            </div>
            
            {editForm.contract_required && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="contract_signed_creator"
                  checked={editForm.contract_signed}
                  onChange={e => setEditForm(prev => ({ ...prev, contract_signed: e.target.checked }))}
                  className="rounded text-primary-600 focus:ring-primary-500 h-4 w-4 border-gray-300"
                />
                <label htmlFor="contract_signed_creator" className="text-sm text-gray-700 select-none">Contract Signed</label>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Campaign Start Date</label>
              <input
                type="date"
                value={editForm.start_date}
                onChange={e => setEditForm(prev => ({ ...prev, start_date: e.target.value }))}
                className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Campaign End Date</label>
              <input
                type="date"
                value={editForm.end_date}
                onChange={e => setEditForm(prev => ({ ...prev, end_date: e.target.value }))}
                className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Activation Notes</label>
            <textarea
              value={editForm.activation_notes}
              onChange={e => setEditForm(prev => ({ ...prev, activation_notes: e.target.value }))}
              className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm min-h-[60px]"
              placeholder="Fulfillment parameters, specific agreements..."
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Internal CRM Notes</label>
            <textarea
              value={editForm.internal_notes}
              onChange={e => setEditForm(prev => ({ ...prev, internal_notes: e.target.value }))}
              className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm min-h-[60px]"
              placeholder="Private details, scoring fits, follow up details..."
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="outline" className="flex-1 font-normal text-xs uppercase tracking-widest" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-normal text-xs uppercase tracking-widest">
              {submitting ? 'Saving...' : 'Save Parameters'}
            </Button>
          </div>
        </form>
      </Modal>

      <OutreachPreviewModal
        creatorId={creator?.id || ''}
        campaignId={creator?.campaign_id || undefined}
        messageType={outreachModalMessageType}
        isOpen={outreachModalOpen}
        onClose={() => setOutreachModalOpen(false)}
        onSend={handleConfirmSendOutreach}
      />

      <ImageLightbox
        src={lightboxOpen ? (creator.profile_pic || null) : null}
        alt={creator.full_name || creator.handle || ''}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
  );
}
