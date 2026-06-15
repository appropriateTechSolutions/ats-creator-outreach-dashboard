import { useState, useEffect, useMemo } from 'react';
import { getContents } from '../lib/api';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { LoadingState } from '../components/ui/LoadingState';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export default function Analytics() {
  const navigate = useNavigate();
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [contents, setContents] = useState<any[]>([]);

  const loadAllContents = async () => {
    setLoadingAnalytics(true);
    try {
      const contentData = await getContents();
      setContents(contentData);
    } catch (err) {
      console.error('Failed to load content deliverables:', err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    loadAllContents();
  }, []);

  const groupedAnalytics = useMemo(() => {
    const groups: { [key: string]: any } = {};
    contents.forEach(c => {
      if (!c.creator_id || !c.campaign_id) return;
      const key = `${c.creator_id}-${c.campaign_id}`;
      if (!groups[key]) {
        groups[key] = {
          creatorId: c.creator_id,
          campaignId: c.campaign_id,
          Creator: c.Creator,
          Campaign: c.Campaign,
          deliverables: [],
          publishedCount: 0,
          approvedCount: 0,
          totalCount: 0,
          earliestDueDate: null
        };
      }
      groups[key].deliverables.push(c);
      groups[key].totalCount += 1;
      if (c.status === 'published') {
        groups[key].publishedCount += 1;
      }
      if (c.status === 'approved') {
        groups[key].approvedCount += 1;
      }
      if (c.due_date) {
        if (!groups[key].earliestDueDate || new Date(c.due_date) < new Date(groups[key].earliestDueDate)) {
          groups[key].earliestDueDate = c.due_date;
        }
      }
    });
    return Object.values(groups);
  }, [contents]);

  if (loadingAnalytics) {
    return (
      <div className="py-24 max-w-7xl mx-auto px-4 sm:px-0">
        <LoadingState message="Retrieving deliverables..." />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 px-4 sm:px-0 animate-[fadeIn_0.3s_ease]">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-gray-100">
        <div>
          <h1 className="text-2xl sm:text-3xl font-normal text-gray-900 font-outfit uppercase tracking-tight">Analytics Performance</h1>
        </div>
      </div>

      {/* Creator Deliverables Table */}
      <Card className="border-none shadow-xl bg-white/80 backdrop-blur-md overflow-hidden">
        <CardHeader className="p-6 border-b border-gray-150/10">
          <h2 className="text-sm font-normal text-gray-900 uppercase tracking-widest font-outfit">Creator Deliverables</h2>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[950px] align-middle">
              <thead>
                <tr className="text-[10px] font-normal text-gray-400 uppercase tracking-widest border-b border-gray-100 bg-gray-50/50">
                  <th className="px-6 py-4">Creator</th>
                  <th className="px-6 py-4">Campaign</th>
                  <th className="px-6 py-4">Platform & Type</th>
                  <th className="px-6 py-4">Deliverables Status</th>
                  <th className="px-6 py-4">Next Due Date</th>
                  <th className="px-6 py-4 text-center">Total Deliverables</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {groupedAnalytics.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500 text-xs uppercase tracking-wider">
                      No content deliverables recorded in the system.
                    </td>
                  </tr>
                ) : (
                  groupedAnalytics.map((group: any) => {
                    const profileKey = `${group.creatorId}-${group.campaignId}`;
                    return (
                      <tr 
                        key={profileKey}
                        onClick={() => navigate(`/analytics/creator-campaign/${group.creatorId}/${group.campaignId}`)}
                        className="hover:bg-primary-50/10 transition-colors text-xs cursor-pointer"
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <img 
                              src={group.Creator?.profile_pic || `https://ui-avatars.com/api/?name=${encodeURIComponent(group.Creator?.full_name || 'C')}&background=random`} 
                              alt="" 
                              className="w-8 h-8 rounded-full border border-gray-200 object-cover"
                            />
                            <div>
                              <div className="font-normal text-gray-900 text-xs uppercase tracking-tight font-outfit leading-tight">{group.Creator?.full_name}</div>
                              <div className="text-[9px] text-gray-400 uppercase tracking-wider mt-0.5">@{group.Creator?.handle}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 font-normal text-gray-900 text-xs uppercase tracking-tight font-outfit leading-tight max-w-[200px]">
                          {group.Campaign?.name}
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-col gap-2">
                            {group.deliverables.map((d: any, idx: number) => {
                              const typeLabel = d.content_type?.replace('instagram_', '').replace('youtube_', '').replace('tiktok_', '').replace('_', ' ').replace('video', '').replace('post', '').replace('short', '').replace('reel', 'REEL').replace('story', 'STORY').toUpperCase();
                              return (
                                <span key={idx} className="text-[10px] text-gray-500 font-mono font-medium uppercase block">
                                  {typeLabel}
                                </span>
                              );
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-col gap-2">
                            {group.deliverables.map((d: any, idx: number) => {
                              const typeLabel = d.content_type?.replace('instagram_', '').replace('youtube_', '').replace('tiktok_', '').replace('_', ' ').replace('video', '').replace('post', '').replace('short', '').replace('reel', 'REEL').replace('story', 'STORY').toUpperCase();
                              return (
                                <div key={idx} className="flex items-center gap-1.5 text-[9px] font-mono uppercase">
                                  <span className="text-gray-400 font-medium inline-block w-14">{typeLabel}:</span>
                                  <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold ${
                                    d.status === 'published' ? 'bg-green-50 text-green-700' :
                                    d.status === 'approved' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
                                  }`}>
                                    {d.status}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-5 text-gray-650 font-mono leading-tight">
                          {group.earliestDueDate ? (
                            <>
                              <div>{format(new Date(group.earliestDueDate), 'MMM d,')}</div>
                              <div>{format(new Date(group.earliestDueDate), 'yyyy')}</div>
                            </>
                          ) : '---'}
                        </td>
                        <td className="px-6 py-5 text-center font-bold text-gray-800 text-xs">
                          {group.totalCount}
                        </td>
                        <td className="px-6 py-5 text-right" onClick={e => e.stopPropagation()}>
                          <Button 
                            size="sm" 
                            onClick={() => navigate(`/analytics/creator-campaign/${group.creatorId}/${group.campaignId}`)}
                            className="bg-primary-600 hover:bg-primary-700 text-white font-normal uppercase tracking-widest text-[9px] min-h-[32px] px-4 shadow-sm"
                          >
                            View Details
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
