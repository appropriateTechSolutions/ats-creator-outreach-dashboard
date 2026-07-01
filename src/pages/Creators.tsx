import { toast } from '../lib/toast';
import { getErRating, formatFollowers } from '../lib/formatters';
import { hasRole, ROLE_GROUPS } from '../lib/constants';
import { useState, useEffect, useMemo } from 'react';
import { Card } from '../components/ui/Card';
import { Table, Thead, Tbody, Tr, Th, Td } from '../components/ui/Table';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Search, ArrowLeft, SlidersHorizontal } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { reviewLead } from '../lib/api';
import {
  useAllCreators,
  useCampaigns,
  usePartnerships,
  useShipments,
  useContents,
} from '../hooks/queries';
import { useInvalidate } from '../hooks/useInvalidate';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import type { Creator } from '../types';
import { LoadingState } from '../components/ui/LoadingState';
import { Check, X, Star } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { OutreachPreviewModal } from '../components/ui/OutreachPreviewModal';
import { WorkflowActionEngine } from '../components/workflow/WorkflowActionEngine';
import { OfferModal } from '../components/workflow/OfferModal';
import { ShipmentModal } from '../components/workflow/ShipmentModal';
import { ContentPromptModal } from '../components/workflow/ContentPromptModal';
import {
  getFollowers,
  getEngagement,
  isQualifiedCreator,
  matchesStatusFilter,
} from '../lib/creatorFilters';
import { Pagination } from '../components/ui/Pagination';
import { useDebounce } from '../hooks/useDebounce';
import { CreatorAvatar, CreatorSocialLinks } from '../components/creators/CreatorIdentity';
import { CreatorsFilterGrid, MobileFiltersSheet } from '../components/creators/CreatorsFilters';
import { Modal } from '../components/ui/Modal';

const PAGE_SIZE = 50;

// Stable empty array so a creator with no content passes the same reference each
// render (keeps WorkflowActionEngine props referentially stable).
const EMPTY_CONTENTS: any[] = [];

const FILTERS_STORAGE_KEY = 'creators-filters-v1';

type StoredFilters = {
  search?: string;
  selectedStatuses?: string[];
  followersFilter?: string;
  engagementFilter?: string;
  campaignFilter?: string;
  sortBy?: string;
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
  const creatorsQ = useAllCreators();
  const partnershipsQ = usePartnerships();
  const shipmentsQ = useShipments();
  const contentsQ = useContents();
  const { data: campaigns = [] } = useCampaigns();
  const creators = creatorsQ.data ?? [];
  const partnerships = partnershipsQ.data ?? [];
  const shipments = shipmentsQ.data ?? [];
  const contents = contentsQ.data ?? [];
  const loading =
    creatorsQ.isLoading || partnershipsQ.isLoading || shipmentsQ.isLoading || contentsQ.isLoading;

  const invalidate = useInvalidate();
  const queryClient = useQueryClient();
  // Invalidate exactly the resources this page reads. Partnership/shipment/content
  // writes also invalidate ['creators'] because the list's status + next-action
  // columns are derived from them (H5).
  const refresh = () =>
    invalidate(
      queryKeys.creators.all,
      queryKeys.partnerships.root,
      queryKeys.shipments.root,
      queryKeys.content.root,
    );
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
  const [outreachInitialSubject, setOutreachInitialSubject] = useState<string | undefined>(
    undefined,
  );
  const [outreachInitialBody, setOutreachInitialBody] = useState<string | undefined>(undefined);

  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  const [search, setSearch] = useState(() => loadStoredFilters().search || '');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(
    () => loadStoredFilters().selectedStatuses || [],
  );
  const [followersFilter, setFollowersFilter] = useState(
    () => loadStoredFilters().followersFilter || '',
  );
  const [engagementFilter, setEngagementFilter] = useState(
    () => loadStoredFilters().engagementFilter || '',
  );
  const [campaignFilter, setCampaignFilter] = useState(
    () => loadStoredFilters().campaignFilter || '',
  );
  const [sortBy, setSortBy] = useState(() => loadStoredFilters().sortBy || 'followers_desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const activeFiltersCount =
    selectedStatuses.length +
    (followersFilter ? 1 : 0) +
    (engagementFilter ? 1 : 0) +
    (campaignFilter ? 1 : 0) +
    (sortBy !== 'followers_desc' ? 1 : 0);

  const toggleStatus = (id: string) =>
    setSelectedStatuses((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );

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
        JSON.stringify({
          search,
          selectedStatuses,
          followersFilter,
          engagementFilter,
          campaignFilter,
          sortBy,
        }),
      );
    } catch {
      // ignore storage errors (quota / disabled)
    }
  }, [search, selectedStatuses, followersFilter, engagementFilter, campaignFilter, sortBy]);

  // Snap back to the first page whenever the result set changes.
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedStatuses, followersFilter, engagementFilter, campaignFilter, sortBy]);

  const handleReview = async (
    id: string,
    action: 'approve' | 'reject' | 'shortlist' | 'revoke',
  ) => {
    // Optimistic update directly on the creators cache; snapshot for rollback.
    const previous = queryClient.getQueryData<Creator[]>(queryKeys.creators.all);
    queryClient.setQueryData<Creator[]>(queryKeys.creators.all, (old) =>
      (old ?? []).map((c) => {
        if (c.id === id) {
          if (action === 'revoke') return { ...c, review_status: 'hold', lifecycle_status: 'new' };
          if (action === 'reject') return { ...c, review_status: 'rejected' };
          if (action === 'shortlist') return { ...c, review_status: 'shortlisted' };
        }
        return c;
      }),
    );

    try {
      await reviewLead(id, action);
      invalidate(queryKeys.creators.all);
    } catch (err) {
      if (previous) queryClient.setQueryData(queryKeys.creators.all, previous); // rollback
      toast.error('Failed to update creator: ' + err);
    }
  };

  const handleConfirmApprove = async (
    customSubject?: string,
    customBody?: string,
    messageType?: string,
    customTo?: string,
  ) => {
    if (!outreachModalCreatorId) return;
    try {
      await reviewLead(
        outreachModalCreatorId,
        'approve',
        customSubject,
        customBody,
        messageType,
        customTo,
      );
      refresh();
    } catch (err) {
      toast.error('Failed to approve lead and send outreach.');
      throw err;
    }
  };

  const handleWorkflowAction = async (creator: any, actionType: string, payload?: any) => {
    const partnership = partnerships.find(
      (p) => p.creator_id === creator.id || p.Creator?.id === creator.id,
    );
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
      setActivePartnership(
        partnership || {
          creator_id: creator.id,
          campaign_id: creator.campaign_id || creator.campaign_ids?.[0],
        },
      );
      setShowOfferModal(true);
    } else if (actionType === 'mark_accepted') {
      if (!partnership) return;
      try {
        const { markAccepted } = await import('../lib/api');
        await markAccepted(partnership.id);
        refresh();
      } catch (err) {
        toast.error('Failed to mark accepted: ' + err);
      }
    } else if (actionType === 'add_shipment') {
      setActivePartnership(partnership);
      setShowShipmentModal(true);
    } else if (actionType === 'activate') {
      if (!partnership) return;
      try {
        const { activatePartnership } = await import('../lib/api');
        await activatePartnership(partnership.id);
        refresh();
      } catch (err) {
        toast.error('Failed to activate: ' + err);
      }
    } else if (actionType === 'mark_delivered') {
      // Find the shipment and update it
      try {
        const { updateShipment } = await import('../lib/api');
        const shipment = shipments.find((s) => s.creator_id === creator.id);
        if (shipment) {
          await updateShipment(shipment.id, { status: 'delivered' });
          refresh();
        }
      } catch (err) {
        toast.error('Failed to mark delivered: ' + err);
      }
    } else if (actionType === 'add_draft_url' || actionType === 'add_live_url') {
      setActiveContentId(payload?.id || null);
      setContentPromptAction(actionType === 'add_draft_url' ? 'submit' : 'publish');
      setInitialContentValue(
        actionType === 'add_draft_url' ? payload?.draft_url || '' : payload?.published_url || '',
      );
      setShowContentPromptModal(true);
    } else if (actionType === 'view_discussion') {
      navigate(`/creators/${creator.id}?scroll=conversation`);
    } else if (actionType === 'view_shipments') {
      navigate('/shipments');
    } else if (actionType === 'review_content') {
      navigate('/content');
    } else if (actionType === 'complete') {
      if (!partnership) return;
      try {
        const { completePartnership } = await import('../lib/api');
        await completePartnership(partnership.id);
        refresh();
      } catch (err) {
        toast.error('Failed to complete: ' + err);
      }
    }
  };

  const debouncedSearch = useDebounce(search, 250);

  const filteredCreators = useMemo(
    () =>
      creators.filter((c) => {
        // Only count creators with real profile data that clear the follower floor.
        if (!isQualifiedCreator(c)) return false;

        // Filter for onlyEngaged creators if requested (includes approved review status or active lifecycle status)
        if (onlyEngaged) {
          const isMyCreator =
            c.review_status === 'approved' ||
            ['engaged', 'qualified', 'converted', 'contacted', 'replied', 'in_discussion'].includes(
              c.lifecycle_status || '',
            );
          if (!isMyCreator) return false;
        }

        const q = debouncedSearch.toLowerCase();
        const matchesSearch =
          c.handle?.toLowerCase().includes(q) ||
          c.full_name?.toLowerCase().includes(q) ||
          c.category?.toLowerCase().includes(q);

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
        return (
          matchesSearch &&
          selectedStatuses.some((statusFilter) => matchesStatusFilter(c, statusFilter))
        );
      }),
    [
      creators,
      onlyEngaged,
      debouncedSearch,
      followersFilter,
      engagementFilter,
      campaignFilter,
      selectedStatuses,
    ],
  );

  const sortedCreators = useMemo(() => {
    const arr = [...filteredCreators];
    switch (sortBy) {
      case 'followers_desc':
        arr.sort((a, b) => getFollowers(b) - getFollowers(a));
        break;
      case 'followers_asc':
        arr.sort((a, b) => getFollowers(a) - getFollowers(b));
        break;
      case 'engagement_desc':
        arr.sort((a, b) => getEngagement(b) - getEngagement(a));
        break;
      case 'engagement_asc':
        arr.sort((a, b) => getEngagement(a) - getEngagement(b));
        break;
    }
    return arr;
  }, [filteredCreators, sortBy]);

  // Clamp the page if the result set shrank below the current offset, then slice.
  const pageStart =
    (Math.min(currentPage, Math.max(1, Math.ceil(sortedCreators.length / PAGE_SIZE))) - 1) *
    PAGE_SIZE;
  const pagedCreators = useMemo(
    () => sortedCreators.slice(pageStart, pageStart + PAGE_SIZE),
    [sortedCreators, pageStart],
  );

  // O(1) per-row lookups instead of scanning partnerships/shipments/contents for
  // every rendered creator (was O(rows × records) on every render).
  const partnershipByCreator = useMemo(() => {
    const m = new Map<string, any>();
    for (const p of partnerships) {
      const key = p.creator_id || p.Creator?.id;
      if (key && !m.has(key)) m.set(key, p);
    }
    return m;
  }, [partnerships]);
  const shipmentByCreator = useMemo(() => {
    const m = new Map<string, any>();
    for (const s of shipments) {
      if (s.creator_id && !m.has(s.creator_id)) m.set(s.creator_id, s);
    }
    return m;
  }, [shipments]);
  const contentsByCreator = useMemo(() => {
    const m = new Map<string, any[]>();
    for (const cnt of contents) {
      const key = String(cnt.creator_id);
      const arr = m.get(key);
      if (arr) arr.push(cnt);
      else m.set(key, [cnt]);
    }
    return m;
  }, [contents]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-[fadeIn_0.3s_ease]">
      {location.state?.initialStatusFilter && (
        <Link
          to="/dashboard"
          className="inline-flex items-center text-[10px] font-normal text-gray-400 hover:text-primary-600 transition-colors group tracking-widest uppercase mb-1"
        >
          <ArrowLeft size={14} className="mr-1 group-hover:-translate-x-1 transition-transform" />{' '}
          BACK TO DASHBOARD
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
                  <span
                    className={`flex items-center justify-center rounded-full min-w-[18px] h-[18px] px-1 text-[10px] font-bold ${
                      showFilters || activeFiltersCount > 0
                        ? 'bg-white text-primary-700'
                        : 'bg-primary-600 text-white'
                    }`}
                  >
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
            <CreatorsFilterGrid
              onlyEngaged={onlyEngaged}
              selectedStatuses={selectedStatuses}
              toggleStatus={toggleStatus}
              followersFilter={followersFilter}
              setFollowersFilter={setFollowersFilter}
              engagementFilter={engagementFilter}
              setEngagementFilter={setEngagementFilter}
              campaignFilter={campaignFilter}
              setCampaignFilter={setCampaignFilter}
              campaigns={campaigns}
              sortBy={sortBy}
              setSortBy={setSortBy}
            />
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
                  {pagedCreators.map((c) => (
                    <Tr key={c.id}>
                      <Td>
                        <div className="flex items-center gap-3">
                          <CreatorAvatar creator={c} />
                          <div className="min-w-0">
                            <Link
                              to={`/creators/${c.id}`}
                              state={{ fromMyCreators: onlyEngaged }}
                              className="font-normal text-gray-900 hover:text-primary-600 transition-colors text-xs uppercase tracking-tight font-outfit leading-tight line-clamp-2 whitespace-normal break-words max-w-[150px]"
                            >
                              {c.full_name || `@${c.handle}`}
                            </Link>
                            <CreatorSocialLinks creator={c} showHandles />
                          </div>
                        </div>
                      </Td>
                      <Td className="text-center">
                        {(() => {
                          const f = getFollowers(c);
                          return (
                            <span className="text-sm text-gray-700 font-normal">
                              {f > 0 ? formatFollowers(f) : '—'}
                            </span>
                          );
                        })()}
                      </Td>
                      <Td className="text-center">
                        {(() => {
                          const e = getEngagement(c);
                          const f = getFollowers(c);
                          const rating = getErRating(f, e);
                          return (
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-sm text-gray-700 font-normal">
                                {e > 0 ? `${e.toFixed(1)}%` : '—'}
                              </span>
                              {rating && (
                                <span
                                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${rating.colorClass}`}
                                >
                                  {rating.label}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </Td>
                      <Td>
                        <StatusBadge
                          status={
                            partnershipByCreator.get(c.id)?.status ||
                            ([
                              'contacted',
                              'replied',
                              'engaged',
                              'qualified',
                              'converted',
                              'not_respond',
                            ].includes(c.lifecycle_status || '')
                              ? c.lifecycle_status
                              : (c.review_status as any) || 'pending')
                          }
                        />
                      </Td>
                      <Td className="text-center align-middle">
                        <WorkflowActionEngine
                          creator={c}
                          partnership={partnershipByCreator.get(c.id)}
                          shipment={shipmentByCreator.get(c.id)}
                          contents={contentsByCreator.get(String(c.id)) ?? EMPTY_CONTENTS}
                          onAction={(type, payload) => handleWorkflowAction(c, type, payload)}
                        />
                      </Td>
                      <Td className="text-right">
                        {hasRole(user?.role, ROLE_GROUPS.MANAGE_CREATORS) && (
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
                            {c.review_status !== 'approved' &&
                              c.review_status !== 'rejected' &&
                              c.lifecycle_status !== 'not_respond' && (
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
                                    onClick={() =>
                                      handleReview(
                                        c.id,
                                        c.review_status === 'shortlisted' ||
                                          c.review_status === 'pending_review'
                                          ? 'revoke'
                                          : 'shortlist',
                                      )
                                    }
                                    className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                                    title={
                                      c.review_status === 'shortlisted' ||
                                      c.review_status === 'pending_review'
                                        ? 'Remove from Shortlist'
                                        : 'Shortlist → Move to Review Queue'
                                    }
                                  >
                                    <Star
                                      size={16}
                                      fill={
                                        c.review_status === 'shortlisted' ||
                                        c.review_status === 'pending_review'
                                          ? 'currentColor'
                                          : 'none'
                                      }
                                    />
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
              {pagedCreators.map((c) => {
                const followers = getFollowers(c);
                const engagement = getEngagement(c);
                return (
                  <div key={c.id} className="p-5 active:bg-gray-50 transition-all space-y-4">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex items-center gap-3">
                        <CreatorAvatar
                          creator={c}
                          className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 text-sm ring-2 ring-white shadow-sm"
                        />
                        <div>
                          <Link
                            to={`/creators/${c.id}`}
                            state={{ fromMyCreators: onlyEngaged }}
                            className="font-normal text-gray-900 hover:text-primary-600 transition-colors text-sm uppercase tracking-tight font-outfit block"
                          >
                            {c.full_name || `@${c.handle}`}
                          </Link>
                          <CreatorSocialLinks creator={c} showHandles />
                        </div>
                      </div>
                      <StatusBadge
                        status={
                          partnershipByCreator.get(c.id)?.status ||
                          ([
                            'contacted',
                            'replied',
                            'engaged',
                            'qualified',
                            'converted',
                            'not_respond',
                          ].includes(c.lifecycle_status || '')
                            ? c.lifecycle_status
                            : (c.review_status as any) || 'pending')
                        }
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-y-3 gap-x-4 pt-1 text-xs">
                      <div>
                        <span className="text-[10px] font-normal text-gray-400 uppercase tracking-widest block mb-0.5">
                          Followers
                        </span>
                        <span className="font-normal text-gray-700">
                          {followers > 0 ? formatFollowers(followers) : '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-normal text-gray-400 uppercase tracking-widest block mb-0.5">
                          Engagement
                        </span>
                        <div className="flex flex-col items-start gap-1">
                          <span className="font-normal text-gray-700">
                            {engagement > 0 ? `${engagement.toFixed(1)}%` : '—'}
                          </span>
                          {(() => {
                            const rating = getErRating(followers, engagement);
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
                      </div>
                    </div>

                    {hasRole(user?.role, ROLE_GROUPS.MANAGE_CREATORS) && (
                      <div className="pt-3 border-t border-gray-50 flex flex-col gap-2 justify-center">
                        <WorkflowActionEngine
                          creator={c}
                          partnership={partnershipByCreator.get(c.id)}
                          shipment={shipmentByCreator.get(c.id)}
                          contents={contentsByCreator.get(String(c.id)) ?? EMPTY_CONTENTS}
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
                          {c.review_status !== 'approved' &&
                            c.review_status !== 'rejected' &&
                            c.lifecycle_status !== 'not_respond' && (
                              <>
                                <button
                                  onClick={() => handleReview(c.id, 'reject')}
                                  className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 transition-colors text-xs font-normal flex items-center gap-1 font-outfit rounded-lg"
                                >
                                  <X size={14} /> Reject
                                </button>
                                <button
                                  onClick={() =>
                                    handleReview(
                                      c.id,
                                      c.review_status === 'shortlisted' ||
                                        c.review_status === 'pending_review'
                                        ? 'revoke'
                                        : 'shortlist',
                                    )
                                  }
                                  className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors text-xs font-normal flex items-center gap-1 font-outfit rounded-lg"
                                >
                                  <Star
                                    size={14}
                                    fill={
                                      c.review_status === 'shortlisted' ||
                                      c.review_status === 'pending_review'
                                        ? 'currentColor'
                                        : 'none'
                                    }
                                  />
                                  {c.review_status === 'shortlisted' ||
                                  c.review_status === 'pending_review'
                                    ? 'Shortlisted'
                                    : 'Shortlist'}
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
                <div className="text-center py-20 text-gray-400 italic bg-white rounded-xl">
                  No creators match your search.
                </div>
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
        campaignId={creators.find((c) => c.id === outreachModalCreatorId)?.campaign_id || undefined}
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
      <Modal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        title="Creator Feedback"
        size="md"
        footer={
          <>
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
                setOutreachInitialBody(
                  `Hi ${activeCreator.full_name},\n\nWe reviewed your feedback regarding the offer terms.\n\n[YOUR NEGOTIATION MESSAGE HERE]\n\nIf these new terms work for you, you can click the link below to accept the updated offer:\n<br><br><a href="${publicUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Review and Accept Offer</a>\n<br><br>Thanks,\nThe ATS Team`,
                );
              }}
              className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
            >
              Reply to Creator
            </button>
          </>
        }
      >
        <p className="text-sm text-gray-600 whitespace-pre-wrap">{activeFeedback}</p>
      </Modal>

      {/* Mobile Filters Modal */}
      <MobileFiltersSheet
        isOpen={isMobileFiltersOpen}
        onClose={() => setIsMobileFiltersOpen(false)}
        onlyEngaged={onlyEngaged}
        selectedStatuses={selectedStatuses}
        setSelectedStatuses={setSelectedStatuses}
        followersFilter={followersFilter}
        setFollowersFilter={setFollowersFilter}
        engagementFilter={engagementFilter}
        setEngagementFilter={setEngagementFilter}
        campaignFilter={campaignFilter}
        setCampaignFilter={setCampaignFilter}
        campaigns={campaigns}
        sortBy={sortBy}
        setSortBy={setSortBy}
      />
      {/* Modals */}
      <OfferModal
        isOpen={showOfferModal}
        onClose={() => setShowOfferModal(false)}
        partnership={activePartnership}
        onSuccess={() => refresh()}
      />

      <ShipmentModal
        isOpen={showShipmentModal}
        onClose={() => setShowShipmentModal(false)}
        creator={activeCreator}
        partnership={activePartnership}
        onSuccess={() => refresh()}
      />

      <ContentPromptModal
        isOpen={showContentPromptModal}
        onClose={() => setShowContentPromptModal(false)}
        actionType={contentPromptAction}
        contentId={activeContentId}
        initialValue={initialContentValue}
        onSuccess={() => refresh()}
      />
    </div>
  );
}
