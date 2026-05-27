import { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Table, Thead, Tbody, Tr, Th, Td } from '../components/ui/Table';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ScoreBadge } from '../components/ui/ScoreBadge';
import { Search, ArrowLeft } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { getAllCreators, reviewLead } from '../lib/api';
import type { Creator } from '../types';
import { LoadingState } from '../components/ui/LoadingState';
import { Check, X, Instagram, Youtube, Activity } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { OutreachPreviewModal } from '../components/ui/OutreachPreviewModal';

const getFollowers = (c: Creator): number => {
  if (typeof c.followers_count === 'number') return c.followers_count;
  const fromProfiles = c.profiles?.map(p => p.followers || 0) ?? [];
  return fromProfiles.length ? Math.max(...fromProfiles) : 0;
};

const getEngagement = (c: Creator): number => {
  if (typeof c.engagement_rate === 'number') return c.engagement_rate;
  const fromProfiles = c.profiles?.map(p => p.engagement_rate || 0) ?? [];
  return fromProfiles.length ? Math.max(...fromProfiles) : 0;
};

const formatFollowers = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return String(n);
};

const FILTERS_STORAGE_KEY = 'creators-filters-v1';

type StoredFilters = {
  search?: string;
  statusFilter?: string;
  followersFilter?: string;
  engagementFilter?: string;
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

export default function Creators() {
  const { user } = useAuth();
  const location = useLocation();
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [outreachModalCreatorId, setOutreachModalCreatorId] = useState<string | null>(null);

  const [search, setSearch] = useState(() => loadStoredFilters().search || '');
  const [statusFilter, setStatusFilter] = useState(() => loadStoredFilters().statusFilter || '');
  const [followersFilter, setFollowersFilter] = useState(() => loadStoredFilters().followersFilter || '');
  const [engagementFilter, setEngagementFilter] = useState(() => loadStoredFilters().engagementFilter || '');
  const [sortBy, setSortBy] = useState(() => loadStoredFilters().sortBy || 'followers_desc');

  const fetchCreators = () => {
    setLoading(true);
    getAllCreators()
      .then(data => setCreators(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCreators();
  }, []);

  // Sync passed location filters from dashboard
  useEffect(() => {
    if (location.state?.initialStatusFilter) {
      setStatusFilter(location.state.initialStatusFilter);
    }
  }, [location.state]);

  // Persist filter/sort selections across navigation within the session
  useEffect(() => {
    try {
      sessionStorage.setItem(
        FILTERS_STORAGE_KEY,
        JSON.stringify({ search, statusFilter, followersFilter, engagementFilter, sortBy })
      );
    } catch {
      // ignore storage errors (quota / disabled)
    }
  }, [search, statusFilter, followersFilter, engagementFilter, sortBy]);

  const handleReview = async (id: string, action: 'approve' | 'reject' | 'shortlist') => {
    setActionLoading(id);
    try {
      await reviewLead(id, action);
      fetchCreators();
    } catch (err) {
      alert('Failed to update creator: ' + err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmApprove = async (customSubject?: string, customBody?: string) => {
    if (!outreachModalCreatorId) return;
    try {
      await reviewLead(outreachModalCreatorId, 'approve', customSubject, customBody);
      fetchCreators();
    } catch (err) {
      alert('Failed to approve lead and send outreach.');
      throw err;
    }
  };

  const filteredCreators = creators.filter(c => {
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

    if (!matchesFollowers || !matchesEngagement) return false;

    // Handle specific status filters
    if (statusFilter === 'hold') {
      return matchesSearch && (c.review_status === 'hold' || !c.review_status || c.review_status === 'pending') && c.lifecycle_status !== 'not_respond';
    }

    if (statusFilter === 'pending') {
      return matchesSearch && (c.review_status === 'pending_review' || c.review_status === 'shortlisted') && c.lifecycle_status !== 'not_respond';
    }

    if (statusFilter === 'not_respond') {
      return matchesSearch && c.lifecycle_status === 'not_respond';
    }

    if (statusFilter === 'contacted') {
      return matchesSearch && (c.lifecycle_status === 'contacted' || c.latest_outreach?.delivery_status === 'sent');
    }

    if (statusFilter === 'failed') {
      return matchesSearch && (c.lifecycle_status === 'failed' || c.latest_outreach?.delivery_status === 'failed');
    }

    // Default: If a status filter is selected, match it. If not, show all that match search.
    if (!statusFilter) return matchesSearch;

    return matchesSearch && c.review_status === statusFilter;
  });

  const sortedCreators = [...filteredCreators];
  switch (sortBy) {
    case 'followers_desc':  sortedCreators.sort((a, b) => getFollowers(b) - getFollowers(a)); break;
    case 'followers_asc':   sortedCreators.sort((a, b) => getFollowers(a) - getFollowers(b)); break;
    case 'engagement_desc': sortedCreators.sort((a, b) => getEngagement(b) - getEngagement(a)); break;
    case 'engagement_asc':  sortedCreators.sort((a, b) => getEngagement(a) - getEngagement(b)); break;
    case 'relevance_desc':  sortedCreators.sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0)); break;
    case 'readiness_desc':  sortedCreators.sort((a, b) => (b.outreach_readiness_score || 0) - (a.outreach_readiness_score || 0)); break;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-[fadeIn_0.3s_ease]">
      {location.state?.initialStatusFilter && (
        <Link to="/dashboard" className="inline-flex items-center text-[10px] font-normal text-gray-400 hover:text-primary-600 transition-colors group tracking-widest uppercase mb-1">
          <ArrowLeft size={14} className="mr-1 group-hover:-translate-x-1 transition-transform" /> BACK TO DASHBOARD
        </Link>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-normal text-gray-900 font-outfit uppercase tracking-tight">Global Creator Directory</h1>
        </div>
      </div>

      <Card>
        <div className="p-6 border-b border-gray-100 bg-gray-50/30 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="relative flex-1 sm:max-w-md">
              <Search className="absolute left-4 top-3.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search global identities..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-xl text-sm font-normal text-gray-900 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all shadow-sm"
              />
            </div>
            <div className="text-sm text-gray-500 font-normal sm:ml-auto">
              {filteredCreators.length} records found
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-white border border-gray-200 text-gray-700 text-sm rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-primary-500 min-w-[150px]"
            >
              <option value="">Any Status</option>
              <option value="hold">Discovered</option>
              <option value="pending">Shortlisted</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="not_respond">Not Responsive</option>
            </select>

            <select
              value={followersFilter}
              onChange={e => setFollowersFilter(e.target.value)}
              className="bg-white border border-gray-200 text-gray-700 text-sm rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-primary-500 min-w-[150px]"
            >
              <option value="">Any Followers</option>
              <option value="<10k">&lt; 10K</option>
              <option value="10k-100k">10K – 100K</option>
              <option value="100k-1m">100K – 1M</option>
              <option value="1m+">1M+</option>
            </select>

            <select
              value={engagementFilter}
              onChange={e => setEngagementFilter(e.target.value)}
              className="bg-white border border-gray-200 text-gray-700 text-sm rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-primary-500 min-w-[150px]"
            >
              <option value="">Any Engagement</option>
              <option value="<1">&lt; 1%</option>
              <option value="1-3">1 – 3%</option>
              <option value="3-6">3 – 6%</option>
              <option value="6+">6%+</option>
            </select>

            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="bg-white border border-gray-200 text-gray-700 text-sm rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-primary-500 min-w-[200px] sm:ml-auto"
            >
              <option value="followers_desc">Sort: Followers (High→Low)</option>
              <option value="followers_asc">Sort: Followers (Low→High)</option>
              <option value="engagement_desc">Sort: Engagement (High→Low)</option>
              <option value="engagement_asc">Sort: Engagement (Low→High)</option>
              <option value="relevance_desc">Sort: Relevance (High→Low)</option>
              <option value="readiness_desc">Sort: Readiness (High→Low)</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="py-20">
            <LoadingState message="Scouring Creator Database..." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <Thead>
                <Tr>
                  <Th>Creator Details</Th>
                  <Th>Category</Th>
                  <Th className="text-center">Followers</Th>
                  <Th className="text-center">Engagement</Th>
                  <Th className="text-center">Relevance</Th>
                  <Th className="text-center">Readiness</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {sortedCreators.map(c => (
                  <Tr key={c.id}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex flex-shrink-0 items-center justify-center font-normal text-sm uppercase ring-2 ring-white shadow-sm">
                          {(c.full_name || c.handle)?.charAt(0)}
                        </div>
                        <div>
                          <Link to={`/creators/${c.id}`} className="font-normal text-gray-900 hover:text-primary-600 transition-colors text-sm uppercase tracking-tight font-outfit">
                            {c.full_name || `@${c.handle}`}
                          </Link>
                          <div className="flex gap-2 mt-1.5">
                            {c.has_instagram && (
                              <a 
                                href={c.profiles?.find(p => p.platform.toLowerCase() === 'instagram')?.profile_url || `https://instagram.com/${c.handle?.replace(/^@/, '')}`} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="text-[#E1306C] hover:scale-110 transition-transform"
                                title="Instagram"
                              >
                                <Instagram size={14} />
                              </a>
                            )}
                            {c.has_youtube && (
                              <a 
                                href={c.profiles?.find(p => p.platform.toLowerCase() === 'youtube')?.profile_url || `https://youtube.com/@${c.handle?.replace(/^@/, '')}`} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="text-[#FF0000] hover:scale-110 transition-transform"
                                title="YouTube"
                              >
                                <Youtube size={14} />
                              </a>
                            )}
                            {c.has_tiktok && (
                              <a 
                                href={c.profiles?.find(p => p.platform.toLowerCase() === 'tiktok')?.profile_url || `https://tiktok.com/@${c.handle?.replace(/^@/, '')}`} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="text-gray-900 hover:scale-110 transition-transform"
                                title="TikTok"
                              >
                                <Activity size={14} />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <div className="flex gap-1 flex-wrap max-w-[150px]">
                        {c.category?.split(',').slice(0, 2).map((cat, i) => (
                           <span key={i} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-normal uppercase tracking-wider">{cat.trim().substring(0,10)}</span>
                        ))}
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
                        return <span className="text-sm text-gray-700 font-normal">{e > 0 ? `${e.toFixed(1)}%` : '—'}</span>;
                      })()}
                    </Td>
                    <Td className="text-center">
                      <ScoreBadge score={c.relevance_score || 0} />
                    </Td>
                    <Td className="text-center">
                      <ScoreBadge score={c.outreach_readiness_score || 0} />
                    </Td>
                    <Td><StatusBadge status={['not_respond'].includes(c.lifecycle_status || '') ? c.lifecycle_status : (c.review_status as any || 'pending')} /></Td>
                    <Td className="text-right">
                      {['super_admin', 'admin', 'operator', 'client_admin', 'client_marketing'].includes(user?.role || '') && (
                        <div className="flex justify-end gap-2">
                          {c.review_status !== 'approved' && c.review_status !== 'rejected' && c.review_status !== 'shortlisted' && c.review_status !== 'pending_review' && c.lifecycle_status !== 'not_respond' && (
                            <>
                              <button
                                onClick={() => setOutreachModalCreatorId(c.id)}
                                disabled={!!actionLoading}
                                className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                                title="Approve & Send Outreach"
                              >
                                <Check size={16} />
                              </button>
                              <button
                                onClick={() => handleReview(c.id, 'reject')}
                                disabled={!!actionLoading}
                                className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                title="Reject"
                              >
                                <X size={16} />
                              </button>
                              {c.review_status !== 'shortlisted' && c.review_status !== 'pending_review' && (
                                <button
                                  onClick={() => handleReview(c.id, 'shortlist')}
                                  disabled={!!actionLoading}
                                  className="px-2.5 py-1 rounded text-[11px] font-normal uppercase tracking-wider bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors font-outfit"
                                  title="Shortlist → Move to Review Queue"
                                >
                                  Shortlist
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </Td>
                  </Tr>
                ))}
                {sortedCreators.length === 0 && (
                  <Tr>
                    <Td colSpan={9} className="text-center py-16 text-gray-500">
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
        )}
      </Card>

      <OutreachPreviewModal
        creatorId={outreachModalCreatorId || ''}
        campaignId={creators.find(c => c.id === outreachModalCreatorId)?.campaign_id || undefined}
        isOpen={!!outreachModalCreatorId}
        onClose={() => setOutreachModalCreatorId(null)}
        onSend={handleConfirmApprove}
      />
    </div>
  );
}
