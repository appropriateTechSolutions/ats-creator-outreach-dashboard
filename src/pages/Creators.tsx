import { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Table, Thead, Tbody, Tr, Th, Td } from '../components/ui/Table';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Search, ArrowLeft, ChevronDown, SlidersHorizontal } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getAllCreators, getCampaigns, reviewLead, getPartnerships, getShipments, getContents } from '../lib/api';
import type { Creator } from '../types';
import { LoadingState } from '../components/ui/LoadingState';
import { Check, X, Instagram, Youtube, Activity, Star } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { OutreachPreviewModal } from '../components/ui/OutreachPreviewModal';
import { WorkflowActionEngine } from '../components/workflow/WorkflowActionEngine';
import { OfferModal } from '../components/workflow/OfferModal';
import { ShipmentModal } from '../components/workflow/ShipmentModal';
import { ContentPromptModal } from '../components/workflow/ContentPromptModal';
import { getFollowers, getEngagement, isQualifiedCreator, matchesStatusFilter } from '../lib/creatorFilters';
import { Pagination } from '../components/ui/Pagination';

const PAGE_SIZE = 50;

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

const formatFollowers = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return String(n);
};

const getPlatformHandle = (creator: Creator, platform: string) => {
  const profileHandle = creator.profiles?.find(p => p.platform.toLowerCase() === platform)?.handle;
  return (profileHandle || creator.handle || '').replace(/^@/, '');
};

const FILTERS_STORAGE_KEY = 'creators-filters-v1';

type StoredFilters = {
  search?: string;
  selectedStatuses?: string[];
  followersFilter?: string;
  engagementFilter?: string;
  campaignFilter?: string;
  sortBy?: string;
};

type CampaignOption = {
  id: string;
  name: string;
};

const loadStoredFilters = (): StoredFilters => {
  try {
    const raw = sessionStorage.getItem(FILTERS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export default function Creators({ onlyEngaged = false }: { onlyEngaged?: boolean } = {}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const location = useLocation();
  const [creators, setCreators] = useState<Creator[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  const [partnerships, setPartnerships] = useState<any[]>([]);
  const [shipments, setShipments] = useState<any[]>([]);
  const [contents, setContents] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [outreachModalCreatorId, setOutreachModalCreatorId] = useState<string | null>(null);
  const [outreachModalType, setOutreachModalType] = useState<string | undefined>(undefined);
  
  // Workflow Modal States
  const [activeCreator, setActiveCreator] = useState<any>(null);
  const [activePartnership, setActivePartnership] = useState<any>(null);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showShipmentModal, setShowShipmentModal] = useState(false);
  const [showContentPromptModal, setShowContentPromptModal] = useState(false);
  const [contentPromptAction, setContentPromptAction] = useState<'submit' | 'publish'>('submit');
  const [activeContentId, setActiveContentId] = useState<string | null>(null);
  const [initialContentValue, setInitialContentValue] = useState('');
  
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [activeFeedback, setActiveFeedback] = useState<string>('');
  const [outreachInitialSubject, setOutreachInitialSubject] = useState<string | undefined>(undefined);
  const [outreachInitialBody, setOutreachInitialBody] = useState<string | undefined>(undefined);
  
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [openMobileDropdown, setOpenMobileDropdown] = useState<'followers' | 'engagement' | 'campaign' | 'sort' | null>(null);

  const [search, setSearch] = useState(() => loadStoredFilters().search || '');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(() => loadStoredFilters().selectedStatuses || []);
  const [followersFilter, setFollowersFilter] = useState(() => loadStoredFilters().followersFilter || '');
  const [engagementFilter, setEngagementFilter] = useState(() => loadStoredFilters().engagementFilter || '');
  const [campaignFilter, setCampaignFilter] = useState(() => loadStoredFilters().campaignFilter || '');
  const [sortBy, setSortBy] = useState(() => loadStoredFilters().sortBy || 'followers_desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const activeFiltersCount = selectedStatuses.length + 
    (followersFilter ? 1 : 0) + 
    (engagementFilter ? 1 : 0) + 
    (campaignFilter ? 1 : 0) + 
    (sortBy !== 'followers_desc' ? 1 : 0);

  const fetchCreators = async () => {
    try {
      setLoading(true);
      const [creatorsData, campaignsData, partnershipsData, shipmentsData, contentsData] = await Promise.all([
        getAllCreators(),
        getCampaigns(),
        getPartnerships(),
        getShipments(),
        getContents()
      ]);
      setCreators(creatorsData);
      setCampaigns(campaignsData.map(c => ({ id: c.id, name: c.name })));
      setPartnerships(partnershipsData);
      setShipments(shipmentsData);
      setContents(contentsData);
    } catch (err) {
      console.error('Failed to load creators:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCreators();
  }, []);

  // Sync passed location filters from dashboard
  useEffect(() => {
    if (location.state?.initialStatusFilter) {
      setSelectedStatuses([location.state.initialStatusFilter]);
    }
  }, [location.state]);

  // Persist filter/sort selections across navigation within the session
  useEffect(() => {
    try {
      sessionStorage.setItem(
        FILTERS_STORAGE_KEY,
        JSON.stringify({ search, selectedStatuses, followersFilter, engagementFilter, campaignFilter, sortBy })
      );
    } catch {
      // ignore storage errors (quota / disabled)
    }
  }, [search, selectedStatuses, followersFilter, engagementFilter, campaignFilter, sortBy]);

  // Snap back to the first page whenever the result set changes.
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedStatuses, followersFilter, engagementFilter, campaignFilter, sortBy]);

  const handleReview = async (id: string, action: 'approve' | 'reject' | 'shortlist' | 'revoke') => {
    const previousCreators = [...creators];

    // Optimistically update the UI state immediately
    setCreators(prevCreators => prevCreators.map(c => {
      if (c.id === id) {
        if (action === 'revoke') {
          return { ...c, review_status: 'hold', lifecycle_status: 'new' };
        } else if (action === 'reject') {
          return { ...c, review_status: 'rejected' };
        } else if (action === 'shortlist') {
          return { ...c, review_status: 'shortlisted' };
        }
      }
      return c;
    }));

    try {
      await reviewLead(id, action);
      // Silently refresh the list in the background
      getAllCreators().then(data => setCreators(data)).catch(console.error);
    } catch (err) {
      setCreators(previousCreators); // Revert state on error
      alert('Failed to update creator: ' + err);
    }
  };

  const handleConfirmApprove = async (customSubject?: string, customBody?: string, messageType?: string, customTo?: string) => {
    if (!outreachModalCreatorId) return;
    try {
      await reviewLead(outreachModalCreatorId, 'approve', customSubject, customBody, messageType, customTo);
      fetchCreators();
    } catch (err) {
      alert('Failed to approve lead and send outreach.');
      throw err;
    }
  };

  const handleWorkflowAction = async (creator: any, actionType: string, payload?: any) => {
    const partnership = partnerships.find(p => p.creator_id === creator.id || p.Creator?.id === creator.id);
    setActiveCreator(creator);
    
    if (actionType === 'view_feedback') {
      setActiveFeedback(partnership?.creator_feedback || 'No feedback provided.');
      setActivePartnership(partnership);
      setShowFeedbackModal(true);
    } else if (actionType === 'review') {
      handleReview(creator.id, 'shortlist');
    } else if (actionType === 'outreach') {
      setOutreachModalType(undefined);
      setOutreachModalCreatorId(creator.id);
    } else if (actionType === 'follow_up') {
      setOutreachModalType('followup_1');
      setOutreachModalCreatorId(creator.id);
    } else if (actionType === 'draft_offer') {
      setActivePartnership(partnership || { creator_id: creator.id, campaign_id: creator.campaign_id || creator.campaign_ids?.[0] });
      setShowOfferModal(true);
    } else if (actionType === 'mark_accepted') {
      try {
        const { markAccepted } = await import('../lib/api');
        await markAccepted(partnership.id);
        fetchCreators();
      } catch (err) { alert('Failed to mark accepted: ' + err); }
    } else if (actionType === 'add_shipment') {
      setActivePartnership(partnership);
      setShowShipmentModal(true);
    } else if (actionType === 'activate') {
      try {
        const { activatePartnership } = await import('../lib/api');
        await activatePartnership(partnership.id);
        fetchCreators();
      } catch (err) { alert('Failed to activate: ' + err); }
    } else if (actionType === 'mark_delivered') {
      // Find the shipment and update it
      try {
        const { updateShipment } = await import('../lib/api');
        const shipment = shipments.find(s => s.creator_id === creator.id);
        if (shipment) {
          await updateShipment(shipment.id, { status: 'delivered' });
          fetchCreators();
        }
      } catch (err) { alert('Failed to mark delivered: ' + err); }
    } else if (actionType === 'add_draft_url' || actionType === 'add_live_url') {
      setActiveContentId(payload?.id || null);
      setContentPromptAction(actionType === 'add_draft_url' ? 'submit' : 'publish');
      setInitialContentValue(actionType === 'add_draft_url' ? (payload?.draft_url || '') : (payload?.published_url || ''));
      setShowContentPromptModal(true);
    } else if (actionType === 'view_discussion') {
      navigate(`/creators/${creator.id}?scroll=conversation`);
    } else if (actionType === 'view_shipments') {
      navigate('/shipments');
    } else if (actionType === 'review_content') {
      navigate('/content');
    } else if (actionType === 'complete') {
      try {
        const { completePartnership } = await import('../lib/api');
        await completePartnership(partnership.id);
        fetchCreators();
      } catch (err) { alert('Failed to complete: ' + err); }
    }
  };

  const filteredCreators = creators.filter(c => {
    // Only count creators with real profile data that clear the follower floor.
    if (!isQualifiedCreator(c)) return false;

    // Filter for onlyEngaged creators if requested (includes approved review status or active lifecycle status)
    if (onlyEngaged) {
      const isMyCreator = c.review_status === 'approved' || ['engaged', 'qualified', 'converted', 'contacted', 'replied', 'in_discussion'].includes(c.lifecycle_status || '');
      if (!isMyCreator) return false;
    }

    const matchesSearch =
      c.handle?.toLowerCase().includes(search.toLowerCase()) ||
      c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.category?.toLowerCase().includes(search.toLowerCase());

    const followers = getFollowers(c);
    const matchesFollowers =
      !followersFilter ||
      (followersFilter === '<10k' && followers < 10_000) ||
      (followersFilter === '10k-100k' && followers >= 10_000 && followers < 100_000) ||
      (followersFilter === '100k-1m' && followers >= 100_000 && followers < 1_000_000) ||
      (followersFilter === '1m+' && followers >= 1_000_000);

    const engagement = getEngagement(c);
    const matchesEngagement =
      !engagementFilter ||
      (engagementFilter === '<1' && engagement < 1) ||
      (engagementFilter === '1-3' && engagement >= 1 && engagement < 3) ||
      (engagementFilter === '3-6' && engagement >= 3 && engagement < 6) ||
      (engagementFilter === '6+' && engagement >= 6);

    const campaignIds = new Set([c.campaign_id, ...(c.campaign_ids || [])].filter(Boolean));
    const matchesCampaign = !campaignFilter || campaignIds.has(campaignFilter);

    if (!matchesFollowers || !matchesEngagement || !matchesCampaign) return false;

    if (selectedStatuses.length === 0) return matchesSearch;

    // Check if the creator matches any of the selected statuses (shared helper
    // so these buckets stay identical to the Dashboard queue counts).
    return matchesSearch && selectedStatuses.some(statusFilter => matchesStatusFilter(c, statusFilter));
  });

  const sortedCreators = [...filteredCreators];
  switch (sortBy) {
    case 'followers_desc': sortedCreators.sort((a, b) => getFollowers(b) - getFollowers(a)); break;
    case 'followers_asc': sortedCreators.sort((a, b) => getFollowers(a) - getFollowers(b)); break;
    case 'engagement_desc': sortedCreators.sort((a, b) => getEngagement(b) - getEngagement(a)); break;
    case 'engagement_asc': sortedCreators.sort((a, b) => getEngagement(a) - getEngagement(b)); break;
  }

  // Clamp the page if the result set shrank below the current offset, then slice.
  const pageStart = (Math.min(currentPage, Math.max(1, Math.ceil(sortedCreators.length / PAGE_SIZE))) - 1) * PAGE_SIZE;
  const pagedCreators = sortedCreators.slice(pageStart, pageStart + PAGE_SIZE);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-[fadeIn_0.3s_ease]">
      {location.state?.initialStatusFilter && (
        <Link to="/dashboard" className="inline-flex items-center text-[10px] font-normal text-gray-400 hover:text-primary-600 transition-colors group tracking-widest uppercase mb-1">
          <ArrowLeft size={14} className="mr-1 group-hover:-translate-x-1 transition-transform" /> BACK TO DASHBOARD
        </Link>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-normal text-gray-900 font-outfit uppercase tracking-tight">
            {onlyEngaged ? 'My Creators' : 'Global Creator Directory'}
          </h1>
        </div>
      </div>

      <Card>
        <div className="p-6 border-b border-gray-100 bg-gray-50/30 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex gap-2 w-full sm:max-w-xl flex-1">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search global identities..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all font-outfit"
                />
              </div>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center justify-center gap-2 px-4 py-2 border rounded-lg text-sm font-outfit uppercase tracking-wider transition-all select-none min-h-[40px] ${
                  showFilters || activeFiltersCount > 0
                    ? 'bg-primary-600 border-primary-600 text-white font-medium shadow-md shadow-primary-500/20'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
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
              {filteredCreators.length} records found
            </div>
          </div>

          {/* Collapsible Filters Grid */}
          {showFilters && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 pt-5 border-t border-gray-100 animate-[fadeIn_0.2s_ease]">
              {/* Status Dropdown */}
              {!onlyEngaged && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                      className="w-full bg-white border border-gray-200 text-gray-700 text-xs font-normal uppercase tracking-tight rounded-lg py-2 px-3 flex justify-between items-center focus:outline-none focus:ring-1 focus:ring-primary-500 font-outfit"
                    >
                      <span className="truncate">
                        {selectedStatuses.length === 0
                          ? 'All Statuses'
                          : `${selectedStatuses.length} Selected`}
                      </span>
                      <ChevronDown size={14} className={`text-gray-400 transition-transform ${isFilterDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isFilterDropdownOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setIsFilterDropdownOpen(false)}
                        />
                        <div className="absolute left-0 mt-1 w-full min-w-[200px] bg-white border border-gray-150 rounded-xl shadow-hover z-20 py-1.5 animate-[fadeIn_0.15s_ease]">
                          {[
                            { id: 'hold', label: 'Discovered' },
                            { id: 'pending', label: 'Shortlisted' },
                            { id: 'approved', label: 'Approved' },
                            { id: 'contacted', label: 'Contacted' },
                            { id: 'engaged', label: 'Engaged' },
                            { id: 'rejected', label: 'Rejected' },
                            { id: 'not_respond', label: 'Not Responsive' }
                          ].map(item => {
                            const isChecked = selectedStatuses.includes(item.id);
                            return (
                              <label
                                key={item.id}
                                className="flex items-center gap-3 px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 cursor-pointer select-none normal-case"
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    setSelectedStatuses(prev =>
                                      isChecked ? prev.filter(s => s !== item.id) : [...prev, item.id]
                                    );
                                  }}
                                  className="w-3.5 h-3.5 rounded text-primary-600 border-gray-300 focus:ring-primary-500/20 cursor-pointer"
                                />
                                <span>{item.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Followers</label>
                <select
                  value={followersFilter}
                  onChange={e => setFollowersFilter(e.target.value)}
                  className="w-full bg-white border border-gray-200 text-gray-700 text-xs font-normal uppercase tracking-tight rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-primary-500 font-outfit"
                >
                  <option value="">All Sizes</option>
                  <option value="<10k">&lt; 10K</option>
                  <option value="10k-100k">10K – 100K</option>
                  <option value="100k-1m">100K – 1M</option>
                  <option value="1m+">1M+</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Engagement</label>
                <select
                  value={engagementFilter}
                  onChange={e => setEngagementFilter(e.target.value)}
                  className="w-full bg-white border border-gray-200 text-gray-700 text-xs font-normal uppercase tracking-tight rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-primary-500 font-outfit"
                >
                  <option value="">Any %</option>
                  <option value="<1">&lt; 1%</option>
                  <option value="1-3">1 – 3%</option>
                  <option value="3-6">3 – 6%</option>
                  <option value="6+">6%+</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Campaign</label>
                <select
                  value={campaignFilter}
                  onChange={e => setCampaignFilter(e.target.value)}
                  className="w-full bg-white border border-gray-200 text-gray-700 text-xs font-normal uppercase tracking-tight rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-primary-500 font-outfit truncate"
                >
                  <option value="">All Campaigns</option>
                  {campaigns.map(campaign => (
                    <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Sort</label>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  className="w-full bg-white border border-gray-200 text-gray-700 text-xs font-normal uppercase tracking-tight rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-primary-500 font-outfit"
                >
                  <option value="followers_desc">Followers (High→Low)</option>
                  <option value="followers_asc">Followers (Low→High)</option>
                  <option value="engagement_desc">Engagement (High→Low)</option>
                  <option value="engagement_asc">Engagement (Low→High)</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="py-20">
            <LoadingState message="Scouring Creator Database..." />
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <Thead>
                  <Tr>
                    <Th>Creator Details</Th>
                    <Th className="text-center">Followers</Th>
                    <Th className="text-center">Engagement</Th>
                    <Th>Status</Th>
                    <Th className="text-center w-40">Next Action</Th>
                    <Th className="text-right">Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {pagedCreators.map(c => (
                    <Tr key={c.id}>
                      <Td>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex flex-shrink-0 items-center justify-center font-normal text-sm uppercase ring-2 ring-white shadow-sm overflow-hidden">
                            {c.profile_pic ? (
                              <img src={c.profile_pic} alt="" className="w-full h-full object-cover" />
                            ) : (
                              (c.full_name || c.handle)?.charAt(0)
                            )}
                          </div>
                          <div className="min-w-0">
                            <Link to={`/creators/${c.id}`} state={{ fromMyCreators: onlyEngaged }} className="font-normal text-gray-900 hover:text-primary-600 transition-colors text-xs uppercase tracking-tight font-outfit leading-tight line-clamp-2 whitespace-normal break-words max-w-[150px]">
                              {c.full_name || `@${c.handle}`}
                            </Link>
                            <div className="flex gap-2 mt-1.5">
                              {c.has_instagram && (
                                <a
                                  href={c.profiles?.find(p => p.platform.toLowerCase() === 'instagram')?.profile_url || `https://instagram.com/${c.handle?.replace(/^@/, '')}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-[#E1306C] hover:scale-[1.02] transition-transform"
                                  title="Instagram"
                                >
                                  <Instagram size={14} />
                                  <span className="text-[11px] text-gray-500 normal-case tracking-normal">@{getPlatformHandle(c, 'instagram')}</span>
                                </a>
                              )}
                              {c.has_youtube && (
                                <a
                                  href={c.profiles?.find(p => p.platform.toLowerCase() === 'youtube')?.profile_url || `https://youtube.com/@${c.handle?.replace(/^@/, '')}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-[#FF0000] hover:scale-[1.02] transition-transform"
                                  title="YouTube"
                                >
                                  <Youtube size={14} />
                                  <span className="text-[11px] text-gray-500 normal-case tracking-normal">@{getPlatformHandle(c, 'youtube')}</span>
                                </a>
                              )}
                              {c.has_tiktok && (
                                <a
                                  href={c.profiles?.find(p => p.platform.toLowerCase() === 'tiktok')?.profile_url || `https://tiktok.com/@${c.handle?.replace(/^@/, '')}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-gray-900 hover:scale-[1.02] transition-transform"
                                  title="TikTok"
                                >
                                  <Activity size={14} />
                                  <span className="text-[11px] text-gray-500 normal-case tracking-normal">@{getPlatformHandle(c, 'tiktok')}</span>
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </Td>
                      <Td className="text-center">
                        {(() => {
                          const f = getFollowers(c);
                          return <span className="text-sm text-gray-700 font-normal">{f > 0 ? formatFollowers(f) : '—'}</span>;
                        })()}
                      </Td>
                      <Td className="text-center">
                        {(() => {
                          const e = getEngagement(c);
                          const f = getFollowers(c);
                          const rating = getErRating(f, e);
                          return (
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-sm text-gray-700 font-normal">{e > 0 ? `${e.toFixed(1)}%` : '—'}</span>
                              {rating && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${rating.colorClass}`}>
                                  {rating.label}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </Td>
                        <Td>
                          <StatusBadge 
                            status={partnerships.find(p => p.creator_id === c.id || p.Creator?.id === c.id)?.status || (['contacted', 'replied', 'engaged', 'qualified', 'converted', 'not_respond'].includes(c.lifecycle_status || '') ? c.lifecycle_status : (c.review_status as any || 'pending'))} 
                          />
                        </Td>
                      <Td className="text-center align-middle">
                        <WorkflowActionEngine 
                          creator={c}
                          partnership={partnerships.find(p => p.creator_id === c.id || p.Creator?.id === c.id)}
                          shipment={shipments.find(s => s.creator_id === c.id)}
                          contents={contents.filter(cnt => String(cnt.creator_id) === String(c.id))}
                          onAction={(type, payload) => handleWorkflowAction(c, type, payload)}
                        />
                      </Td>
                      <Td className="text-right">
                        {['super_admin', 'admin', 'operator', 'client_admin', 'client_marketing'].includes(user?.role || '') && (
                          <div className="flex justify-end gap-2">
                            {c.review_status === 'rejected' && (
                              <button
                                onClick={() => handleReview(c.id, 'revoke')}
                                className="px-2.5 py-1 rounded text-[11px] font-normal uppercase tracking-wider bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors font-outfit"
                                title="Revoke Rejection"
                              >
                                Revoke
                              </button>
                            )}
                            {c.review_status !== 'approved' && c.review_status !== 'rejected' && c.lifecycle_status !== 'not_respond' && (
                              <>
                                <button
                                  onClick={() => setOutreachModalCreatorId(c.id)}
                                  className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                                  title="Approve & Send Outreach"
                                >
                                  <Check size={16} />
                                </button>
                                <button
                                  onClick={() => handleReview(c.id, 'reject')}
                                  className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                  title="Reject"
                                >
                                  <X size={16} />
                                </button>
                                <button
                                  onClick={() => handleReview(c.id, (c.review_status === 'shortlisted' || c.review_status === 'pending_review') ? 'revoke' : 'shortlist')}
                                  className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                                  title={(c.review_status === 'shortlisted' || c.review_status === 'pending_review') ? "Remove from Shortlist" : "Shortlist → Move to Review Queue"}
                                >
                                  <Star size={16} fill={(c.review_status === 'shortlisted' || c.review_status === 'pending_review') ? "currentColor" : "none"} />
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </Td>
                    </Tr>
                  ))}
                  {sortedCreators.length === 0 && (
                    <Tr>
                      <Td colSpan={6} className="text-center py-16 text-gray-500">
                        <div className="flex justify-center mb-3">
                          <Search size={32} className="text-gray-300" />
                        </div>
                        No creators match your search.
                      </Td>
                    </Tr>
                  )}
                </Tbody>
              </Table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-gray-100 bg-white">
              {pagedCreators.map(c => {
                const followers = getFollowers(c);
                const engagement = getEngagement(c);
                return (
                  <div key={c.id} className="p-5 active:bg-gray-50 transition-all space-y-4">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex flex-shrink-0 items-center justify-center font-normal text-sm uppercase ring-2 ring-white shadow-sm overflow-hidden">
                          {c.profile_pic ? (
                            <img src={c.profile_pic} alt="" className="w-full h-full object-cover" />
                          ) : (
                            (c.full_name || c.handle)?.charAt(0)
                          )}
                        </div>
                        <div>
                          <Link to={`/creators/${c.id}`} state={{ fromMyCreators: onlyEngaged }} className="font-normal text-gray-900 hover:text-primary-600 transition-colors text-sm uppercase tracking-tight font-outfit block">
                            {c.full_name || `@${c.handle}`}
                          </Link>
                          <div className="flex gap-2.5 mt-1.5">
                            {c.has_instagram && (
                              <a
                                href={c.profiles?.find(p => p.platform.toLowerCase() === 'instagram')?.profile_url || `https://instagram.com/${c.handle?.replace(/^@/, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[#E1306C] hover:scale-[1.02] transition-transform"
                                title="Instagram"
                              >
                                <Instagram size={14} />
                                <span className="text-[11px] text-gray-500 normal-case tracking-normal">@{getPlatformHandle(c, 'instagram')}</span>
                              </a>
                            )}
                            {c.has_youtube && (
                              <a
                                href={c.profiles?.find(p => p.platform.toLowerCase() === 'youtube')?.profile_url || `https://youtube.com/@${c.handle?.replace(/^@/, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[#FF0000] hover:scale-[1.02] transition-transform"
                                title="YouTube"
                              >
                                <Youtube size={14} />
                                <span className="text-[11px] text-gray-500 normal-case tracking-normal">@{getPlatformHandle(c, 'youtube')}</span>
                              </a>
                            )}
                            {c.has_tiktok && (
                              <a
                                href={c.profiles?.find(p => p.platform.toLowerCase() === 'tiktok')?.profile_url || `https://tiktok.com/@${c.handle?.replace(/^@/, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-gray-900 hover:scale-[1.02] transition-transform"
                                title="TikTok"
                              >
                                <Activity size={14} />
                                <span className="text-[11px] text-gray-500 normal-case tracking-normal">@{getPlatformHandle(c, 'tiktok')}</span>
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                      <StatusBadge 
                          status={partnerships.find(p => p.creator_id === c.id || p.Creator?.id === c.id)?.status || (['contacted', 'replied', 'engaged', 'qualified', 'converted', 'not_respond'].includes(c.lifecycle_status || '') ? c.lifecycle_status : (c.review_status as any || 'pending'))} 
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-y-3 gap-x-4 pt-1 text-xs">
                      <div>
                        <span className="text-[10px] font-normal text-gray-400 uppercase tracking-widest block mb-0.5">Followers</span>
                        <span className="font-normal text-gray-700">{followers > 0 ? formatFollowers(followers) : '—'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-normal text-gray-400 uppercase tracking-widest block mb-0.5">Engagement</span>
                        <div className="flex flex-col items-start gap-1">
                          <span className="font-normal text-gray-700">{engagement > 0 ? `${engagement.toFixed(1)}%` : '—'}</span>
                          {(() => {
                            const rating = getErRating(followers, engagement);
                            return rating && (
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${rating.colorClass}`}>
                                {rating.label}
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    {['super_admin', 'admin', 'operator', 'client_admin', 'client_marketing'].includes(user?.role || '') && (
                      <div className="pt-3 border-t border-gray-50 flex flex-col gap-2 justify-center">
                        <WorkflowActionEngine 
                          creator={c}
                          partnership={partnerships.find(p => p.creator_id === c.id || p.Creator?.id === c.id)}
                          shipment={shipments.find(s => s.creator_id === c.id)}
                          contents={contents.filter(cnt => String(cnt.creator_id) === String(c.id))}
                          onAction={(type, payload) => handleWorkflowAction(c, type, payload)}
                        />
                        <div className="flex gap-2 justify-center mt-2">
                          {c.review_status === 'rejected' && (
                            <button
                              onClick={() => handleReview(c.id, 'revoke')}
                              className="px-3 py-1.5 rounded-lg text-xs font-normal uppercase tracking-wider bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors font-outfit"
                            >
                              Revoke Rejection
                            </button>
                          )}
                          {c.review_status !== 'approved' && c.review_status !== 'rejected' && c.lifecycle_status !== 'not_respond' && (
                            <>
                              <button
                                onClick={() => handleReview(c.id, 'reject')}
                                className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 transition-colors text-xs font-normal flex items-center gap-1 font-outfit rounded-lg"
                              >
                                <X size={14} /> Reject
                              </button>
                              <button
                                onClick={() => handleReview(c.id, (c.review_status === 'shortlisted' || c.review_status === 'pending_review') ? 'revoke' : 'shortlist')}
                                className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors text-xs font-normal flex items-center gap-1 font-outfit rounded-lg"
                              >
                                <Star size={14} fill={(c.review_status === 'shortlisted' || c.review_status === 'pending_review') ? "currentColor" : "none"} />
                                {(c.review_status === 'shortlisted' || c.review_status === 'pending_review') ? "Shortlisted" : "Shortlist"}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {sortedCreators.length === 0 && (
                <div className="text-center py-20 text-gray-400 italic bg-white rounded-xl">No creators match your search.</div>
              )}
            </div>

            <Pagination
              currentPage={currentPage}
              totalItems={sortedCreators.length}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </Card>

      <OutreachPreviewModal
        creatorId={outreachModalCreatorId || ''}
        campaignId={creators.find(c => c.id === outreachModalCreatorId)?.campaign_id || undefined}
        messageType={outreachModalType}
        isOpen={!!outreachModalCreatorId}
        onClose={() => {
          setOutreachModalCreatorId(null);
          setOutreachInitialSubject(undefined);
          setOutreachInitialBody(undefined);
        }}
        onSend={handleConfirmApprove}
        initialSubject={outreachInitialSubject}
        initialBody={outreachInitialBody}
        skipFetch={!!outreachInitialSubject}
      />

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Creator Feedback</h2>
              <button
                onClick={() => setShowFeedbackModal(false)}
                className="p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{activeFeedback}</p>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50">
              <button
                onClick={() => setShowFeedbackModal(false)}
                className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowFeedbackModal(false);
                  setOutreachModalType('qualification');
                  setOutreachModalCreatorId(activeCreator.id);
                  const publicUrl = `${window.location.origin}/public/offer/${activePartnership.id}`;
                  setOutreachInitialSubject(`Re: Partnership Offer - @${activeCreator.handle}`);
                  setOutreachInitialBody(`Hi ${activeCreator.full_name},\n\nWe reviewed your feedback regarding the offer terms.\n\n[YOUR NEGOTIATION MESSAGE HERE]\n\nIf these new terms work for you, you can click the link below to accept the updated offer:\n<br><br><a href="${publicUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Review and Accept Offer</a>\n<br><br>Thanks,\nThe ATS Team`);
                }}
                className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
              >
                Reply to Creator
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Filters Modal */}
      {isMobileFiltersOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-end justify-center p-0">
          <div
            className="fixed inset-0"
            onClick={() => setIsMobileFiltersOpen(false)}
          />
          <div className="relative w-full bg-white rounded-t-3xl shadow-3xl flex flex-col max-h-[85vh] z-10 animate-in slide-in-from-bottom duration-250">
            {/* Drag Handle */}
            <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto my-3 shrink-0" />

            {/* Header */}
            <div className="px-6 pb-4 border-b border-gray-100 flex justify-between items-center bg-white shrink-0">
              <h3 className="text-lg font-normal text-gray-900 font-outfit uppercase tracking-tight flex items-center gap-2">
                <SlidersHorizontal size={18} className="text-primary-600" /> Filters
              </h3>
              <button
                type="button"
                onClick={() => {
                  setSelectedStatuses([]);
                  setFollowersFilter('');
                  setEngagementFilter('');
                  setCampaignFilter('');
                  setSortBy('followers_desc');
                }}
                className="text-xs text-primary-600 hover:text-primary-700 font-normal uppercase tracking-widest font-outfit"
              >
                Clear all
              </button>
            </div>

            {/* Scrollable Body */}
            <div
              className="flex-1 overflow-y-auto p-6 space-y-6"
              onClick={() => setOpenMobileDropdown(null)}
            >
              {/* Status Section */}
              {!onlyEngaged && (
                <div className="space-y-2.5">
                  <label className="text-[10px] font-normal text-slate-400 block font-outfit uppercase tracking-widest">Status</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'hold', label: 'Discovered' },
                      { id: 'pending', label: 'Shortlisted' },
                      { id: 'approved', label: 'Approved' },
                      { id: 'contacted', label: 'Contacted' },
                      { id: 'engaged', label: 'Engaged' },
                      { id: 'rejected', label: 'Rejected' },
                      { id: 'not_respond', label: 'Not Responsive' }
                    ].map(item => {
                      const isChecked = selectedStatuses.includes(item.id);
                      return (
                        <button
                          type="button"
                          key={item.id}
                          onClick={() => {
                            setSelectedStatuses(prev =>
                              isChecked ? prev.filter(s => s !== item.id) : [...prev, item.id]
                            );
                          }}
                          className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-xs text-left transition-all ${isChecked
                              ? 'border-primary-500 bg-primary-50/30 text-primary-700 font-medium'
                              : 'border-slate-100 bg-slate-50/50 text-slate-700'
                            }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            readOnly
                            className="w-3.5 h-3.5 rounded text-primary-600 border-gray-300 focus:ring-primary-500/20 pointer-events-none"
                          />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Followers Section */}
              <div className="space-y-1.5 relative">
                <label className="text-[10px] font-normal text-slate-400 block font-outfit uppercase tracking-widest">Followers</label>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMobileDropdown(openMobileDropdown === 'followers' ? null : 'followers');
                  }}
                  className="w-full flex items-center justify-between bg-slate-50/50 border border-slate-100 rounded-xl py-3 px-4 text-sm font-normal text-slate-900 text-left font-outfit"
                >
                  <span>
                    {followersFilter === '' ? 'Any Followers' :
                      followersFilter === '<10k' ? '< 10K' :
                        followersFilter === '10k-100k' ? '10K – 100K' :
                          followersFilter === '100k-1m' ? '100K – 1M' :
                            followersFilter === '1m+' ? '1M+' : 'Any Followers'}
                  </span>
                  <ChevronDown size={16} className="text-gray-400" />
                </button>
                {openMobileDropdown === 'followers' && (
                  <div className="absolute left-0 mt-1 w-full bg-white border border-gray-150 rounded-xl shadow-xl z-30 py-1.5 max-h-60 overflow-y-auto">
                    {[
                      { val: '', label: 'Any Followers' },
                      { val: '<10k', label: '< 10K' },
                      { val: '10k-100k', label: '10K – 100K' },
                      { val: '100k-1m', label: '100K – 1M' },
                      { val: '1m+', label: '1M+' }
                    ].map(opt => (
                      <button
                        type="button"
                        key={opt.val}
                        onClick={() => {
                          setFollowersFilter(opt.val);
                          setOpenMobileDropdown(null);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors ${followersFilter === opt.val ? 'text-primary-600 bg-primary-50/30 font-medium' : 'text-slate-600 hover:text-slate-900'}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Engagement Section */}
              <div className="space-y-1.5 relative">
                <label className="text-[10px] font-normal text-slate-400 block font-outfit uppercase tracking-widest">Engagement</label>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMobileDropdown(openMobileDropdown === 'engagement' ? null : 'engagement');
                  }}
                  className="w-full flex items-center justify-between bg-slate-50/50 border border-slate-100 rounded-xl py-3 px-4 text-sm font-normal text-slate-900 text-left font-outfit"
                >
                  <span>
                    {engagementFilter === '' ? 'Any Engagement' :
                      engagementFilter === '<1' ? '< 1%' :
                        engagementFilter === '1-3' ? '1 – 3%' :
                          engagementFilter === '3-6' ? '3 – 6%' :
                            engagementFilter === '6+' ? '6%+' : 'Any Engagement'}
                  </span>
                  <ChevronDown size={16} className="text-gray-400" />
                </button>
                {openMobileDropdown === 'engagement' && (
                  <div className="absolute left-0 mt-1 w-full bg-white border border-gray-150 rounded-xl shadow-xl z-30 py-1.5 max-h-60 overflow-y-auto">
                    {[
                      { val: '', label: 'Any Engagement' },
                      { val: '<1', label: '< 1%' },
                      { val: '1-3', label: '1 – 3%' },
                      { val: '3-6', label: '3 – 6%' },
                      { val: '6+', label: '6%+' }
                    ].map(opt => (
                      <button
                        type="button"
                        key={opt.val}
                        onClick={() => {
                          setEngagementFilter(opt.val);
                          setOpenMobileDropdown(null);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors ${engagementFilter === opt.val ? 'text-primary-600 bg-primary-50/30 font-medium' : 'text-slate-600 hover:text-slate-900'}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Campaign Section */}
              <div className="space-y-1.5 relative">
                <label className="text-[10px] font-normal text-slate-400 block font-outfit uppercase tracking-widest">Campaign</label>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMobileDropdown(openMobileDropdown === 'campaign' ? null : 'campaign');
                  }}
                  className="w-full flex items-center justify-between bg-slate-50/50 border border-slate-100 rounded-xl py-3 px-4 text-sm font-normal text-slate-900 text-left font-outfit"
                >
                  <span>
                    {campaignFilter === '' ? 'Any Campaign' :
                      campaigns.find(camp => camp.id === campaignFilter)?.name || 'Any Campaign'}
                  </span>
                  <ChevronDown size={16} className="text-gray-400" />
                </button>
                {openMobileDropdown === 'campaign' && (
                  <div className="absolute left-0 mt-1 w-full bg-white border border-gray-150 rounded-xl shadow-xl z-30 py-1.5 max-h-60 overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setCampaignFilter('');
                        setOpenMobileDropdown(null);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors ${campaignFilter === '' ? 'text-primary-600 bg-primary-50/30 font-medium' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      Any Campaign
                    </button>
                    {campaigns.map(camp => (
                      <button
                        type="button"
                        key={camp.id}
                        onClick={() => {
                          setCampaignFilter(camp.id);
                          setOpenMobileDropdown(null);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors ${campaignFilter === camp.id ? 'text-primary-600 bg-primary-50/30 font-medium' : 'text-slate-600 hover:text-slate-900'}`}
                      >
                        {camp.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Sort By Section */}
              <div className="space-y-1.5 relative">
                <label className="text-[10px] font-normal text-slate-400 block font-outfit uppercase tracking-widest">Sort By</label>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMobileDropdown(openMobileDropdown === 'sort' ? null : 'sort');
                  }}
                  className="w-full flex items-center justify-between bg-slate-50/50 border border-slate-100 rounded-xl py-3 px-4 text-sm font-normal text-slate-900 text-left font-outfit"
                >
                  <span>
                    {sortBy === 'followers_desc' ? 'Followers (High→Low)' :
                      sortBy === 'followers_asc' ? 'Followers (Low→High)' :
                        sortBy === 'engagement_desc' ? 'Engagement (High→Low)' :
                          sortBy === 'engagement_asc' ? 'Engagement (Low→High)' : 'Followers (High→Low)'}
                  </span>
                  <ChevronDown size={16} className="text-gray-400" />
                </button>
                {openMobileDropdown === 'sort' && (
                  <div className="absolute left-0 mt-1 w-full bg-white border border-gray-150 rounded-xl shadow-xl z-30 py-1.5 max-h-60 overflow-y-auto">
                    {[
                      { val: 'followers_desc', label: 'Followers (High→Low)' },
                      { val: 'followers_asc', label: 'Followers (Low→High)' },
                      { val: 'engagement_desc', label: 'Engagement (High→Low)' },
                      { val: 'engagement_asc', label: 'Engagement (Low→High)' }
                    ].map(opt => (
                      <button
                        type="button"
                        key={opt.val}
                        onClick={() => {
                          setSortBy(opt.val);
                          setOpenMobileDropdown(null);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors ${sortBy === opt.val ? 'text-primary-600 bg-primary-50/30 font-medium' : 'text-slate-600 hover:text-slate-900'}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-100 bg-white rounded-b-3xl shrink-0">
              <button
                type="button"
                onClick={() => setIsMobileFiltersOpen(false)}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white rounded-xl py-3 text-center text-xs font-normal uppercase tracking-widest font-outfit shadow-xl shadow-primary-500/20 transition-all active:scale-[0.98]"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modals */}
      <OfferModal 
        isOpen={showOfferModal}
        onClose={() => setShowOfferModal(false)}
        partnership={activePartnership}
        onSuccess={() => fetchCreators()}
      />

      <ShipmentModal
        isOpen={showShipmentModal}
        onClose={() => setShowShipmentModal(false)}
        creator={activeCreator}
        partnership={activePartnership}
        onSuccess={() => fetchCreators()}
      />

      <ContentPromptModal
        isOpen={showContentPromptModal}
        onClose={() => setShowContentPromptModal(false)}
        actionType={contentPromptAction}
        contentId={activeContentId}
        initialValue={initialContentValue}
        onSuccess={() => fetchCreators()}
      />
    </div>
  );
}
