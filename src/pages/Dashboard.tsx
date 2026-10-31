import { clickable } from '../lib/a11y';
import { getRelativeTime } from '../lib/formatters';
import { hasRole, ROLE_GROUPS } from '../lib/constants';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KPICard } from '../components/ui/KPICard';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { InfoTip } from '../components/ui/InfoTip';
import { NeedsAttention } from '../components/dashboard/NeedsAttention';
import {
  Users,
  Mail,
  MessageSquare,
  Target,
  CheckCircle,
  Activity,
  Clock,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { LoadingState } from '../components/ui/LoadingState';
import { Select } from '../components/ui/Select';
import { useCampaigns, useAllCreators, useDashboardStats } from '../hooks/queries';
import { useAuth } from '../contexts/AuthContext';
import { isQualifiedCreator, matchesStatusFilter } from '../lib/creatorFilters';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');

  // Reads are declarative now: the stats query is keyed on selectedCampaignId,
  // so switching campaign refetches automatically (no manual fetchStats).
  const { data: campaigns = [] } = useCampaigns();
  const { data: creators = [] } = useAllCreators();
  const {
    data: stats,
    isLoading: loading,
    refetch: refetchStats,
  } = useDashboardStats(selectedCampaignId || undefined);

  // Filter creators based on selectedCampaignId first
  const filteredCreatorsForStats = creators.filter((c) => {
    if (selectedCampaignId) {
      const cIds = c.campaign_ids || [c.campaign_id];
      return cIds.includes(selectedCampaignId);
    }
    return true;
  });

  // The queue cards below count "qualified" creators (real profile data + follower
  // floor) with the same definition as the Creators directory, so they match what
  // that page shows when clicked through. The creator total, the funnel and Sent
  // come from the backend stats, which define each of them once for the whole page.
  const qualifiedCreators = filteredCreatorsForStats.filter(isQualifiedCreator);

  const approvedCount = qualifiedCreators.filter((c) => matchesStatusFilter(c, 'approved')).length;
  const pendingReviewCount = qualifiedCreators.filter((c) =>
    matchesStatusFilter(c, 'pending'),
  ).length;
  const notResponsiveCount = qualifiedCreators.filter((c) =>
    matchesStatusFilter(c, 'not_respond'),
  ).length;
  const discoveredCount = qualifiedCreators.filter((c) => matchesStatusFilter(c, 'hold')).length;
  const rejectedCount = qualifiedCreators.filter((c) => matchesStatusFilter(c, 'rejected')).length;

  const handleQueueClick = (status: string) => {
    let targetFilter = '';
    if (status === 'discovered') targetFilter = 'hold';
    else if (status === 'pending_review') targetFilter = 'pending';
    else if (status === 'approved') targetFilter = 'approved';
    else if (status === 'contacted') targetFilter = 'contacted';
    else if (status === 'rejected') targetFilter = 'rejected';
    else if (status === 'not_respond') targetFilter = 'not_respond';

    navigate('/creators', { state: { initialStatusFilter: targetFilter } });
  };

  const getPercentLength = (val: number, max: number) => {
    if (max === 0 || val === 0) return '0%';
    // For non-zero values, ensure at least 3% visibility so the color is seen
    return `${Math.max(3, Math.min(100, (val / max) * 100))}%`;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-[fadeIn_0.2s_ease]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Overview of your influencer marketing performance.
          </p>
        </div>
        <div className="w-full sm:w-72">
          <Select
            ariaLabel="Filter by campaign"
            value={selectedCampaignId}
            onChange={(v) => setSelectedCampaignId(v)}
            className="w-full bg-gray-50/50 hover:bg-gray-50 border border-gray-200/60 text-gray-900 text-sm rounded-xl px-4 py-2.5 shadow-sm font-medium text-left transition-all"
            options={[
              { value: '', label: `All Campaigns (${campaigns.length})` },
              ...campaigns.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
        </div>
      </div>

      {loading ? (
        <div className="py-24">
          <LoadingState message="Syncing CRM Intelligence..." />
        </div>
      ) : !stats ? (
        <div className="py-12">
          <EmptyState
            icon={AlertCircle}
            title="Dashboard Unavailable"
            description="We couldn't load the dashboard metrics. Please check your connection and try again."
            action={<Button onClick={() => refetchStats()}>Retry</Button>}
          />
        </div>
      ) : (
        <>
          {/* Single KPI Row */}
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
            <KPICard
              title="Creators"
              value={stats.kpis.totalCreators.value}
              icon={<Users size={16} />}
              trend={
                stats.kpis.totalCreators.trend
                  ? {
                      value: stats.kpis.totalCreators.trend,
                      isPositive: stats.kpis.totalCreators.trend >= 0,
                    }
                  : undefined
              }
              onClick={() => navigate('/creators')}
            />

            {selectedCampaignId ? (
              <>
                <KPICard
                  title="Brand"
                  value={campaigns.find((c) => c.id === selectedCampaignId)?.Brand?.name || 'N/A'}
                  icon={<Target size={16} />}
                  onClick={() => navigate('/brands')}
                />
                <KPICard
                  title="Client"
                  value={campaigns.find((c) => c.id === selectedCampaignId)?.Client?.name || 'N/A'}
                  icon={<Activity size={16} />}
                  onClick={() => navigate('/clients')}
                />
              </>
            ) : hasRole(user?.role, ROLE_GROUPS.INTERNAL) ? (
              <>
                <KPICard
                  title="Campaigns"
                  value={stats.kpis.totalCampaigns.value}
                  icon={<Target size={16} />}
                  onClick={() => navigate('/campaigns')}
                />
                <KPICard
                  title="Clients"
                  value={stats.kpis.totalClients.value}
                  icon={<Activity size={16} />}
                  onClick={() => navigate('/clients')}
                />
              </>
            ) : (
              <>
                <KPICard
                  title="Campaigns"
                  value={campaigns.filter((c) => c.status === 'active').length}
                  icon={<Target size={16} />}
                  onClick={() => navigate('/campaigns')}
                />
              </>
            )}
            <KPICard title="Sent" value={stats.kpis.contacted.value} icon={<Mail size={16} />} />
            <KPICard
              title="Replied"
              value={stats.kpis.replied.value}
              icon={<MessageSquare size={16} />}
              trend={
                stats.kpis.replied.trend
                  ? { value: stats.kpis.replied.trend, isPositive: true }
                  : undefined
              }
              colorClass="text-secondary-600"
            />
            <KPICard
              title="Qualified"
              value={stats.kpis.qualified.value}
              icon={<CheckCircle size={16} />}
              colorClass="text-primary-600"
            />
            <KPICard
              title="Converted"
              value={stats.kpis.converted.value}
              icon={<Sparkles size={16} />}
              trend={
                stats.kpis.converted.trend
                  ? {
                      value: stats.kpis.converted.trend,
                      isPositive: stats.kpis.converted.trend >= 0,
                    }
                  : undefined
              }
              colorClass="text-success-600"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Funnel Chart Area */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-normal text-gray-700 uppercase tracking-widest font-outfit">
                    Pipeline Funnel
                  </h2>
                  <InfoTip text="Each stage counts creators who reached at least that stage." />
                </div>
              </CardHeader>
              <CardContent className="h-64 flex flex-col justify-center gap-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-24 text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      New
                    </div>
                    <div className="bg-gray-100/50 rounded-full h-10 flex-1 overflow-hidden border border-gray-100 relative">
                      <div
                        className="bg-gradient-to-r from-slate-400 to-slate-500 h-full transition-all shadow-inner"
                        style={{ width: stats.funnel.new === 0 ? '0%' : '100%' }}
                      ></div>
                    </div>
                    <div className="w-12 text-sm font-bold text-gray-900">{stats.funnel.new}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-24 text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Contacted
                    </div>
                    <div className="bg-gray-100/50 rounded-full h-10 flex-1 overflow-hidden border border-gray-100 relative">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full transition-all shadow-md"
                        style={{
                          width: getPercentLength(stats.funnel.contacted, stats.funnel.new),
                        }}
                      ></div>
                    </div>
                    <div className="w-12 text-sm font-bold text-gray-900">
                      {stats.funnel.contacted}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-24 text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Replied
                    </div>
                    <div className="bg-gray-100/50 rounded-full h-10 flex-1 overflow-hidden border border-gray-100 relative">
                      <div
                        className="bg-gradient-to-r from-indigo-500 to-purple-600 h-full transition-all shadow-md"
                        style={{ width: getPercentLength(stats.funnel.replied, stats.funnel.new) }}
                      ></div>
                    </div>
                    <div className="w-12 text-sm font-bold text-gray-900">
                      {stats.funnel.replied}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-24 text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Qualified
                    </div>
                    <div className="bg-gray-100/50 rounded-full h-10 flex-1 overflow-hidden border border-gray-100 relative">
                      <div
                        className="bg-gradient-to-r from-teal-400 to-emerald-500 h-full transition-all shadow-md"
                        style={{
                          width: getPercentLength(stats.funnel.qualified, stats.funnel.new),
                        }}
                      ></div>
                    </div>
                    <div className="w-12 text-sm font-bold text-gray-900">
                      {stats.funnel.qualified}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-24 text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Converted
                    </div>
                    <div className="bg-gray-100/50 rounded-full h-10 flex-1 overflow-hidden border border-gray-100 relative">
                      <div
                        className="bg-gradient-to-r from-emerald-500 to-green-600 h-full transition-all shadow-lg"
                        style={{
                          width: getPercentLength(stats.funnel.converted, stats.funnel.new),
                        }}
                      ></div>
                    </div>
                    <div className="w-12 text-sm font-bold text-gray-900">
                      {stats.funnel.converted}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Outreach Status */}
            <Card>
              <CardHeader className="flex flex-row justify-between items-center pb-2">
                <h2 className="text-sm font-normal text-gray-700 uppercase tracking-widest font-outfit">
                  Outreach Queue
                </h2>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2">
                {/* 1. Discovered (Preview) */}
                <div
                  {...clickable(() => handleQueueClick('discovered'))}
                  className="cursor-pointer transition-all border p-3 rounded-xl flex flex-col justify-between bg-gray-50 border-gray-100 hover:bg-gray-100/70 hover:scale-[1.01]"
                >
                  <p className="text-[9px] font-normal text-gray-400 uppercase tracking-widest mb-1 text-left">
                    Discovered
                  </p>
                  <div className="flex justify-between items-end">
                    <span className="text-lg font-normal text-gray-900 font-outfit">
                      {discoveredCount}
                    </span>
                    <span className="text-[8px] uppercase tracking-wider bg-gray-200/50 text-gray-600 px-1 py-0.5 rounded font-bold">
                      Preview
                    </span>
                  </div>
                </div>

                {/* 2. Pending Review */}
                <div
                  {...clickable(() => handleQueueClick('pending_review'))}
                  className="cursor-pointer transition-all border p-3 rounded-xl flex flex-col justify-between bg-blue-50/20 border-blue-100/50 hover:bg-blue-50/50 hover:scale-[1.01]"
                >
                  <p className="text-[9px] font-normal text-blue-400 uppercase tracking-widest mb-1 text-left">
                    In Review
                  </p>
                  <div className="flex justify-between items-end">
                    <span className="text-lg font-normal text-blue-900 font-outfit">
                      {pendingReviewCount}
                    </span>
                    <span className="text-[8px] uppercase tracking-wider bg-blue-100/50 text-blue-700 px-1 py-0.5 rounded font-bold">
                      Review
                    </span>
                  </div>
                </div>

                {/* 3. Approved */}
                <div
                  {...clickable(() => handleQueueClick('approved'))}
                  className="cursor-pointer transition-all border p-3 rounded-xl flex flex-col justify-between bg-amber-50/20 border-amber-100/50 hover:bg-amber-50/50 hover:scale-[1.01]"
                >
                  <p className="text-[9px] font-normal text-amber-500 uppercase tracking-widest mb-1 text-left">
                    Approved
                  </p>
                  <div className="flex justify-between items-end">
                    <span className="text-lg font-normal text-amber-900 font-outfit">
                      {approvedCount}
                    </span>
                    <span className="text-[8px] uppercase tracking-wider bg-amber-100 text-amber-800 px-1 py-0.5 rounded font-bold">
                      Approved
                    </span>
                  </div>
                </div>

                {/* 4. Total Sent — every email sent, so it opens the outreach log
                    (the Creators "contacted" filter only holds creators still awaiting a reply). */}
                <div
                  {...clickable(() => navigate('/outreach'))}
                  className="cursor-pointer transition-all border p-3 rounded-xl flex flex-col justify-between bg-purple-50/20 border-purple-100/50 hover:bg-purple-50/50 hover:scale-[1.01]"
                >
                  <p className="text-[9px] font-normal text-purple-500 uppercase tracking-widest mb-1 text-left">
                    Total Sent
                  </p>
                  <div className="flex justify-between items-end">
                    <span className="text-lg font-normal text-purple-900 font-outfit">
                      {stats.outreachQueue.sent}
                    </span>
                    <span className="text-[8px] uppercase tracking-wider bg-purple-100 text-purple-800 px-1 py-0.5 rounded font-bold">
                      Sent
                    </span>
                  </div>
                </div>

                {/* 5. Rejected */}
                <div
                  {...clickable(() => handleQueueClick('rejected'))}
                  className="cursor-pointer transition-all border p-3 rounded-xl flex flex-col justify-between bg-rose-50/20 border-rose-100/50 hover:bg-rose-50/50 hover:scale-[1.01]"
                >
                  <p className="text-[9px] font-normal text-rose-500 uppercase tracking-widest mb-1 text-left">
                    Rejected
                  </p>
                  <div className="flex justify-between items-end">
                    <span className="text-lg font-normal text-rose-950 font-outfit">
                      {rejectedCount}
                    </span>
                    <span className="text-[8px] uppercase tracking-wider bg-rose-100 text-rose-800 px-1 py-0.5 rounded font-bold">
                      Rejected
                    </span>
                  </div>
                </div>

                {/* 6. Not Responsive */}
                <div
                  {...clickable(() => handleQueueClick('not_respond'))}
                  className="cursor-pointer transition-all border p-3 rounded-xl flex flex-col justify-between bg-slate-50 border-slate-100 hover:bg-slate-100/70 hover:scale-[1.01]"
                >
                  <p className="text-[9px] font-normal text-slate-500 uppercase tracking-widest mb-1 text-left">
                    No Response
                  </p>
                  <div className="flex justify-between items-end">
                    <span className="text-lg font-normal text-slate-900 font-outfit">
                      {notResponsiveCount}
                    </span>
                    <span className="text-[8px] uppercase tracking-wider bg-slate-200 text-slate-700 px-1 py-0.5 rounded font-bold">
                      No Ans
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <NeedsAttention
              campaignId={selectedCampaignId || undefined}
              className="lg:col-span-2"
            />

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <h2 className="text-sm font-normal text-gray-700 uppercase tracking-widest font-outfit">
                  Recent Activity
                </h2>
              </CardHeader>
              <CardContent className="space-y-6">
                {stats.recentActivity.length === 0 ? (
                  <div className="text-center text-sm text-gray-500 py-4 font-normal uppercase tracking-widest text-[10px]">
                    No recent activity detected.
                  </div>
                ) : (
                  stats.recentActivity.map((act: any, idx: number) => (
                    <div key={idx} className="flex gap-4 items-start group">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10 transition-transform group-hover:scale-110 shadow-sm ${
                            act.type === 'outreach'
                              ? 'bg-primary-100 text-primary-600'
                              : act.type === 'campaign'
                                ? 'bg-secondary-100 text-secondary-600'
                                : 'bg-success-100 text-success-600'
                          }`}
                        >
                          {act.type === 'outreach' ? (
                            <Mail size={16} />
                          ) : act.type === 'campaign' ? (
                            <Target size={16} />
                          ) : (
                            <CheckCircle size={16} />
                          )}
                        </div>
                        {idx !== stats.recentActivity.length - 1 && (
                          <div className="w-0.5 h-full bg-gray-100 mt-2"></div>
                        )}
                      </div>
                      <div className="pt-1.5 pb-2">
                        <p className="text-sm font-normal text-gray-900 leading-tight">
                          {act.message}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1.5 text-gray-400">
                          <Clock size={12} />
                          <span className="text-xs font-normal">
                            {getRelativeTime(act.timestamp)}
                          </span>
                          <span className="text-[10px] uppercase font-normal tracking-widest px-1.5 py-0.5 rounded bg-gray-50 border border-gray-100 ml-1">
                            {act.status || 'Active'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
