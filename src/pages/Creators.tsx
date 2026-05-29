import { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Table, Thead, Tbody, Tr, Th, Td } from '../components/ui/Table';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Search, ArrowLeft, ChevronDown } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { getAllCreators, getCampaigns, reviewLead } from '../lib/api';
import type { Creator } from '../types';
import { LoadingState } from '../components/ui/LoadingState';
import { Check, X, Instagram, Youtube, Activity, Star } from 'lucide-react';
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

const hasPublicProfileSignal = (c: Creator): boolean => {
  const hasProfileMetrics = c.profiles?.some(profile =>
    (profile.followers || 0) > 0 ||
    (profile.avg_likes || 0) > 0 ||
    (profile.avg_comments || 0) > 0 ||
    (profile.engagement_rate || 0) > 0
  );

  return Boolean(
    c.bio?.trim() ||
    getFollowers(c) > 0 ||
    (c.avg_likes || 0) > 0 ||
    (c.avg_comments || 0) > 0 ||
    getEngagement(c) > 0 ||
    hasProfileMetrics
  );
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

export default function Creators() {
  const { user } = useAuth();
  const location = useLocation();
  const [creators, setCreators] = useState<Creator[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setActionLoading] = useState<string | null>(null);
  const [outreachModalCreatorId, setOutreachModalCreatorId] = useState<string | null>(null);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);

  const [search, setSearch] = useState(() => loadStoredFilters().search || '');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(() => loadStoredFilters().selectedStatuses || []);
  const [followersFilter, setFollowersFilter] = useState(() => loadStoredFilters().followersFilter || '');
  const [engagementFilter, setEngagementFilter] = useState(() => loadStoredFilters().engagementFilter || '');
  const [campaignFilter, setCampaignFilter] = useState(() => loadStoredFilters().campaignFilter || '');
  const [sortBy, setSortBy] = useState(() => loadStoredFilters().sortBy || 'followers_desc');

  const fetchCreators = () => {
    setLoading(true);
    Promise.all([getAllCreators(), getCampaigns()])
      .then(([creatorsData, campaignsData]) => {
        setCreators(creatorsData);
        setCampaigns(campaignsData.map(c => ({ id: c.id, name: c.name })));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
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

  const handleReview = async (id: string, action: 'approve' | 'reject' | 'shortlist' | 'revoke') => {
    setActionLoading(id);
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
    if (!hasPublicProfileSignal(c)) return false;

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

    // Check if the creator matches any of the selected statuses
    return matchesSearch && selectedStatuses.some(statusFilter => {
      if (statusFilter === 'hold') {
        return (c.review_status === 'hold' || !c.review_status || c.review_status === 'pending') && c.lifecycle_status !== 'not_respond';
      }

      if (statusFilter === 'pending') {
        return (c.review_status === 'pending_review' || c.review_status === 'shortlisted') && c.lifecycle_status !== 'not_respond';
      }

      if (statusFilter === 'not_respond') {
        return c.lifecycle_status === 'not_respond';
      }

      if (statusFilter === 'contacted') {
        return c.lifecycle_status === 'contacted' || c.latest_outreach?.delivery_status === 'sent';
      }

      if (statusFilter === 'failed') {
        return c.lifecycle_status === 'failed' || c.latest_outreach?.delivery_status === 'failed';
      }

      return c.review_status === statusFilter;
    });
  });

  const sortedCreators = [...filteredCreators];
  switch (sortBy) {
    case 'followers_desc':  sortedCreators.sort((a, b) => getFollowers(b) - getFollowers(a)); break;
    case 'followers_asc':   sortedCreators.sort((a, b) => getFollowers(a) - getFollowers(b)); break;
    case 'engagement_desc': sortedCreators.sort((a, b) => getEngagement(b) - getEngagement(a)); break;
    case 'engagement_asc':  sortedCreators.sort((a, b) => getEngagement(a) - getEngagement(b)); break;
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
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                className="bg-white border border-gray-200 text-gray-700 text-sm rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-primary-500 min-w-[150px] flex items-center justify-between shadow-sm hover:bg-gray-50"
              >
                <span>
                  {selectedStatuses.length === 0 
                    ? 'Any Status' 
                    : `${selectedStatuses.length} Selected`}
                </span>
                <ChevronDown size={14} className="text-gray-400 ml-2" />
              </button>

              {isFilterDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setIsFilterDropdownOpen(false)}
                  />
                  <div className="absolute left-0 mt-2 w-56 bg-white border border-gray-150 rounded-xl shadow-xl z-20 py-1.5 animate-[fadeIn_0.15s_ease]">
                    {[
                      { id: 'hold', label: 'Discovered' },
                      { id: 'pending', label: 'Shortlisted' },
                      { id: 'approved', label: 'Approved' },
                      { id: 'rejected', label: 'Rejected' },
                      { id: 'not_respond', label: 'Not Responsive' }
                    ].map(item => {
                      const isChecked = selectedStatuses.includes(item.id);
                      return (
                        <label 
                          key={item.id} 
                          className="flex items-center gap-3 px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 cursor-pointer select-none"
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
              value={campaignFilter}
              onChange={e => setCampaignFilter(e.target.value)}
              className="bg-white border border-gray-200 text-gray-700 text-sm rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-primary-500 min-w-[210px]"
            >
              <option value="">Any Campaign</option>
              {campaigns.map(campaign => (
                <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
              ))}
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
                  <Th className="text-center">Followers</Th>
                  <Th className="text-center">Engagement</Th>
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
                        return <span className="text-sm text-gray-700 font-normal">{e > 0 ? `${e.toFixed(1)}%` : '—'}</span>;
                      })()}
                    </Td>
                    <Td><StatusBadge status={['not_respond'].includes(c.lifecycle_status || '') ? c.lifecycle_status : (c.review_status as any || 'pending')} /></Td>
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
                          {c.review_status !== 'approved' && c.review_status !== 'rejected' && c.review_status !== 'shortlisted' && c.review_status !== 'pending_review' && c.lifecycle_status !== 'not_respond' && (
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
                              {c.review_status !== 'shortlisted' && c.review_status !== 'pending_review' && (
                                <button
                                  onClick={() => handleReview(c.id, 'shortlist')}
                                  className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                                  title="Shortlist → Move to Review Queue"
                                >
                                  <Star size={16} />
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
                    <Td colSpan={5} className="text-center py-16 text-gray-500">
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
