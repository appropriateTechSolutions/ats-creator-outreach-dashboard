import { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { OutreachPreviewModal } from '../components/ui/OutreachPreviewModal';
import { Check, X } from 'lucide-react';
import { Link as RouterLink } from 'react-router-dom';
import { LoadingState } from '../components/ui/LoadingState';
import { Table, Thead, Tbody, Tr, Th, Td } from '../components/ui/Table';
import { getAllCreators, reviewLead } from '../lib/api';
import type { Creator } from '../types';

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
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-2xl sm:text-3xl font-normal text-gray-900 font-outfit uppercase tracking-tight">Review Queue</h1>
        <div className="text-sm font-normal text-gray-500 bg-gray-100 px-3 py-1 rounded-full uppercase tracking-widest">
          {queue.length} Pending
        </div>
      </div>

      <Card className="shadow-xl shadow-gray-200/50 border-gray-200 overflow-hidden">
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
                        <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex flex-shrink-0 items-center justify-center font-normal text-sm uppercase ring-2 ring-white shadow-sm">
                          {(c.full_name || c.handle)?.charAt(0)}
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
