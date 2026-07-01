import { hasRole, ROLE_GROUPS } from '../lib/constants';
import { Card, CardContent } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { CheckCircle, AlertCircle, MessageSquare, ExternalLink, RefreshCw } from 'lucide-react';
import { useCampaigns, useOutreachLogs } from '../hooks/queries';
import { useAuth } from '../contexts/AuthContext';

export default function Outreach() {
  const { user } = useAuth();
  const { data: campaigns = [] } = useCampaigns();
  const { data: logs = [], isLoading: loading, refetch } = useOutreachLogs();

  if (loading) {
    return (
      <div className="p-12 text-center text-gray-500 font-medium">
        Loading Dashboard statistics...
      </div>
    );
  }

  const campaignMetrics = campaigns.map((camp) => {
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
      progress,
    };
  });

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12 animate-[fadeIn_0.2s_ease]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-normal text-gray-900 mb-1 font-outfit uppercase tracking-tight">
            Outreach Dashboard
          </h1>
        </div>
        <Button
          onClick={() => refetch()}
          variant="outline"
          size="sm"
          icon={<RefreshCw size={16} />}
        >
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Campaign Progress */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 gap-4">
            {campaignMetrics.map((camp) => (
              <Card
                key={camp.id}
                className="group hover:border-primary-200 transition-all duration-300"
              >
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-lg font-normal text-gray-900 group-hover:text-primary-600 transition-colors font-outfit uppercase tracking-tight">
                        {camp.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`w-2 h-2 rounded-full ${camp.status === 'active' ? 'bg-success-500 animate-pulse' : 'bg-gray-300'}`}
                        />
                        <span className="text-xs font-normal text-gray-400 uppercase tracking-wider">
                          {camp.status}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-normal text-gray-900">
                        {Math.round(camp.progress)}%
                      </div>
                      <div className="text-[10px] font-normal text-gray-400 uppercase tracking-widest">
                        Completion
                      </div>
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
                      <p className="text-[10px] font-normal text-gray-400 uppercase mb-1 tracking-widest">
                        Target
                      </p>
                      <p className="text-lg font-normal text-gray-900">{camp.totalApproved}</p>
                    </div>
                    <div className="bg-success-50/30 rounded-xl p-3 border border-success-100/50">
                      <p className="text-[10px] font-normal text-success-600/60 uppercase mb-1 tracking-widest">
                        Delivered
                      </p>
                      <p className="text-lg font-normal text-success-600">{camp.sentCount}</p>
                    </div>
                    <div className="bg-primary-50/30 rounded-xl p-3 border border-primary-100/50">
                      <p className="text-[10px] font-normal text-primary-600/60 uppercase mb-1 tracking-widest">
                        Pending
                      </p>
                      <p className="text-lg font-normal text-primary-600">{camp.pending}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Right Column: Recent Activity Log */}
        {hasRole(user?.role, ROLE_GROUPS.INTERNAL) && (
          <div className="space-y-6">
            <div className="bg-white border border-gray-100 rounded-2xl p-2 shadow-sm space-y-1">
              {logs.length > 0 ? (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors border-b border-gray-50 last:border-0 group"
                  >
                    <div
                      className={`mt-1 p-1.5 rounded-lg ${log.delivery_status === 'sent' ? 'bg-success-50 text-success-600' : 'bg-red-50 text-red-600'}`}
                    >
                      {log.delivery_status === 'sent' ? (
                        <CheckCircle size={14} />
                      ) : (
                        <AlertCircle size={14} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-0.5">
                        <p className="text-sm font-normal text-gray-900 truncate">
                          @{log.Creator?.handle}
                        </p>
                        <span className="text-[10px] text-gray-400 font-normal">
                          {log.created_at || log.createdAt
                            ? new Date((log.created_at || log.createdAt)!).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'Recently'}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 truncate mb-1">{log.subject_line}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded font-normal uppercase tracking-widest">
                          {log.channel}
                        </span>
                        {log.delivery_status === 'sent' && (
                          <span className="text-[9px] text-success-600 font-normal flex items-center gap-0.5 uppercase tracking-widest">
                            <div className="w-1 h-1 bg-success-600 rounded-full" /> Inbox
                          </span>
                        )}
                      </div>
                    </div>
                    <button className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-primary-600 transition-all">
                      <ExternalLink size={12} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="py-8">
                  <EmptyState
                    icon={MessageSquare}
                    title="No Outreach Activity"
                    description="No recent outreach activity."
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
