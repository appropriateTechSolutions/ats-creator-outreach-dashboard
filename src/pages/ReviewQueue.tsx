import { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { OutreachPreviewModal } from '../components/ui/OutreachPreviewModal';
import { Check, X, FileText } from 'lucide-react';
import { Link as RouterLink } from 'react-router-dom';
import { LoadingState } from '../components/ui/LoadingState';
import { Table, Thead, Tbody, Tr, Th, Td } from '../components/ui/Table';
import { getAllCreators, reviewLead } from '../lib/api';
import type { Creator } from '../types';

const getPrimaryProfileStats = (c: Creator) => {
  if (!c.profiles || c.profiles.length === 0) {
    return {
      followers: c.followers || c.followers_count || 0,
      engagementRate: c.engagement_rate || 0,
      avgLikes: c.avg_likes || 0,
      avgComments: c.avg_comments || 0,
      mediaCount: 0,
      platform: c.platform || 'instagram'
    };
  }
  
  const primaryPlatformName = c.primary_platform?.toLowerCase();
  const profile = c.profiles.find(p => p.platform.toLowerCase() === primaryPlatformName) || c.profiles[0];
  
  return {
    followers: profile.followers || 0,
    engagementRate: profile.engagement_rate ? Number(profile.engagement_rate) : 0,
    avgLikes: profile.avg_likes || 0,
    avgComments: profile.avg_comments || 0,
    mediaCount: profile.media_count || 0,
    platform: profile.platform
  };
};

export default function ReviewQueue() {
  const [queue, setQueue] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [outreachModalCreatorId, setOutreachModalCreatorId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchQueue = async () => {
    try {
      const data = await getAllCreators();
      // Filter for pending/shortlisted items
      const pending = data.filter(c => 
        (c.review_status === 'shortlisted' || c.review_status === 'pending_review') && 
        c.lifecycle_status !== 'not_respond' && 
        c.lifecycle_status !== 'contacted'
      );
      // Sort by relevance score descending
      pending.sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
      setQueue(pending);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleReject = async (id: string) => {
    setActionLoading(id);
    try {
      await reviewLead(id, 'reject');
      fetchQueue();
    } catch (err) {
      alert('Failed to reject lead.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmApprove = async (customSubject?: string, customBody?: string) => {
    if (!outreachModalCreatorId) return;
    setActionLoading(outreachModalCreatorId);
    try {
      await reviewLead(outreachModalCreatorId, 'approve', customSubject, customBody);
      fetchQueue();
    } catch (err) {
      alert('Failed to approve lead.');
      throw err;
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="p-20">
        <LoadingState message="Synchronizing Review Pipeline..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-[fadeIn_0.3s_ease]">
      <style>{`
        @media print {
          /* Hide non-printable layout items */
          aside,
          header,
          nav,
          .no-print,
          .hide-on-print,
          button,
          label,
          input {
            display: none !important;
          }

          /* Reset layout padding when printing */
          div[class*="lg:pl-64"],
          div[class*="pl-0"],
          main,
          .main-content {
            padding-left: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
            background: transparent !important;
          }

          /* Reset all wrapper backgrounds to transparent to let the white page show */
          body,
          html,
          #root,
          main,
          .main-content,
          div,
          section {
            background-color: transparent !important;
            background: transparent !important;
          }

          body,
          html {
            background-color: #ffffff !important;
            background: #ffffff !important;
            color: #111827 !important;
            font-size: 10pt !important;
            font-family: 'Outfit', 'Inter', sans-serif !important;
          }

          /* Keep cards and grid metrics clean */
          .page-break-inside-avoid {
            background-color: #ffffff !important;
            background: #ffffff !important;
            border: 1px solid #e5e7eb !important;
          }
          
          .bg-gray-50 {
            background-color: #f9fafb !important;
            background: #f9fafb !important;
            border: 1px solid #f3f4f6 !important;
          }

          .max-w-5xl {
            max-width: 100% !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          /* Force backgrounds/colors to render on print */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .page-break-inside-avoid {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      <div className="no-print flex justify-between items-center mb-2">
        <h1 className="text-2xl sm:text-3xl font-normal text-gray-900 font-outfit uppercase tracking-tight">Review Queue</h1>
        <div className="flex items-center gap-3">
          <div className="text-sm font-normal text-gray-500 bg-gray-100 px-3 py-1 rounded-full uppercase tracking-widest">
            {queue.length} Pending
          </div>
          {queue.length > 0 && (
            <Button
              onClick={() => window.print()}
              variant="outline"
              className="flex items-center gap-2 text-xs uppercase tracking-widest font-outfit h-9"
            >
              <FileText size={14} className="text-primary-600" /> Export PDF
            </Button>
          )}
        </div>
      </div>

      <Card className="no-print shadow-xl shadow-gray-200/50 border-gray-200 overflow-hidden">
        {queue.length === 0 ? (
          <div className="p-16 text-center bg-primary-50/10">
            <div className="w-16 h-16 bg-primary-100 text-primary-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check size={32} />
            </div>
            <h3 className="text-xl font-normal text-gray-900 font-outfit uppercase tracking-tight">Queue Empty!</h3>
            <p className="text-gray-500 mt-2 max-w-sm mx-auto">There are currently zero pending leads in the review queue. Great job maintaining inbox zero.</p>
            <Button onClick={fetchQueue} variant="outline" className="mt-6">Refresh Queue</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <Thead>
                <Tr>
                  <Th>Creator Details</Th>
                  <Th className="text-right">Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {queue.map(c => (
                  <Tr key={c.id}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex flex-shrink-0 items-center justify-center font-normal text-sm uppercase ring-2 ring-white shadow-sm overflow-hidden">
                          {c.profile_pic ? (
                            <img src={c.profile_pic} alt="" className="w-full h-full object-cover" />
                          ) : (
                            (c.full_name || c.handle)?.charAt(0)
                          )}
                        </div>
                        <div>
                          <RouterLink to={`/creators/${c.id}`} className="font-normal text-gray-900 hover:text-primary-600 transition-colors text-sm uppercase tracking-tight font-outfit">
                            {c.full_name || `@${c.handle}`}
                          </RouterLink>
                          <div className="text-xs text-gray-500 font-normal mt-0.5">
                            @{c.handle}
                          </div>
                        </div>
                      </div>
                    </Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setOutreachModalCreatorId(c.id)}
                          disabled={!!actionLoading}
                          className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                          title="Approve & Send Outreach"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => handleReject(c.id)}
                          disabled={!!actionLoading}
                          className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                          title="Reject"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </div>
        )}
      </Card>

      {/* Print-only Well-Formatted Layout */}
      {queue.length > 0 && (
        <div className="hidden print:block w-full">
          {/* Print-only Branded Header */}
          <div className="flex items-center justify-between border-b-2 border-gray-900 pb-4 mb-8">
            <div className="flex items-center gap-3">
              <span className="text-3xl font-extrabold tracking-widest text-primary-600 font-outfit">ATS</span>
              <span className="text-xs text-gray-400 uppercase tracking-widest border-l pl-3 border-gray-300 font-medium">Outreach Platform</span>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-gray-800 uppercase tracking-wider font-outfit">Review Queue Export</p>
              <p className="text-xs text-gray-400">{new Date().toLocaleDateString()}</p>
            </div>
          </div>

          <div className="space-y-6">
            {queue.map((c) => {
              const stats = getPrimaryProfileStats(c);
              return (
                <div key={c.id} className="page-break-inside-avoid border border-gray-200 rounded-xl p-5 bg-white shadow-sm">
                  {/* Header Info */}
                  <div className="flex justify-between items-start border-b border-gray-100 pb-3 mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 font-outfit">{c.full_name || 'N/A'}</h3>
                      <p className="text-xs text-primary-600 font-semibold mt-0.5">@{c.handle}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-gray-500 capitalize font-medium">
                        {stats.platform} &bull; {c.city ? `${c.city}${c.country ? `, ${c.country}` : ''}` : 'Location Unknown'}
                      </p>
                      <p className="text-[11px] text-gray-600 font-medium mt-0.5">{c.email || 'No email available'}</p>
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-5 gap-3">
                    <div className="bg-gray-50 p-2.5 rounded-lg text-center border border-gray-100">
                      <p className="text-[9px] uppercase tracking-wider text-gray-400 font-semibold font-outfit">Followers</p>
                      <p className="text-sm font-bold text-gray-800 mt-0.5">{stats.followers ? stats.followers.toLocaleString() : '0'}</p>
                    </div>
                    <div className="bg-gray-50 p-2.5 rounded-lg text-center border border-gray-100">
                      <p className="text-[9px] uppercase tracking-wider text-gray-400 font-semibold font-outfit">Avg Likes</p>
                      <p className="text-sm font-bold text-gray-800 mt-0.5">{stats.avgLikes ? stats.avgLikes.toLocaleString() : '0'}</p>
                    </div>
                    <div className="bg-gray-50 p-2.5 rounded-lg text-center border border-gray-100">
                      <p className="text-[9px] uppercase tracking-wider text-gray-400 font-semibold font-outfit">Avg Comments</p>
                      <p className="text-sm font-bold text-gray-800 mt-0.5">{stats.avgComments ? stats.avgComments.toLocaleString() : '0'}</p>
                    </div>
                    <div className="bg-gray-50 p-2.5 rounded-lg text-center border border-gray-100">
                      <p className="text-[9px] uppercase tracking-wider text-gray-400 font-semibold font-outfit">Posts / Media</p>
                      <p className="text-sm font-bold text-gray-800 mt-0.5">{stats.mediaCount ? stats.mediaCount.toLocaleString() : '0'}</p>
                    </div>
                    <div className="bg-gray-50 p-2.5 rounded-lg text-center border border-gray-100">
                      <p className="text-[9px] uppercase tracking-wider text-gray-400 font-semibold font-outfit">Engagement</p>
                      <p className="text-sm font-bold text-primary-600 mt-0.5">{stats.engagementRate ? `${stats.engagementRate.toFixed(2)}%` : '0.00%'}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <OutreachPreviewModal
        creatorId={outreachModalCreatorId || ''}
        campaignId={queue.find(c => c.id === outreachModalCreatorId)?.campaign_id || undefined}
        isOpen={!!outreachModalCreatorId}
        onClose={() => setOutreachModalCreatorId(null)}
        onSend={handleConfirmApprove}
      />
    </div>
  );
}
