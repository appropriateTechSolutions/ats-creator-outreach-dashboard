import React, { useState, useEffect } from 'react';
import { KPICard } from '../components/ui/KPICard';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Table, Thead, Tbody, Tr, Th, Td } from '../components/ui/Table';
import { ScoreBadge } from '../components/ui/ScoreBadge';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Button } from '../components/ui/Button';
import { Users, Mail, MessageSquare, Target, CheckCircle, Activity, AlertCircle, Clock, Sparkles } from 'lucide-react';
import { LoadingState } from '../components/ui/LoadingState';
import { getCampaigns, getAllCreators, getDashboardStats } from '../lib/api';
import type { Campaign, Creator } from '../types';

export default function Dashboard() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');

  const fetchStats = (campaignId?: string) => {
    setLoading(true);
    getDashboardStats(campaignId)
      .then(dashboardStats => {
        setStats(dashboardStats);
      })
      .catch(err => console.error("Stats fetch error:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    Promise.all([getCampaigns(), getAllCreators()])
      .then(([camps, creats]) => {
        setCampaigns(camps);
        setCreators(creats);
      })
      .catch(err => console.error("Dashboard metadata fetch error:", err));
    
    fetchStats();
  }, []);

  const handleCampaignChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedCampaignId(val);
    fetchStats(val || undefined);
  };

  const topCreators = [...creators]
    .filter(c => {
      // If filtering by campaign, check if this campaign is in the creator's list
      if (selectedCampaignId) {
        const cIds = c.campaign_ids || [c.campaign_id];
        return cIds.includes(selectedCampaignId);
      }
      return true;
    })
    .sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0))
    .slice(0, 10);

  const getPercentLength = (val: number, max: number) => {
    if (max === 0) return '0%';
    return `${Math.max(5, Math.min(100, (val / max) * 100))}%`;
  };

  const getRelativeTime = (timestamp: any) => {
    try {
      if (!timestamp) return 'Just now';
      const now = new Date();
      const then = new Date(timestamp);
      
      if (isNaN(then.getTime())) return 'Just now';
      
      const diffMs = now.getTime() - then.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSecs < 60) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${diffDays}d ago`;
    } catch (e) {
      return 'Just now';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-[fadeIn_0.3s_ease]">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-normal text-gray-900 font-outfit uppercase tracking-tight">Dashboard</h1>
        <select 
          value={selectedCampaignId}
          onChange={handleCampaignChange}
          className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block px-4 py-2 shadow-sm font-normal outline-none"
        >
          <option value="">All Campaigns ({campaigns.length})</option>
          {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {loading || !stats ? (
        <div className="py-24">
          <LoadingState message="Syncing CRM Intelligence..." />
        </div>
      ) : (
        <>
          {/* Single KPI Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <KPICard 
              title="Creators" 
              value={stats.kpis.totalCreators.value} 
              icon={<Users size={16} />} 
              trend={stats.kpis.totalCreators.trend ? { value: stats.kpis.totalCreators.trend, isPositive: stats.kpis.totalCreators.trend >= 0 } : undefined} 
            />
            <KPICard 
              title="Campaigns" 
              value={stats.kpis.totalCampaigns.value} 
              icon={<Target size={16} />} 
            />
            <KPICard 
              title="Clients" 
              value={stats.kpis.totalClients.value} 
              icon={<Activity size={16} />} 
            />
            <KPICard 
              title="Sent" 
              value={stats.kpis.contacted.value} 
              icon={<Mail size={16} />} 
            />
            <KPICard 
              title="Replied" 
              value={stats.kpis.replied.value} 
              icon={<MessageSquare size={16} />} 
              trend={stats.kpis.replied.trend !== 0 ? { value: stats.kpis.replied.trend, isPositive: true } : undefined} 
              colorClass="text-secondary-600" 
            />
            <KPICard title="Qualified" value={stats.kpis.qualified.value} icon={<CheckCircle size={16} />} colorClass="text-primary-600" />
            <KPICard 
              title="Converted" 
              value={stats.kpis.converted.value} 
              icon={<Sparkles size={16} />} 
              trend={stats.kpis.converted.trend ? { value: stats.kpis.converted.trend, isPositive: stats.kpis.converted.trend >= 0 } : undefined} 
              colorClass="text-success-600" 
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Funnel Chart Area */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <h2 className="text-sm font-normal text-gray-700 uppercase tracking-widest font-outfit">Pipeline Funnel</h2>
              </CardHeader>
              <CardContent className="h-64 flex flex-col justify-center gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-4">
                    <div className="w-24 text-right text-xs font-normal text-gray-400 uppercase tracking-widest">New</div>
                    <div className="bg-gray-100 rounded-full h-8 flex-1 overflow-hidden">
                      <div className="bg-gray-300 h-full transition-all" style={{ width: '100%' }}></div>
                    </div>
                    <div className="w-12 text-sm font-normal text-gray-700">{stats.kpis.totalCreators.value}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-24 text-right text-xs font-normal text-gray-400 uppercase tracking-widest">Contacted</div>
                    <div className="bg-gray-100 rounded-full h-8 flex-1 overflow-hidden">
                      <div className="bg-primary-500 h-full transition-all" style={{ width: getPercentLength(stats.funnel.contacted, stats.kpis.totalCreators.value) }}></div>
                    </div>
                    <div className="w-12 text-sm font-normal text-gray-700">{stats.funnel.contacted}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-24 text-right text-xs font-normal text-gray-400 uppercase tracking-widest">Replied</div>
                    <div className="bg-gray-100 rounded-full h-8 flex-1 overflow-hidden">
                      <div className="bg-primary-700 h-full transition-all" style={{ width: getPercentLength(stats.funnel.replied, stats.kpis.totalCreators.value) }}></div>
                    </div>
                    <div className="w-12 text-sm font-normal text-gray-700">{stats.funnel.replied}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-24 text-right text-xs font-normal text-gray-400 uppercase tracking-widest">Qualified</div>
                    <div className="bg-gray-100 rounded-full h-8 flex-1 overflow-hidden">
                      <div className="bg-success-400 h-full transition-all" style={{ width: getPercentLength(stats.funnel.qualified, stats.kpis.totalCreators.value) }}></div>
                    </div>
                    <div className="w-12 text-sm font-normal text-gray-700">{stats.funnel.qualified}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-24 text-right text-xs font-normal text-gray-400 uppercase tracking-widest">Converted</div>
                    <div className="bg-gray-100 rounded-full h-8 flex-1 overflow-hidden">
                      <div className="bg-success-600 h-full transition-all" style={{ width: getPercentLength(stats.funnel.converted, stats.kpis.totalCreators.value) }}></div>
                    </div>
                    <div className="w-12 text-sm font-normal text-gray-700">{stats.funnel.converted}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Outreach Status */}
            <Card>
              <CardHeader>
                <h2 className="text-sm font-normal text-gray-700 uppercase tracking-widest font-outfit">Outreach Queue</h2>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-warning-50 border border-warning-100 rounded-xl flex justify-between items-center">
                  <div>
                    <div className="text-xs font-normal text-warning-800 uppercase tracking-widest mb-1">Approved · Pending Send</div>
                    <div className="text-2xl font-normal text-warning-900">{stats.outreachQueue.pending}</div>
                  </div>
                  <div className="w-10 h-10 bg-warning-200 rounded-full flex items-center justify-center text-warning-700"><Mail size={18}/></div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-center">
                    <div className="text-xs font-normal text-gray-400 uppercase tracking-widest mb-1">Total Sent</div>
                    <div className="text-xl font-normal text-gray-900">{stats.outreachQueue.sent}</div>
                  </div>
                  <div className="p-4 bg-error-50 border border-error-100 rounded-xl text-center">
                    <div className="text-xs font-normal text-error-700 uppercase tracking-widest mb-1">Failed</div>
                    <div className="text-xl font-normal text-error-600">{stats.outreachQueue.failed}</div>
                  </div>
                </div>

                <Button className="w-full mt-2" variant="outline" disabled={stats.funnel.replied === 0}>
                  Process Follow-ups ({stats.funnel.replied})
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <h2 className="text-sm font-normal text-gray-700 uppercase tracking-widest font-outfit">Top Discovery Leads</h2>
              </CardHeader>
              {topCreators.length === 0 ? (
                <div className="p-12 text-center text-gray-500">No pending leads. Trigger AI discovery inside a Campaign!</div>
              ) : (
                <Table>
                  <Thead>
                    <Tr>
                      <Th>Creator</Th>
                      <Th>City</Th>
                      <Th className="text-center">V2 Score</Th>
                      <Th className="text-center">Relevance</Th>
                      <Th>Status</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {topCreators.map(c => (
                      <Tr key={c.id}>
                        <Td>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex flex-shrink-0 items-center justify-center font-normal text-xs uppercase">
                              {c.handle?.charAt(0)}
                            </div>
                            <div>
                               <div className="font-normal text-gray-900 font-outfit uppercase tracking-tight">@{c.handle}</div>
                              <div className="text-xs text-gray-500 truncate max-w-[120px]">{c.full_name || c.category}</div>
                            </div>
                          </div>
                        </Td>
                        <Td className="text-gray-500 capitalize">{c.city || 'Global'}</Td>
                        <Td>
                          <ScoreBadge score={c.outreach_readiness_score || 0} />
                        </Td>
                        <Td>
                          <ScoreBadge score={c.relevance_score || 0} />
                        </Td>
                        <Td><StatusBadge status={c.review_status as any || 'pending'} /></Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              )}
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <h2 className="text-sm font-normal text-gray-700 uppercase tracking-widest font-outfit">Recent Activity</h2>
              </CardHeader>
              <CardContent className="space-y-6">
                {stats.recentActivity.length === 0 ? (
                   <div className="text-center text-sm text-gray-500 py-4 font-normal uppercase tracking-widest text-[10px]">No recent activity detected.</div>
                ) : (
                  stats.recentActivity.map((act: any, idx: number) => (
                    <div key={idx} className="flex gap-4 items-start group">
                      <div className="flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10 transition-transform group-hover:scale-110 shadow-sm ${
                          act.type === 'outreach' ? 'bg-primary-100 text-primary-600' : 
                          act.type === 'campaign' ? 'bg-secondary-100 text-secondary-600' : 
                          'bg-success-100 text-success-600'
                        }`}>
                          {act.type === 'outreach' ? <Mail size={16}/> : 
                           act.type === 'campaign' ? <Target size={16}/> : 
                           <CheckCircle size={16}/>}
                        </div>
                        {idx !== stats.recentActivity.length - 1 && (
                          <div className="w-0.5 h-full bg-gray-100 mt-2"></div>
                        )}
                      </div>
                      <div className="pt-1.5 pb-2">
                        <p className="text-sm font-normal text-gray-900 leading-tight">{act.message}</p>
                        <div className="flex items-center gap-1.5 mt-1.5 text-gray-400">
                           <Clock size={12} />
                           <span className="text-xs font-normal">{getRelativeTime(act.timestamp)}</span>
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
