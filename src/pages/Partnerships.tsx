import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { LoadingState } from '../components/ui/LoadingState';
import { Modal } from '../components/ui/Modal';
import { OfferModal } from '../components/workflow/OfferModal';
import { ShipmentModal } from '../components/workflow/ShipmentModal';
import {
  getPartnerships, 
  getCampaigns,
  markQualified,
  markAccepted,
  activatePartnership,
  completePartnership,
  rejectPartnership,
  updatePartnership
} from '../lib/api';
import { 
  Search, 
  Coins, 
  Edit3,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';

export default function Partnerships() {
  const navigate = useNavigate();
  const [partnerships, setPartnerships] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Filters
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedTier, setSelectedTier] = useState('');
  const [selectedOfferType, setSelectedOfferType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals
  const [activePartnership, setActivePartnership] = useState<any | null>(null);
  // Shared Modal States
  const [showSharedOfferModal, setShowSharedOfferModal] = useState(false);
  const [showSharedShipmentModal, setShowSharedShipmentModal] = useState(false);

  const fetchCampaignsAndPartnerships = async () => {
    try {
      const [campaignsList, partnershipsList] = await Promise.all([
        getCampaigns(),
        getPartnerships()
      ]);
      setCampaigns(campaignsList);
      setPartnerships(partnershipsList);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaignsAndPartnerships();
  }, []);

  const handleAction = async (id: string, action: string) => {
    try {
      setLoading(true);
      if (action === 'qualify') {
        await markQualified(id);
      } else if (action === 'accept') {
        await markAccepted(id);
      } else if (action === 'activate') {
        await activatePartnership(id);
      } else if (action === 'complete') {
        await completePartnership(id);
      } else if (action === 'reject') {
        if (window.confirm('Are you sure you want to reject this partnership?')) {
          await rejectPartnership(id);
        } else {
          setLoading(false);
          return;
        }
      }
      const updated = await getPartnerships();
      setPartnerships(updated);
    } catch (err) {
      alert('Action failed: ' + err);
    } finally {
      setLoading(false);
    }
  };

  const openOfferModal = (p: any) => {
    setActivePartnership(p);
    setShowSharedOfferModal(true);
  };

  const openShipmentModal = (p: any) => {
    setActivePartnership(p);
    setShowSharedShipmentModal(true);
  };

  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    creator_tier: 'unknown',
    contract_required: false,
    contract_signed: false,
    contract_url: '',
    start_date: '',
    end_date: '',
    activation_notes: '',
    internal_notes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const openEditModal = (p: any) => {
    setActivePartnership(p);
    setEditForm({
      creator_tier: p.creator_tier || 'unknown',
      contract_required: p.contract_required || false,
      contract_signed: p.contract_signed || false,
      contract_url: p.contract_url || '',
      start_date: p.start_date || '',
      end_date: p.end_date || '',
      activation_notes: p.activation_notes || '',
      internal_notes: p.internal_notes || ''
    });
    setShowEditModal(true);
  };

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePartnership) return;
    setSubmitting(true);
    try {
      await updatePartnership(activePartnership.id, {
        creator_tier: editForm.creator_tier,
        contract_required: editForm.contract_required,
        contract_signed: editForm.contract_signed,
        contract_url: editForm.contract_url || null,
        start_date: editForm.start_date || null,
        end_date: editForm.end_date || null,
        activation_notes: editForm.activation_notes || null,
        internal_notes: editForm.internal_notes || null
      });
      setShowEditModal(false);
      const updated = await getPartnerships();
      setPartnerships(updated);
    } catch (err) {
      alert('Failed to update details: ' + err);
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = partnerships.filter(p => {
    // Hide pre-activated creators by default since they haven't been officially activated yet.
    if (!selectedStatus && ['engaged', 'qualified', 'meeting_scheduled', 'offer_sent', 'accepted'].includes(p.status)) return false;

    // Search
    if (search) {
      const q = search.toLowerCase();
      const matchCreator = p.Creator?.handle?.toLowerCase().includes(q) || p.Creator?.full_name?.toLowerCase().includes(q);
      const matchCampaign = p.Campaign?.name?.toLowerCase().includes(q);
      if (!matchCreator && !matchCampaign) return false;
    }
    // Dropdowns
    if (selectedCampaign && p.campaign_id !== selectedCampaign) return false;
    if (selectedStatus && p.status !== selectedStatus) return false;
    if (selectedTier && p.creator_tier !== selectedTier) return false;
    if (selectedOfferType && p.offer_type !== selectedOfferType) return false;
    
    let matchesDate = true;
    if (startDate || endDate) {
      const pDate = p.start_date ? new Date(p.start_date) : (p.createdAt ? new Date(p.createdAt) : new Date());
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0,0,0,0);
        if (pDate < start) matchesDate = false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23,59,59,999);
        if (pDate > end) matchesDate = false;
      }
    }
    if (!matchesDate) return false;
    
    return true;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20 px-4 sm:px-0 animate-[fadeIn_0.3s_ease]">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-normal text-gray-900 font-outfit uppercase tracking-tight">
            Creator Partnerships
          </h1>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="border-none shadow-xl bg-white/80 backdrop-blur-md">
        <div className="p-6 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex gap-2 w-full sm:max-w-md flex-1">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search creator..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all font-outfit"
                />
              </div>
            </div>
            <div className="text-sm text-gray-500 font-normal sm:ml-auto">
              {filtered.length} records found
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedCampaign}
              onChange={(e) => setSelectedCampaign(e.target.value)}
              className="bg-white border border-gray-200 text-gray-700 text-xs font-normal uppercase tracking-tight rounded-lg py-2.5 px-3 focus:outline-none focus:ring-1 focus:ring-primary-500 font-outfit min-w-[150px]"
            >
              <option value="">All Campaigns</option>
              {campaigns.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-white border border-gray-200 text-gray-700 text-xs font-normal uppercase tracking-tight rounded-lg py-2.5 px-3 focus:outline-none focus:ring-1 focus:ring-primary-500 font-outfit min-w-[150px]"
            >
              <option value="">All Statuses</option>
              <option value="engaged">Engaged</option>
              <option value="meeting_scheduled">Meeting Scheduled</option>
              <option value="qualified">Qualified</option>
              <option value="offer_sent">Offer Sent</option>
              <option value="accepted">Accepted</option>
              <option value="activated">Activated</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
            </select>

            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
              className="bg-white border border-gray-200 text-gray-700 text-xs font-normal uppercase tracking-tight rounded-lg py-2.5 px-3 focus:outline-none focus:ring-1 focus:ring-primary-500 font-outfit min-w-[150px]"
            >
              <option value="">All Tiers</option>
              <option value="nano">Nano (&lt;10k)</option>
              <option value="micro">Micro (10k-50k)</option>
              <option value="mid_tier">Mid Tier (50k-100k)</option>
              <option value="macro">Macro (100k-500k)</option>
              <option value="celebrity">Celebrity (500k+)</option>
            </select>

            <select
              value={selectedOfferType}
              onChange={(e) => setSelectedOfferType(e.target.value)}
              className="bg-white border border-gray-200 text-gray-700 text-xs font-normal uppercase tracking-tight rounded-lg py-2.5 px-3 focus:outline-none focus:ring-1 focus:ring-primary-500 font-outfit min-w-[150px]"
            >
              <option value="">All Offer Types</option>
              <option value="free_product">Free Product</option>
              <option value="affiliate_commission">Affiliate Only</option>
              <option value="flat_fee">Flat Fee</option>
              <option value="hybrid">Hybrid</option>
            </select>

            {/* Date Range Selector */}
            <div className="flex items-center gap-3 border border-gray-200 rounded-lg py-2 px-3 bg-white shadow-sm">
              <Calendar size={14} className="text-gray-400" />
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-normal text-gray-500 uppercase tracking-widest font-outfit">From</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-transparent border-none text-gray-700 text-xs font-normal uppercase tracking-tight outline-none focus:ring-0 font-outfit p-0 cursor-pointer focus:outline-none"
                />
              </div>
              <span className="text-gray-300">|</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-normal text-gray-500 uppercase tracking-widest font-outfit">To</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent border-none text-gray-700 text-xs font-normal uppercase tracking-tight outline-none focus:ring-0 font-outfit p-0 cursor-pointer focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Main Table */}
      <Card className="overflow-hidden border-none shadow-2xl bg-white">
        {loading ? (
          <div className="py-20">
            <LoadingState message="Retrieving CRM Partnerships..." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[1200px]">
              <thead>
                <tr className="text-[10px] font-normal text-gray-400 uppercase tracking-widest border-b border-gray-100 bg-gray-50/50">
                  <th className="px-8 py-5">Creator</th>
                  <th className="px-8 py-5">Campaign</th>
                  <th className="px-8 py-5 text-center">Status</th>
                  <th className="px-8 py-5 text-center">Tier</th>
                  <th className="px-8 py-5">Offer Parameters</th>
                  <th className="px-8 py-5 text-center">Start Date</th>
                  <th className="px-8 py-5 text-center">End Date</th>
                  <th className="px-8 py-5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(p => (
                  <tr 
                    key={p.id} 
                    onClick={() => navigate(`/partnerships/${p.id}`)}
                    className="hover:bg-primary-50/10 transition-colors cursor-pointer"
                  >
                    <td className="px-8 py-5 align-middle">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex flex-shrink-0 items-center justify-center font-normal text-sm uppercase ring-2 ring-white shadow-sm overflow-hidden">
                          {p.Creator?.profile_pic ? (
                            <img src={p.Creator.profile_pic} alt="" className="w-full h-full object-cover" />
                          ) : (
                            (p.Creator?.full_name || p.Creator?.handle)?.charAt(0) || 'C'
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-normal text-gray-900 text-xs uppercase tracking-tight font-outfit leading-tight line-clamp-2 whitespace-normal break-words max-w-[150px]">
                            {p.Creator?.full_name || `@${p.Creator?.handle}`}
                          </div>
                          <div className="flex gap-2 mt-1.5">
                            <span className="text-[11px] text-gray-500 normal-case tracking-normal">@{p.Creator?.handle}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 align-middle">
                      <div className="font-normal text-gray-900 text-xs uppercase tracking-tight font-outfit leading-tight truncate max-w-[200px]">{p.Campaign?.name}</div>
                    </td>
                    <td className="px-8 py-5 text-center align-middle">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-8 py-5 text-center align-middle">
                      <span className="px-2 py-0.5 rounded text-[10px] font-normal bg-gray-100 text-gray-600 uppercase tracking-wider">
                        {p.creator_tier?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-8 py-5 align-middle text-xs">
                      {p.offer_type ? (
                        <div className="space-y-1">
                          <div className="font-normal text-gray-900 text-xs uppercase tracking-tight font-outfit leading-tight flex items-center gap-1">
                            <Coins size={12} className="text-amber-500" /> {p.offer_type.replace('_', ' ')}
                          </div>
                          {p.flat_fee > 0 && <div className="text-[11px] text-gray-500 tracking-normal">${p.flat_fee} {p.currency}</div>}
                          {p.affiliate_enabled && (
                            <div className="text-primary-600 bg-primary-50/50 border border-primary-100/50 rounded px-1.5 py-0.5 inline-block text-[10px] uppercase font-mono mt-1">
                              Code: {p.affiliate_code || '---'} ({p.affiliate_percentage || 0}%)
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">No offer drafted</span>
                      )}
                    </td>
                    <td className="px-8 py-5 text-center align-middle text-xs text-gray-650 font-mono">
                      {p.start_date ? format(new Date(p.start_date), 'MMM d, yyyy') : <span className="text-gray-400 italic">---</span>}
                    </td>
                    <td className="px-8 py-5 text-center align-middle text-xs text-gray-650 font-mono">
                      {p.end_date ? format(new Date(p.end_date), 'MMM d, yyyy') : <span className="text-gray-400 italic">---</span>}
                    </td>
                    <td className="px-8 py-5 align-middle" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-2">
                        {p.status === 'engaged' && (
                          <Button size="sm" className="bg-indigo-600 text-white font-normal uppercase tracking-widest text-[9px] min-h-[32px] px-2.5" onClick={() => handleAction(p.id, 'qualify')}>
                            Qualify
                          </Button>
                        )}
                        {p.status === 'qualified' && (
                          <Button size="sm" className="bg-primary-600 text-white font-normal uppercase tracking-widest text-[9px] min-h-[32px] px-2.5" onClick={() => openOfferModal(p)}>
                            Send Offer
                          </Button>
                        )}
                        {p.status === 'offer_sent' && (
                          <Button size="sm" variant="outline" className="text-gray-600 font-normal uppercase tracking-widest text-[9px] min-h-[32px] px-2.5 border-gray-200 bg-gray-50 hover:bg-gray-100" onClick={() => openOfferModal(p)}>
                            Resend Offer
                          </Button>
                        )}
                        {p.status === 'accepted' && (
                          <Button size="sm" className="bg-blue-600 text-white font-normal uppercase tracking-widest text-[9px] min-h-[32px] px-2.5" onClick={() => openShipmentModal(p)}>
                            Create Shipment
                          </Button>
                        )}
                        {['product_shipped', 'product_delivered'].includes(p.status) && (
                          <Button size="sm" className="bg-amber-600 text-white font-normal uppercase tracking-widest text-[9px] min-h-[32px] px-2.5" onClick={() => handleAction(p.id, 'activate')}>
                            Activate
                          </Button>
                        )}
                        {p.status === 'activated' && (
                          <Button size="sm" className="bg-gray-800 text-white font-normal uppercase tracking-widest text-[9px] min-h-[32px] px-2.5" onClick={() => handleAction(p.id, 'complete')}>
                            Complete
                          </Button>
                        )}
                        <button 
                          onClick={() => openEditModal(p)}
                          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Edit parameters"
                        >
                          <Edit3 size={16} />
                        </button>
                        {p.status !== 'rejected' && p.status !== 'completed' && (
                          <button 
                            onClick={() => handleAction(p.id, 'reject')}
                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Reject partnership"
                          >
                            &times;
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-20 text-gray-400 italic">No partnerships matching criteria.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

      </Card>

      {/* ─── Edit Partnership Modal ─── */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Update Partnership Profile">
        <form onSubmit={submitEdit} className="space-y-4 font-outfit">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Creator Tier Size</label>
              <select
                value={editForm.creator_tier}
                onChange={e => setEditForm(prev => ({ ...prev, creator_tier: e.target.value }))}
                className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm"
              >
                <option value="unknown">Unknown</option>
                <option value="nano">Nano (&lt;10k)</option>
                <option value="micro">Micro (10k-50k)</option>
                <option value="mid_tier">Mid Tier (50k-100k)</option>
                <option value="macro">Macro (100k-500k)</option>
                <option value="celebrity">Celebrity (500k+)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Contract Signature Link</label>
              <input
                type="text"
                value={editForm.contract_url}
                onChange={e => setEditForm(prev => ({ ...prev, contract_url: e.target.value }))}
                className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm"
                placeholder="https://docusign.com/..."
              />
            </div>
          </div>

          <div className="flex gap-6 py-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="contract_required"
                checked={editForm.contract_required}
                onChange={e => setEditForm(prev => ({ ...prev, contract_required: e.target.checked }))}
                className="rounded text-primary-600 focus:ring-primary-500 h-4 w-4 border-gray-300"
              />
              <label htmlFor="contract_required" className="text-sm text-gray-700 select-none">Contract Required</label>
            </div>
            
            {editForm.contract_required && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="contract_signed"
                  checked={editForm.contract_signed}
                  onChange={e => setEditForm(prev => ({ ...prev, contract_signed: e.target.checked }))}
                  className="rounded text-primary-600 focus:ring-primary-500 h-4 w-4 border-gray-300"
                />
                <label htmlFor="contract_signed" className="text-sm text-gray-700 select-none">Contract Signed</label>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Campaign Start Date</label>
              <input
                type="date"
                value={editForm.start_date}
                onChange={e => setEditForm(prev => ({ ...prev, start_date: e.target.value }))}
                className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Campaign End Date</label>
              <input
                type="date"
                value={editForm.end_date}
                onChange={e => setEditForm(prev => ({ ...prev, end_date: e.target.value }))}
                className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Activation Notes</label>
            <textarea
              value={editForm.activation_notes}
              onChange={e => setEditForm(prev => ({ ...prev, activation_notes: e.target.value }))}
              className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm min-h-[60px]"
              placeholder="Fulfillment parameters, specific agreements..."
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Internal CRM Notes</label>
            <textarea
              value={editForm.internal_notes}
              onChange={e => setEditForm(prev => ({ ...prev, internal_notes: e.target.value }))}
              className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm min-h-[60px]"
              placeholder="Private details, scoring fits, follow up details..."
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="outline" className="flex-1 font-normal text-xs uppercase tracking-widest" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-normal text-xs uppercase tracking-widest">
              {submitting ? 'Saving...' : 'Save Parameters'}
            </Button>
          </div>
        </form>
      </Modal>

      <OfferModal
        isOpen={showSharedOfferModal}
        onClose={() => setShowSharedOfferModal(false)}
        partnership={activePartnership}
        onSuccess={() => fetchCampaignsAndPartnerships()}
      />

      <ShipmentModal
        isOpen={showSharedShipmentModal}
        onClose={() => setShowSharedShipmentModal(false)}
        creator={activePartnership?.Creator}
        partnership={activePartnership}
        onSuccess={() => fetchCampaignsAndPartnerships()}
      />
    </div>
  );
}
