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
import { LoadingState } from '../components/ui/LoadingState';
import { Check, X, Mail } from 'lucide-react';
import { OutreachPreviewModal } from '../components/ui/OutreachPreviewModal';
import { useAuth } from '../contexts/AuthContext';

export default function Creators() {
  const { user } = useAuth();
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [outreachModalCreatorId, setOutreachModalCreatorId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');

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

  const filteredCreators = creators.filter(c => {
    const matchesSearch = 
      c.handle?.toLowerCase().includes(search.toLowerCase()) || 
      c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.category?.toLowerCase().includes(search.toLowerCase());
    
    if (!statusFilter) return matchesSearch;
    
    if (statusFilter === 'pending') {
      return matchesSearch && (c.review_status === 'pending' || c.review_status === 'pending_review' || c.review_status === 'hold' || c.review_status === 'reviewed' || !c.review_status);
    }
    
    return matchesSearch && c.review_status === statusFilter;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-[fadeIn_0.3s_ease]">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-normal text-gray-900 font-outfit uppercase tracking-tight">Global Creator Directory</h1>
          <p className="text-gray-500 font-normal">View and filter all discovered leads across all campaigns.</p>
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
            
            <select 
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-white border border-gray-200 text-gray-700 text-sm rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-primary-500 min-w-[140px]"
            >
              <option value="">Any Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>

          </div>
          <div className="text-sm text-gray-500 font-normal">
            {filteredCreators.length} records found
          </div>
        </div>

        {loading ? (
          <div className="py-20">
            <LoadingState message="Scouring Creator Database..." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <Thead>
                <Tr>
                  <Th>Creator Details</Th>
                  <Th>Category</Th>
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
                        <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex flex-shrink-0 items-center justify-center font-normal text-sm uppercase ring-2 ring-white shadow-sm">
                          {(c.full_name || c.handle)?.charAt(0)}
                        </div>
                        <div>
                          <Link to={`/creators/${c.id}`} className="font-normal text-gray-900 hover:text-primary-600 block leading-tight font-outfit uppercase tracking-tight">
                            {c.full_name || `@${c.handle}`}
                          </Link>
                          <div className="flex gap-2 mt-1.5">
                            <a 
                              href={c.profiles?.find(p => p.platform.toLowerCase() === 'instagram')?.profile_url || `https://instagram.com/${c.handle?.replace(/^@/, '')}`} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="text-[#E1306C] hover:scale-110 transition-transform"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
                            </a>
                            <a 
                              href={c.profiles?.find(p => p.platform.toLowerCase() === 'youtube')?.profile_url || `https://youtube.com/@${c.handle?.replace(/^@/, '')}`} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="text-[#FF0000] hover:scale-110 transition-transform"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 2-2h15a2 2 0 0 1 2 2 24.12 24.12 0 0 1 0 10 2 2 0 0 1-2 2h-15a2 2 0 0 1-2-2Z"/><path d="m10 15 5-3-5-3z"/></svg>
                            </a>
                            <a 
                              href={c.profiles?.find(p => p.platform.toLowerCase() === 'tiktok')?.profile_url || `https://tiktok.com/@${c.handle?.replace(/^@/, '')}`} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="text-gray-900 hover:scale-110 transition-transform"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/></svg>
                            </a>
                          </div>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <div className="flex gap-1 flex-wrap max-w-[150px]">
                        {c.category?.split(',').slice(0, 2).map((cat, i) => (
                           <span key={i} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-normal uppercase tracking-wider">{cat.trim().substring(0,10)}</span>
                        ))}
                      </div>
                    </Td>
                    <Td className="text-center">
                      <ScoreBadge score={c.relevance_score || 0} />
                    </Td>
                    <Td className="text-center">
                      <ScoreBadge score={c.outreach_readiness_score || 0} />
                    </Td>
                    <Td><StatusBadge status={c.review_status as any || 'pending'} /></Td>
                    <Td className="text-right">
                      {['super_admin', 'admin', 'operator', 'client_admin', 'client_marketing'].includes(user?.role || '') && (c.review_status === 'hold' || !c.review_status || c.review_status === 'pending_review' || c.review_status === 'reviewed') && c.review_status !== 'approved' && c.review_status !== 'rejected' && (
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
