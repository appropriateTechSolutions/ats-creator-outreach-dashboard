import { toast } from '../lib/toast';
import { CreatorAvatar } from '../components/creators/CreatorIdentity';
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { LoadingState } from '../components/ui/LoadingState';
import { Modal } from '../components/ui/Modal';
import {
  updateContent,
  markContentSubmitted,
  approveContent,
  requestContentRevision,
  markContentPublished,
  rejectContent,
  syncContentPerformance,
  sendSingleOutreach,
} from '../lib/api';
import { useContents } from '../hooks/queries';
import { ArrowLeft, ExternalLink, Edit3, RefreshCw, Calendar, Check, X } from 'lucide-react';
import { format } from 'date-fns';

export default function CreatorCampaignContentDetail() {
  const { creatorId, campaignId } = useParams<{ creatorId: string; campaignId: string }>();

  const {
    data: contents = [],
    isLoading: loading,
    refetch: fetchDetails,
  } = useContents({
    creator_id: creatorId,
    campaign_id: campaignId,
  });
  const [submitting, setSubmitting] = useState(false);

  // Modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedContent, setSelectedContent] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    id: '',
    platform: 'instagram',
    content_type: 'instagram_reel',
    due_date: '',
    notes: '',
    draft_url: '',
    published_url: '',
  });

  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionForm, setRevisionForm] = useState({
    subject: '',
    body: '',
  });

  const [showPromptModal, setShowPromptModal] = useState(false);
  const [promptTitle, setPromptTitle] = useState('');
  const [promptLabel, setPromptLabel] = useState('');
  const [promptPlaceholder, setPromptPlaceholder] = useState('');
  const [promptValue, setPromptValue] = useState('');
  const [promptType, setPromptType] = useState<'input' | 'textarea'>('input');
  const [currentAction, setCurrentAction] = useState('');

  const handleOpenEdit = (c: any) => {
    setSelectedContent(c);
    setEditForm({
      id: c.id,
      platform: c.platform || 'instagram',
      content_type: c.content_type || 'instagram_reel',
      due_date: c.due_date || '',
      notes: c.notes || '',
      draft_url: c.draft_url || '',
      published_url: c.published_url || '',
    });
    setShowEditModal(true);
  };

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await updateContent(editForm.id, {
        platform: editForm.platform,
        content_type: editForm.content_type,
        due_date: editForm.due_date || null,
        notes: editForm.notes,
        draft_url: editForm.draft_url || null,
        published_url: editForm.published_url || null,
      });
      setShowEditModal(false);
      await fetchDetails();
    } catch (err: any) {
      toast.error('Failed to update deliverable: ' + (err.message || err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleAction = async (c: any, action: string) => {
    setSelectedContent(c);
    if (action === 'submit') {
      setPromptTitle('Submit Content Draft');
      setPromptLabel('Draft URL');
      setPromptPlaceholder('https://instagram.com/p/mock_draft_url');
      setPromptValue(c.draft_url || 'https://instagram.com/p/mock_draft_url');
      setPromptType('input');
      setCurrentAction('submit');
      setShowPromptModal(true);
      return;
    }
    if (action === 'publish') {
      setPromptTitle('Publish Content Deliverable');
      setPromptLabel('Live Published URL');
      setPromptPlaceholder('https://instagram.com/p/mock_published_url');
      setPromptValue(c.published_url || 'https://instagram.com/p/mock_published_url');
      setPromptType('input');
      setCurrentAction('publish');
      setShowPromptModal(true);
      return;
    }
    if (action === 'reject') {
      setPromptTitle('Reject Content Deliverable');
      setPromptLabel('Rejection Reason / Notes');
      setPromptPlaceholder('Not matching campaign guidelines.');
      setPromptValue('Not matching campaign guidelines.');
      setPromptType('textarea');
      setCurrentAction('reject');
      setShowPromptModal(true);
      return;
    }

    try {
      setSubmitting(true);
      if (action === 'approve') {
        await approveContent(c.id);
      } else if (action === 'revise') {
        const creatorName = c.Creator?.full_name || `@${c.Creator?.handle}` || 'Creator';
        const defaultNotes = 'Please revise the lighting/audio.';
        const subject = `Revision Requested: ${c.Campaign?.name || 'Campaign'} Content Deliverable`;
        const body = `Hi ${creatorName},\n\nWe have reviewed your content draft and would like to request some revisions.\n\nRevision Notes:\n${defaultNotes}\n\nPlease update the draft and share the new link with us.\n\nBest regards,\nCampaign Management Team`;

        setRevisionForm({ subject, body });
        setShowRevisionModal(true);
        setSubmitting(false);
        return;
      } else if (action === 'sync') {
        await syncContentPerformance(c.id);
      }
      await fetchDetails();
    } catch (err: any) {
      toast.error('Action failed: ' + (err.message || err));
    } finally {
      setSubmitting(false);
    }
  };

  const handlePromptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContent) return;
    try {
      setSubmitting(true);
      setShowPromptModal(false);
      if (currentAction === 'submit') {
        await markContentSubmitted(selectedContent.id, { draft_url: promptValue });
      } else if (currentAction === 'publish') {
        await markContentPublished(selectedContent.id, { published_url: promptValue });
      } else if (currentAction === 'reject') {
        await rejectContent(selectedContent.id, { notes: promptValue });
      }
      await fetchDetails();
    } catch (err: any) {
      toast.error('Action failed: ' + (err.message || err));
    } finally {
      setSubmitting(false);
    }
  };

  const submitRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContent) return;
    setSubmitting(true);
    try {
      await requestContentRevision(selectedContent.id, { notes: revisionForm.body });
      await sendSingleOutreach(
        selectedContent.Creator?.id || '',
        selectedContent.campaign_id || undefined,
        revisionForm.subject,
        revisionForm.body,
        'initial',
      );
      setShowRevisionModal(false);
      await fetchDetails();
      toast.success('Revision request logged and email sent to creator!');
    } catch (err: any) {
      toast.error('Failed to submit revision: ' + (err.message || err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && contents.length === 0) {
    return (
      <div className="py-24 max-w-7xl mx-auto px-4 sm:px-0">
        <LoadingState message="Retrieving creator campaign deliverables..." />
      </div>
    );
  }

  const first = contents[0];
  const creator = first?.Creator;
  const campaign = first?.Campaign;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20 px-4 sm:px-0 animate-[fadeIn_0.2s_ease]">
      {/* Back button */}
      <Link
        to="/content"
        className="inline-flex items-center text-[10px] font-normal text-gray-400 hover:text-primary-600 transition-colors group tracking-widest uppercase"
      >
        <ArrowLeft size={14} className="mr-1 group-hover:-translate-x-1 transition-transform" />{' '}
        BACK TO CONTENT TRACKING
      </Link>

      {/* Creator Profile Header Card */}
      {creator && (
        <Card className="border-none shadow-xl bg-white p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-center sm:text-left flex-col sm:flex-row">
            <CreatorAvatar
              creator={creator}
              className="w-16 h-16 rounded-full bg-primary-100 text-primary-700 flex flex-shrink-0 items-center justify-center font-normal text-2xl overflow-hidden shadow-inner"
            />
            <div>
              <h1 className="text-xl sm:text-2xl font-normal text-gray-900 font-outfit uppercase tracking-tight">
                {creator.full_name || `@${creator.handle}`}
              </h1>
              <p className="text-xs text-primary-600 font-semibold tracking-wide mt-1">
                Campaign: {campaign?.name}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* List of deliverables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {contents.map((item) => {
          const er = item.avg_engagement_rate !== undefined ? item.avg_engagement_rate : 0;
          return (
            <Card
              key={item.id}
              className="border border-gray-100 shadow-lg bg-white overflow-hidden transition-all hover:shadow-xl flex flex-col justify-between"
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-950">
                      {item.platform} {item.content_type?.replace('_', ' ')}
                    </h3>
                    {item.due_date && (
                      <p className="text-[11px] text-gray-400 flex items-center gap-1.5 mt-1">
                        <Calendar size={12} /> Due: {format(new Date(item.due_date), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={item.status} />
                </div>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4 flex-1">
                {item.notes && (
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
                      Notes
                    </span>
                    <p className="text-xs text-gray-600 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">
                      {item.notes}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
                      Draft Link
                    </span>
                    {item.draft_url ? (
                      <a
                        href={item.draft_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-primary-600 hover:underline inline-flex items-center gap-1"
                      >
                        View Draft <ExternalLink size={12} />
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400 italic">No link</span>
                    )}
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
                      Published Link
                    </span>
                    {item.published_url ? (
                      <a
                        href={item.published_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-emerald-600 hover:underline inline-flex items-center gap-1"
                      >
                        View Live <ExternalLink size={12} />
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Not published</span>
                    )}
                  </div>
                </div>

                {/* Metrics */}
                {item.status === 'published' && (
                  <div className="pt-4 border-t border-gray-100/60">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">
                      Metrics
                    </span>
                    <div className="grid grid-cols-4 gap-2 text-center text-xs">
                      <div className="bg-gray-50 p-2 rounded-lg">
                        <div className="text-[9px] text-gray-400 uppercase">Views</div>
                        <div className="font-bold text-gray-900 mt-0.5">
                          {item.views_count ? item.views_count.toLocaleString() : '—'}
                        </div>
                      </div>
                      <div className="bg-gray-50 p-2 rounded-lg">
                        <div className="text-[9px] text-gray-400 uppercase">Likes</div>
                        <div className="font-bold text-gray-900 mt-0.5">
                          {item.likes_count ? item.likes_count.toLocaleString() : '—'}
                        </div>
                      </div>
                      <div className="bg-gray-50 p-2 rounded-lg">
                        <div className="text-[9px] text-gray-400 uppercase">Comments</div>
                        <div className="font-bold text-gray-900 mt-0.5">
                          {item.comments_count ? item.comments_count.toLocaleString() : '—'}
                        </div>
                      </div>
                      <div className="bg-gray-50 p-2 rounded-lg">
                        <div className="text-[9px] text-gray-400 uppercase">ER</div>
                        <div className="font-bold text-gray-900 mt-0.5">
                          {er ? `${Number(er).toFixed(1)}%` : '—'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="p-6 bg-gray-50/50 border-t border-gray-100 flex flex-wrap gap-2 justify-end">
                <Button
                  onClick={() => handleOpenEdit(item)}
                  variant="ghost"
                  className="!text-gray-500 hover:!bg-gray-100 border border-gray-200 text-[10px] uppercase tracking-wider h-8"
                  icon={<Edit3 size={12} />}
                >
                  Edit
                </Button>

                {item.status === 'pending' && (
                  <Button
                    onClick={() => handleAction(item, 'submit')}
                    className="bg-primary-600 hover:bg-primary-700 text-white text-[10px] uppercase tracking-wider h-8"
                  >
                    Submit Draft
                  </Button>
                )}

                {item.status === 'submitted' && (
                  <>
                    <Button
                      onClick={() => handleAction(item, 'approve')}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] uppercase tracking-wider h-8"
                      icon={<Check size={12} />}
                    >
                      Approve
                    </Button>
                    <Button
                      onClick={() => handleAction(item, 'revise')}
                      className="bg-amber-600 hover:bg-amber-700 text-white text-[10px] uppercase tracking-wider h-8"
                      icon={<X size={12} />}
                    >
                      Revise
                    </Button>
                  </>
                )}

                {item.status === 'approved' && (
                  <Button
                    onClick={() => handleAction(item, 'publish')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] uppercase tracking-wider h-8"
                  >
                    Publish
                  </Button>
                )}

                {item.status === 'published' && (
                  <Button
                    onClick={() => handleAction(item, 'sync')}
                    variant="ghost"
                    className="!text-indigo-600 hover:!bg-indigo-50 border border-indigo-200 text-[10px] uppercase tracking-wider h-8"
                    icon={<RefreshCw size={12} />}
                  >
                    Sync
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Deliverable Details"
      >
        <form onSubmit={submitEdit} className="space-y-4 font-outfit text-sm">
          <div>
            <label
              htmlFor="creatorcampaigncontentdetail-1"
              className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2"
            >
              Platform
            </label>
            <select
              id="creatorcampaigncontentdetail-1"
              value={editForm.platform}
              onChange={(e) => setEditForm({ ...editForm, platform: e.target.value })}
              className="w-full bg-white border border-gray-250 rounded-xl py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            >
              <option value="instagram">Instagram</option>
              <option value="tiktok">TikTok</option>
              <option value="youtube">YouTube</option>
              <option value="blog">Blog</option>
              <option value="website">Website</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="creatorcampaigncontentdetail-2"
              className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2"
            >
              Content Type
            </label>
            <select
              id="creatorcampaigncontentdetail-2"
              value={editForm.content_type}
              onChange={(e) => setEditForm({ ...editForm, content_type: e.target.value })}
              className="w-full bg-white border border-gray-250 rounded-xl py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            >
              <option value="instagram_reel">Instagram Reel</option>
              <option value="instagram_story">Instagram Story</option>
              <option value="instagram_post">Instagram Post</option>
              <option value="youtube_video">YouTube Video</option>
              <option value="youtube_short">YouTube Short</option>
              <option value="tiktok_video">TikTok Video</option>
              <option value="blog_post">Blog Post</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="creatorcampaigncontentdetail-3"
              className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2"
            >
              Due Date
            </label>
            <input
              id="creatorcampaigncontentdetail-3"
              type="date"
              value={editForm.due_date ? editForm.due_date.split('T')[0] : ''}
              onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })}
              className="w-full bg-white border border-gray-250 rounded-xl py-2.5 px-3 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="creatorcampaigncontentdetail-4"
              className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2"
            >
              Draft URL
            </label>
            <input
              id="creatorcampaigncontentdetail-4"
              type="url"
              value={editForm.draft_url}
              onChange={(e) => setEditForm({ ...editForm, draft_url: e.target.value })}
              className="w-full bg-white border border-gray-250 rounded-xl py-2.5 px-3 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="creatorcampaigncontentdetail-5"
              className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2"
            >
              Published URL
            </label>
            <input
              id="creatorcampaigncontentdetail-5"
              type="url"
              value={editForm.published_url}
              onChange={(e) => setEditForm({ ...editForm, published_url: e.target.value })}
              className="w-full bg-white border border-gray-250 rounded-xl py-2.5 px-3 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="creatorcampaigncontentdetail-6"
              className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2"
            >
              Notes
            </label>
            <textarea
              id="creatorcampaigncontentdetail-6"
              value={editForm.notes}
              onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              rows={3}
              className="w-full bg-white border border-gray-250 rounded-xl py-2.5 px-3 focus:outline-none"
            />
          </div>

          <div className="flex gap-3 pt-4 justify-end">
            <Button type="button" variant="ghost" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Revision Modal */}
      <Modal
        isOpen={showRevisionModal}
        onClose={() => setShowRevisionModal(false)}
        title="Request Content Revision"
      >
        <form onSubmit={submitRevision} className="space-y-4 font-outfit text-sm">
          <div>
            <label
              htmlFor="creatorcampaigncontentdetail-7"
              className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2"
            >
              Email Subject
            </label>
            <input
              id="creatorcampaigncontentdetail-7"
              type="text"
              value={revisionForm.subject}
              onChange={(e) => setRevisionForm({ ...revisionForm, subject: e.target.value })}
              className="w-full bg-white border border-gray-250 rounded-xl py-2.5 px-3 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="creatorcampaigncontentdetail-8"
              className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2"
            >
              Revision Notes / Email Body
            </label>
            <textarea
              id="creatorcampaigncontentdetail-8"
              value={revisionForm.body}
              onChange={(e) => setRevisionForm({ ...revisionForm, body: e.target.value })}
              rows={8}
              className="w-full bg-white border border-gray-250 rounded-xl py-2.5 px-3 focus:outline-none font-mono text-xs"
            />
          </div>

          <div className="flex gap-3 pt-4 justify-end">
            <Button type="button" variant="ghost" onClick={() => setShowRevisionModal(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              Send Revision Request
            </Button>
          </div>
        </form>
      </Modal>

      {/* Prompt Modal */}
      <Modal isOpen={showPromptModal} onClose={() => setShowPromptModal(false)} title={promptTitle}>
        <form onSubmit={handlePromptSubmit} className="space-y-4 font-outfit text-sm">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
              {promptLabel}
            </label>
            {promptType === 'input' ? (
              <input
                type="text"
                value={promptValue}
                onChange={(e) => setPromptValue(e.target.value)}
                placeholder={promptPlaceholder}
                className="w-full bg-white border border-gray-250 rounded-xl py-2.5 px-3 focus:outline-none"
              />
            ) : (
              <textarea
                value={promptValue}
                onChange={(e) => setPromptValue(e.target.value)}
                placeholder={promptPlaceholder}
                rows={4}
                className="w-full bg-white border border-gray-250 rounded-xl py-2.5 px-3 focus:outline-none"
              />
            )}
          </div>

          <div className="flex gap-3 pt-4 justify-end">
            <Button type="button" variant="ghost" onClick={() => setShowPromptModal(false)}>
              Cancel
            </Button>
            <Button type="submit">Submit</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
