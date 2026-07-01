import { dismissOverlay } from '../../lib/a11y';
import { hasRole, ROLE_GROUPS } from '../../lib/constants';
import React, { useState, useEffect } from 'react';
import {
  ChevronDown,
  Loader2,
  Activity,
  Sparkles,
  Check,
  X,
  Star,
  Instagram,
  Youtube,
} from 'lucide-react';
import { Table, Thead, Tbody, Tr, Th, Td } from '../ui/Table';
import { StatusBadge } from '../ui/StatusBadge';
import { Pagination } from '../ui/Pagination';
import { Creator } from '../../types';
import { CreatorAvatar } from '../creators/CreatorIdentity';
import { matchesStatusFilter } from '../../lib/creatorFilters';
import { hasPublicProfileSignal, getFollowers, getEngagement } from '../../lib/creatorFilters';
import { getPlatformHandle, getErRating, formatFollowers } from '../../lib/formatters';

interface CampaignLeadsTableProps {
  leads: Creator[];
  userRole: string;
  discovering: boolean;
  discoveredOrder: string[];
  syncingLeads: boolean;
  handleSyncCampaignCreators: () => void;
  handleReview: (id: string, action: 'approve' | 'reject' | 'shortlist' | 'revoke') => void;
  setPreviewCreator: (creator: Creator) => void;
  setIsPreviewOpen: (isOpen: boolean) => void;
  selectedStatuses: string[];
  setSelectedStatuses: React.Dispatch<React.SetStateAction<string[]>>;
}

const LEADS_PER_PAGE = 50;

export function CampaignLeadsTable({
  leads,
  userRole,
  discovering,
  discoveredOrder,
  syncingLeads,
  handleSyncCampaignCreators,
  handleReview,
  setPreviewCreator,
  setIsPreviewOpen,
  selectedStatuses,
  setSelectedStatuses,
}: CampaignLeadsTableProps) {
  const [sortBy, setSortBy] = useState(() => {
    try {
      return sessionStorage.getItem('campaign-leads-sort-v1') || 'followers_desc';
    } catch {
      return 'followers_desc';
    }
  });
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    try {
      sessionStorage.setItem('campaign-leads-sort-v1', sortBy);
    } catch {
      /* ignore */
    }
  }, [sortBy]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedStatuses, sortBy]);

  const filteredLeads = leads.filter((c) => {
    if (!hasPublicProfileSignal(c)) return false;
    if (getFollowers(c) < 1000 && !discoveredOrder.includes(c.id)) return false;

    if (selectedStatuses.length > 0) {
      return selectedStatuses.some((s) => matchesStatusFilter(c, s));
    }
    return true;
  });

  const sortedLeads = [...filteredLeads];
  switch (sortBy) {
    case 'followers_desc':
      sortedLeads.sort((a, b) => getFollowers(b) - getFollowers(a));
      break;
    case 'followers_asc':
      sortedLeads.sort((a, b) => getFollowers(a) - getFollowers(b));
      break;
    case 'engagement_desc':
      sortedLeads.sort((a, b) => getEngagement(b) - getEngagement(a));
      break;
    case 'engagement_asc':
      sortedLeads.sort((a, b) => getEngagement(a) - getEngagement(b));
      break;
  }

  const displayLeads =
    discovering && discoveredOrder.length > 0
      ? [...filteredLeads].sort((a, b) => {
          const ia = discoveredOrder.indexOf(a.id);
          const ib = discoveredOrder.indexOf(b.id);
          if (ia === -1 && ib === -1) return 0;
          if (ia === -1) return 1;
          if (ib === -1) return -1;
          return ia - ib;
        })
      : sortedLeads;

  const leadsPageStart =
    (Math.min(currentPage, Math.max(1, Math.ceil(displayLeads.length / LEADS_PER_PAGE))) - 1) *
    LEADS_PER_PAGE;
  const pagedLeads = displayLeads.slice(leadsPageStart, leadsPageStart + LEADS_PER_PAGE);

  return (
    <>
      <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white">
        <h2 className="text-lg font-normal text-gray-900 font-outfit uppercase tracking-tight">
          Creators Leads ({filteredLeads.length})
        </h2>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-white border border-gray-200 text-gray-700 text-xs uppercase tracking-wider rounded-lg py-1.5 px-3 focus:outline-none focus:ring-1 focus:ring-primary-500 min-w-[150px]"
          >
            <option value="followers_desc">Sort: Followers (High→Low)</option>
            <option value="followers_asc">Sort: Followers (Low→High)</option>
            <option value="engagement_desc">Sort: Engagement (High→Low)</option>
            <option value="engagement_asc">Sort: Engagement (Low→High)</option>
          </select>
          <div className="relative">
            <button
              onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
              className="w-full sm:w-auto inline-flex items-center justify-between gap-2 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-normal hover:bg-gray-50 transition-all outline-none min-w-[140px]"
            >
              <span className="text-xs uppercase tracking-wider">
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
                  {...dismissOverlay(() => setIsFilterDropdownOpen(false))}
                />
                <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-20 py-1.5 animate-[fadeIn_0.15s_ease]">
                  {[
                    { id: 'hold', label: 'Discovered' },
                    { id: 'pending', label: 'Shortlisted' },
                    { id: 'approved', label: 'Approved' },
                    { id: 'contacted', label: 'Contacted' },
                    { id: 'engaged', label: 'Engaged' },
                    { id: 'rejected', label: 'Rejected' },
                    { id: 'not_respond', label: 'Not Responsive' },
                  ].map((item) => {
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
                            setSelectedStatuses((prev) =>
                              isChecked ? prev.filter((s) => s !== item.id) : [...prev, item.id],
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

          <button
            onClick={handleSyncCampaignCreators}
            disabled={syncingLeads || leads.length === 0}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed text-indigo-700 border border-indigo-100 rounded-lg text-xs font-normal uppercase tracking-wider transition-all outline-none"
          >
            {syncingLeads ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Syncing...</span>
              </>
            ) : (
              <>
                <Activity size={14} />
                <span>Sync All Creators</span>
              </>
            )}
          </button>
        </div>
      </div>

      {filteredLeads.length === 0 ? (
        discovering ? (
          <div className="p-16 text-center">
            <div className="relative w-16 h-16 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full border-2 border-primary-100 border-t-primary-500 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center text-primary-500">
                <Sparkles size={26} className="animate-pulse" />
              </div>
            </div>
            <h3 className="text-lg font-normal text-gray-900 uppercase tracking-widest font-outfit">
              Search in progress 🕵️
            </h3>
            <p className="text-gray-500 mt-1 max-w-sm mx-auto">
              Our AI is combing the internet for the perfect creators. Hang tight — the first finds
              will pop in right here any moment. Grab a coffee ☕
            </p>
          </div>
        ) : (
          <div className="p-16 text-center">
            <div className="w-16 h-16 bg-primary-50 text-primary-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles size={32} />
            </div>
            <h3 className="text-lg font-normal text-gray-900 uppercase tracking-widest font-outfit">
              No leads found yet
            </h3>
            <p className="text-gray-500 mt-1 max-w-sm mx-auto">
              Trigger the AI Discovery engine to automatically scrape, score, and qualify
              influencers matching this campaign's target profile.
            </p>
          </div>
        )
      ) : (
        <Table>
          <Thead>
            <Tr>
              <Th>Creator</Th>
              <Th className="text-center">Followers</Th>
              <Th className="text-center">Engagement</Th>
              <Th>Review Status</Th>
              <Th className="text-right">Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {pagedLeads.map((lead) => (
              <Tr key={lead.id}>
                <Td>
                  <div className="flex items-center gap-3">
                    <CreatorAvatar
                      creator={lead}
                      className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 text-xs"
                    />
                    <div className="min-w-0">
                      <button
                        onClick={() => {
                          setPreviewCreator(lead);
                          setIsPreviewOpen(true);
                        }}
                        className="font-normal text-gray-900 hover:text-primary-600 transition-colors text-left text-xs uppercase tracking-tight font-outfit leading-tight line-clamp-2 whitespace-normal break-words max-w-[140px]"
                      >
                        {lead.full_name || `@${lead.handle}`}
                      </button>
                      <div className="flex items-center gap-2 mt-1.5">
                        {(lead.primary_platform?.toLowerCase() === 'instagram' ||
                          lead.has_instagram) && (
                          <a
                            href={
                              lead.profiles?.find((p) => p.platform.toLowerCase() === 'instagram')
                                ?.profile_url ||
                              `https://instagram.com/${lead.handle?.replace(/^@/, '')}`
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[#E1306C] hover:scale-[1.02] transition-transform"
                            title="Instagram"
                          >
                            <Instagram size={14} />
                            <span className="text-[11px] text-gray-500 normal-case tracking-normal">
                              @{getPlatformHandle(lead, 'instagram')}
                            </span>
                          </a>
                        )}
                        {(lead.primary_platform?.toLowerCase() === 'youtube' ||
                          lead.has_youtube) && (
                          <a
                            href={
                              lead.profiles?.find((p) => p.platform.toLowerCase() === 'youtube')
                                ?.profile_url ||
                              `https://youtube.com/@${lead.handle?.replace(/^@/, '')}`
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[#FF0000] hover:scale-[1.02] transition-transform"
                            title="YouTube"
                          >
                            <Youtube size={14} />
                            <span className="text-[11px] text-gray-500 normal-case tracking-normal">
                              @{getPlatformHandle(lead, 'youtube')}
                            </span>
                          </a>
                        )}
                        {(lead.primary_platform?.toLowerCase() === 'tiktok' || lead.has_tiktok) && (
                          <a
                            href={
                              lead.profiles?.find((p) => p.platform.toLowerCase() === 'tiktok')
                                ?.profile_url ||
                              `https://tiktok.com/@${lead.handle?.replace(/^@/, '')}`
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-gray-900 hover:scale-[1.02] transition-transform"
                            title="TikTok"
                          >
                            <Activity size={14} />
                            <span className="text-[11px] text-gray-500 normal-case tracking-normal">
                              @{getPlatformHandle(lead, 'tiktok')}
                            </span>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </Td>
                <Td className="text-center">
                  {(() => {
                    const followers = getFollowers(lead);
                    return (
                      <span className="text-sm text-gray-700 font-normal">
                        {followers > 0 ? formatFollowers(followers) : '—'}
                      </span>
                    );
                  })()}
                </Td>
                <Td className="text-center">
                  {(() => {
                    const engagement = getEngagement(lead);
                    const followers = getFollowers(lead);
                    const rating = getErRating(followers, engagement);
                    return (
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-sm text-gray-700 font-normal">
                          {engagement > 0 ? `${engagement.toFixed(1)}%` : '—'}
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
                      [
                        'contacted',
                        'replied',
                        'engaged',
                        'qualified',
                        'converted',
                        'not_respond',
                      ].includes(lead.lifecycle_status || '')
                        ? lead.lifecycle_status
                        : (lead.review_status as any) || 'pending'
                    }
                  />
                </Td>
                <Td className="text-right">
                  {hasRole(userRole, ROLE_GROUPS.MANAGE_CREATORS) && (
                    <div className="flex items-center justify-end gap-2">
                      {lead.review_status === 'rejected' && (
                        <button
                          onClick={() => handleReview(lead.id, 'revoke')}
                          className="px-2.5 py-1 rounded text-[11px] font-normal uppercase tracking-wider bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors font-outfit"
                          title="Revoke Rejection"
                        >
                          Revoke
                        </button>
                      )}
                      {lead.review_status !== 'approved' &&
                        lead.review_status !== 'rejected' &&
                        lead.lifecycle_status !== 'not_respond' && (
                          <>
                            <button
                              onClick={() => handleReview(lead.id, 'approve')}
                              className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                              title="Approve & Send Outreach"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              onClick={() => handleReview(lead.id, 'reject')}
                              className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                              title="Reject"
                            >
                              <X size={16} />
                            </button>
                            <button
                              onClick={() =>
                                handleReview(
                                  lead.id,
                                  lead.review_status === 'shortlisted' ||
                                    lead.review_status === 'pending_review'
                                    ? 'revoke'
                                    : 'shortlist',
                                )
                              }
                              className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                              title={
                                lead.review_status === 'shortlisted' ||
                                lead.review_status === 'pending_review'
                                  ? 'Remove from Shortlist'
                                  : 'Shortlist → Move to Review Queue'
                              }
                            >
                              <Star
                                size={16}
                                fill={
                                  lead.review_status === 'shortlisted' ||
                                  lead.review_status === 'pending_review'
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
          </Tbody>
        </Table>
      )}
      <Pagination
        currentPage={currentPage}
        totalItems={displayLeads.length}
        pageSize={LEADS_PER_PAGE}
        onPageChange={setCurrentPage}
      />
    </>
  );
}
