import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getCreatorById, getCampaignById, reviewLead, sendSingleOutreach } from '../lib/api';
import type { Creator, Campaign } from '../types';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { ScoreBadge } from '../components/ui/ScoreBadge';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Button } from '../components/ui/Button';
import { ArrowLeft, Instagram, Youtube, UserCheck, Activity, Check, X, Mail } from 'lucide-react';

export default function CreatorDetail() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [creator, setCreator] = useState<Creator | null>(null);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = () => {
    if (!id) return;
    setLoading(true);
    
    getCreatorById(id)
      .then(async (data) => {
        setCreator(data);
        if (data.campaign_id) {
          try {
            const camp = await getCampaignById(data.campaign_id);
            setCampaign(camp);
          } catch (e) {
            console.error('No campaign found for lead');
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleReview = async (action: 'approve' | 'reject') => {
    if (!creator) return;
    setActionLoading(true);
    try {
      await reviewLead(creator.id, action);
      loadData();
    } catch (err) {
      alert('Action failed: ' + err);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-gray-500">Loading creator profile...</div>;
  }

  if (!creator) {
    return <div className="p-12 text-center text-error-500">Creator not found.</div>;
  }

  // Parse scoring_notes safely
  let scoringNotes = creator.scoring_notes;
  if (typeof scoringNotes === 'string') {
    try { scoringNotes = JSON.parse(scoringNotes); } catch { scoringNotes = {}; }
  }
  const breakdown = (scoringNotes as any)?.initial_breakdown || {};
  
  // Available platforms to check
  const platforms = [
    { key: 'instagram', label: 'Instagram', icon: <Instagram size={14} className="text-pink-600"/> },
    { key: 'youtube', label: 'YouTube', icon: <Youtube size={14} className="text-red-600"/> },
    { key: 'tiktok', label: 'TikTok', icon: <Activity size={14} className="text-black"/> }
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-[fadeIn_0.3s_ease]">
      <Link to="/creators" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors mb-4">
        <ArrowLeft size={16} className="mr-1" /> Back to Directory
      </Link>

      <Card>
        <div className="bg-gradient-to-r from-gray-50 to-white px-8 py-8 border-b border-gray-100 flex items-start justify-between rounded-t-[12px]">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-primary-600 text-white flex items-center justify-center font-black text-4xl uppercase shadow-lg shadow-primary-500/30 ring-4 ring-white">
              {creator.handle?.charAt(0)}
            </div>
            <div>
              <h1 className="text-3xl font-black text-gray-900 flex items-center gap-2">
                @{creator.handle}
              </h1>
              <p className="text-gray-500 font-medium text-lg mt-0.5">{creator.full_name || 'No full name provided'}</p>
              
              <div className="flex gap-2 mt-3">
                {creator.category?.split(',').map(c => (
                  <span key={c} className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded text-xs font-bold uppercase tracking-wider">{c.trim()}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-3">
            <div className="flex gap-2 mb-2">
               {(creator.review_status === 'hold' || !creator.review_status || creator.review_status === 'pending_review' || creator.review_status === 'reviewed') && creator.review_status !== 'approved' && creator.review_status !== 'rejected' && (
                 <>
                   <Button 
                     size="sm" 
                     variant="outline" 
                     className="text-red-600 border-red-200 hover:bg-red-50 px-3" 
                     onClick={() => handleReview('reject')}
                     disabled={actionLoading}
                   >
                     <X size={14} className="mr-1.5" /> Reject
                   </Button>
                   <Button 
                     size="sm" 
                     variant="outline" 
                     className="text-green-600 border-green-200 hover:bg-green-50 px-3" 
                     onClick={() => handleReview('approve')}
                     disabled={actionLoading}
                   >
                     <Check size={14} className="mr-1.5" />
                     {creator.review_status === 'hold' || !creator.review_status ? 'Shortlist →' : 'Approve ✓'}
                   </Button>
                 </>
               )}
            </div>
            <StatusBadge status={creator.review_status as any || 'pending'} />
            <div className="flex items-center gap-2 mt-2">
               <span className="text-xs font-bold text-gray-400 uppercase">Master Readiness:</span>
               <ScoreBadge score={creator.outreach_readiness_score || 0} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-8">
          
          {/* Platform Wise Scores */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2">
              <UserCheck size={18} className="text-primary-600" /> Platform-wise Score Breakdown
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {platforms.map(platform => {
                const pData = breakdown[platform.key];
                // Display the platform card if data exists OR if the creator has this platform true (even if data is 0)
                const hasPlatform = creator[`has_${platform.key}` as keyof Creator];
                
                if (!pData && !hasPlatform) return null;

                const score = pData?.score || 0;
                
                return (
                  <div key={platform.key} className="bg-gray-50 border border-gray-200 rounded-xl p-5 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-2 font-black text-gray-800 text-sm uppercase tracking-wide">
                        {platform.icon} {platform.label}
                      </div>
                      <div className={`text-xl font-black ${
                        score >= 70 ? 'text-green-600' :
                        score >= 40 ? 'text-primary-600' : 'text-gray-500'
                      }`}>
                        {score} <span className="text-xs text-gray-400 font-medium">/ 100</span>
                      </div>
                    </div>

                    {/* Show detailed logic points if we have them */}
                    {pData?.breakdown ? (
                      <div className="space-y-2 mt-4 pt-4 border-t border-gray-100">
                        {Object.entries(pData.breakdown).map(([key, val]) => (
                           <div key={key} className="flex justify-between items-center text-xs">
                             <span className="text-gray-500 capitalize">{key.replace(/_/g, ' ')}</span>
                             <span className="font-bold text-gray-700">+{val as number} points</span>
                           </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic mt-4 pt-4 border-t border-gray-100">No algorithm breakdown points available.</p>
                    )}
                  </div>
                );
              })}
            </div>
            
            {Object.keys(breakdown).length === 0 && (
              <div className="bg-gray-50 p-6 rounded-xl border border-dashed border-gray-300 text-center text-gray-500 text-sm">
                 Detailed platform-wise algorithm breakdown was not collected for this lead. Total score: {creator.outreach_readiness_score || 0}/100.
              </div>
            )}
          </div>
          
          <div className="space-y-6">
            <div>
               <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-4">Match Breakdown</h3>
               <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm space-y-4">
                 
                 <div className="flex justify-between items-center mb-2">
                   <span className="text-xs font-bold text-gray-900 uppercase tracking-widest">Total Match</span>
                   <span className="text-xl font-black text-primary-600">{Math.round(Number(creator.relevance_score) || 0)}%</span>
                 </div>
                 
                 <div className="space-y-3 pl-3 border-l-2 border-primary-100">
                    {/* City Match */}
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500 font-medium">City Match</span>
                      <span className="text-sm font-bold text-gray-900">
                        {Number(creator.relevance_score) >= 33 ? '+33.3%' : '0%'}
                      </span>
                    </div>
                    
                    {/* Niche Match */}
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500 font-medium">Niche Match</span>
                      <span className="text-sm font-bold text-gray-900">
                        {Number(creator.relevance_score) >= 66 ? '+33.3%' : '0%'}
                      </span>
                    </div>
                    
                    {/* Keyword Match */}
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500 font-medium">Keyword Match</span>
                      <span className="text-sm font-bold text-gray-900">
                        {Number(creator.relevance_score) >= 67 
                          ? `+${(Number(creator.relevance_score) - 66.6).toFixed(1)}%` 
                          : Number(creator.relevance_score) > 33 && Number(creator.relevance_score) < 66
                            ? `+${(Number(creator.relevance_score) - 33.3).toFixed(1)}%`
                            : '0%'}
                      </span>
                    </div>
                 </div>

                 <p className="text-[10px] text-gray-400 leading-tight mt-4 pt-4 border-t border-gray-100 italic">
                   * Match % determines how well they fit your specific search filters defined in the campaign.
                 </p>
                 
               </div>
            </div>
          </div>

        </div>
      </Card>
    </div>
  );
}
