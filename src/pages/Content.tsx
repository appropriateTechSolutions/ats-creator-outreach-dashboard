import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { LoadingState } from '../components/ui/LoadingState';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../components/ui/Modal';
import { 
  getContents, 
  getCampaigns,
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
  Search, 
  ExternalLink,
  ChevronDown,
  Eye,
  MessageSquare,
  Heart,
  RefreshCw,
  Edit3,
  Calendar,
  SlidersHorizontal
} from 'lucide-react';
import { format } from 'date-fns';

export default function Content() {
  const navigate = useNavigate();
  const [contents, setContents] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [showFilters, setShowFilters] = useState(false);
  
  // Filters
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [selectedContentType, setSelectedContentType] = useState('');
  const [dueStartDate, setDueStartDate] = useState('');
  const [dueEndDate, setDueEndDate] = useState('');
  const [pubStartDate, setPubStartDate] = useState('');
  const [pubEndDate, setPubEndDate] = useState('');

  // Dropdown states
  const [openActionDropdownId, setOpenActionDropdownId] = useState<string | null>(null);

  // V3 Content Edit States
  const [showEditContentModal, setShowEditContentModal] = useState(false);
  const [selectedContent, setSelectedContent] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editContentForm, setEditContentForm] = useState({
    id: '',
    platform: 'instagram',
    content_type: 'instagram_reel',
    due_date: '',
    notes: '',
    draft_url: '',
    published_url: ''
  });

  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionSubject, setRevisionSubject] = useState('');
  const [revisionBody, setRevisionBody] = useState('');
  const [activeRevisionContentId, setActiveRevisionContentId] = useState<string | null>(null);

  const handleOpenEditContent = (c: any) => {
    setSelectedContent(c);
    setEditContentForm({
      id: c.id,
      platform: c.platform,
      content_type: c.content_type,
      due_date: c.due_date || '',
      notes: c.notes || '',
      draft_url: c.draft_url || '',
      published_url: c.published_url || ''
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
        published_url: editContentForm.published_url || null
      });
      setShowEditContentModal(false);
      await loadData();
    } catch (err: any) {
      alert('Failed to update deliverable: ' + (err.message || err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRevisionContentId) return;
    try {
      setSubmitting(true);
      await requestContentRevision(activeRevisionContentId, { notes: revisionBody });
      const currentItem = contents.find(c => c.id === activeRevisionContentId);
      await sendSingleOutreach(
        currentItem?.Creator?.id || '',
        currentItem?.campaign_id || undefined,
        revisionSubject,
        revisionBody,
        'initial'
      );
      setShowRevisionModal(false);
      await loadData();
      alert('Revision request logged and email sent to creator!');
    } catch (err: any) {
      alert('Failed to request revision: ' + (err.message || err));
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCampaign, selectedStatus, selectedPlatform]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [contentData, campaignData] = await Promise.all([
        getContents({
          campaign_id: selectedCampaign || undefined,
          status: selectedStatus || undefined,
          platform: selectedPlatform || undefined
        }),
        getCampaigns()
      ]);
      setContents(contentData);
      setCampaigns(campaignData);
    } catch (err) {
      console.error("Failed to load content:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: string, action: string) => {
    try {
      const currentItem = contents.find(c => c.id === id);
      if (action === 'submit') {
        const draftUrl = prompt("Enter Draft URL (or leave default for mock):", currentItem?.draft_url || "https://instagram.com/p/mock_draft_url");
        if (draftUrl === null) return;
        await markContentSubmitted(id, { draft_url: draftUrl });
      }
      if (action === 'approve') {
        await approveContent(id);
      }
      if (action === 'revise') {
        const creatorName = currentItem?.Creator?.full_name || `@${currentItem?.Creator?.handle}` || 'Creator';
        const defaultNotes = "Please revise the lighting/audio.";
        const subject = `Revision Requested: ${currentItem?.Campaign?.name || 'Campaign'} Content Deliverable`;
        const body = `Hi ${creatorName},\n\nWe have reviewed your content draft and would like to request some revisions.\n\nRevision Notes:\n${defaultNotes}\n\nPlease update the draft and share the new link with us.\n\nBest regards,\nCampaign Management Team`;
        
        setActiveRevisionContentId(id);
        setRevisionSubject(subject);
        setRevisionBody(body);
        setShowRevisionModal(true);
        return;
      }
      if (action === 'publish') {
        const publishedUrl = prompt("Enter Live Published URL:", currentItem?.published_url || "https://instagram.com/p/mock_published_url");
        if (publishedUrl === null) return;
        await markContentPublished(id, { published_url: publishedUrl });
      }
      if (action === 'sync') {
        await syncContentPerformance(id);
      }
      if (action === 'reject') {
        const notes = prompt("Enter rejection notes:", "Not matching campaign guidelines.");
        if (notes === null) return;
        await rejectContent(id, { notes });
      }
      await loadData();
    } catch (err) {
      console.error("Action failed:", err);
    }
    setOpenActionDropdownId(null);
  };

  // Client-side filtration for advanced filters
  const filteredContents = contents.filter(c => {
    // Text search
    if (search) {
      const s = search.toLowerCase();
      const creatorName = c.Creator?.full_name?.toLowerCase() || '';
      const creatorHandle = c.Creator?.handle?.toLowerCase() || '';
      const campaignName = c.Campaign?.name?.toLowerCase() || '';
      if (!creatorName.includes(s) && !creatorHandle.includes(s) && !campaignName.includes(s)) {
        return false;
      }
    }

    // Content Type Filter
    if (selectedContentType && c.content_type !== selectedContentType) {
      return false;
    }

    // Due Date Range Filter
    if (dueStartDate && c.due_date && c.due_date < dueStartDate) return false;
    if (dueEndDate && c.due_date && c.due_date > dueEndDate) return false;

    // Published Date Range Filter
    if (c.published_at) {
      const pubDate = c.published_at.split('T')[0];
      if (pubStartDate && pubDate < pubStartDate) return false;
      if (pubEndDate && pubDate > pubEndDate) return false;
    } else if (pubStartDate || pubEndDate) {
      return false; // Has no published date, but date filter is active
    }

    return true;
  });

  const activeFiltersCount = [
    selectedCampaign,
    selectedStatus,
    selectedPlatform,
    selectedContentType,
    dueStartDate,
    dueEndDate,
    pubStartDate,
    pubEndDate
  ].filter(Boolean).length;

  if (loading) return <LoadingState message="Loading content..." />;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20 px-4 sm:px-0 animate-[fadeIn_0.3s_ease]">
      {/* Page Header (Outside of Card) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-normal text-gray-900 font-outfit uppercase tracking-tight">
            Content Tracking
          </h1>
        </div>
      </div>

      {/* Filter Bar (Card) */}
      <Card className="border-none shadow-xl bg-white/80 backdrop-blur-md">
        <div className="p-6 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex gap-2 w-full sm:max-w-xl flex-1">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search by creator or campaign..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all font-outfit"
                />
              </div>
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-outfit uppercase tracking-wider transition-all select-none ${
                  showFilters || activeFiltersCount > 0
                    ? 'bg-primary-600 border-primary-600 text-white font-medium shadow-md shadow-primary-500/20'
                    : 'bg-white border-gray-200 text-gray-650 hover:bg-gray-50'
                }`}
              >
                <SlidersHorizontal size={14} />
                <span>Filters</span>
                {activeFiltersCount > 0 && (
                  <span className={`flex items-center justify-center rounded-full min-w-[18px] h-[18px] px-1 text-[10px] font-bold ${
                    showFilters || activeFiltersCount > 0 ? 'bg-white text-primary-700' : 'bg-primary-600 text-white'
                  }`}>
                    {activeFiltersCount}
                  </span>
                )}
              </button>
            </div>
            <div className="text-sm text-gray-500 font-normal sm:ml-auto">
              {filteredContents.length} records found
            </div>
          </div>

          {/* Collapsible Filters Horizontal Strip */}
          {showFilters && (
            <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-gray-150/10 text-xs font-outfit animate-[fadeIn_0.2s_ease]">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Campaign</span>
                <select
                  value={selectedCampaign}
                  onChange={(e) => setSelectedCampaign(e.target.value)}
                  className="bg-white border border-gray-200 text-gray-700 text-xs font-normal uppercase tracking-tight rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-primary-500 font-outfit max-w-[160px] truncate"
                >
                  <option value="">All Campaigns</option>
                  {campaigns.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</span>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="bg-white border border-gray-200 text-gray-700 text-xs font-normal uppercase tracking-tight rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-primary-500 font-outfit max-w-[130px]"
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="submitted">Submitted</option>
                  <option value="revision_requested">Revision</option>
                  <option value="approved">Approved</option>
                  <option value="published">Published</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Platform</span>
                <select
                  value={selectedPlatform}
                  onChange={(e) => setSelectedPlatform(e.target.value)}
                  className="bg-white border border-gray-200 text-gray-700 text-xs font-normal uppercase tracking-tight rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-primary-500 font-outfit max-w-[130px]"
                >
                  <option value="">All Platforms</option>
                  <option value="instagram">Instagram</option>
                  <option value="tiktok">TikTok</option>
                  <option value="youtube">YouTube</option>
                  <option value="blog">Blog</option>
                  <option value="website">Website</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Type</span>
                <select
                  value={selectedContentType}
                  onChange={(e) => setSelectedContentType(e.target.value)}
                  className="bg-white border border-gray-250 text-gray-700 text-xs font-normal uppercase tracking-tight rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-primary-500 font-outfit max-w-[130px]"
                >
                  <option value="">All Types</option>
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

              {/* Due Date Range Selector */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Due</span>
                <div className="flex items-center gap-2 border border-gray-200 rounded-lg py-1.5 px-2.5 bg-white shadow-sm text-[11px] font-outfit">
                  <input
                    type="date"
                    value={dueStartDate}
                    onChange={(e) => setDueStartDate(e.target.value)}
                    className="bg-transparent border-none text-gray-700 text-xs outline-none focus:ring-0 p-0 cursor-pointer focus:outline-none w-[95px]"
                  />
                  <span className="text-gray-300">|</span>
                  <input
                    type="date"
                    value={dueEndDate}
                    onChange={(e) => setDueEndDate(e.target.value)}
                    className="bg-transparent border-none text-gray-700 text-xs outline-none focus:ring-0 p-0 cursor-pointer focus:outline-none w-[95px]"
                  />
                </div>
              </div>

              {/* Published Date Range Selector */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Pub</span>
                <div className="flex items-center gap-2 border border-gray-200 rounded-lg py-1.5 px-2.5 bg-white shadow-sm text-[11px] font-outfit">
                  <input
                    type="date"
                    value={pubStartDate}
                    onChange={(e) => setPubStartDate(e.target.value)}
                    className="bg-transparent border-none text-gray-700 text-xs outline-none focus:ring-0 p-0 cursor-pointer focus:outline-none w-[95px]"
                  />
                  <span className="text-gray-300">|</span>
                  <input
                    type="date"
                    value={pubEndDate}
                    onChange={(e) => setPubEndDate(e.target.value)}
                    className="bg-transparent border-none text-gray-700 text-xs outline-none focus:ring-0 p-0 cursor-pointer focus:outline-none w-[95px]"
                  />
                </div>
              </div>

              {activeFiltersCount > 0 && (
                <button
                  onClick={() => {
                    setSelectedCampaign('');
                    setSelectedStatus('');
                    setSelectedPlatform('');
                    setSelectedContentType('');
                    setDueStartDate('');
                    setDueEndDate('');
                    setPubStartDate('');
                    setPubEndDate('');
                  }}
                  className="text-xs text-primary-600 hover:text-primary-700 font-outfit uppercase tracking-widest pl-2 font-semibold ml-auto"
                >
                  Clear All
                </button>
              )}
            </div>
          )}
        </div>
      </Card>

      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="w-full text-left min-w-[1200px]">
          <thead>
            <tr className="text-[10px] font-normal text-gray-400 uppercase tracking-widest border-b border-gray-100 bg-gray-50/50">
              <th className="px-4 py-3">Creator</th>
              <th className="px-4 py-3">Campaign</th>
                <th className="px-4 py-3">Platform & Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Due Date</th>
                <th className="px-4 py-3">Draft URL</th>
                <th className="px-4 py-3">Published URL</th>
                <th className="px-4 py-3">Published At</th>
                <th className="px-4 py-3 text-right">Metrics (V/L/C)</th>
                <th className="px-4 py-3 text-right">ER</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredContents.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-gray-500 text-sm">
                    No content deliverables found matching filters.
                  </td>
                </tr>
              ) : (
                filteredContents.map((c) => (
                  <tr 
                    key={c.id} 
                    onClick={() => navigate(`/content/${c.id}`)}
                    className="hover:bg-primary-50/10 transition-colors text-xs cursor-pointer"
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <img 
                          src={c.Creator?.profile_pic || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.Creator?.full_name || 'C')}&background=random`} 
                          alt="" 
                          className="w-8 h-8 rounded-full border border-gray-200 object-cover"
                        />
                        <div>
                          <div className="font-normal text-gray-900 text-xs uppercase tracking-tight font-outfit leading-tight line-clamp-2 whitespace-normal break-words max-w-[150px]">{c.Creator?.full_name}</div>
                          <div className="text-[9px] text-gray-500 uppercase tracking-wider mt-1">@{c.Creator?.handle}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 font-normal text-gray-900 text-xs uppercase tracking-tight font-outfit leading-tight">
                      {c.Campaign?.name}
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-normal text-gray-900 text-xs uppercase tracking-tight font-outfit leading-tight">{c.platform}</div>
                      <div className="text-[10px] text-gray-500 uppercase mt-0.5">{c.content_type?.replace('_', ' ')}</div>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-4 py-4 text-gray-600 font-mono">
                      {c.due_date ? format(new Date(c.due_date), 'MMM d, yyyy') : '---'}
                    </td>
                    <td className="px-4 py-4 max-w-[150px] truncate" onClick={e => e.stopPropagation()}>
                      {c.draft_url ? (
                        <a href={c.draft_url} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline inline-flex items-center gap-0.5">
                          View Draft <ExternalLink size={10} />
                        </a>
                      ) : (
                        <span className="text-gray-400 italic">No link</span>
                      )}
                    </td>
                    <td className="px-4 py-4 max-w-[150px] truncate" onClick={e => e.stopPropagation()}>
                      {c.published_url ? (
                        <a href={c.published_url} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline inline-flex items-center gap-0.5">
                          View Post <ExternalLink size={10} />
                        </a>
                      ) : (
                        <span className="text-gray-400 italic">No link</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-gray-600 font-mono">
                      {c.published_at ? format(new Date(c.published_at), 'MMM d, yyyy') : '---'}
                    </td>
                    <td className="px-4 py-4 text-right">
                      {c.status === 'published' ? (
                        <div className="flex flex-col items-end gap-0.5 font-mono text-gray-600 text-[10px]">
                          <span>{Number(c.views || 0).toLocaleString()} Views</span>
                          <span>{Number(c.likes || 0).toLocaleString()} Likes</span>
                          <span>{Number(c.comments || 0).toLocaleString()} Comments</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic text-[10px]">---</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right font-mono font-semibold">
                      {c.status === 'published' && c.engagement_rate ? `${Number(c.engagement_rate).toFixed(2)}%` : '---'}
                    </td>
                    <td className="px-4 py-4 text-right relative" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        {c.status === 'submitted' && (
                          <>
                            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white font-normal uppercase tracking-widest text-[9px] min-h-[28px] px-2" onClick={() => handleAction(c.id, 'approve')}>
                              Approve
                            </Button>
                            <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white font-normal uppercase tracking-widest text-[9px] min-h-[28px] px-2" onClick={() => handleAction(c.id, 'revise')}>
                              Revise
                            </Button>
                          </>
                        )}
                        {c.status === 'approved' && (
                          <Button size="sm" className="bg-primary-600 hover:bg-primary-700 text-white font-normal uppercase tracking-widest text-[9px] min-h-[28px] px-2" onClick={() => handleAction(c.id, 'publish')}>
                            Publish
                          </Button>
                        )}
                        {c.status === 'published' && (
                          <Button size="sm" className="bg-gray-800 hover:bg-gray-900 text-white font-normal uppercase tracking-widest text-[9px] min-h-[28px] px-2" onClick={() => handleAction(c.id, 'sync')}>
                            Sync
                          </Button>
                        )}
                        {['pending', 'revision_requested', 'rejected'].includes(c.status) && (
                          <button 
                            onClick={() => handleOpenEditContent(c)}
                            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                            title="Edit requirement details"
                          >
                            <Edit3 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      {/* ─── Edit Content Deliverable Modal ─── */}
      <Modal isOpen={showEditContentModal} onClose={() => setShowEditContentModal(false)} title="Edit Content Deliverable">
        <form onSubmit={handleEditContentSubmit} className="space-y-4 font-outfit">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Platform</label>
              <select
                value={editContentForm.platform}
                onChange={e => {
                  const plat = e.target.value;
                  let defType = 'other';
                  if (plat === 'instagram') defType = 'instagram_reel';
                  if (plat === 'youtube') defType = 'youtube_video';
                  if (plat === 'tiktok') defType = 'tiktok_video';
                  if (plat === 'blog') defType = 'blog_post';
                  setEditContentForm(prev => ({ ...prev, platform: plat, content_type: defType }));
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
                value={editContentForm.content_type}
                onChange={e => setEditContentForm(prev => ({ ...prev, content_type: e.target.value }))}
                className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm"
              >
                {editContentForm.platform === 'instagram' && (
                  <>
                    <option value="instagram_reel">Instagram Reel</option>
                    <option value="instagram_story">Instagram Story</option>
                    <option value="instagram_post">Instagram Post</option>
                  </>
                )}
                {editContentForm.platform === 'youtube' && (
                  <>
                    <option value="youtube_video">YouTube Video</option>
                    <option value="youtube_short">YouTube Short</option>
                  </>
                )}
                {editContentForm.platform === 'tiktok' && (
                  <option value="tiktok_video">TikTok Video</option>
                )}
                {editContentForm.platform === 'blog' && (
                  <option value="blog_post">Blog Post</option>
                )}
                {!['instagram', 'youtube', 'tiktok', 'blog'].includes(editContentForm.platform) && (
                  <option value="other">Other</option>
                )}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Due Date</label>
            <input
              type="date"
              value={editContentForm.due_date}
              onChange={e => setEditContentForm(prev => ({ ...prev, due_date: e.target.value }))}
              className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Draft URL (Triggers Submitted State)</label>
            <input
              type="text"
              value={editContentForm.draft_url}
              onChange={e => setEditContentForm(prev => ({ ...prev, draft_url: e.target.value }))}
              className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm"
              placeholder="https://drive.google.com/..."
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Published URL (Triggers Live State)</label>
            <input
              type="text"
              value={editContentForm.published_url}
              onChange={e => setEditContentForm(prev => ({ ...prev, published_url: e.target.value }))}
              className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm"
              placeholder="https://instagram.com/p/..."
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Notes & Requirements</label>
            <textarea
              value={editContentForm.notes}
              onChange={e => setEditContentForm(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm min-h-[80px]"
              placeholder="e.g. guidelines..."
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="outline" className="flex-1 font-normal text-xs uppercase tracking-widest" onClick={() => setShowEditContentModal(false)}>
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
        <form onSubmit={handleRevisionSubmit} className="space-y-4 font-outfit">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Email Subject</label>
            <input
              type="text"
              value={revisionSubject}
              onChange={e => setRevisionSubject(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Email Message Body (Sent to Creator & Saved to CRM)</label>
            <textarea
              value={revisionBody}
              onChange={e => setRevisionBody(e.target.value)}
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
