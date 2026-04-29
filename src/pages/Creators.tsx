import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Table, Thead, Tbody, Tr, Th, Td } from '../components/ui/Table';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ScoreBadge } from '../components/ui/ScoreBadge';
import { Button } from '../components/ui/Button';
import { Search, Filter, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getAllCreators, reviewLead, sendSingleOutreach } from '../lib/api';
import type { Creator } from '../types';
import { format } from 'date-fns';
import { Check, X, Mail } from 'lucide-react';
import { OutreachPreviewModal } from '../components/ui/OutreachPreviewModal';

export default function Creators() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [outreachModalCreatorId, setOutreachModalCreatorId] = useState<string | null>(null);

  const fetchCreators = () => {
    setLoading(true);
    getAllCreators()
      .then(data => setCreators(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCreators();
  }, []);

  const handleReview = async (id: string, action: 'approve' | 'reject') => {
    const creator = creators.find(c => c.id === id);
    if (action === 'approve' && (creator?.review_status === 'pending_review' || creator?.review_status === 'reviewed')) {
      setOutreachModalCreatorId(id);
      return;
    }
    setActionLoading(id);
    try {
      await reviewLead(id, action);
      fetchCreators();
    } catch (err) {
      alert('Failed to update creator: ' + err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmApprove = async (customSubject?: string, customBody?: string) => {
    if (!outreachModalCreatorId) return;
    setActionLoading(outreachModalCreatorId);
    try {
      await reviewLead(outreachModalCreatorId, 'approve', customSubject, customBody);
      fetchCreators();
    } catch (err) {
      alert('Failed to update creator: ' + err);
      throw err; // throw so modal doesn't close on error
    } finally {
      setActionLoading(null);
    }
  };

  const filteredCreators = creators.filter(c => 
    c.handle?.toLowerCase().includes(search.toLowerCase()) || 
    c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-[fadeIn_0.3s_ease]">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Global Creator Directory</h1>
          <p className="text-sm text-gray-500">View and filter all discovered leads across all campaigns.</p>
        </div>
      </div>

      <Card>
        <div className="p-4 border-b border-gray-100 flex flex-wrap gap-4 items-center justify-between bg-white rounded-t-[12px]">
          <div className="flex gap-3 items-center flex-1 max-w-2xl">
            <div className="relative w-full max-w-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={16} className="text-gray-400" />
              </div>
              <input 
                type="text" 
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by handle, name, or category..." 
                className="block w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            
            <select className="bg-white border border-gray-200 text-gray-700 text-sm rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-primary-500 min-w-[140px]">
              <option value="">Any Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>

            <Button variant="ghost" className="px-2 text-gray-500" icon={<Filter size={16}/>}>Advanced</Button>
          </div>
          <div className="text-sm text-gray-500 font-medium">
            {filteredCreators.length} records found
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-500">Loading creator database...</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <Thead>
                <Tr>
                  <Th>Creator Details</Th>
                  <Th>Category</Th>
                  <Th className="text-center">Followers</Th>
                  <Th className="text-center">Relevance</Th>
                  <Th className="text-center">Readiness</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredCreators.map(c => (
                  <Tr key={c.id}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex flex-shrink-0 items-center justify-center font-bold text-sm uppercase ring-2 ring-white shadow-sm">
                          {c.handle?.charAt(0)}
                        </div>
                        <div>
                          <Link to={`/creators/${c.id}`} className="font-bold text-gray-900 hover:text-primary-600 block leading-tight">
                            @{c.handle}
                          </Link>
                          <div className="text-[11px] text-gray-500 mt-0.5 truncate max-w-[180px]">{c.full_name || 'No Name Provided'}</div>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <div className="flex gap-1 flex-wrap max-w-[150px]">
                        {c.category?.split(',').slice(0, 2).map((cat, i) => (
                           <span key={i} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-semibold uppercase tracking-wider">{cat.trim().substring(0,10)}</span>
                        ))}
                      </div>
                    </Td>
                    <Td className="text-center font-medium text-gray-700 text-sm">
                       {c.followers_count ? (c.followers_count > 1000000 ? (c.followers_count/1000000).toFixed(1) + 'M' : (c.followers_count/1000).toFixed(1) + 'K') : '-'}
                    </Td>
                    <Td className="text-center">
                      <ScoreBadge score={c.relevance_score || 0} />
                    </Td>
                    <Td className="text-center">
                      <ScoreBadge score={c.outreach_readiness_score || 0} />
                    </Td>
                    <Td><StatusBadge status={c.review_status as any || 'pending'} /></Td>
                    <Td className="text-right">
                      {(c.review_status === 'hold' || !c.review_status || c.review_status === 'pending_review' || c.review_status === 'reviewed') && c.review_status !== 'approved' && c.review_status !== 'rejected' && (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleReview(c.id, 'approve')}
                            disabled={!!actionLoading}
                            className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                            title={c.review_status === 'hold' || !c.review_status ? 'Shortlist → Move to Review Queue' : 'Approve → Send outreach email'}
                          >
                            <Check size={16} />
                          </button>
                          <button
                            onClick={() => handleReview(c.id, 'reject')}
                            disabled={!!actionLoading}
                            className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                            title="Reject"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      )}
                    </Td>
                  </Tr>
                ))}
                {filteredCreators.length === 0 && (
                  <Tr>
                    <Td colSpan={7} className="text-center py-16 text-gray-500">
                      <div className="flex justify-center mb-3">
                        <Search size={32} className="text-gray-300" />
                      </div>
                      No creators match your search.
                    </Td>
                  </Tr>
                )}
              </Tbody>
            </Table>
          </div>
        )}
      </Card>
      
      <OutreachPreviewModal
        creatorId={outreachModalCreatorId || ''}
        isOpen={!!outreachModalCreatorId}
        onClose={() => setOutreachModalCreatorId(null)}
        onSend={handleConfirmApprove}
      />
    </div>
  );
}
