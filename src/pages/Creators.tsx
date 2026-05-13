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
import { Check, X, Instagram, Youtube, Activity } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Creators() {
  const { user } = useAuth();
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
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

  const filteredCreators = creators.filter(c => {
    const matchesSearch = 
      c.handle?.toLowerCase().includes(search.toLowerCase()) || 
      c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.category?.toLowerCase().includes(search.toLowerCase());

    // Handle specific status filters
    if (statusFilter === 'hold') {
      return matchesSearch && (c.review_status === 'hold' || !c.review_status || c.review_status === 'pending') && c.lifecycle_status !== 'not_respond';
    }

    if (statusFilter === 'pending') {
      return matchesSearch && c.review_status === 'pending_review' && c.lifecycle_status !== 'not_respond';
    }

    if (statusFilter === 'not_respond') {
      return matchesSearch && c.lifecycle_status === 'not_respond';
    }

    // Default: If a status filter is selected, match it. If not, show all that match search.
    if (!statusFilter) return matchesSearch;
    
    return matchesSearch && c.review_status === statusFilter;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-[fadeIn_0.3s_ease]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-normal text-gray-900 font-outfit uppercase tracking-tight">Global Creator Directory</h1>
        </div>
      </div>

      <Card>
        <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gray-50/30">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-4 top-3.5 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search global identities..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-xl text-sm font-normal text-gray-900 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all shadow-sm"
            />
          </div>
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <select 
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full sm:w-auto bg-white border border-gray-200 text-gray-700 text-sm rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-primary-500 min-w-[140px]"
            >
              <option value="">Any Status</option>
              <option value="hold">Discovered</option>
              <option value="pending">Pending Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="not_respond">Not Responsive</option>
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
                          <Link to={`/creators/${c.id}`} className="font-normal text-gray-900 hover:text-primary-600 transition-colors text-sm uppercase tracking-tight font-outfit">
                            {c.full_name || `@${c.handle}`}
                          </Link>
                          <div className="flex gap-2 mt-1.5">
                            {c.has_instagram && (
                              <a 
                                href={c.profiles?.find(p => p.platform.toLowerCase() === 'instagram')?.profile_url || `https://instagram.com/${c.handle?.replace(/^@/, '')}`} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="text-[#E1306C] hover:scale-110 transition-transform"
                                title="Instagram"
                              >
                                <Instagram size={14} />
                              </a>
                            )}
                            {c.has_youtube && (
                              <a 
                                href={c.profiles?.find(p => p.platform.toLowerCase() === 'youtube')?.profile_url || `https://youtube.com/@${c.handle?.replace(/^@/, '')}`} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="text-[#FF0000] hover:scale-110 transition-transform"
                                title="YouTube"
                              >
                                <Youtube size={14} />
                              </a>
                            )}
                            {c.has_tiktok && (
                              <a 
                                href={c.profiles?.find(p => p.platform.toLowerCase() === 'tiktok')?.profile_url || `https://tiktok.com/@${c.handle?.replace(/^@/, '')}`} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="text-gray-900 hover:scale-110 transition-transform"
                                title="TikTok"
                              >
                                <Activity size={14} />
                              </a>
                            )}
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
                    <Td><StatusBadge status={['not_respond'].includes(c.lifecycle_status) ? c.lifecycle_status : (c.review_status as any || 'pending')} /></Td>
                    <Td className="text-right">
                      {['super_admin', 'admin', 'operator', 'client_admin', 'client_marketing'].includes(user?.role || '') && (
                        <div className="flex justify-end gap-2">
                          {(c.review_status === 'hold' || !c.review_status || c.review_status === 'pending_review' || c.review_status === 'reviewed') && c.review_status !== 'approved' && c.review_status !== 'rejected' && c.lifecycle_status !== 'not_respond' && (
                            <>
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
                            </>
                          )}
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
    </div>
  );
}
