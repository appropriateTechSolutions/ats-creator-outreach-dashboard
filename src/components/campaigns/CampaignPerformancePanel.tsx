import React from 'react';
import { format } from 'date-fns';
import { Sparkles, Loader2, Mail, Check, Star, Activity } from 'lucide-react';
import { Button } from '../ui/Button';
import { Link } from 'react-router-dom';

interface CampaignPerformancePanelProps {
  activeTab: string;
  perfData: any;
  funnelData: any;
  activities: any[];
  recalculating: boolean;
  handleRecalculate: () => void;
}

export function CampaignPerformancePanel({
  activeTab,
  perfData,
  funnelData,
  activities,
  recalculating,
  handleRecalculate
}: CampaignPerformancePanelProps) {
  
  const formatFollowers = (count: number) => {
    if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
    if (count >= 1000) return (count / 1000).toFixed(1) + 'K';
    return count.toString();
  };

  if (activeTab === 'analytics') {
    return (
      <div className="p-6 space-y-8 bg-white rounded-b-[12px]">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-normal text-gray-900 font-outfit uppercase tracking-tight">Campaign Analytics</h2>
            <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">Aggregate views, engagement, costs, and conversion funnel</p>
          </div>
          <Button
            onClick={handleRecalculate}
            disabled={recalculating}
            className="bg-primary-600 hover:bg-primary-700 text-white font-normal uppercase tracking-widest text-[10px] h-10 px-4 self-stretch sm:self-auto"
            icon={recalculating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          >
            {recalculating ? 'Recalculating...' : 'Recalculate Performance'}
          </Button>
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-gray-50/50 rounded-xl border border-gray-100">
            <div className="text-[10px] font-normal text-gray-500 uppercase tracking-widest">Total Content</div>
            <div className="text-xl font-normal text-gray-900 font-outfit mt-1">{perfData?.total_content || 0}</div>
          </div>
          <div className="p-4 bg-gray-50/50 rounded-xl border border-gray-100">
            <div className="text-[10px] font-normal text-gray-500 uppercase tracking-widest">Published Content</div>
            <div className="text-xl font-normal text-gray-900 font-outfit mt-1">{perfData?.published_content || 0}</div>
          </div>
          <div className="p-4 bg-gray-50/50 rounded-xl border border-gray-100">
            <div className="text-[10px] font-normal text-gray-500 uppercase tracking-widest">Total Views</div>
            <div className="text-xl font-normal text-gray-900 font-outfit mt-1">{perfData?.total_views ? formatFollowers(perfData.total_views) : 0}</div>
          </div>
          <div className="p-4 bg-gray-50/50 rounded-xl border border-gray-100">
            <div className="text-[10px] font-normal text-gray-500 uppercase tracking-widest">Total Engagement</div>
            <div className="text-xl font-normal text-gray-900 font-outfit mt-1">{perfData?.total_engagement ? formatFollowers(perfData.total_engagement) : 0}</div>
          </div>
          <div className="p-4 bg-gray-50/50 rounded-xl border border-gray-100">
            <div className="text-[10px] font-normal text-gray-500 uppercase tracking-widest">Avg ER</div>
            <div className="text-xl font-normal text-gray-900 font-outfit mt-1">{perfData?.avg_engagement_rate || '0.00'}%</div>
          </div>
          <div className="p-4 bg-gray-50/50 rounded-xl border border-gray-100">
            <div className="text-[10px] font-normal text-gray-500 uppercase tracking-widest">Total Spend</div>
            <div className="text-xl font-normal text-gray-900 font-outfit mt-1">${perfData?.total_cost || 0}</div>
          </div>
          <div className="p-4 bg-gray-50/50 rounded-xl border border-gray-100">
            <div className="text-[10px] font-normal text-gray-500 uppercase tracking-widest">Total Revenue</div>
            <div className="text-xl font-normal text-gray-900 font-outfit mt-1">${perfData?.total_revenue || 0}</div>
          </div>
          <div className="p-4 bg-gray-50/50 rounded-xl border border-gray-100">
            <div className="text-[10px] font-normal text-gray-500 uppercase tracking-widest">ROI</div>
            <div className="text-xl font-normal text-gray-900 font-outfit mt-1">
              {perfData?.roi !== null && perfData?.roi !== undefined ? `${Number(perfData.roi).toFixed(2)}x` : 'N/A'}
            </div>
          </div>
        </div>

        {/* Conversion Funnel Section */}
        <div className="border-t border-gray-100 pt-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-900 mb-6">Campaign Conversion Funnel</h3>
          <div className="space-y-4 max-w-2xl">
            {[
              { key: 'identified', label: 'Identified Leads' },
              { key: 'shortlisted', label: 'Shortlisted' },
              { key: 'outreach_sent', label: 'Outreach Sent' },
              { key: 'engaged', label: 'Engaged' },
              { key: 'meeting_scheduled', label: 'Meetings Scheduled' },
              { key: 'qualified', label: 'Qualified' },
              { key: 'offer_sent', label: 'Offers Sent' },
              { key: 'accepted', label: 'Accepted Offers' },
              { key: 'activated', label: 'Activated Partnerships' },
              { key: 'product_shipped', label: 'Product Shipped' },
              { key: 'product_delivered', label: 'Product Delivered' },
              { key: 'content_published', label: 'Content Live' },
              { key: 'completed', label: 'Completed' },
            ].map((stage) => {
              const val = funnelData?.[stage.key] || 0;
              const pct = funnelData?.identified > 0 ? Math.round((val / funnelData.identified) * 100) : 0;
              return (
                <div key={stage.key} className="flex items-center gap-4">
                  <div className="w-44 text-xs font-normal text-gray-500 uppercase tracking-wider text-right">{stage.label}</div>
                  <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden relative">
                    <div
                      className="bg-primary-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="w-24 text-xs font-bold text-gray-900 font-mono">
                    {val} <span className="text-gray-400 font-normal text-[10px]">({pct}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'activity') {
    return (
      <div className="p-6 space-y-6 bg-white rounded-b-[12px]">
        <div>
          <h2 className="text-lg font-normal text-gray-900 font-outfit uppercase tracking-tight">Activity Timeline</h2>
          <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">Real-time log of creator outreach, approvals, shipments, and content updates</p>
        </div>

        {activities.length === 0 ? (
          <div className="text-center text-xs text-gray-500 py-12 italic">No activity recorded yet for this campaign.</div>
        ) : (
          <div className="relative border-l border-gray-150 ml-4 pl-6 space-y-6 mt-4">
            {activities.map((act) => {
              const timeStr = act.created_at || act.createdAt ? format(new Date(act.created_at || act.createdAt), 'MMM d, yyyy h:mm a') : 'N/A';

              const getActivityIcon = (type: string) => {
                switch (type) {
                  case 'outreach_sent':
                    return <Mail size={12} className="text-indigo-500" />;
                  case 'content_approved':
                  case 'offer_accepted':
                  case 'payment_paid':
                    return <Check size={12} className="text-emerald-500" />;
                  case 'creator_shortlisted':
                    return <Star size={12} className="text-blue-500" fill="currentColor" />;
                  case 'engaged':
                  case 'meeting_scheduled':
                    return <Activity size={12} className="text-amber-500" />;
                  default:
                    return <Sparkles size={12} className="text-purple-500" />;
                }
              };

              return (
                <div key={act.id} className="relative group">
                  <div className="absolute -left-[31px] top-1.5 w-6 h-6 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center transition-all group-hover:scale-110">
                    {getActivityIcon(act.activity_type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-gray-900 font-outfit uppercase tracking-wider">{act.title}</span>
                      <span className="text-[10px] text-gray-400 font-mono">{timeStr}</span>
                    </div>
                    {act.Creator && (
                      <div className="text-[11px] text-gray-500 uppercase tracking-widest mt-0.5">
                        Creator: <Link to={`/creators/${act.Creator.id}`} className="text-primary-600 hover:text-primary-700 font-medium">@{act.Creator.handle}</Link>
                      </div>
                    )}
                    {act.description && (
                      <p className="text-[11px] text-gray-600 mt-1 max-w-xl">{act.description}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return null;
}
