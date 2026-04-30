import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ScoreBadge } from '../components/ui/ScoreBadge';
import { OutreachPreviewModal } from '../components/ui/OutreachPreviewModal';
import { Check, X, Search, Instagram, Mail, Activity } from 'lucide-react';
import { getAllCreators, reviewLead } from '../lib/api';
import type { Creator } from '../types';

export default function ReviewQueue() {
  const [queue, setQueue] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [outreachModalCreatorId, setOutreachModalCreatorId] = useState<string | null>(null);

  const fetchQueue = async () => {
    try {
      const data = await getAllCreators();
      // Filter for pending items
      const pending = data.filter(c => !c.review_status || c.review_status === 'pending_review' || c.review_status === 'pending');
      // Sort by relevance score descending
      pending.sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
      setQueue(pending);
      setCurrentIndex(0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleReview = async (action: 'approve' | 'reject') => {
    const currentLead = queue[currentIndex];
    if (!currentLead) return;

    if (action === 'approve') {
      setOutreachModalCreatorId(currentLead.id);
      return;
    }

    try {
      await reviewLead(currentLead.id, action);
      
      // Visual transition
      if (currentIndex < queue.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        fetchQueue(); // refresh queue
      }
    } catch (err) {
      alert(`Failed to ${action} lead.`);
    }
  };

  const handleConfirmApprove = async (customSubject?: string, customBody?: string) => {
    if (!outreachModalCreatorId) return;
    try {
      await reviewLead(outreachModalCreatorId, 'approve', customSubject, customBody);
      if (currentIndex < queue.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        fetchQueue();
      }
    } catch (err) {
      alert('Failed to approve lead.');
      throw err;
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-gray-500">Loading pipeline queue...</div>;
  }

  const currentLead = queue[currentIndex];

  if (!currentLead) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto pb-12 animate-[fadeIn_0.3s_ease]">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-normal text-gray-900 font-outfit uppercase tracking-tight">Review Queue</h1>
        </div>
        <Card className="p-16 text-center border-dashed border-2 border-primary-200 bg-primary-50/30">
          <div className="w-16 h-16 bg-primary-100 text-primary-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check size={32} />
          </div>
          <h3 className="text-xl font-normal text-gray-900 font-outfit uppercase tracking-tight">Queue Empty!</h3>
          <p className="text-gray-500 mt-2 max-w-sm mx-auto">There are currently zero pending leads across all active campaigns. Great job maintaining inbox zero.</p>
          <Button onClick={fetchQueue} variant="outline" className="mt-6" icon={<Activity size={16}/>}>Refresh Queue</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12 animate-[fadeIn_0.3s_ease]">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-2xl font-bold text-gray-900">Review Queue</h1>
        <div className="text-sm font-normal text-gray-500 bg-gray-100 px-3 py-1 rounded-full uppercase tracking-widest">
          {currentIndex + 1} of {queue.length} Pending
        </div>
      </div>

      <Card className="shadow-xl shadow-gray-200/50 border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-gray-50 to-white px-8 py-6 border-b border-gray-100 flex items-start justify-between">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-full bg-primary-600 text-white flex items-center justify-center font-normal text-2xl uppercase shadow-inner font-outfit">
              {currentLead.handle?.charAt(0)}
            </div>
            <div>
              <h2 className="text-2xl font-normal text-gray-900 flex items-center gap-2 font-outfit uppercase tracking-tight">
                @{currentLead.handle}
              </h2>
              <p className="text-gray-500 font-normal">{currentLead.full_name || 'No full name provided'}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <ScoreBadge score={currentLead.relevance_score || 0} />
            <ScoreBadge score={currentLead.outreach_readiness_score || 0} />
          </div>
        </div>

        <CardContent className="px-8 py-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
               <h3 className="text-xs font-normal text-gray-400 uppercase tracking-widest mb-3">Audience & Reach</h3>
               <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
                 <div className="flex justify-between items-center">
                   <span className="text-sm text-gray-600 flex items-center gap-2"><Instagram size={14} className="text-pink-600"/> Followers</span>
                   <span className="font-normal text-gray-900">{currentLead.followers_count?.toLocaleString() || '-'}</span>
                 </div>
                 <div className="flex justify-between items-center">
                   <span className="text-sm text-gray-600">Engagement</span>
                   <span className="font-normal text-gray-900">{currentLead.engagement_rate ? `${(currentLead.engagement_rate * 100).toFixed(1)}%` : '-'}</span>
                 </div>
                 <div className="flex justify-between items-center">
                   <span className="text-sm text-gray-600">Category</span>
                   <span className="font-normal text-gray-900 capitalize text-right max-w-[120px] truncate">{currentLead.category || '-'}</span>
                 </div>
                 <div className="flex justify-between items-center">
                   <span className="text-sm text-gray-600">City</span>
                   <span className="font-normal text-gray-900 capitalize">{currentLead.city || '-'}</span>
                 </div>
               </div>
            </div>

            <div>
               <h3 className="text-xs font-normal text-gray-400 uppercase tracking-widest mb-3">Contact Discovery</h3>
               <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
                 <div className="flex justify-between items-center">
                   <span className="text-sm text-gray-600 flex items-center gap-2"><Mail size={14} className="text-primary-600"/> Email Present</span>
                   {currentLead.email ? (
                     <span className="px-2 py-0.5 rounded text-xs font-normal bg-success-100 text-success-700 uppercase tracking-widest">Yes</span>
                   ) : (
                     <span className="px-2 py-0.5 rounded text-xs font-normal bg-error-100 text-error-700 uppercase tracking-widest">Missing</span>
                   )}
                 </div>
                 {currentLead.email && (
                    <div className="mt-2 text-sm font-normal text-gray-900 truncate">
                      {currentLead.email}
                    </div>
                 )}
               </div>
            </div>
          </div>
          
          {currentLead.research_summary && (
            <div>
              <h3 className="text-xs font-normal text-gray-400 uppercase tracking-widest mb-3">AI Evaluation Summary</h3>
              <div className="text-sm text-gray-700 bg-primary-50/50 p-4 rounded-xl border border-primary-100 leading-relaxed min-h-[80px]">
                {currentLead.research_summary}
              </div>
            </div>
          )}
        </CardContent>

        <div className="grid grid-cols-2">
          <button 
            onClick={() => handleReview('reject')}
            className="flex items-center justify-center gap-2 py-6 bg-red-50 text-red-600 font-normal hover:bg-red-100 transition-colors border-t border-r border-red-100 group uppercase tracking-widest text-sm"
          >
            <X size={20} className="group-hover:scale-125 transition-transform" /> Reject Lead
          </button>
          <button 
            onClick={() => handleReview('approve')}
            className="flex items-center justify-center gap-2 py-6 bg-success-50 text-success-700 font-normal hover:bg-success-100 transition-colors border-t border-success-100 group uppercase tracking-widest text-sm"
          >
            <Check size={20} className="group-hover:scale-125 transition-transform" /> Approve Match
          </button>
        </div>
      </Card>
      
      {/* Mini queue preview */}
      {queue.length > 1 && (
        <div className="pt-6 border-t border-gray-200">
          <p className="text-xs font-normal text-gray-500 uppercase tracking-widest mb-3">Up Next</p>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {queue.slice(currentIndex + 1, currentIndex + 6).map((lead, idx) => (
              <div key={lead.id} className={`flex-shrink-0 flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-sm opacity-${100 - (idx * 15)}`}>
                <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-normal text-[10px]">
                  {lead.handle?.charAt(0).toUpperCase()}
                </div>
                <div className="text-xs font-normal text-gray-700">@{lead.handle}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <OutreachPreviewModal
        creatorId={outreachModalCreatorId || ''}
        isOpen={!!outreachModalCreatorId}
        onClose={() => setOutreachModalCreatorId(null)}
        onSend={handleConfirmApprove}
      />
    </div>
  );
}
