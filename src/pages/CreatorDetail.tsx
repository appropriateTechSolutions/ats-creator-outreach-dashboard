import { logger } from '../lib/logger';
import { toast } from '../lib/toast';
import { getErRating, cleanMessageText } from '../lib/formatters';
import { hasRole, ROLE_GROUPS } from '../lib/constants';
import { useState, useEffect } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  reviewLead,
  sendSingleOutreach,
  linkAffiliate,
  findSimilarCreators,
  previewOutreach,
  regenerateCreatorSummary,
  getAudienceAnalytics,
  uploadMediaKit,
  getMediaKitUrl,
  updateCreatorNotes,
  markQualified,
  sendOffer,
  sendDiscoveryEmail,
  markAccepted,
  activatePartnership,
  completePartnership,
  rejectPartnership,
  updatePartnership,
  updateShipment,
  createContent,
  updateContent,
  markContentSubmitted,
  approveContent,
  requestContentRevision,
  markContentPublished,
  syncContentPerformance,
  syncCreator,
} from '../lib/api';
import {
  useCreator,
  usePartnerships,
  useCreatorActivities,
  useShipments,
  useContents,
} from '../hooks/queries';
import { useInvalidate } from '../hooks/useInvalidate';
import { queryKeys } from '../lib/queryKeys';
import { useQueryClient } from '@tanstack/react-query';
import type { Creator } from '../types';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { ScoreBadge } from '../components/ui/ScoreBadge';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Button } from '../components/ui/Button';
import {
  ArrowLeft,
  Instagram,
  Youtube,
  UserCheck,
  Activity,
  Check,
  X,
  Star,
  Heart,
  Mail,
  MapPin,
  ExternalLink,
  FileText,
  Users,
  Send,
  RefreshCw,
  Sparkles,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  Link as LinkIcon,
  Copy,
  Tag,
  Calendar,
  TrendingUp,
  MousePointer2,
  ShoppingCart,
  DollarSign,
  ArrowUpRight,
  Clock,
  Eye,
  Download,
  Coins,
  Edit3,
  Truck,
} from 'lucide-react';
import { OutreachPreviewModal } from '../components/ui/OutreachPreviewModal';
import { LoadingState } from '../components/ui/LoadingState';
import { ImageLightbox } from '../components/ui/ImageLightbox';
import { InfoTip } from '../components/ui/InfoTip';
import { useAuth } from '../contexts/AuthContext';
import { DiscussionModal } from '../components/workflow/DiscussionModal';
import {
  PartnershipOfferModal,
  PartnershipEditModal,
  type OfferForm,
  type PartnershipEditForm,
} from '../components/creators/CreatorPartnershipModals';
import {
  AddContentModal,
  EditContentModal,
  PromptModal,
  RevisionModal,
  ContentEmailModal,
  type ContentForm,
  type EditContentForm,
} from '../components/creators/CreatorContentModals';
import { CreatorShipmentsSection } from '../components/creators/CreatorShipmentsSection';
import { CreatorContentSection } from '../components/creators/CreatorContentSection';
import { CreatorPartnershipsSection } from '../components/creators/CreatorPartnershipsSection';
import { CreatorConversationPanel } from '../components/creators/CreatorConversationPanel';
import { CreatorProfileHeader } from '../components/creators/CreatorProfileHeader';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { format } from 'date-fns';

export default function CreatorDetail() {
  const { user: currentUser } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const { data: creatorData, isLoading: loading } = useCreator(id);
  const creator = creatorData ?? null;
  const queryClient = useQueryClient();
  const invalidate = useInvalidate();
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
    link: '',
  });

  // Creator Notes States
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  // V3 CRM Tab & Partnership States
  const [activeTab, setActiveTab] = useState<
    'partnerships' | 'shipments' | 'content' | 'activities'
  >('partnerships');
  const { data: allPartnerships = [] } = usePartnerships();
  const partnerships = allPartnerships.filter(
    (p) => String(p.creator_id) === String(id) || String(p.Creator?.id) === String(id),
  );
  const { data: activities = [] } = useCreatorActivities(id);
  const { data: creatorShipments = [] } = useShipments(id ? { creator_id: id } : undefined);
  const { data: creatorContent = [] } = useContents(id ? { creator_id: id } : undefined);
  const [partnershipsLoading, setPartnershipsLoading] = useState(false);

  const [activePartnership, setActivePartnership] = useState<any | null>(null);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDiscussionModal, setShowDiscussionModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // V3 Content tracking states
  const [showAddContentModal, setShowAddContentModal] = useState(false);
  const [showEditContentModal, setShowEditContentModal] = useState(false);
  const [showContentEmailModal, setShowContentEmailModal] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionSubject, setRevisionSubject] = useState('');
  const [revisionBody, setRevisionBody] = useState('');
  const [activeRevisionContentId, setActiveRevisionContentId] = useState<string | null>(null);
  const [selectedContent, setSelectedContent] = useState<any | null>(null);
  const [contentEmailSubject, setContentEmailSubject] = useState('');
  const [contentEmailBody, setContentEmailBody] = useState('');
  const [contentActionLoading, setContentActionLoading] = useState(false);
  // Custom Prompt Modal States
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [promptTitle, setPromptTitle] = useState('');
  const [promptLabel, setPromptLabel] = useState('');
  const [promptPlaceholder, setPromptPlaceholder] = useState('');
  const [promptValue, setPromptValue] = useState('');
  const [activePromptContentId, setActivePromptContentId] = useState<string | null>(null);
  const [currentPromptAction, setCurrentPromptAction] = useState('');
  const [contentForm, setContentForm] = useState<ContentForm>({
    campaign_id: '',
    platform: 'instagram',
    content_type: 'instagram_reel',
    due_date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [editContentForm, setEditContentForm] = useState<EditContentForm>({
    id: '',
    platform: 'instagram',
    content_type: 'instagram_reel',
    due_date: '',
    notes: '',
    draft_url: '',
    published_url: '',
  });

  const [offerForm, setOfferForm] = useState<OfferForm>({
    offer_type: 'free_product',
    flat_fee: 0,
    affiliate_enabled: false,
    affiliate_percentage: 0,
    affiliate_code: '',
    affiliate_link: '',
  });

  const [editForm, setEditForm] = useState<PartnershipEditForm>({
    creator_tier: 'unknown',
    contract_required: false,
    contract_signed: false,
    contract_url: '',
    start_date: '',
    end_date: '',
    activation_notes: '',
    internal_notes: '',
  });

  const togglePlatform = (key: string) => {
    setExpandedPlatforms((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Helper to clean up email signatures and quoted replies
  const loadAudienceData = (silent = false) => {
    if (!id) return;
    if (!silent) setLoadingAudience(true);
    getAudienceAnalytics(id)
      .then((res) => {
        setAudienceData(res);
      })
      .catch((err) => {
        logger.error('Error loading audience analytics:', err);
      })
      .finally(() => {
        if (!silent) setLoadingAudience(false);
      });
  };

  // Refresh via cache invalidation; kept as a named fn so all existing call
  // sites (post-mutation refreshes) work unchanged.
  const loadData = (silent = false) => {
    if (!id) return;
    loadAudienceData(silent);
    invalidate(
      queryKeys.creators.detail(id),
      queryKeys.partnerships.root,
      queryKeys.activities.creator(id),
      queryKeys.shipments.root,
      queryKeys.content.root,
    );
  };

  // Reset editable notes when the creator identity changes.
  useEffect(() => {
    if (creator) setNotesValue(creator.notes || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creator?.id]);

  // Keep the conversation thread in sync (sorted ascending) with the creator.
  useEffect(() => {
    const msgs = creator?.conversation?.messages;
    if (msgs) {
      setMessages(
        [...msgs].sort(
          (a, b) => new Date(a.message_time).getTime() - new Date(b.message_time).getTime(),
        ),
      );
    }
  }, [creator]);

  // Default the content form's campaign to this creator's first partnership.
  useEffect(() => {
    if (partnerships.length > 0) {
      setContentForm((f) => ({
        ...f,
        campaign_id:
          f.campaign_id || partnerships[0].Campaign?.id || partnerships[0].campaign_id || '',
      }));
    }
  }, [partnerships]);

  // Load audience analytics for this creator.
  useEffect(() => {
    loadAudienceData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const [syncingProfile, setSyncingProfile] = useState(false);

  const handleSyncCreator = async () => {
    // Use creator.id (the real database ID already loaded) instead of the URL
    // param `id` which may contain a malformed UUID due to React Router state.
    const creatorId = creator?.id || id;
    if (!creatorId) return;
    try {
      setSyncingProfile(true);
      await syncCreator(creatorId, creator?.campaign_id || undefined);
      await loadData(true);
      showToast('Successfully synced Instagram profile!', 'success');
    } catch (err: any) {
      const errMsg =
        err.response?.data?.error || err.response?.data?.message || err.message || String(err);
      showToast('Sync failed: ' + errMsg, 'error');
    } finally {
      setSyncingProfile(false);
    }
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
        const isConfirmed = await confirm({
          title: 'Reject Partnership',
          message: 'Are you sure you want to reject this partnership?',
          confirmText: 'Reject',
          isDestructive: true,
        });
        if (isConfirmed) {
          await rejectPartnership(partnershipId);
        } else {
          setPartnershipsLoading(false);
          return;
        }
      }
      await loadData(true);
    } catch (err) {
      showToast('Action failed: ' + err, 'error');
    } finally {
      setPartnershipsLoading(false);
    }
  };

  const handleRevisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRevisionContentId) return;
    try {
      setSubmitting(true);
      // Save the final email message body text directly to CRM as the revision notes
      await requestContentRevision(activeRevisionContentId, { notes: revisionBody });

      await sendSingleOutreach(
        id!,
        creatorContent.find((c) => c.id === activeRevisionContentId)?.campaign_id || undefined,
        revisionSubject,
        revisionBody,
        'initial',
      );

      setShowRevisionModal(false);
      await loadData(true);
      setShowRevisionModal(false);
      showToast('Revision request logged and email sent to creator!', 'success');
    } catch (err: any) {
      showToast('Failed to request revision: ' + (err.message || err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleContentAction = async (contentId: string, action: string) => {
    try {
      setContentActionLoading(true);
      const currentItem = creatorContent.find((c) => c.id === contentId);
      if (action === 'submit') {
        setPromptTitle('Submit Content Draft');
        setPromptLabel('Draft URL');
        setPromptPlaceholder('https://instagram.com/p/mock_draft_url');
        setPromptValue(currentItem?.draft_url || 'https://instagram.com/p/mock_draft_url');
        setActivePromptContentId(contentId);
        setCurrentPromptAction('submit');
        setShowPromptModal(true);
        setContentActionLoading(false);
        return;
      } else if (action === 'approve') {
        await approveContent(contentId);
      } else if (action === 'revise') {
        const creatorName = creator?.full_name || `@${creator?.handle}` || 'Creator';
        const defaultNotes = 'Please revise the lighting/audio.';
        const subject = `Revision Requested: ${currentItem?.Campaign?.name || 'Campaign'} Content Deliverable`;
        const body = `Hi ${creatorName},\n\nWe have reviewed your content draft and would like to request some revisions.\n\nRevision Notes:\n${defaultNotes}\n\nPlease update the draft and share the new link with us.\n\nBest regards,\nCampaign Management Team`;

        setActiveRevisionContentId(contentId);
        setRevisionSubject(subject);
        setRevisionBody(body);
        setShowRevisionModal(true);
        return;
      } else if (action === 'publish') {
        setPromptTitle('Publish Content Deliverable');
        setPromptLabel('Live Published URL');
        setPromptPlaceholder('https://instagram.com/p/mock_published_url');
        setPromptValue(currentItem?.published_url || 'https://instagram.com/p/mock_published_url');
        setActivePromptContentId(contentId);
        setCurrentPromptAction('publish');
        setShowPromptModal(true);
        setContentActionLoading(false);
        return;
      } else if (action === 'sync') {
        await syncContentPerformance(contentId);
      }
      await loadData(true);
    } catch (err: any) {
      showToast('Content action failed: ' + (err.message || err), 'error');
    } finally {
      setContentActionLoading(false);
    }
  };

  const handlePromptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePromptContentId) return;
    try {
      setContentActionLoading(true);
      setShowPromptModal(false);
      if (currentPromptAction === 'submit') {
        await markContentSubmitted(activePromptContentId, { draft_url: promptValue });
      } else if (currentPromptAction === 'publish') {
        await markContentPublished(activePromptContentId, { published_url: promptValue });
      }
      await loadData(true);
    } catch (err: any) {
      showToast('Action failed: ' + (err.message || err), 'error');
    } finally {
      setContentActionLoading(false);
    }
  };

  const handleOpenEmailRequirements = () => {
    if (creatorContent.length === 0) return;

    const creatorName = creator?.full_name || `@${creator?.handle}` || 'Creator';
    const campaignNames = Array.from(new Set(creatorContent.map((c) => c.Campaign?.name))).join(
      ', ',
    );

    const subject = `Campaign Deliverables and Requirements - ${campaignNames}`;
    let body = `Hi ${creatorName},\n\nHere is the summary of your content deliverables and requirements for the upcoming campaign:\n\n`;

    creatorContent.forEach((c, index) => {
      body += `Requirement #${index + 1}:\n`;
      body += `- Campaign: ${c.Campaign?.name || '---'}\n`;
      body += `- Platform: ${c.platform.toUpperCase()}\n`;
      body += `- Content Type: ${c.content_type.replace('_', ' ').toUpperCase()}\n`;
      body += `- Due Date: ${c.due_date ? format(new Date(c.due_date), 'MMM d, yyyy') : '---'}\n`;
      if (c.notes) body += `- Guidelines: ${c.notes}\n`;
      body += `\n`;
    });

    body += `Please review these requirements and share your drafts once ready.\n\nBest regards,\nCampaign Management Team`;

    setContentEmailSubject(subject);
    setContentEmailBody(body);
    setShowContentEmailModal(true);
  };

  const handleSendContentEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await sendSingleOutreach(
        id!,
        creatorContent[0]?.campaign_id || undefined,
        contentEmailSubject,
        contentEmailBody,
        'initial',
      );
      setShowContentEmailModal(false);
      showToast('Deliverable requirements email sent to creator successfully!', 'success');
    } catch (err: any) {
      showToast('Failed to send email: ' + (err.message || err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEditContent = (c: any) => {
    setSelectedContent(c);
    setEditContentForm({
      id: c.id,
      platform: c.platform,
      content_type: c.content_type,
      due_date: c.due_date || '',
      notes: c.notes || '',
      draft_url: c.draft_url || '',
      published_url: c.published_url || '',
    });
    setShowEditContentModal(true);
  };

  const handleEditContentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await updateContent(editContentForm.id, {
        platform: editContentForm.platform,
        content_type: editContentForm.content_type,
        due_date: editContentForm.due_date || null,
        notes: editContentForm.notes,
        draft_url: editContentForm.draft_url || null,
        published_url: editContentForm.published_url || null,
      });
      setShowEditContentModal(false);
      await loadData(true);
    } catch (err: any) {
      showToast('Failed to update deliverable: ' + (err.message || err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddContentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contentForm.campaign_id) {
      showToast('Please select a Campaign', 'error');
      return;
    }
    try {
      setSubmitting(true);
      const selectedPart = partnerships.find(
        (p) =>
          String(p.campaign_id) === String(contentForm.campaign_id) ||
          String(p.Campaign?.id) === String(contentForm.campaign_id),
      );
      await createContent({
        creator_id: id,
        campaign_id: contentForm.campaign_id,
        partnership_id: selectedPart?.id || null,
        platform: contentForm.platform,
        content_type: contentForm.content_type,
        due_date: contentForm.due_date,
        notes: contentForm.notes,
      });
      setShowAddContentModal(false);
      setContentForm((prev) => ({
        ...prev,
        notes: '',
      }));
      await loadData(true);
    } catch (err: any) {
      showToast('Failed to add content requirement: ' + (err.message || err), 'error');
    } finally {
      setSubmitting(false);
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
      affiliate_link: p.affiliate_link || '',
    });
    setShowOfferModal(true);
  };

  const submitDiscussion = async (subject: string, body: string, testEmail?: string) => {
    if (!activePartnership) return;
    setSubmitting(true);
    try {
      await sendDiscoveryEmail(activePartnership.id, subject, body, testEmail);
      setShowDiscussionModal(false);
      await loadData(true);
    } catch (err: any) {
      showToast(
        `Failed to send discussion email: ${err.response?.data?.message || err.message || err}`,
        'error',
      );
    } finally {
      setSubmitting(false);
    }
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
        affiliate_percentage: offerForm.affiliate_enabled
          ? Number(offerForm.affiliate_percentage)
          : undefined,
        affiliate_code: offerForm.affiliate_enabled ? offerForm.affiliate_code : undefined,
        affiliate_link: offerForm.affiliate_enabled ? offerForm.affiliate_link : undefined,
      });
      setShowOfferModal(false);
      await loadData(true);
    } catch (err) {
      showToast('Failed to send offer: ' + err, 'error');
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
      internal_notes: p.internal_notes || '',
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
        internal_notes: editForm.internal_notes || null,
      });
      setShowEditModal(false);
      await loadData(true);
    } catch (err) {
      showToast('Failed to update details: ' + err, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    // Scroll to conversation if requested
    const params = new URLSearchParams(location.search);
    if (params.get('scroll') === 'conversation') {
      setTimeout(() => {
        const el = document.getElementById('conversation-section');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 500);
    }
  }, [id, location.search]);

  const handleReview = async (action: 'approve' | 'reject' | 'shortlist' | 'revoke') => {
    if (!creator) return;

    if (action === 'approve') {
      handleSendOutreach();
      return;
    }

    const previousCreator = queryClient.getQueryData<Creator>(queryKeys.creators.detail(id!));

    // Optimistically update the creator cache immediately
    queryClient.setQueryData<Creator>(queryKeys.creators.detail(id!), (prev) => {
      if (!prev) return prev;
      if (action === 'revoke') return { ...prev, review_status: 'hold', lifecycle_status: 'new' };
      if (action === 'reject') return { ...prev, review_status: 'rejected' };
      if (action === 'shortlist') return { ...prev, review_status: 'shortlisted' };
      return prev;
    });

    try {
      await reviewLead(creator.id, action);
      loadData(true);
    } catch (err) {
      if (previousCreator)
        queryClient.setQueryData(queryKeys.creators.detail(id!), previousCreator); // Revert
      toast.error('Action failed: ' + err);
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

    if (!['application/pdf'].includes(file.type)) {
      showToast('Only PDF reports or media kits are supported.', 'error');
      return;
    }

    setUploadingMediaKit(true);
    try {
      await uploadMediaKit(creator.id, file);
      await loadData(true);
      showToast('Media kit PDF uploaded and parsed successfully!', 'success');
    } catch (err: any) {
      logger.error(err);
      showToast(err?.error || err?.message || 'Failed to parse media kit PDF.', 'error');
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
      logger.error(err);
      toast.error(err?.error || err?.message || 'Could not open the media kit.');
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
      logger.error(err);
      toast.error(err?.error || err?.message || 'Could not download the media kit.');
    } finally {
      setMediaKitAction(null);
    }
  };

  const getInstagramHandle = () => {
    if (!creator) return '';

    const igProfile = creator.profiles?.find((p) => p.platform.toLowerCase() === 'instagram');
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
    if (!creator) return;
    setSendingEmail(true);
    try {
      await sendSingleOutreach(
        creator.id,
        creator.campaign_id || undefined,
        customSubject,
        customBody,
        messageType,
      );
      toast.success('Outreach email sent successfully!');
      loadData();
    } catch (err) {
      toast.error('Failed to send outreach: ' + err);
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
      queryClient.setQueryData<Creator>(queryKeys.creators.detail(id!), (prev) =>
        prev ? { ...prev, summary: res.summary } : prev,
      );
    } catch (err: any) {
      toast.error(err?.message || err || 'Failed to regenerate summary.');
    } finally {
      setRegeneratingSummary(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!creator) return;
    setSavingNotes(true);
    try {
      await updateCreatorNotes(creator.id, notesValue);
      queryClient.setQueryData<Creator>(queryKeys.creators.detail(id!), (prev) =>
        prev ? { ...prev, notes: notesValue } : prev,
      );
      setIsEditingNotes(false);
    } catch (err: any) {
      toast.error(err?.message || err || 'Failed to save notes.');
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
      toast.error('This creator must be part of a campaign to find similar influencers.');
      return;
    }

    setFindingSimilar(true);
    try {
      const res: any = await findSimilarCreators(creator.id, creator.campaign_id);
      toast.success(
        `✅ Success: ${res.message || '10 similar influencers found and added to this campaign!'}`,
      );
    } catch (err: any) {
      toast.error(err || 'Failed to find similar influencers.');
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
        affiliate_link: affiliateFormData.link,
      });
      setIsAffiliateModalOpen(false);
      loadData();
    } catch (err) {
      toast.error('Failed to link affiliate info: ' + err);
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
        <div className="text-error-500 font-normal text-lg mb-4">
          {error || 'Creator not found.'}
        </div>
        <Link to="/creators" className="text-primary-600 hover:underline">
          Return to Directory
        </Link>
      </div>
    );
  }

  // Parse scoring_notes safely (handle both snake_case and camelCase)
  let scoringNotes = creator.scoring_notes || (creator as any).scoringNotes;
  if (typeof scoringNotes === 'string') {
    try {
      scoringNotes = JSON.parse(scoringNotes);
    } catch {
      scoringNotes = {};
    }
  }
  const breakdown = (scoringNotes as any)?.initial_breakdown || {};

  // Available platforms to check
  const platforms = [
    {
      key: 'instagram',
      label: 'Instagram',
      icon: <Instagram size={14} className="text-pink-600" />,
    },
    { key: 'youtube', label: 'YouTube', icon: <Youtube size={14} className="text-red-600" /> },
    { key: 'tiktok', label: 'TikTok', icon: <Activity size={14} className="text-black" /> },
  ];
  const fromCampaignId = (location.state as any)?.fromCampaignId;
  const fromMyCreators = (location.state as any)?.fromMyCreators;
  const fromPath = (location.state as any)?.fromPath;
  const fromLabel = (location.state as any)?.fromLabel;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-[fadeIn_0.2s_ease] px-4 sm:px-0">
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

      <Card>
        <CreatorProfileHeader
          creator={creator}
          currentUser={currentUser}
          fromPath={fromPath}
          fromLabel={fromLabel}
          fromCampaignId={fromCampaignId}
          fromMyCreators={fromMyCreators}
          setLightboxOpen={setLightboxOpen}
          handleReview={handleReview}
          handleFindSimilar={handleFindSimilar}
          findingSimilar={findingSimilar}
          handleSendDM={handleSendDM}
          handleSendOutreach={handleSendOutreach}
          sendingEmail={sendingEmail}
          isFollowUpDue={isFollowUpDue}
          isWaitingForFollowUp={isWaitingForFollowUp}
          handleSyncCreator={handleSyncCreator}
          syncingProfile={syncingProfile}
        />

        {/* Creator Insights Section (Summary, Bio, Email, Location) */}
        <div className="px-8 py-6 bg-primary-50/30 border-b border-gray-100">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[10px] font-normal text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Sparkles size={12} className="text-primary-600" /> SUMMARY
              </h4>
              {hasRole(currentUser?.role, ROLE_GROUPS.MANAGE_CREATORS) && (
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
                : creator.notes ||
                  "AI is analyzing this creator's profile and generating a professional summary..."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex gap-3">
              <div className="mt-1 text-primary-600">
                <FileText size={18} />
              </div>
              <div>
                <h4 className="text-[10px] font-normal text-gray-400 uppercase tracking-widest mb-1">
                  About / Bio
                </h4>
                <p className="text-sm text-gray-700 leading-relaxed italic">
                  {creator.bio || 'No bio available for this creator.'}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="mt-1 text-primary-600">
                <Mail size={18} />
              </div>
              <div className="flex-1">
                <h4 className="text-[10px] font-normal text-gray-400 uppercase tracking-widest mb-1">
                  Direct Contact
                </h4>
                <div
                  className={`p-3 rounded-lg text-sm font-normal ${
                    creator.email
                      ? 'text-gray-800 bg-transparent'
                      : 'text-amber-700 bg-amber-50 border border-amber-200'
                  }`}
                >
                  {creator.email || '📧 Email hidden or not found'}
                </div>
                {creator.has_email && (
                  <span className="text-[10px] text-green-600 font-normal flex items-center gap-1 mt-1">
                    <Check size={10} /> Verified Email
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <div className="mt-1 text-primary-600">
                <MapPin size={18} />
              </div>
              <div>
                <h4 className="text-[10px] font-normal text-gray-400 uppercase tracking-widest mb-1">
                  Target Location
                </h4>
                <p className="text-sm font-normal text-gray-800 capitalize">
                  {creator.city
                    ? `${creator.city}${creator.state ? `, ${creator.state}` : ''}${creator.country ? `, ${creator.country}` : ''}`
                    : 'Location unknown'}
                </p>
                <span className="text-[10px] text-gray-500 font-medium">
                  Primarily active in this region
                </span>
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
              {platforms.map((platform) => {
                const pData = breakdown[platform.key];
                // Display the platform card if data exists OR if the creator has this platform true (even if data is 0)
                const hasPlatform = creator[`has_${platform.key}` as keyof Creator];

                if (!pData && !hasPlatform) return null;

                const score = pData?.score || 0;
                const profile = creator.profiles?.find(
                  (p) => p.platform.toLowerCase() === platform.key,
                );

                const isExpanded = expandedPlatforms[platform.key];

                return (
                  <div
                    key={platform.key}
                    className="bg-gray-50 border border-gray-200 rounded-xl p-5 shadow-sm"
                  >
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-2 font-normal text-gray-800 text-sm uppercase tracking-wide">
                        {platform.icon} {platform.label}
                      </div>
                      <div className="flex items-center gap-3">
                        <div
                          className={`text-xl font-normal ${
                            score >= 70
                              ? 'text-green-600'
                              : score >= 40
                                ? 'text-primary-600'
                                : 'text-gray-500'
                          }`}
                        >
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
                          <p className="text-[10px] font-normal text-gray-400 uppercase tracking-widest mb-0.5">
                            Followers
                          </p>
                          <p className="text-sm font-normal text-gray-900 flex items-center gap-1 mb-3">
                            <Users size={12} className="text-gray-400" />
                            {profile.followers?.toLocaleString() || 'N/A'}
                          </p>
                          <p className="text-[10px] font-normal text-gray-400 uppercase tracking-widest mb-0.5">
                            Avg Likes
                          </p>
                          <p className="text-sm font-normal text-gray-900 flex items-center gap-1 mb-3">
                            {profile.avg_likes?.toLocaleString() || 'N/A'}
                          </p>
                          <p className="text-[10px] font-normal text-gray-400 uppercase tracking-widest mb-0.5">
                            Posts / Media
                          </p>
                          <p className="text-sm font-normal text-gray-900 flex items-center gap-1">
                            {profile.media_count?.toLocaleString() || 'N/A'}
                          </p>
                        </div>
                        <div className="flex-1">
                          <p className="text-[10px] font-normal text-gray-400 uppercase tracking-widest mb-0.5">
                            Engagement
                          </p>
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-sm font-normal text-gray-900">
                              {profile.engagement_rate
                                ? `${Number(profile.engagement_rate).toFixed(2)}%`
                                : 'N/A'}
                            </span>
                            {profile.engagement_rate &&
                              (() => {
                                const rating = getErRating(
                                  profile.followers || 0,
                                  Number(profile.engagement_rate),
                                );
                                return (
                                  rating && (
                                    <span
                                      className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${rating.colorClass}`}
                                    >
                                      {rating.label}
                                    </span>
                                  )
                                );
                              })()}
                          </div>
                          <p className="text-[10px] font-normal text-gray-400 uppercase tracking-widest mb-0.5">
                            Avg Comments
                          </p>
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
                          <p className="text-xs text-gray-400 italic mt-4 pt-4 border-t border-gray-100">
                            No algorithm breakdown points available.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {Object.keys(breakdown).length === 0 && (
              <div className="bg-gray-50 p-6 rounded-xl border border-dashed border-gray-300 text-center text-gray-500 text-sm">
                Detailed platform-wise algorithm breakdown was not collected for this lead. Total
                score: {creator.outreach_readiness_score || 0}/100.
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-normal text-gray-900 uppercase tracking-widest mb-4">
                Match Breakdown
              </h3>
              <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-normal text-gray-900 uppercase tracking-widest">
                    Total Match
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-normal text-primary-600">
                      {Math.round(Number(creator.relevance_score) || 0)}%
                    </span>
                    <button
                      onClick={() => setMatchExpanded(!matchExpanded)}
                      className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-400"
                    >
                      {matchExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {matchExpanded &&
                  (() => {
                    const rb = (scoringNotes as any)?.relevance_breakdown;
                    if (!rb) {
                      return (
                        <div className="pl-3 border-l-2 border-primary-100 animate-[fadeIn_0.2s_ease] text-xs text-gray-400 italic">
                          Detailed breakdown unavailable for this lead.
                        </div>
                      );
                    }
                    const fmtPct = (p: number) => (p > 0 ? `+${p.toFixed(1)}%` : '0%');
                    return (
                      <div className="space-y-3 pl-3 border-l-2 border-primary-100 animate-[fadeIn_0.2s_ease]">
                        {/* City Match */}
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex flex-col">
                            <span className="text-sm text-gray-500 font-medium">City Match</span>
                            {rb.city?.matched && rb.city?.source === 'bio' && (
                              <span className="text-[10px] text-gray-400">
                                matched in bio (partial)
                              </span>
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
                            {Array.isArray(rb.categories?.matched_categories) &&
                              rb.categories.matched_categories.length > 0 && (
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
                                  ({rb.keywords?.matched_keywords?.length || 0}/
                                  {rb.keywords.total_keywords})
                                </span>
                              )}
                            </span>
                            {Array.isArray(rb.keywords?.matched_keywords) &&
                              rb.keywords.matched_keywords.length > 0 && (
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
                  * Match % determines how well they fit your specific search filters defined in the
                  campaign.
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
                <span className="text-gray-400 italic">
                  No notes added yet. Click 'Edit Notes' to add your notes.
                </span>
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
                  {mediaKitAction === 'view' ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Eye size={14} />
                  )}{' '}
                  View
                </button>
                <button
                  type="button"
                  onClick={handleDownloadMediaKit}
                  disabled={mediaKitAction !== null}
                  title="Download the uploaded media kit PDF"
                  className="no-print inline-flex items-center gap-1.5 text-xs font-normal text-primary-600 hover:text-primary-700 transition-colors uppercase tracking-widest font-outfit disabled:opacity-50"
                >
                  {mediaKitAction === 'download' ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Download size={14} />
                  )}{' '}
                  Download Profile
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
                    const male = demos.find(
                      (d: any) => d.demographic_type === 'gender' && d.gender === 'male',
                    );
                    const female = demos.find(
                      (d: any) => d.demographic_type === 'gender' && d.gender === 'female',
                    );

                    const malePct = male ? Number(male.percentage) * 100 : 0;
                    const femalePct = female ? Number(female.percentage) * 100 : 0;

                    if (malePct === 0 && femalePct === 0) {
                      return <p className="text-sm text-gray-500 italic">No gender data found</p>;
                    }

                    return (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center text-sm font-normal text-gray-700">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Male:{' '}
                            {malePct.toFixed(1)}%
                          </span>
                          <span className="flex items-center gap-1.5">
                            Female: {femalePct.toFixed(1)}%{' '}
                            <span className="w-2.5 h-2.5 rounded-full bg-pink-500"></span>
                          </span>
                        </div>
                        <div className="w-full h-3 rounded-full bg-pink-500 overflow-hidden flex">
                          <div
                            className="h-full bg-blue-500 transition-all duration-500"
                            style={{ width: `${malePct}%` }}
                          ></div>
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
                    if (!quality)
                      return <p className="text-sm text-gray-500 italic">No quality data found</p>;

                    const fakePct = quality.fake_followers_percent
                      ? Number(quality.fake_followers_percent) * 100
                      : 0;
                    const realPct = quality.real_percent ? Number(quality.real_percent) * 100 : 0;

                    return (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-white border border-gray-200/50 rounded-lg shadow-sm">
                          <p className="flex items-center justify-center gap-1 text-xs font-normal text-gray-400 uppercase">
                            Fake Followers
                            <InfoTip text="Everyone has fake followers. Up to 25% is perfectly normal." />
                          </p>
                          <p
                            className={`text-xl font-normal mt-1 ${fakePct > 25 ? 'text-red-600' : fakePct > 15 ? 'text-amber-600' : 'text-green-600'}`}
                          >
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
                      const ages = demos
                        .filter((d: any) => d.demographic_type === 'age')
                        .sort((a: any, b: any) =>
                          (a.age_range || '').localeCompare(b.age_range || ''),
                        );

                      if (ages.length === 0)
                        return <p className="text-sm text-gray-500 italic">No age data found</p>;

                      return ages.map((age: any) => {
                        const pct = Number(age.percentage) * 100;
                        return (
                          <div key={age.id} className="space-y-1">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-gray-500 font-normal">{age.age_range}</span>
                              <span className="font-semibold text-gray-700">{pct.toFixed(1)}%</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-gray-200 overflow-hidden">
                              <div
                                className="h-full bg-primary-600 rounded-full"
                                style={{ width: `${pct}%` }}
                              ></div>
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
                      if (!quality)
                        return (
                          <p className="text-sm text-gray-500 italic">No reachability data found</p>
                        );

                      const reachMetrics = [
                        { label: '< 500 followers', val: quality.reachability_0_500 },
                        { label: '500 - 1,000 followers', val: quality.reachability_500_1000 },
                        { label: '1,000 - 1,500 followers', val: quality.reachability_1000_1500 },
                        { label: '> 1,500 followers', val: quality.reachability_1500_plus },
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
                              <div
                                className="h-full bg-indigo-500 rounded-full"
                                style={{ width: `${pct}%` }}
                              ></div>
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
                  const countries = locs
                    .filter((l: any) => l.location_type === 'country')
                    .slice(0, 5);
                  const cities = locs.filter((l: any) => l.location_type === 'city').slice(0, 5);

                  if (countries.length === 0 && cities.length === 0) {
                    return <p className="text-sm text-gray-500 italic">No location data found</p>;
                  }

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Top Countries */}
                      <div>
                        <h5 className="text-xs font-semibold text-gray-700 uppercase mb-3">
                          Countries
                        </h5>
                        <div className="space-y-2">
                          {countries.map((c: any) => {
                            const pct = Number(c.percentage) * 100;
                            return (
                              <div
                                key={c.id}
                                className="flex justify-between items-center text-xs border-b border-gray-200/50 pb-1.5"
                              >
                                <span className="text-gray-600 font-normal">{c.name}</span>
                                <span className="font-semibold text-gray-900">
                                  {pct.toFixed(2)}%
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Top Cities */}
                      <div>
                        <h5 className="text-xs font-semibold text-gray-700 uppercase mb-3">
                          Cities
                        </h5>
                        <div className="space-y-2">
                          {cities.map((c: any) => {
                            const pct = Number(c.percentage) * 100;
                            return (
                              <div
                                key={c.id}
                                className="flex justify-between items-center text-xs border-b border-gray-200/50 pb-1.5"
                              >
                                <span className="text-gray-600 font-normal">{c.name}</span>
                                <span className="font-semibold text-gray-900">
                                  {pct.toFixed(2)}%
                                </span>
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
              <p className="text-sm font-semibold text-gray-700 uppercase">
                No Demographics Data Uploaded
              </p>
              <p className="text-xs text-gray-400 max-w-sm mt-1 mb-4">
                Upload a media kit PDF report (e.g. Modash Report) to automatically parse locations,
                age ranges, gender distribution, and audience quality using Gemini AI.
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
      <CreatorConversationPanel
        creator={creator}
        messages={messages}
        cleanMessageText={cleanMessageText}
        partnerships={partnerships}
        setActivePartnership={setActivePartnership}
        setShowDiscussionModal={setShowDiscussionModal}
        setShowOfferModal={setShowOfferModal}
      />

      {creator.lifecycle_status &&
        [
          'engaged',
          'qualified',
          'offered',
          'accepted',
          'activated',
          'converted',
          'completed',
        ].includes(creator.lifecycle_status) && (
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
                          <p className="text-[9px] font-normal text-gray-400 uppercase tracking-widest mb-0.5">
                            Tracking Code
                          </p>
                          <p className="text-sm font-normal text-gray-900 font-outfit uppercase">
                            {(creator as any).affiliate_code || '---'}
                          </p>
                        </div>
                        <button className="text-primary-500 hover:text-primary-700 p-1.5 hover:bg-primary-50 rounded-lg transition-colors">
                          <Copy size={14} />
                        </button>
                      </div>
                      {hasRole(currentUser?.role, ROLE_GROUPS.MANAGE_CREATORS) ? (
                        <Button
                          variant="outline"
                          className="w-full text-[10px] uppercase tracking-widest"
                          onClick={() => {
                            setAffiliateFormData({
                              code: (creator as any).affiliate_code || '',
                              link: (creator as any).affiliate_link || '',
                            });
                            setIsAffiliateModalOpen(true);
                          }}
                        >
                          Manage Assets
                        </Button>
                      ) : (
                        <p className="text-[9px] text-gray-400 italic text-center mt-2">
                          Read-only access for this section
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 rounded-xl border border-dashed border-gray-200 py-5 gap-1">
                        <LinkIcon size={24} className="text-gray-300" />
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest">
                          No assets linked
                        </p>
                      </div>
                      {hasRole(currentUser?.role, ROLE_GROUPS.MANAGE_CREATORS) ? (
                        <Button
                          className="w-full bg-primary-600 hover:bg-primary-700 shadow-md text-[10px] uppercase tracking-widest"
                          onClick={() => setIsAffiliateModalOpen(true)}
                        >
                          Link Assets
                        </Button>
                      ) : (
                        <p className="text-[9px] text-gray-400 italic text-center mt-2">
                          Read-only access for this section
                        </p>
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
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">
                    Real-time tracking for {creator.full_name}
                  </p>
                </div>
                <div
                  className={`px-3 py-1 rounded-full text-[10px] font-normal uppercase tracking-widest border ${
                    (creator as any).affiliate_status === 'paid'
                      ? 'bg-green-50 text-green-600 border-green-100'
                      : (creator as any).affiliate_status === 'approved'
                        ? 'bg-blue-50 text-blue-600 border-blue-100'
                        : 'bg-amber-50 text-amber-600 border-amber-100'
                  }`}
                >
                  {(creator as any).affiliate_status || 'Pending'}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="space-y-1 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                  <p className="text-[9px] font-normal text-gray-400 uppercase tracking-widest flex items-center gap-1">
                    <MousePointer2 size={10} /> Total Clicks
                  </p>
                  <p className="text-2xl font-normal text-gray-900 font-outfit">
                    {(creator as any).AffiliateTracking?.clicks || 0}
                  </p>
                </div>
                <div className="space-y-1 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                  <p className="text-[9px] font-normal text-gray-400 uppercase tracking-widest flex items-center gap-1">
                    <ShoppingCart size={10} /> Conversions
                  </p>
                  <p className="text-2xl font-normal text-gray-900 font-outfit">
                    {(creator as any).AffiliateTracking?.conversions || 0}
                  </p>
                </div>
                <div className="space-y-1 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                  <p className="text-[9px] font-normal text-gray-400 uppercase tracking-widest flex items-center gap-1">
                    <DollarSign size={10} /> Gross Revenue
                  </p>
                  <p className="text-2xl font-normal text-emerald-600 font-outfit">
                    $
                    {Number(
                      (creator as any).AffiliateTracking?.revenue_generated || 0,
                    ).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="space-y-1 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                  <p className="text-[9px] font-normal text-gray-400 uppercase tracking-widest flex items-center gap-1">
                    <ArrowUpRight size={10} /> Net Payable
                  </p>
                  <p className="text-2xl font-normal text-primary-600 font-outfit">
                    $
                    {Number(
                      (creator as any).AffiliateTracking?.commission_owed || 0,
                    ).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </Card>
          </>
        )}

      {/* V3 Creator CRM Partnerships & Activities Section */}
      <Card className="no-print">
        <div className="border-b border-gray-100 bg-white rounded-t-[12px] flex items-center justify-between px-6 pt-4">
          {['partnerships', 'shipments', 'content', 'activities'].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab as any)}
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
                  : tab === 'content'
                    ? `Content (${creatorContent.length})`
                    : `Activity Timeline (${activities.length})`}
            </button>
          ))}
        </div>

        {activeTab === 'partnerships' && (
          <CreatorPartnershipsSection
            partnerships={partnerships}
            partnershipsLoading={partnershipsLoading}
            creatorId={id || ''}
            handlePartnershipAction={handlePartnershipAction}
            openOfferModal={openOfferModal}
            openEditModal={openEditModal}
          />
        )}

        {activeTab === 'shipments' && (
          <div className="p-6 space-y-4">
            <CreatorShipmentsSection
              creatorShipments={creatorShipments}
              creatorId={id || ''}
              loadData={loadData}
            />
          </div>
        )}

        {activeTab === 'content' && (
          <CreatorContentSection
            creatorContent={creatorContent}
            creatorId={id || ''}
            contentActionLoading={contentActionLoading}
            partnerships={partnerships}
            handleContentAction={handleContentAction}
            handleOpenEditContent={handleOpenEditContent}
            setShowAddContentModal={setShowAddContentModal}
            handleOpenEmailRequirements={handleOpenEmailRequirements}
          />
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
                                new Date((act.created_at || act.createdAt)!),
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

      {/* Affiliate Modal */}
      {isAffiliateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/80 backdrop-blur-md p-4">
          <Card className="w-full max-w-md border-none shadow-3xl animate-in zoom-in-95 duration-200 bg-white rounded-2xl">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/30 rounded-t-2xl">
              <h2 className="text-xl font-normal uppercase tracking-tight flex items-center gap-2 text-gray-900 font-outfit">
                <LinkIcon className="text-primary-600" size={24} /> Link Affiliate Assets
              </h2>
              <button
                onClick={() => setIsAffiliateModalOpen(false)}
                className="text-gray-400 hover:text-gray-900 p-1 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-1.5">
                <label
                  htmlFor="creatordetail-2001"
                  className="text-[10px] font-normal text-gray-400 uppercase tracking-widest"
                >
                  Affiliate Tracking Code
                </label>
                <div className="relative">
                  <Tag className="absolute left-4 top-3.5 w-4 h-4 text-gray-400" />
                  <input
                    id="creatordetail-2001"
                    placeholder="e.g. SAVE20"
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-normal text-gray-900 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all shadow-sm font-outfit uppercase"
                    value={affiliateFormData.code}
                    onChange={(e) =>
                      setAffiliateFormData({ ...affiliateFormData, code: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="creatordetail-2002"
                  className="text-[10px] font-normal text-gray-400 uppercase tracking-widest"
                >
                  Tracking Link (URL)
                </label>
                <div className="relative">
                  <LinkIcon className="absolute left-4 top-3.5 w-4 h-4 text-gray-400" />
                  <input
                    id="creatordetail-2002"
                    placeholder="https://..."
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-normal text-gray-900 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all shadow-sm"
                    value={affiliateFormData.link}
                    onChange={(e) =>
                      setAffiliateFormData({ ...affiliateFormData, link: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t border-gray-50">
                <Button
                  type="button"
                  variant="ghost"
                  className="flex-1 font-normal uppercase text-[10px] tracking-widest"
                  onClick={() => setIsAffiliateModalOpen(false)}
                >
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

      <DiscussionModal
        isOpen={showDiscussionModal}
        onClose={() => setShowDiscussionModal(false)}
        onSubmit={submitDiscussion}
        creator={creator}
        submitting={submitting}
      />

      {/* 📝 Send Offer Modal 📝 */}
      <PartnershipOfferModal
        isOpen={showOfferModal}
        onClose={() => setShowOfferModal(false)}
        offerForm={offerForm}
        setOfferForm={setOfferForm}
        onSubmit={submitOffer}
        submitting={submitting}
      />

      {/* ─── Edit Partnership Modal ─── */}
      <PartnershipEditModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        editForm={editForm}
        setEditForm={setEditForm}
        onSubmit={submitEdit}
        submitting={submitting}
      />

      {/* ─── Action Prompt Modal (Submit Draft, Publish) ─── */}
      <PromptModal
        isOpen={showPromptModal}
        onClose={() => setShowPromptModal(false)}
        title={promptTitle}
        label={promptLabel}
        placeholder={promptPlaceholder}
        value={promptValue}
        setValue={setPromptValue}
        onSubmit={handlePromptSubmit}
      />

      {/* ─── Request Revision Modal ─── */}
      <RevisionModal
        isOpen={showRevisionModal}
        onClose={() => setShowRevisionModal(false)}
        subject={revisionSubject}
        setSubject={setRevisionSubject}
        body={revisionBody}
        setBody={setRevisionBody}
        onSubmit={handleRevisionSubmit}
        submitting={submitting}
      />

      {/* ─── Edit Content Deliverable Modal ─── */}
      <EditContentModal
        isOpen={showEditContentModal}
        onClose={() => setShowEditContentModal(false)}
        form={editContentForm}
        setForm={setEditContentForm}
        onSubmit={handleEditContentSubmit}
        submitting={submitting}
      />

      {/* ─── Content Email Composer Modal ─── */}
      <ContentEmailModal
        isOpen={showContentEmailModal}
        onClose={() => setShowContentEmailModal(false)}
        subject={contentEmailSubject}
        setSubject={setContentEmailSubject}
        body={contentEmailBody}
        setBody={setContentEmailBody}
        onSubmit={handleSendContentEmail}
        submitting={submitting}
      />

      {/* ─── Add Content Deliverable Modal ─── */}
      <AddContentModal
        isOpen={showAddContentModal}
        onClose={() => setShowAddContentModal(false)}
        form={contentForm}
        setForm={setContentForm}
        partnerships={partnerships}
        onSubmit={handleAddContentSubmit}
        submitting={submitting}
      />

      <OutreachPreviewModal
        creatorId={creator?.id || ''}
        campaignId={creator?.campaign_id || undefined}
        messageType={outreachModalMessageType}
        isOpen={outreachModalOpen}
        onClose={() => setOutreachModalOpen(false)}
        onSend={handleConfirmSendOutreach}
      />

      <ImageLightbox
        src={lightboxOpen ? creator.profile_pic || null : null}
        alt={creator.full_name || creator.handle || ''}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
  );
}
