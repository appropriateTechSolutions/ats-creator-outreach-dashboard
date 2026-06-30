import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { useConfirm } from '../contexts/ConfirmContext';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { LoadingState } from '../components/ui/LoadingState';
import { Modal } from '../components/ui/Modal';
import { 
  getContentById,
  updateContent,
  markContentSubmitted,
  approveContent,
  requestContentRevision,
  markContentPublished,
  rejectContent,
  syncContentPerformance,
  sendSingleOutreach
} from '../lib/api';
import { 
  ArrowLeft, 
  ExternalLink, 
  Edit3, 
  RefreshCw, 
  Calendar, 
  FileText, 
  Eye, 
  Heart, 
  MessageSquare, 
  Share2, 
  Bookmark, 
  MousePointerClick, 
  Activity,
  Video,
  User,
  Mail
} from 'lucide-react';
import { format } from 'date-fns';

export default function ContentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { confirm } = useConfirm();
  const fromCreatorId = location.state?.fromCreatorId;

  const [content, setContent] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);

  // Form states
  const [editForm, setEditForm] = useState({
    platform: 'instagram',
    content_type: 'instagram_reel',
    due_date: '',
    notes: '',
    draft_url: '',
    published_url: '',
    internal_notes: ''
  });

  const [revisionForm, setRevisionForm] = useState({
    subject: '',
    body: ''
  });

  const fetchContentDetail = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await getContentById(id);
      setContent(data);
    } catch (err) {
      console.error('Failed to load content deliverable:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContentDetail();
  }, [id]);

  const handleAction = async (action: string) => {
    if (!id || !content) return;
    try {
      setLoading(true);
      if (action === 'submit') {
        const draftUrl = prompt("Enter Draft URL:", content.draft_url || "https://instagram.com/p/mock_draft_url");
        if (draftUrl === null) {
          setLoading(false);
          return;
        }
        await markContentSubmitted(id, { draft_url: draftUrl });
      } else if (action === 'approve') {
        const isConfirmed = await confirm({
          title: 'Approve Deliverable',
          message: 'Are you sure you want to approve this deliverable?',
          confirmText: 'Approve',
          isDestructive: false
        });
        if (isConfirmed) {
          await approveContent(id);
        } else {
          setLoading(false);
          return;
        }
      } else if (action === 'publish') {
        const publishedUrl = prompt("Enter Live Published URL:", content.published_url || "https://instagram.com/p/mock_published_url");
        if (publishedUrl === null) {
          setLoading(false);
          return;
        }
        await markContentPublished(id, { published_url: publishedUrl });
      } else if (action === 'sync') {
        await syncContentPerformance(id);
      } else if (action === 'reject') {
        const notes = prompt("Enter rejection notes:", content.notes || "Not matching campaign requirements.");
        if (notes === null) {
          setLoading(false);
          return;
        }
        await rejectContent(id, { notes });
      }
      
      const updated = await getContentById(id);
      setContent(updated);
    } catch (err: any) {
      alert('Action failed: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = () => {
    if (!content) return;
    setEditForm({
      platform: content.platform || 'instagram',
      content_type: content.content_type || 'instagram_reel',
      due_date: content.due_date || '',
      notes: content.notes || '',
      draft_url: content.draft_url || '',
      published_url: content.published_url || '',
      internal_notes: content.internal_notes || ''
    });
    setShowEditModal(true);
  };

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSubmitting(true);
    try {
      await updateContent(id, {
        platform: editForm.platform,
        content_type: editForm.content_type,
        due_date: editForm.due_date || null,
        notes: editForm.notes,
        draft_url: editForm.draft_url || null,
        published_url: editForm.published_url || null,
        internal_notes: editForm.internal_notes || null
      });
      setShowEditModal(false);
      const updated = await getContentById(id);
      setContent(updated);
    } catch (err: any) {
      alert('Failed to update deliverable: ' + (err.message || err));
    } finally {
      setSubmitting(false);
    }
  };

  const openRevisionModal = () => {
    if (!content) return;
    const creatorName = content.Creator?.full_name || `@${content.Creator?.handle}` || 'Creator';
    const defaultNotes = "Please revise the lighting/audio.";
    const subject = `Revision Requested: ${content.Campaign?.name || 'Campaign'} Content Deliverable`;
    const body = `Hi ${creatorName},\n\nWe have reviewed your content draft and would like to request some revisions.\n\nRevision Notes:\n${defaultNotes}\n\nPlease update the draft and share the new link with us.\n\nBest regards,\nCampaign Management Team`;

    setRevisionForm({
      subject,
      body
    });
    setShowRevisionModal(true);
  };

  const submitRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !content) return;
    setSubmitting(true);
    try {
      await requestContentRevision(id, { notes: revisionForm.body });
      await sendSingleOutreach(
        content.Creator?.id || '',
        content.campaign_id || undefined,
        revisionForm.subject,
        revisionForm.body,
        'initial'
      );
      setShowRevisionModal(false);
      const updated = await getContentById(id);
      setContent(updated);
      alert('Revision request logged and email sent to creator!');
    } catch (err: any) {
      alert('Failed to submit revision: ' + (err.message || err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 max-w-7xl mx-auto px-4 sm:px-0">
        <LoadingState message="Retrieving Deliverable details..." />
      </div>
    );
  }

  if (!content) {
    return (
      <div className="py-20 max-w-7xl mx-auto px-4 sm:px-0 text-center">
        <h2 className="text-xl font-semibold text-gray-700">Content Deliverable not found</h2>
        <Link to={fromCreatorId ? `/creators/${fromCreatorId}` : "/content"} className="text-primary-600 hover:underline mt-4 inline-block font-outfit uppercase text-xs tracking-widest">
          Back to {fromCreatorId ? 'Creator Detail' : 'Content Tracking'}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20 px-4 sm:px-0 animate-[fadeIn_0.2s_ease]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          {fromCreatorId ? (
            <button 
              onClick={() => navigate(`/creators/${fromCreatorId}`)}
              className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-gray-900 uppercase tracking-widest transition-colors mb-3"
            >
              <ArrowLeft size={14} /> Back to Creator Detail
            </button>
          ) : (
            <button 
              onClick={() => navigate('/content')}
              className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-gray-900 uppercase tracking-widest transition-colors mb-3"
            >
              <ArrowLeft size={14} /> Back to Content Tracking
            </button>
          )}
          <h1 className="text-2xl sm:text-3xl font-normal text-gray-900 font-outfit uppercase tracking-tight">
            Content Deliverable Profile
          </h1>
        </div>

        {/* Actions panel */}
        <div className="flex items-center gap-2">
          {['pending', 'revision_requested', 'rejected'].includes(content.status) && (
            <Button className="bg-primary-600 text-white font-normal uppercase tracking-widest text-xs min-h-[40px] px-4" onClick={() => handleAction('submit')}>
              Submit Draft
            </Button>
          )}
          {content.status === 'submitted' && (
            <>
              <Button className="bg-green-650 text-white font-normal uppercase tracking-widest text-xs min-h-[40px] px-4" onClick={() => handleAction('approve')}>
                Approve
              </Button>
              <Button className="bg-amber-600 text-white font-normal uppercase tracking-widest text-xs min-h-[40px] px-4" onClick={openRevisionModal}>
                Request Revision
              </Button>
              <Button className="bg-red-600 text-white font-normal uppercase tracking-widest text-xs min-h-[40px] px-4" onClick={() => handleAction('reject')}>
                Reject
              </Button>
            </>
          )}
          {content.status === 'approved' && (
            <Button className="bg-indigo-650 text-white font-normal uppercase tracking-widest text-xs min-h-[40px] px-4" onClick={() => handleAction('publish')}>
              Publish Post
            </Button>
          )}
          {content.status === 'published' && (
            <Button className="bg-gray-800 text-white font-normal uppercase tracking-widest text-xs min-h-[40px] px-4 flex items-center gap-1.5" onClick={() => handleAction('sync')}>
              <RefreshCw size={12} className="animate-spin-hover" /> Sync Performance
            </Button>
          )}
          <button 
            onClick={openEditModal}
            className="p-2.5 text-gray-500 hover:text-gray-900 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-colors flex items-center justify-center shadow-sm"
            title="Edit Parameters"
          >
            <Edit3 size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column: Deliverable Profile Info */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="border-none shadow-xl bg-white p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-b border-gray-100 pb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center">
                  <Video size={28} />
                </div>
                <div>
                  <div className="text-xl font-normal text-gray-900 font-outfit uppercase tracking-tight">
                    {content.platform} deliverable
                  </div>
                  <div className="text-xs text-gray-500 uppercase tracking-widest mt-1">
                    Type: {content.content_type?.replace('_', ' ')}
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:items-end gap-1.5">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Deliverable Status</span>
                <StatusBadge status={content.status} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-6">
              {/* Due dates & lifecycle logs */}
              <div className="space-y-4 font-outfit">
                <div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Due Date</span>
                  <span className="text-sm font-normal text-gray-800 font-mono">
                    {content.due_date ? format(new Date(content.due_date), 'MMMM d, yyyy') : 'No date set'}
                  </span>
                </div>
                
                {content.submitted_at && (
                  <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Submitted At</span>
                    <span className="text-xs font-normal text-gray-850 font-mono">
                      {format(new Date(content.submitted_at), 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>
                )}
                
                {content.approved_at && (
                  <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Approved At</span>
                    <span className="text-xs font-normal text-gray-855 font-mono">
                      {format(new Date(content.approved_at), 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>
                )}
              </div>

              {/* URLs Section */}
              <div className="space-y-4 font-outfit">
                <div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Draft Link</span>
                  {content.draft_url ? (
                    <a href={content.draft_url} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline flex items-center gap-1 mt-1 text-sm font-semibold truncate max-w-full font-mono">
                      View Submitted Draft <ExternalLink size={12} />
                    </a>
                  ) : (
                    <span className="text-sm font-normal text-gray-400 block mt-1 italic">No draft URL registered</span>
                  )}
                </div>

                <div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Live Published Link</span>
                  {content.published_url ? (
                    <a href={content.published_url} target="_blank" rel="noreferrer" className="text-primary-650 hover:underline flex items-center gap-1 mt-1 text-sm font-semibold truncate max-w-full font-mono">
                      View Live Post <ExternalLink size={12} />
                    </a>
                  ) : (
                    <span className="text-sm font-normal text-gray-400 block mt-1 italic">No published URL registered</span>
                  )}
                </div>

                {content.published_at && (
                  <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Published At</span>
                    <span className="text-xs font-normal text-gray-850 font-mono">
                      {format(new Date(content.published_at), 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Notes Section */}
            {(content.notes || content.internal_notes) && (
              <div className="border-t border-gray-100 mt-6 pt-6 space-y-4 font-outfit">
                {content.notes && (
                  <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Campaign Guidelines & Notes</span>
                    <p className="text-sm text-gray-650 mt-1.5 whitespace-pre-wrap leading-relaxed">{content.notes}</p>
                  </div>
                )}

                {content.internal_notes && (
                  <div className="bg-yellow-50/45 border border-yellow-100/50 p-4 rounded-xl">
                    <span className="text-[9px] font-bold text-amber-800 uppercase tracking-wider block">Internal Team Notes</span>
                    <p className="text-sm text-gray-650 mt-1.5 whitespace-pre-wrap leading-relaxed">{content.internal_notes}</p>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Performance metrics dashboard (Only if published) */}
          {content.status === 'published' && (
            <Card className="border-none shadow-xl bg-white p-6 sm:p-8 space-y-6 animate-[fadeIn_0.2s_ease]">
              <div className="border-b border-gray-100 pb-4 flex justify-between items-center">
                <h2 className="text-sm font-normal text-gray-950 uppercase tracking-widest flex items-center gap-2 font-outfit">
                  <Activity size={16} /> Performance Metrics
                </h2>
                {content.performance_last_synced_at && (
                  <span className="text-[10px] font-mono text-gray-400">
                    Synced: {format(new Date(content.performance_last_synced_at), 'MMM d, h:mm a')}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-outfit">
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <span className="text-[9px] text-gray-400 block uppercase font-bold tracking-wider mb-1">Views</span>
                  <div className="flex items-center gap-1.5">
                    <Eye size={14} className="text-gray-400" />
                    <span className="text-lg font-normal text-gray-900 font-mono">
                      {Number(content.views || 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <span className="text-[9px] text-gray-400 block uppercase font-bold tracking-wider mb-1">Likes</span>
                  <div className="flex items-center gap-1.5">
                    <Heart size={14} className="text-gray-400" />
                    <span className="text-lg font-normal text-gray-900 font-mono">
                      {Number(content.likes || 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <span className="text-[9px] text-gray-400 block uppercase font-bold tracking-wider mb-1">Comments</span>
                  <div className="flex items-center gap-1.5">
                    <MessageSquare size={14} className="text-gray-400" />
                    <span className="text-lg font-normal text-gray-900 font-mono">
                      {Number(content.comments || 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <span className="text-[9px] text-gray-400 block uppercase font-bold tracking-wider mb-1">Engagement Rate</span>
                  <div className="flex items-center gap-1.5">
                    <Activity size={14} className="text-gray-400" />
                    <span className="text-lg font-semibold text-primary-700 font-mono">
                      {content.engagement_rate ? `${Number(content.engagement_rate).toFixed(2)}%` : '0.00%'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 font-outfit pt-2">
                <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100/50">
                  <span className="text-[9px] text-gray-450 block uppercase tracking-wider mb-1">Shares</span>
                  <div className="flex items-center gap-1.5">
                    <Share2 size={13} className="text-gray-400" />
                    <span className="text-sm font-normal text-gray-800 font-mono">
                      {Number(content.shares || 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100/50">
                  <span className="text-[9px] text-gray-450 block uppercase tracking-wider mb-1">Saves</span>
                  <div className="flex items-center gap-1.5">
                    <Bookmark size={13} className="text-gray-400" />
                    <span className="text-sm font-normal text-gray-800 font-mono">
                      {Number(content.saves || 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100/50">
                  <span className="text-[9px] text-gray-450 block uppercase tracking-wider mb-1">Clicks</span>
                  <div className="flex items-center gap-1.5">
                    <MousePointerClick size={13} className="text-gray-400" />
                    <span className="text-sm font-normal text-gray-800 font-mono">
                      {Number(content.clicks || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Right column: Relationships Info (Creator/Campaign) */}
        <div className="lg:col-span-1 space-y-8">
          {/* Creator Profile */}
          <Card className="border-none shadow-xl bg-white p-6">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-1.5 font-outfit">
              <User size={14} /> Assigned Creator
            </h3>
            
            <div className="flex flex-col items-center text-center space-y-4 pt-2 font-outfit">
              <img 
                src={content.Creator?.profile_pic || `https://ui-avatars.com/api/?name=${encodeURIComponent(content.Creator?.full_name || 'C')}&background=random`} 
                alt="" 
                className="w-20 h-20 rounded-full border border-gray-100 object-cover shadow-md"
              />
              <div>
                <h4 className="font-normal text-gray-900 text-lg uppercase tracking-tight">
                  {content.Creator?.full_name}
                </h4>
                <div className="text-xs text-gray-550 mt-1 font-mono">@{content.Creator?.handle}</div>
                <div className="text-[11px] text-gray-400 mt-1 font-mono">{content.Creator?.email || 'No email registered'}</div>
              </div>

              <div className="w-full pt-4 border-t border-gray-100">
                <Link 
                  to={`/creators/${content.creator_id}`}
                  state={{ fromPath: location.pathname, fromLabel: 'CONTENT' }}
                  className="w-full text-center py-2 border border-gray-200 hover:border-gray-900 text-gray-750 hover:text-gray-950 rounded-lg text-xs tracking-wider uppercase font-normal block transition-colors bg-white font-outfit"
                >
                  View Creator Profile
                </Link>
              </div>
            </div>
          </Card>
      </div>
      </div>

      {/* ─── Edit Content Deliverable Modal ─── */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Content Deliverable">
        <form onSubmit={submitEdit} className="space-y-4 font-outfit">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Platform</label>
              <select
                value={editForm.platform}
                onChange={e => {
                  const plat = e.target.value;
                  let defType = 'other';
                  if (plat === 'instagram') defType = 'instagram_reel';
                  if (plat === 'youtube') defType = 'youtube_video';
                  if (plat === 'tiktok') defType = 'tiktok_video';
                  if (plat === 'blog') defType = 'blog_post';
                  setEditForm(prev => ({ ...prev, platform: plat, content_type: defType }));
                }}
                className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm"
              >
                <option value="instagram">Instagram</option>
                <option value="tiktok">TikTok</option>
                <option value="youtube">YouTube</option>
                <option value="blog">Blog</option>
                <option value="website">Website</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Content Type</label>
              <select
                value={editForm.content_type}
                onChange={e => setEditForm(prev => ({ ...prev, content_type: e.target.value }))}
                className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm"
              >
                {editForm.platform === 'instagram' && (
                  <>
                    <option value="instagram_reel">Instagram Reel</option>
                    <option value="instagram_story">Instagram Story</option>
                    <option value="instagram_post">Instagram Post</option>
                  </>
                )}
                {editForm.platform === 'youtube' && (
                  <>
                    <option value="youtube_video">YouTube Video</option>
                    <option value="youtube_short">YouTube Short</option>
                  </>
                )}
                {editForm.platform === 'tiktok' && (
                  <option value="tiktok_video">TikTok Video</option>
                )}
                {editForm.platform === 'blog' && (
                  <option value="blog_post">Blog Post</option>
                )}
                {!['instagram', 'youtube', 'tiktok', 'blog'].includes(editForm.platform) && (
                  <option value="other">Other</option>
                )}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Due Date</label>
            <input
              type="date"
              value={editForm.due_date}
              onChange={e => setEditForm(prev => ({ ...prev, due_date: e.target.value }))}
              className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Draft URL</label>
            <input
              type="text"
              value={editForm.draft_url}
              onChange={e => setEditForm(prev => ({ ...prev, draft_url: e.target.value }))}
              className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm"
              placeholder="https://drive.google.com/..."
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Published URL</label>
            <input
              type="text"
              value={editForm.published_url}
              onChange={e => setEditForm(prev => ({ ...prev, published_url: e.target.value }))}
              className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm"
              placeholder="https://instagram.com/p/..."
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Notes & Requirements</label>
            <textarea
              value={editForm.notes}
              onChange={e => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm min-h-[80px]"
              placeholder="e.g. guidelines..."
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-amber-800 uppercase tracking-widest block">Internal Notes</label>
            <textarea
              value={editForm.internal_notes}
              onChange={e => setEditForm(prev => ({ ...prev, internal_notes: e.target.value }))}
              className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm min-h-[80px]"
              placeholder="e.g. tracking notes..."
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="outline" className="flex-1 font-normal text-xs uppercase tracking-widest" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-normal text-xs uppercase tracking-widest">
              {submitting ? 'Saving...' : 'Save Deliverable'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ─── Request Revision Modal ─── */}
      <Modal isOpen={showRevisionModal} onClose={() => setShowRevisionModal(false)} title="Request Content Revision">
        <form onSubmit={submitRevision} className="space-y-4 font-outfit">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Email Subject</label>
            <input
              type="text"
              value={revisionForm.subject}
              onChange={e => setRevisionForm(prev => ({ ...prev, subject: e.target.value }))}
              className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Email Message Body (Sent to Creator & Logged to CRM)</label>
            <textarea
              value={revisionForm.body}
              onChange={e => setRevisionForm(prev => ({ ...prev, body: e.target.value }))}
              className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm min-h-[200px]"
              required
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="outline" className="flex-1 font-normal text-xs uppercase tracking-widest" onClick={() => setShowRevisionModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-normal text-xs uppercase tracking-widest">
              {submitting ? 'Sending Request...' : 'Send Revision Request'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
