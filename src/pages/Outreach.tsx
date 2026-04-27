import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Settings, Activity } from 'lucide-react';
import { CheckCircle, AlertCircle, History, MessageSquare, ExternalLink } from 'lucide-react';
import { getCampaigns, getAllCreators, getOutreachLogs } from '../lib/api';
import type { Campaign, Creator } from '../types';

export default function Outreach() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [camps, leads, recentLogs] = await Promise.all([
        getCampaigns(), 
        getAllCreators(),
        getOutreachLogs()
      ]);
      setCampaigns(camps);
      setCreators(leads);
      setLogs(recentLogs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Poll for updates every 10 seconds while on this dashboard
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="p-12 text-center text-gray-500 font-medium">Loading Dashboard statistics...</div>;
  }

  const campaignMetrics = campaigns.map(camp => {
    // Ensure target is at least as high as delivered count to avoid negative pending stats
    const totalTarget = Math.max(camp.approved_count || 0, camp.delivered_count || 0);
    const sentCount = camp.delivered_count || 0;
    const pending = Math.max(0, totalTarget - sentCount);
    const progress = totalTarget > 0 ? (sentCount / totalTarget) * 100 : 0;
    
    return { 
      ...camp, 
      sentCount, 
      totalApproved: totalTarget,
      pending,
      progress
    };
  });

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12 animate-[fadeIn_0.3s_ease]">
      <div className="flex justify-between items-end mb-2">
        <div>
          <h1 className="text-3xl font-black text-gray-900 mb-1">Outreach Dashboard</h1>
          <p className="text-gray-500 font-medium tracking-tight">Real-time monitoring of automated campaign sequences.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" icon={<Settings size={16} />} className="rounded-xl border-gray-200">Configure Templates</Button>
          <div className="flex items-center gap-2 px-4 py-2 bg-success-50 text-success-700 rounded-xl text-sm font-bold border border-success-100">
            <Activity size={14} className="animate-pulse" /> System Active
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Campaign Progress */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
             <Activity size={14} /> Active Sequence Progress
          </h2>
          
          <div className="grid grid-cols-1 gap-4">
            {campaignMetrics.map(camp => (
              <Card key={camp.id} className="group hover:border-primary-200 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-lg font-black text-gray-900 group-hover:text-primary-600 transition-colors">{camp.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`w-2 h-2 rounded-full ${camp.status === 'active' ? 'bg-success-500 animate-pulse' : 'bg-gray-300'}`} />
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{camp.status}</span>
                      </div>
                    </div>
                    <div className="text-right">
                       <div className="text-2xl font-black text-gray-900">{Math.round(camp.progress)}%</div>
                       <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Completion</div>
                    </div>
                  </div>

                  {/* Custom Progress Bar */}
                  <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden mb-6 relative">
                    <div 
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(var(--primary-rgb),0.3)]"
                      style={{ width: `${camp.progress}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Target</p>
                      <p className="text-lg font-black text-gray-900">{camp.totalApproved}</p>
                    </div>
                    <div className="bg-success-50/30 rounded-xl p-3 border border-success-100/50">
                      <p className="text-[10px] font-bold text-success-600/60 uppercase mb-1">Delivered</p>
                      <p className="text-lg font-black text-success-600">{camp.sentCount}</p>
                    </div>
                    <div className="bg-primary-50/30 rounded-xl p-3 border border-primary-100/50">
                      <p className="text-[10px] font-bold text-primary-600/60 uppercase mb-1">Pending</p>
                      <p className="text-lg font-black text-primary-600">{camp.pending}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Right Column: Recent Activity Log */}
        <div className="space-y-6">
          <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
             <History size={14} /> Live Activity Feed
          </h2>

          <div className="bg-white border border-gray-100 rounded-2xl p-2 shadow-sm space-y-1">
            {logs.length > 0 ? logs.map((log, i) => (
              <div key={log.id} className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors border-b border-gray-50 last:border-0 group">
                <div className={`mt-1 p-1.5 rounded-lg ${log.delivery_status === 'sent' ? 'bg-success-50 text-success-600' : 'bg-red-50 text-red-600'}`}>
                  {log.delivery_status === 'sent' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <p className="text-sm font-bold text-gray-900 truncate">@{log.Creator?.handle}</p>
                    <span className="text-[10px] text-gray-400 font-medium">
                      {(log.created_at || log.createdAt) ? new Date(log.created_at || log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 truncate mb-1">{log.subject_line}</p>
                  <div className="flex items-center gap-2">
                     <span className="text-[9px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded font-bold uppercase">{log.channel}</span>
                     {log.delivery_status === 'sent' && (
                       <span className="text-[9px] text-success-600 font-bold flex items-center gap-0.5">
                         <div className="w-1 h-1 bg-success-600 rounded-full" /> Inbox
                       </span>
                     )}
                  </div>
                </div>
                <button className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-primary-600 transition-all">
                  <ExternalLink size={12} />
                </button>
              </div>
            )) : (
              <div className="py-12 text-center">
                 <MessageSquare size={32} className="mx-auto text-gray-200 mb-2" />
                 <p className="text-xs text-gray-400 font-medium">No recent outreach activity.</p>
              </div>
            )}
          </div>
          
          <Card className="bg-gradient-to-br from-primary-600 to-primary-700 border-0 p-6 text-white overflow-hidden relative">
            <Activity className="absolute -right-4 -bottom-4 w-24 h-24 text-white/10" />
            <p className="text-xs font-bold text-white/70 uppercase tracking-widest mb-1">Queue Status</p>
            <h3 className="text-xl font-black mb-4">Background Worker</h3>
            <div className="space-y-3">
               <div className="flex justify-between text-xs font-bold">
                  <span>Drip Delay</span>
                  <span>2.0s</span>
               </div>
               <div className="w-full bg-white/20 h-1 rounded-full">
                  <div className="bg-white w-full h-full rounded-full" />
               </div>
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
}
