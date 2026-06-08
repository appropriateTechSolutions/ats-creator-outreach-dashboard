import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { LoadingState } from '../components/ui/LoadingState';
import { Modal } from '../components/ui/Modal';
import { 
  getShipments, 
  getCampaigns,
  getPartnerships,
  createShipment,
  updateShipment
} from '../lib/api';
import { 
  Package, 
  Search, 
  Plus, 
  Truck, 
  ExternalLink,
  Edit2
} from 'lucide-react';

export default function Shipments() {
  const [shipments, setShipments] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [partnerships, setPartnerships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Filters
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeShipment, setActiveShipment] = useState<any | null>(null);

  // Form states
  const [createForm, setCreateForm] = useState({
    campaign_id: '',
    creator_id: '',
    product_name: '',
    product_sku: '',
    quantity: 1,
    recipient_name: '',
    shipping_address_line1: '',
    shipping_address_line2: '',
    shipping_city: '',
    shipping_state: '',
    shipping_zip: '',
    shipping_country: 'US',
    notes: ''
  });

  const [editForm, setEditForm] = useState({
    status: 'pending',
    carrier: '',
    tracking_number: '',
    tracking_url: '',
    notes: '',
    recipient_name: '',
    shipping_address_line1: '',
    shipping_address_line2: '',
    shipping_city: '',
    shipping_state: '',
    shipping_zip: '',
    shipping_country: 'US'
  });

  const [submitting, setSubmitting] = useState(false);

  // Fetch campaigns, shipments, and active partnerships
  const fetchData = async () => {
    try {
      const [campaignsList, shipmentsList, partnershipsList] = await Promise.all([
        getCampaigns(),
        getShipments(),
        getPartnerships()
      ]);
      setCampaigns(campaignsList);
      setShipments(shipmentsList);
      setPartnerships(partnershipsList);
    } catch (err) {
      console.error('Failed to load shipments data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.campaign_id || !createForm.creator_id || !createForm.product_name) {
      alert('Campaign, Creator, and Product Name are required');
      return;
    }
    setSubmitting(true);
    try {
      // Find partnership_id if exists
      const linkedPartnership = partnerships.find(
        p => p.creator_id === createForm.creator_id && p.campaign_id === createForm.campaign_id
      );

      await createShipment({
        ...createForm,
        partnership_id: linkedPartnership ? linkedPartnership.id : undefined
      });
      setShowCreateModal(false);
      
      // Reset form
      setCreateForm({
        campaign_id: '',
        creator_id: '',
        product_name: '',
        product_sku: '',
        quantity: 1,
        recipient_name: '',
        shipping_address_line1: '',
        shipping_address_line2: '',
        shipping_city: '',
        shipping_state: '',
        shipping_zip: '',
        shipping_country: 'US',
        notes: ''
      });

      setLoading(true);
      const updated = await getShipments();
      setShipments(updated);
    } catch (err) {
      alert('Failed to create shipment: ' + err);
    } finally {
      setSubmitting(false);
      setLoading(false);
    }
  };

  const openEditModal = (shipment: any) => {
    setActiveShipment(shipment);
    setEditForm({
      status: shipment.status || 'pending',
      carrier: shipment.carrier || '',
      tracking_number: shipment.tracking_number || '',
      tracking_url: shipment.tracking_url || '',
      notes: shipment.notes || '',
      recipient_name: shipment.recipient_name || '',
      shipping_address_line1: shipment.shipping_address_line1 || '',
      shipping_address_line2: shipment.shipping_address_line2 || '',
      shipping_city: shipment.shipping_city || '',
      shipping_state: shipment.shipping_state || '',
      shipping_zip: shipment.shipping_zip || '',
      shipping_country: shipment.shipping_country || 'US'
    });
    setShowEditModal(true);
  };

  const handleUpdateShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShipment) return;
    setSubmitting(true);
    try {
      await updateShipment(activeShipment.id, editForm);
      setShowEditModal(false);
      setLoading(true);
      const updatedList = await getShipments();
      const updatedPartnerships = await getPartnerships();
      setShipments(updatedList);
      setPartnerships(updatedPartnerships);
    } catch (err) {
      alert('Failed to update shipment: ' + err);
    } finally {
      setSubmitting(false);
      setLoading(false);
    }
  };

  const handleStatusChange = async (shipmentId: string, newStatus: string) => {
    try {
      setLoading(true);
      await updateShipment(shipmentId, { status: newStatus });
      const updatedList = await getShipments();
      const updatedPartnerships = await getPartnerships();
      setShipments(updatedList);
      setPartnerships(updatedPartnerships);
    } catch (err) {
      alert('Failed to update status: ' + err);
    } finally {
      setLoading(false);
    }
  };

  // Filtered shipments
  const filteredShipments = shipments.filter(s => {
    const creatorHandle = s.Creator?.handle || '';
    const creatorName = s.Creator?.full_name || '';
    const matchesSearch = creatorHandle.toLowerCase().includes(search.toLowerCase()) || 
                          creatorName.toLowerCase().includes(search.toLowerCase()) ||
                          s.product_name?.toLowerCase().includes(search.toLowerCase()) ||
                          s.tracking_number?.toLowerCase().includes(search.toLowerCase());

    const matchesCampaign = selectedCampaign ? s.campaign_id === selectedCampaign : true;
    const matchesStatus = selectedStatus ? s.status === selectedStatus : true;

    return matchesSearch && matchesCampaign && matchesStatus;
  });

  // Creators available for selected campaign in creation form (limit to partnered or registered creators)
  const availablePartners = partnerships.filter(p => p.campaign_id === createForm.campaign_id);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold uppercase tracking-wider text-gray-900 font-outfit">Product Shipments</h1>
          <p className="text-xs text-gray-500 mt-1">Track product delivery and inventory dispatch to influencers</p>
        </div>
        <Button 
          onClick={() => setShowCreateModal(true)}
          className="bg-primary-600 text-white font-normal uppercase tracking-widest text-xs flex items-center gap-2"
        >
          <Plus size={16} /> New Shipment
        </Button>
      </div>

      {/* Filters Bar */}
      <Card className="p-4 bg-white/80 backdrop-blur-md border border-gray-100 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search creator, product, tracking..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 w-full text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 font-outfit"
            />
          </div>

          {/* Campaign Filter */}
          <select
            value={selectedCampaign}
            onChange={(e) => setSelectedCampaign(e.target.value)}
            className="px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 font-outfit bg-white"
          >
            <option value="">All Campaigns</option>
            {campaigns.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 font-outfit bg-white"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending Dispatch</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="returned">Returned</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </Card>

      {/* Shipments List */}
      <Card className="border border-gray-100 overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-16">
            <LoadingState message="Loading product shipments..." />
          </div>
        ) : filteredShipments.length === 0 ? (
          <div className="py-20 text-center">
            <Package size={40} className="mx-auto text-gray-300 mb-3" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700 font-outfit">No Shipments Found</h3>
            <p className="text-xs text-gray-500 mt-1">Create a new shipment or adjust your search filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[1000px]">
              <thead>
                <tr className="text-[10px] font-normal text-gray-400 uppercase tracking-widest border-b border-gray-100 bg-gray-50/50">
                  <th className="px-6 py-4">Creator</th>
                  <th className="px-6 py-4">Campaign</th>
                  <th className="px-6 py-4">Product Details</th>
                  <th className="px-6 py-4">Destination</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4">Tracking info</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 bg-white">
                {filteredShipments.map((s) => (
                  <tr key={s.id} className="hover:bg-primary-50/10 transition-colors">
                    {/* Creator Info */}
                    <td className="px-6 py-4 align-middle">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-gray-100 overflow-hidden shrink-0 shadow-sm border border-gray-100 flex items-center justify-center">
                          {s.Creator?.profile_pic ? (
                            <img src={s.Creator.profile_pic} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="font-outfit text-xs uppercase text-gray-400">{s.Creator?.handle?.charAt(0) || 'C'}</span>
                          )}
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-gray-900 font-outfit">@{s.Creator?.handle}</div>
                          <div className="text-[10px] text-gray-400">{s.Creator?.full_name || 'Anonymous'}</div>
                        </div>
                      </div>
                    </td>

                    {/* Campaign */}
                    <td className="px-6 py-4 align-middle text-xs font-medium text-gray-800">
                      {s.Campaign?.name}
                    </td>

                    {/* Product details */}
                    <td className="px-6 py-4 align-middle">
                      <div className="text-xs font-medium text-gray-900">{s.product_name}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        {s.product_sku ? `SKU: ${s.product_sku}` : 'No SKU'} • Qty: {s.quantity}
                      </div>
                    </td>

                    {/* Destination Address */}
                    <td className="px-6 py-4 align-middle">
                      <div className="text-xs text-gray-800 font-medium">{s.recipient_name || 'No Name'}</div>
                      <div className="text-[10px] text-gray-500 mt-0.5 truncate max-w-[200px]" title={`${s.shipping_address_line1 || ''}, ${s.shipping_city || ''}`}>
                        {s.shipping_address_line1 ? `${s.shipping_address_line1}, ${s.shipping_city || ''}` : 'No address provided'}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="px-6 py-4 text-center align-middle">
                      <StatusBadge status={s.status} />
                    </td>

                    {/* Tracking */}
                    <td className="px-6 py-4 align-middle">
                      {s.tracking_number ? (
                        <div className="space-y-1">
                          <div className="text-xs font-mono font-medium text-gray-800 flex items-center gap-1.5">
                            <Truck size={12} className="text-gray-400" />
                            {s.carrier}: {s.tracking_number}
                          </div>
                          {s.tracking_url && (
                            <a 
                              href={s.tracking_url} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="text-[10px] text-primary-600 hover:underline flex items-center gap-0.5"
                            >
                              Track Shipment <ExternalLink size={10} />
                            </a>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-400 italic">No tracking info</span>
                      )}
                    </td>

                    {/* Action buttons */}
                    <td className="px-6 py-4 align-middle text-center">
                      <div className="flex items-center justify-center gap-2">
                        {s.status === 'pending' && (
                          <Button 
                            size="sm" 
                            className="bg-indigo-600 text-white font-normal uppercase tracking-widest text-[9px] min-h-[28px] px-2.5" 
                            onClick={() => handleStatusChange(s.id, 'shipped')}
                          >
                            Mark Shipped
                          </Button>
                        )}
                        {s.status === 'shipped' && (
                          <Button 
                            size="sm" 
                            className="bg-green-600 text-white font-normal uppercase tracking-widest text-[9px] min-h-[28px] px-2.5" 
                            onClick={() => handleStatusChange(s.id, 'delivered')}
                          >
                            Mark Delivered
                          </Button>
                        )}
                        <button 
                          onClick={() => openEditModal(s)}
                          className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                          title="Edit details"
                        >
                          <Edit2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* CREATE SHIPMENT MODAL */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create Product Shipment">
        <form onSubmit={handleCreateShipment} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Campaign selection */}
            <div>
              <label className="block text-[10px] font-normal uppercase tracking-wider text-gray-500 mb-1">Campaign</label>
              <select
                required
                value={createForm.campaign_id}
                onChange={(e) => setCreateForm({ ...createForm, campaign_id: e.target.value, creator_id: '' })}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
              >
                <option value="">Select Campaign</option>
                {campaigns.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Creator selection */}
            <div>
              <label className="block text-[10px] font-normal uppercase tracking-wider text-gray-500 mb-1">Creator</label>
              <select
                required
                disabled={!createForm.campaign_id}
                value={createForm.creator_id}
                onChange={(e) => {
                  const partner = availablePartners.find(p => p.creator_id === e.target.value);
                  setCreateForm({ 
                    ...createForm, 
                    creator_id: e.target.value,
                    recipient_name: partner?.Creator?.full_name || '',
                  });
                }}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white disabled:bg-gray-50 disabled:text-gray-400"
              >
                <option value="">Select Creator</option>
                {availablePartners.map(p => (
                  <option key={p.creator_id} value={p.creator_id}>@{p.Creator?.handle} ({p.Creator?.full_name || 'Anonymous'})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* Product Name */}
            <div className="col-span-2">
              <label className="block text-[10px] font-normal uppercase tracking-wider text-gray-500 mb-1">Product Name</label>
              <input
                type="text"
                required
                placeholder="e.g., Summer Hydration Kit"
                value={createForm.product_name}
                onChange={(e) => setCreateForm({ ...createForm, product_name: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 font-outfit"
              />
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-[10px] font-normal uppercase tracking-wider text-gray-500 mb-1">Quantity</label>
              <input
                type="number"
                min="1"
                required
                value={createForm.quantity}
                onChange={(e) => setCreateForm({ ...createForm, quantity: Number(e.target.value) || 1 })}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 font-outfit"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* SKU */}
            <div>
              <label className="block text-[10px] font-normal uppercase tracking-wider text-gray-500 mb-1">SKU (Optional)</label>
              <input
                type="text"
                placeholder="SKU-12345"
                value={createForm.product_sku}
                onChange={(e) => setCreateForm({ ...createForm, product_sku: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 font-outfit"
              />
            </div>

            {/* Recipient Name */}
            <div>
              <label className="block text-[10px] font-normal uppercase tracking-wider text-gray-500 mb-1">Recipient Name</label>
              <input
                type="text"
                required
                value={createForm.recipient_name}
                onChange={(e) => setCreateForm({ ...createForm, recipient_name: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 font-outfit"
              />
            </div>
          </div>

          {/* Shipping Address */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-700 mt-2 border-b border-gray-100 pb-1">Shipping Address</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] font-normal uppercase tracking-wider text-gray-400 mb-1">Address Line 1</label>
                <input
                  type="text"
                  required
                  placeholder="123 Main St"
                  value={createForm.shipping_address_line1}
                  onChange={(e) => setCreateForm({ ...createForm, shipping_address_line1: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 font-outfit"
                />
              </div>
              <div>
                <label className="block text-[9px] font-normal uppercase tracking-wider text-gray-400 mb-1">Address Line 2</label>
                <input
                  type="text"
                  placeholder="Apt 4B"
                  value={createForm.shipping_address_line2}
                  onChange={(e) => setCreateForm({ ...createForm, shipping_address_line2: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 font-outfit"
                />
              </div>
            </div>

            <div className="grid grid-cols-5 gap-2">
              <div className="col-span-2">
                <label className="block text-[9px] font-normal uppercase tracking-wider text-gray-400 mb-1">City</label>
                <input
                  type="text"
                  required
                  placeholder="City"
                  value={createForm.shipping_city}
                  onChange={(e) => setCreateForm({ ...createForm, shipping_city: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 font-outfit"
                />
              </div>
              <div>
                <label className="block text-[9px] font-normal uppercase tracking-wider text-gray-400 mb-1">State</label>
                <input
                  type="text"
                  required
                  placeholder="State"
                  value={createForm.shipping_state}
                  onChange={(e) => setCreateForm({ ...createForm, shipping_state: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 font-outfit"
                />
              </div>
              <div>
                <label className="block text-[9px] font-normal uppercase tracking-wider text-gray-400 mb-1">Zip Code</label>
                <input
                  type="text"
                  required
                  placeholder="Zip"
                  value={createForm.shipping_zip}
                  onChange={(e) => setCreateForm({ ...createForm, shipping_zip: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 font-outfit"
                />
              </div>
              <div>
                <label className="block text-[9px] font-normal uppercase tracking-wider text-gray-400 mb-1">Country</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. US, IN"
                  value={createForm.shipping_country}
                  onChange={(e) => setCreateForm({ ...createForm, shipping_country: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 font-outfit"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[10px] font-normal uppercase tracking-wider text-gray-500 mb-1">Internal Notes</label>
            <textarea
              rows={2}
              placeholder="Any specific delivery instructions..."
              value={createForm.notes}
              onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 font-outfit"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting} className="bg-primary-600 text-white">
              {submitting ? 'Creating...' : 'Create Shipment'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* EDIT/TRACK SHIPMENT MODAL */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Update Shipment Details & Tracking">
        <form onSubmit={handleUpdateShipment} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Shipment Status */}
            <div>
              <label className="block text-[10px] font-normal uppercase tracking-wider text-gray-500 mb-1">Shipment Status</label>
              <select
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white font-outfit"
              >
                <option value="pending">Pending Dispatch</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="returned">Returned</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Carrier */}
            <div>
              <label className="block text-[10px] font-normal uppercase tracking-wider text-gray-500 mb-1">Carrier</label>
              <input
                type="text"
                placeholder="e.g., USPS, UPS, FedEx"
                value={editForm.carrier}
                onChange={(e) => setEditForm({ ...editForm, carrier: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 font-outfit"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Tracking Number */}
            <div>
              <label className="block text-[10px] font-normal uppercase tracking-wider text-gray-500 mb-1">Tracking Number</label>
              <input
                type="text"
                placeholder="1Z999AA10123456784"
                value={editForm.tracking_number}
                onChange={(e) => setEditForm({ ...editForm, tracking_number: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 font-outfit"
              />
            </div>

            {/* Tracking URL */}
            <div>
              <label className="block text-[10px] font-normal uppercase tracking-wider text-gray-500 mb-1">Tracking Link</label>
              <input
                type="url"
                placeholder="https://www.ups.com/track?..."
                value={editForm.tracking_url}
                onChange={(e) => setEditForm({ ...editForm, tracking_url: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 font-outfit"
              />
            </div>
          </div>

          {/* Delivery Recipient Name */}
          <div>
            <label className="block text-[10px] font-normal uppercase tracking-wider text-gray-500 mb-1">Recipient Name</label>
            <input
              type="text"
              required
              value={editForm.recipient_name}
              onChange={(e) => setEditForm({ ...editForm, recipient_name: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 font-outfit"
            />
          </div>

          {/* Recipient Address */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-700 mt-2 border-b border-gray-100 pb-1">Delivery Address</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] font-normal uppercase tracking-wider text-gray-400 mb-1">Address Line 1</label>
                <input
                  type="text"
                  required
                  value={editForm.shipping_address_line1}
                  onChange={(e) => setEditForm({ ...editForm, shipping_address_line1: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 font-outfit"
                />
              </div>
              <div>
                <label className="block text-[9px] font-normal uppercase tracking-wider text-gray-400 mb-1">Address Line 2</label>
                <input
                  type="text"
                  value={editForm.shipping_address_line2}
                  onChange={(e) => setEditForm({ ...editForm, shipping_address_line2: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 font-outfit"
                />
              </div>
            </div>

            <div className="grid grid-cols-5 gap-2">
              <div className="col-span-2">
                <label className="block text-[9px] font-normal uppercase tracking-wider text-gray-400 mb-1">City</label>
                <input
                  type="text"
                  required
                  value={editForm.shipping_city}
                  onChange={(e) => setEditForm({ ...editForm, shipping_city: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 font-outfit"
                />
              </div>
              <div>
                <label className="block text-[9px] font-normal uppercase tracking-wider text-gray-400 mb-1">State</label>
                <input
                  type="text"
                  required
                  value={editForm.shipping_state}
                  onChange={(e) => setEditForm({ ...editForm, shipping_state: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 font-outfit"
                />
              </div>
              <div>
                <label className="block text-[9px] font-normal uppercase tracking-wider text-gray-400 mb-1">Zip Code</label>
                <input
                  type="text"
                  required
                  value={editForm.shipping_zip}
                  onChange={(e) => setEditForm({ ...editForm, shipping_zip: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 font-outfit"
                />
              </div>
              <div>
                <label className="block text-[9px] font-normal uppercase tracking-wider text-gray-400 mb-1">Country</label>
                <input
                  type="text"
                  required
                  value={editForm.shipping_country}
                  onChange={(e) => setEditForm({ ...editForm, shipping_country: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 font-outfit"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[10px] font-normal uppercase tracking-wider text-gray-500 mb-1">Shipment Notes</label>
            <textarea
              rows={2}
              value={editForm.notes}
              onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 font-outfit"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting} className="bg-primary-600 text-white">
              {submitting ? 'Updating...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
