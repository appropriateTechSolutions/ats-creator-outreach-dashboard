import { dismissOverlay } from '../../lib/a11y';
import React, { useState } from 'react';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import { MultiSelect } from '../ui/DropdownMenu';
import type { Campaign } from '../../types';

// Shared by the desktop status filter (MultiSelect) and the mobile filter sheet
// so the two never drift.
export const STATUS_FILTER_OPTIONS = [
  { id: 'hold', label: 'Discovered' },
  { id: 'pending', label: 'Shortlisted' },
  { id: 'approved', label: 'Approved' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'engaged', label: 'Engaged' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'not_respond', label: 'Not Responsive' },
];

interface CreatorsFilterGridProps {
  onlyEngaged: boolean;
  selectedStatuses: string[];
  toggleStatus: (id: string) => void;
  followersFilter: string;
  setFollowersFilter: React.Dispatch<React.SetStateAction<string>>;
  engagementFilter: string;
  setEngagementFilter: React.Dispatch<React.SetStateAction<string>>;
  campaignFilter: string;
  setCampaignFilter: React.Dispatch<React.SetStateAction<string>>;
  campaigns: Campaign[];
  sortBy: string;
  setSortBy: React.Dispatch<React.SetStateAction<string>>;
}

/** The collapsible desktop filter grid (rendered when the Filters toggle is on). */
export function CreatorsFilterGrid({
  onlyEngaged,
  selectedStatuses,
  toggleStatus,
  followersFilter,
  setFollowersFilter,
  engagementFilter,
  setEngagementFilter,
  campaignFilter,
  setCampaignFilter,
  campaigns,
  sortBy,
  setSortBy,
}: CreatorsFilterGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 pt-5 border-t border-gray-100 animate-[fadeIn_0.2s_ease]">
      {/* Status Dropdown */}
      {!onlyEngaged && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            Status
          </span>
          <MultiSelect
            ariaLabel="Filter by status"
            placeholder="All Statuses"
            options={STATUS_FILTER_OPTIONS}
            selected={selectedStatuses}
            onToggle={toggleStatus}
          />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="creatorsfilters-1"
          className="text-[10px] font-bold text-gray-400 uppercase tracking-wider"
        >
          Followers
        </label>
        <select
          id="creatorsfilters-1"
          value={followersFilter}
          onChange={(e) => setFollowersFilter(e.target.value)}
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
        <label
          htmlFor="creatorsfilters-2"
          className="text-[10px] font-bold text-gray-400 uppercase tracking-wider"
        >
          Engagement
        </label>
        <select
          id="creatorsfilters-2"
          value={engagementFilter}
          onChange={(e) => setEngagementFilter(e.target.value)}
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
        <label
          htmlFor="creatorsfilters-3"
          className="text-[10px] font-bold text-gray-400 uppercase tracking-wider"
        >
          Campaign
        </label>
        <select
          id="creatorsfilters-3"
          value={campaignFilter}
          onChange={(e) => setCampaignFilter(e.target.value)}
          className="w-full bg-white border border-gray-200 text-gray-700 text-xs font-normal uppercase tracking-tight rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-primary-500 font-outfit truncate"
        >
          <option value="">All Campaigns</option>
          {campaigns.map((campaign) => (
            <option key={campaign.id} value={campaign.id}>
              {campaign.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="creatorsfilters-4"
          className="text-[10px] font-bold text-gray-400 uppercase tracking-wider"
        >
          Sort
        </label>
        <select
          id="creatorsfilters-4"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="w-full bg-white border border-gray-200 text-gray-700 text-xs font-normal uppercase tracking-tight rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-primary-500 font-outfit"
        >
          <option value="followers_desc">Followers (High→Low)</option>
          <option value="followers_asc">Followers (Low→High)</option>
          <option value="engagement_desc">Engagement (High→Low)</option>
          <option value="engagement_asc">Engagement (Low→High)</option>
        </select>
      </div>
    </div>
  );
}

interface MobileFiltersSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onlyEngaged: boolean;
  selectedStatuses: string[];
  setSelectedStatuses: React.Dispatch<React.SetStateAction<string[]>>;
  followersFilter: string;
  setFollowersFilter: React.Dispatch<React.SetStateAction<string>>;
  engagementFilter: string;
  setEngagementFilter: React.Dispatch<React.SetStateAction<string>>;
  campaignFilter: string;
  setCampaignFilter: React.Dispatch<React.SetStateAction<string>>;
  campaigns: Campaign[];
  sortBy: string;
  setSortBy: React.Dispatch<React.SetStateAction<string>>;
}

/** The mobile bottom-sheet variant of the creator filters. */
export function MobileFiltersSheet({
  isOpen,
  onClose,
  onlyEngaged,
  selectedStatuses,
  setSelectedStatuses,
  followersFilter,
  setFollowersFilter,
  engagementFilter,
  setEngagementFilter,
  campaignFilter,
  setCampaignFilter,
  campaigns,
  sortBy,
  setSortBy,
}: MobileFiltersSheetProps) {
  const [openMobileDropdown, setOpenMobileDropdown] = useState<
    'followers' | 'engagement' | 'campaign' | 'sort' | null
  >(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-end justify-center p-0">
      <div className="fixed inset-0" {...dismissOverlay(onClose)} />
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
        {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events -- click-away to close open dropdowns; not a control */}
        <div
          className="flex-1 overflow-y-auto p-6 space-y-6"
          onClick={() => setOpenMobileDropdown(null)}
        >
          {/* Status Section */}
          {!onlyEngaged && (
            <div className="space-y-2.5">
              <label
                htmlFor="creatorsfilters-2001"
                className="text-[10px] font-normal text-slate-400 block font-outfit uppercase tracking-widest"
              >
                Status
              </label>
              <div className="grid grid-cols-2 gap-2">
                {STATUS_FILTER_OPTIONS.map((item) => {
                  const isChecked = selectedStatuses.includes(item.id);
                  return (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => {
                        setSelectedStatuses((prev) =>
                          isChecked ? prev.filter((s) => s !== item.id) : [...prev, item.id],
                        );
                      }}
                      className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-xs text-left transition-all ${
                        isChecked
                          ? 'border-primary-500 bg-primary-50/30 text-primary-700 font-medium'
                          : 'border-slate-100 bg-slate-50/50 text-slate-700'
                      }`}
                    >
                      <input
                        id="creatorsfilters-2001"
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
            <span className="text-[10px] font-normal text-slate-400 block font-outfit uppercase tracking-widest">
              Followers
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpenMobileDropdown(openMobileDropdown === 'followers' ? null : 'followers');
              }}
              className="w-full flex items-center justify-between bg-slate-50/50 border border-slate-100 rounded-xl py-3 px-4 text-sm font-normal text-slate-900 text-left font-outfit"
            >
              <span>
                {followersFilter === ''
                  ? 'Any Followers'
                  : followersFilter === '<10k'
                    ? '< 10K'
                    : followersFilter === '10k-100k'
                      ? '10K – 100K'
                      : followersFilter === '100k-1m'
                        ? '100K – 1M'
                        : followersFilter === '1m+'
                          ? '1M+'
                          : 'Any Followers'}
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
                  { val: '1m+', label: '1M+' },
                ].map((opt) => (
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
            <span className="text-[10px] font-normal text-slate-400 block font-outfit uppercase tracking-widest">
              Engagement
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpenMobileDropdown(openMobileDropdown === 'engagement' ? null : 'engagement');
              }}
              className="w-full flex items-center justify-between bg-slate-50/50 border border-slate-100 rounded-xl py-3 px-4 text-sm font-normal text-slate-900 text-left font-outfit"
            >
              <span>
                {engagementFilter === ''
                  ? 'Any Engagement'
                  : engagementFilter === '<1'
                    ? '< 1%'
                    : engagementFilter === '1-3'
                      ? '1 – 3%'
                      : engagementFilter === '3-6'
                        ? '3 – 6%'
                        : engagementFilter === '6+'
                          ? '6%+'
                          : 'Any Engagement'}
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
                  { val: '6+', label: '6%+' },
                ].map((opt) => (
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
            <span className="text-[10px] font-normal text-slate-400 block font-outfit uppercase tracking-widest">
              Campaign
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpenMobileDropdown(openMobileDropdown === 'campaign' ? null : 'campaign');
              }}
              className="w-full flex items-center justify-between bg-slate-50/50 border border-slate-100 rounded-xl py-3 px-4 text-sm font-normal text-slate-900 text-left font-outfit"
            >
              <span>
                {campaignFilter === ''
                  ? 'Any Campaign'
                  : campaigns.find((camp) => camp.id === campaignFilter)?.name || 'Any Campaign'}
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
                {campaigns.map((camp) => (
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
            <span className="text-[10px] font-normal text-slate-400 block font-outfit uppercase tracking-widest">
              Sort By
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpenMobileDropdown(openMobileDropdown === 'sort' ? null : 'sort');
              }}
              className="w-full flex items-center justify-between bg-slate-50/50 border border-slate-100 rounded-xl py-3 px-4 text-sm font-normal text-slate-900 text-left font-outfit"
            >
              <span>
                {sortBy === 'followers_desc'
                  ? 'Followers (High→Low)'
                  : sortBy === 'followers_asc'
                    ? 'Followers (Low→High)'
                    : sortBy === 'engagement_desc'
                      ? 'Engagement (High→Low)'
                      : sortBy === 'engagement_asc'
                        ? 'Engagement (Low→High)'
                        : 'Followers (High→Low)'}
              </span>
              <ChevronDown size={16} className="text-gray-400" />
            </button>
            {openMobileDropdown === 'sort' && (
              <div className="absolute left-0 mt-1 w-full bg-white border border-gray-150 rounded-xl shadow-xl z-30 py-1.5 max-h-60 overflow-y-auto">
                {[
                  { val: 'followers_desc', label: 'Followers (High→Low)' },
                  { val: 'followers_asc', label: 'Followers (Low→High)' },
                  { val: 'engagement_desc', label: 'Engagement (High→Low)' },
                  { val: 'engagement_asc', label: 'Engagement (Low→High)' },
                ].map((opt) => (
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
            onClick={onClose}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white rounded-xl py-3 text-center text-xs font-normal uppercase tracking-widest font-outfit shadow-xl shadow-primary-500/20 transition-all active:scale-[0.98]"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}
