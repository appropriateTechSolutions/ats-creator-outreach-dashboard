import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { LoadingState } from '../components/ui/LoadingState';
import { getContents, syncContentPerformance } from '../lib/api';
import { 
  ArrowLeft, 
  RefreshCw, 
  Eye, 
  Heart, 
  MessageSquare, 
  Share2, 
  Bookmark, 
  MousePointerClick, 
  Activity,
  Video,
  User,
  ExternalLink
} from 'lucide-react';

export default function AnalyticsDetail() {
  const { creatorId, campaignId } = useParams<{ creatorId: string; campaignId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [contents, setContents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContentDetail = async () => {
    if (!creatorId || !campaignId) return;
    try {
      setLoading(true);
      const data = await getContents({ creator_id: creatorId, campaign_id: campaignId });
      setContents(data);
    } catch (err) {
      console.error('Failed to load content deliverables:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContentDetail();
  }, [creatorId, campaignId]);

  const handleAction = async (action: string, contentId: string) => {
    try {
      setLoading(true);
      if (action === 'sync') {
        await syncContentPerformance(contentId);
      }
      const data = await getContents({ creator_id: creatorId, campaign_id: campaignId });
      setContents(data);
    } catch (err: any) {
      alert('Action failed: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const overallMetrics = useMemo(() => {
    let totalViews = 0;
    let totalLikes = 0;
    let totalComments = 0;
    let totalShares = 0;
    let totalSaves = 0;
    let totalClicks = 0;

    contents.forEach(c => {
      totalViews += Number(c.views || 0);
      totalLikes += Number(c.likes || 0);
      totalComments += Number(c.comments || 0);
      totalShares += Number(c.shares || 0);
      totalSaves += Number(c.saves || 0);
      totalClicks += Number(c.clicks || 0);
    });

    const engagementRate = totalViews > 0 ? ((totalLikes + totalComments) / totalViews) * 100 : 0;

    return {
      views: totalViews,
      likes: totalLikes,
      comments: totalComments,
      shares: totalShares,
      saves: totalSaves,
      clicks: totalClicks,
      engagementRate
    };
  }, [contents]);

  if (loading) {
    return (
      <div className="py-20 max-w-7xl mx-auto px-4 sm:px-0">
        <LoadingState message="Retrieving deliverables performance..." />
      </div>
    );
  }

  if (contents.length === 0) {
    return (
      <div className="py-20 max-w-7xl mx-auto px-4 sm:px-0 text-center">
        <h2 className="text-xl font-semibold text-gray-700">No content deliverables found</h2>
        <Link to="/analytics" className="text-primary-600 hover:underline mt-4 inline-block font-outfit uppercase text-xs tracking-widest">
          Back to Analytics Performance
        </Link>
      </div>
    );
  }

  const groupCreator = contents[0]?.Creator;
  const groupCampaign = contents[0]?.Campaign;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20 px-4 sm:px-0 animate-[fadeIn_0.3s_ease]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <button 
            onClick={() => navigate('/analytics')}
            className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-gray-900 uppercase tracking-widest transition-colors mb-3"
          >
            <ArrowLeft size={14} /> Back to Analytics Performance
          </button>
          <h1 className="text-2xl sm:text-3xl font-normal text-gray-900 font-outfit uppercase tracking-tight">
            Grouped Analytics Profile
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column: Deliverable Profile Info */}
        <div className="lg:col-span-2 space-y-8">
          {/* Overall Performance Card */}
          <Card className="border-none shadow-xl bg-white p-6 sm:p-8 space-y-6">
            <div className="border-b border-gray-100 pb-4">
              <h2 className="text-sm font-normal text-gray-950 uppercase tracking-widest flex items-center gap-2 font-outfit">
                Grouped Performance Metrics
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-outfit">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <span className="text-[9px] text-gray-400 block uppercase font-normal tracking-widest mb-1">Total Views</span>
                <div className="flex items-center gap-1.5">
                  <Eye size={14} className="text-gray-400" />
                  <span className="text-lg font-normal text-gray-900 font-mono">
                    {overallMetrics.views.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <span className="text-[9px] text-gray-400 block uppercase font-normal tracking-widest mb-1">Total Likes</span>
                <div className="flex items-center gap-1.5">
                  <Heart size={14} className="text-gray-400" />
                  <span className="text-lg font-normal text-gray-900 font-mono">
                    {overallMetrics.likes.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <span className="text-[9px] text-gray-400 block uppercase font-normal tracking-widest mb-1">Total Comments</span>
                <div className="flex items-center gap-1.5">
                  <MessageSquare size={14} className="text-gray-400" />
                  <span className="text-lg font-normal text-gray-900 font-mono">
                    {overallMetrics.comments.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <span className="text-[9px] text-gray-400 block uppercase font-normal tracking-widest mb-1">Overall ER</span>
                <div className="flex items-center gap-1.5">
                  <Activity size={14} className="text-gray-400" />
                  <span className="text-lg font-semibold text-primary-700 font-mono">
                    {overallMetrics.engagementRate.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Individual Breakdown Card */}
          <Card className="border-none shadow-xl bg-white p-6 sm:p-8 space-y-6">
            <div className="border-b border-gray-100 pb-4">
              <h2 className="text-sm font-normal text-gray-950 uppercase tracking-widest flex items-center gap-2 font-outfit">
                Individual Deliverables Breakdown
              </h2>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">Breakdown of metrics per post / story / reel</p>
            </div>

            <div className="space-y-6">
              {contents.map((item: any) => {
                const typeLabel = item.content_type?.replace('instagram_', '').replace('youtube_', '').replace('tiktok_', '').replace('_', ' ');
                const itemViews = Number(item.views || 0);
                const itemLikes = Number(item.likes || 0);
                const itemComments = Number(item.comments || 0);
                const itemER = itemViews > 0 ? ((itemLikes + itemComments) / itemViews) * 100 : 0;

                return (
                  <div key={item.id} className="border border-gray-150/40 rounded-xl p-5 space-y-4 bg-gray-50/20">
                    <div className="flex justify-between items-start border-b border-gray-100 pb-3">
                      <div>
                        <span className="inline-block bg-primary-50 text-primary-700 text-[10px] font-semibold uppercase px-2 py-0.5 rounded tracking-wider">
                          {item.platform} - {typeLabel}
                        </span>
                        {item.published_url && (
                          <a 
                            href={item.published_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] text-primary-600 hover:text-primary-700 font-semibold uppercase tracking-wider ml-3"
                          >
                            Live URL <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={item.status} />
                        {item.published_url && (
                          <Button 
                            size="sm"
                            className="bg-primary-600 text-white font-normal uppercase tracking-widest text-[8px] min-h-[24px] px-2 flex items-center gap-1"
                            onClick={() => handleAction('sync', item.id)}
                          >
                            <RefreshCw size={8} /> Sync
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-outfit text-xs">
                      <div>
                        <span className="text-[9px] text-gray-440 uppercase font-normal tracking-widest block mb-0.5">Views</span>
                        <span className="font-mono text-gray-800">{itemViews.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-440 uppercase font-normal tracking-widest block mb-0.5">Likes</span>
                        <span className="font-mono text-gray-800">{itemLikes.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-440 uppercase font-normal tracking-widest block mb-0.5">Comments</span>
                        <span className="font-mono text-gray-800">{itemComments.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-440 uppercase font-normal tracking-widest block mb-0.5">Engagement Rate</span>
                        <span className="font-mono font-semibold text-primary-700">{itemER.toFixed(2)}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Right column: Relationships Info (Creator) */}
        <div className="lg:col-span-1 space-y-8">
          {/* Creator Profile */}
          <Card className="border-none shadow-xl bg-white p-6">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-1.5 font-outfit">
              <User size={14} /> Assigned Creator
            </h3>
            
            <div className="flex flex-col items-center text-center space-y-4 pt-2 font-outfit">
              <img 
                src={groupCreator?.profile_pic || `https://ui-avatars.com/api/?name=${encodeURIComponent(groupCreator?.full_name || 'C')}&background=random`} 
                alt="" 
                className="w-20 h-20 rounded-full border border-gray-200 object-cover shadow-md"
              />
              <div>
                <h4 className="font-normal text-gray-900 text-lg uppercase tracking-tight">
                  {groupCreator?.full_name}
                </h4>
                <div className="text-xs text-gray-550 mt-1 font-mono">@{groupCreator?.handle}</div>
                <div className="text-[11px] text-gray-450 mt-1 font-mono">{groupCreator?.email || 'No email registered'}</div>
              </div>

              <div className="w-full pt-4 border-t border-gray-100">
                <Link 
                  to={`/creators/${groupCreator?.id}`}
                  state={{ fromPath: location.pathname, fromLabel: 'ANALYTICS' }}
                  className="w-full text-center py-2 border border-gray-200 hover:border-gray-900 text-gray-750 hover:text-gray-950 rounded-lg text-xs tracking-wider uppercase font-normal block transition-colors bg-white font-outfit"
                >
                  View Creator Profile
                </Link>
              </div>
            </div>
          </Card>

          {/* Campaign Info Card */}
          {groupCampaign && (
            <Card className="border-none shadow-xl bg-white p-6 font-outfit">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
                Campaign Information
              </h3>
              <div className="space-y-3">
                <div>
                  <span className="text-[9px] text-gray-400 block uppercase font-normal tracking-widest">Campaign Name</span>
                  <span className="text-sm font-normal text-gray-800">{groupCampaign.name}</span>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
