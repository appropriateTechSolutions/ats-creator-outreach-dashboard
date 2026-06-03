import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KPICard } from '../components/ui/KPICard';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Table, Thead, Tbody, Tr, Th, Td } from '../components/ui/Table';
import { ScoreBadge } from '../components/ui/ScoreBadge';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Users, Mail, MessageSquare, Target, CheckCircle, Activity, Clock, Sparkles, Instagram, Youtube, ChevronDown } from 'lucide-react';
import { LoadingState } from '../components/ui/LoadingState';
import { getCampaigns, getAllCreators, getDashboardStats } from '../lib/api';
import type { Campaign, Creator } from '../types';
import { useAuth } from '../contexts/AuthContext';

const getFollowers = (c: Creator): number => {
  if (typeof c.followers_count === 'number') return c.followers_count;
  const fromProfiles = c.profiles?.map(p => p.followers || 0) ?? [];
  return fromProfiles.length ? Math.max(...fromProfiles) : 0;
};

const getEngagement = (c: Creator): number => {
  if (typeof c.engagement_rate === 'number') return c.engagement_rate;
  const fromProfiles = c.profiles?.map(p => Number(p.engagement_rate) || 0) ?? [];
  return fromProfiles.length > 0 ? Math.max(...fromProfiles) : 0;
};

// Promote shortlisted/approved leads to the top of the Top Discovery Leads list.
const leadPriority = (c: Creator): number => {
  if (c.review_status === 'approved') return 2;
  if (c.review_status === 'shortlisted') return 1;
  return 0;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    const handleClose = () => setDropdownOpen(false);
    window.addEventListener('click', handleClose);
    return () => window.removeEventListener('click', handleClose);
  }, []);

  const toggleDropdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDropdownOpen(!dropdownOpen);
  };

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


  // Filter creators based on selectedCampaignId first
  const filteredCreatorsForStats = creators.filter(c => {
    if (selectedCampaignId) {
      const cIds = c.campaign_ids || [c.campaign_id];
      return cIds.includes(selectedCampaignId);
    }
    return true;
  });

  const approvedCount = filteredCreatorsForStats.filter(c => c.review_status === 'approved').length;
  const pendingReviewCount = filteredCreatorsForStats.filter(c => c.review_status === 'pending_review').length;
  const notResponsiveCount = filteredCreatorsForStats.filter(c => c.lifecycle_status === 'not_respond').length;
  const discoveredCount = filteredCreatorsForStats.filter(c => c.review_status === 'hold' || c.review_status === 'pending' || !c.review_status).length;
  
  const sentCount = filteredCreatorsForStats.filter(c => c.lifecycle_status === 'contacted' || c.latest_outreach?.delivery_status === 'sent').length;
  const rejectedCount = filteredCreatorsForStats.filter(c => c.review_status === 'rejected').length;

  const topCreators = [...creators]
    .filter(c => {
      // If filtering by campaign, check if this campaign is in the creator's list
      if (selectedCampaignId) {
        const cIds = c.campaign_ids || [c.campaign_id];
        return cIds.includes(selectedCampaignId);
      }
      return true;
    })
    .sort((a, b) => {
      // Shortlisted/approved leads first, then by engagement rate, then by followers
      const pa = leadPriority(a), pb = leadPriority(b);
      if (pa !== pb) return pb - pa;
      const ea = getEngagement(a), eb = getEngagement(b);
      if (eb !== ea) return eb - ea;
      return getFollowers(b) - getFollowers(a);
    })
    .slice(0, 10);

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-normal text-gray-900 font-outfit uppercase tracking-tight">Dashboard</h1>
        <div className="relative w-full sm:w-72 z-20">
          <button
            onClick={toggleDropdown}
            className="w-full flex items-center justify-between bg-white border border-gray-300 text-gray-900 text-sm rounded-lg px-4 py-2.5 shadow-sm font-normal outline-none text-left"
          >
            <span className="truncate">
              {selectedCampaignId 
                ? (campaigns.find(c => c.id === selectedCampaignId)?.name || 'Campaign')
                : `All Campaigns (${campaigns.length})`
              }
            </span>
            <ChevronDown size={16} className="text-gray-500 ml-2 flex-shrink-0" />
          </button>
          
          {dropdownOpen && (
            <div className="absolute right-0 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-30 max-h-60 overflow-y-auto">
              <button
                type="button"
                onClick={() => {
                  setSelectedCampaignId('');
                  fetchStats(undefined);
                  setDropdownOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors truncate ${!selectedCampaignId ? 'text-primary-600 bg-primary-50/30 font-medium' : 'text-gray-700'}`}
              >
                All Campaigns ({campaigns.length})
              </button>
              {campaigns.map(c => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => {
                    setSelectedCampaignId(c.id);
                    fetchStats(c.id);
                    setDropdownOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors truncate ${selectedCampaignId === c.id ? 'text-primary-600 bg-primary-50/30 font-medium' : 'text-gray-700'}`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {loading || !stats ? (
        <div className="py-24">
          <LoadingState message="Syncing CRM Intelligence..." />
        </div>
      ) : (
        <>
          {/* Single KPI Row */}
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
            <KPICard 
              title="Creators" 
              value={stats.kpis.totalCreators.value} 
              icon={<Users size={16} />} 
              trend={stats.kpis.totalCreators.trend ? { value: stats.kpis.totalCreators.trend, isPositive: stats.kpis.totalCreators.trend >= 0 } : undefined} 
              onClick={() => navigate('/creators')}
            />
            
            {selectedCampaignId ? (
              <>
                <KPICard 
                  title="Brand" 
                  value={campaigns.find(c => c.id === selectedCampaignId)?.Brand?.name || 'N/A'} 
                  icon={<Target size={16} />} 
                  onClick={() => navigate('/brands')}
                />
                <KPICard 
                  title="Client" 
                  value={campaigns.find(c => c.id === selectedCampaignId)?.Client?.name || 'N/A'} 
                  icon={<Activity size={16} />} 
                  onClick={() => navigate('/clients')}
                />
              </>
            ) : (
              ['super_admin', 'admin', 'operator', 'analyst'].includes(user?.role || '') ? (
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
                    value={campaigns.filter(c => c.status === 'active').length} 
                    icon={<Target size={16} />} 
                    onClick={() => navigate('/campaigns')}
                  />
                </>
              )
            )}
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
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-24 text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest">New</div>
                    <div className="bg-gray-100/50 rounded-full h-10 flex-1 overflow-hidden border border-gray-100 relative">
                      <div className="bg-gradient-to-r from-slate-400 to-slate-500 h-full transition-all shadow-inner" style={{ width: stats.kpis.totalCreators.value === 0 ? '0%' : '100%' }}></div>
                    </div>
                    <div className="w-12 text-sm font-bold text-gray-900">{stats.kpis.totalCreators.value}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-24 text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest">Contacted</div>
                    <div className="bg-gray-100/50 rounded-full h-10 flex-1 overflow-hidden border border-gray-100 relative">
                      <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full transition-all shadow-md" style={{ width: getPercentLength(stats.funnel.contacted, stats.kpis.totalCreators.value) }}></div>
                    </div>
                    <div className="w-12 text-sm font-bold text-gray-900">{stats.funnel.contacted}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-24 text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest">Replied</div>
                    <div className="bg-gray-100/50 rounded-full h-10 flex-1 overflow-hidden border border-gray-100 relative">
                      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 h-full transition-all shadow-md" style={{ width: getPercentLength(stats.funnel.replied, stats.kpis.totalCreators.value) }}></div>
                    </div>
                    <div className="w-12 text-sm font-bold text-gray-900">{stats.funnel.replied}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-24 text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest">Qualified</div>
                    <div className="bg-gray-100/50 rounded-full h-10 flex-1 overflow-hidden border border-gray-100 relative">
                      <div className="bg-gradient-to-r from-teal-400 to-emerald-500 h-full transition-all shadow-md" style={{ width: getPercentLength(stats.funnel.qualified, stats.kpis.totalCreators.value) }}></div>
                    </div>
                    <div className="w-12 text-sm font-bold text-gray-900">{stats.funnel.qualified}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-24 text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest">Converted</div>
                    <div className="bg-gray-100/50 rounded-full h-10 flex-1 overflow-hidden border border-gray-100 relative">
                      <div className="bg-gradient-to-r from-emerald-500 to-green-600 h-full transition-all shadow-lg" style={{ width: getPercentLength(stats.funnel.converted, stats.kpis.totalCreators.value) }}></div>
                    </div>
                    <div className="w-12 text-sm font-bold text-gray-900">{stats.funnel.converted}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

             {/* Outreach Status */}
             <Card>
               <CardHeader className="flex flex-row justify-between items-center pb-2">
                 <h2 className="text-sm font-normal text-gray-700 uppercase tracking-widest font-outfit">Outreach Queue</h2>
               </CardHeader>
               <CardContent className="grid grid-cols-2 gap-2">
                 {/* 1. Discovered (Preview) */}
                 <div 
                   onClick={() => handleQueueClick('discovered')}
                   className="cursor-pointer transition-all border p-3 rounded-xl flex flex-col justify-between bg-gray-50 border-gray-100 hover:bg-gray-100/70 hover:scale-[1.01]"
                 >
                   <p className="text-[9px] font-normal text-gray-400 uppercase tracking-widest mb-1 text-left">Discovered</p>
                   <div className="flex justify-between items-end">
                     <span className="text-lg font-normal text-gray-900 font-outfit">{discoveredCount}</span>
                     <span className="text-[8px] uppercase tracking-wider bg-gray-200/50 text-gray-600 px-1 py-0.5 rounded font-bold">Preview</span>
                   </div>
                 </div>
 
                 {/* 2. Pending Review */}
                 <div 
                   onClick={() => handleQueueClick('pending_review')}
                   className="cursor-pointer transition-all border p-3 rounded-xl flex flex-col justify-between bg-blue-50/20 border-blue-100/50 hover:bg-blue-50/50 hover:scale-[1.01]"
                 >
                   <p className="text-[9px] font-normal text-blue-400 uppercase tracking-widest mb-1 text-left">In Review</p>
                   <div className="flex justify-between items-end">
                     <span className="text-lg font-normal text-blue-900 font-outfit">{pendingReviewCount}</span>
                     <span className="text-[8px] uppercase tracking-wider bg-blue-100/50 text-blue-700 px-1 py-0.5 rounded font-bold">Review</span>
                   </div>
                 </div>
 
                 {/* 3. Approved */}
                 <div 
                   onClick={() => handleQueueClick('approved')}
                   className="cursor-pointer transition-all border p-3 rounded-xl flex flex-col justify-between bg-amber-50/20 border-amber-100/50 hover:bg-amber-50/50 hover:scale-[1.01]"
                 >
                   <p className="text-[9px] font-normal text-amber-500 uppercase tracking-widest mb-1 text-left">Approved</p>
                   <div className="flex justify-between items-end">
                     <span className="text-lg font-normal text-amber-900 font-outfit">{approvedCount}</span>
                     <span className="text-[8px] uppercase tracking-wider bg-amber-100 text-amber-800 px-1 py-0.5 rounded font-bold">Approved</span>
                   </div>
                 </div>
 
                 {/* 4. Total Sent */}
                 <div 
                   onClick={() => handleQueueClick('contacted')}
                   className="cursor-pointer transition-all border p-3 rounded-xl flex flex-col justify-between bg-purple-50/20 border-purple-100/50 hover:bg-purple-50/50 hover:scale-[1.01]"
                 >
                   <p className="text-[9px] font-normal text-purple-500 uppercase tracking-widest mb-1 text-left">Total Sent</p>
                   <div className="flex justify-between items-end">
                     <span className="text-lg font-normal text-purple-900 font-outfit">{sentCount}</span>
                     <span className="text-[8px] uppercase tracking-wider bg-purple-100 text-purple-800 px-1 py-0.5 rounded font-bold">Sent</span>
                   </div>
                 </div>
 
                 {/* 5. Rejected */}
                 <div 
                   onClick={() => handleQueueClick('rejected')}
                   className="cursor-pointer transition-all border p-3 rounded-xl flex flex-col justify-between bg-rose-50/20 border-rose-100/50 hover:bg-rose-50/50 hover:scale-[1.01]"
                 >
                   <p className="text-[9px] font-normal text-rose-500 uppercase tracking-widest mb-1 text-left">Rejected</p>
                   <div className="flex justify-between items-end">
                     <span className="text-lg font-normal text-rose-950 font-outfit">{rejectedCount}</span>
                     <span className="text-[8px] uppercase tracking-wider bg-rose-100 text-rose-800 px-1 py-0.5 rounded font-bold">Rejected</span>
                   </div>
                 </div>
 
                 {/* 6. Not Responsive */}
                 <div 
                   onClick={() => handleQueueClick('not_respond')}
                   className="cursor-pointer transition-all border p-3 rounded-xl flex flex-col justify-between bg-slate-50 border-slate-100 hover:bg-slate-100/70 hover:scale-[1.01]"
                 >
                   <p className="text-[9px] font-normal text-slate-500 uppercase tracking-widest mb-1 text-left">No Response</p>
                   <div className="flex justify-between items-end">
                     <span className="text-lg font-normal text-slate-900 font-outfit">{notResponsiveCount}</span>
                     <span className="text-[8px] uppercase tracking-wider bg-slate-200 text-slate-700 px-1 py-0.5 rounded font-bold">No Ans</span>
                   </div>
                 </div>
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
                       <Th className="text-center">Engagement</Th>
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
                              {(c.full_name || c.handle)?.charAt(0)}
                            </div>
                            <div className="min-w-0">
                               <Link to={`/creators/${c.id}`} className="font-normal text-gray-900 font-outfit uppercase tracking-tight hover:text-primary-600 transition-colors text-xs leading-tight line-clamp-2 whitespace-normal break-words max-w-[150px]">
                                 {c.full_name || `@${c.handle}`}
                               </Link>
                               <div className="flex items-center gap-2 mt-1.5">
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
                        <Td className="text-gray-500 capitalize">{c.city || 'Global'}</Td>
                        <Td className="text-center">
                          <span className="text-sm font-normal text-gray-900 font-outfit">
                            {getEngagement(c) > 0 ? `${getEngagement(c).toFixed(2)}%` : 'N/A'}
                          </span>
                        </Td>
                        <Td>
                          <ScoreBadge score={c.relevance_score || 0} />
                        </Td>
                        <Td><StatusBadge status={['not_respond'].includes(c.lifecycle_status || '') ? c.lifecycle_status : (c.review_status as any || 'pending')} /></Td>
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
