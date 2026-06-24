import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { LoadingState } from '../components/ui/LoadingState';
import { Modal } from '../components/ui/Modal';
import { useNavigate } from 'react-router-dom';
import {
  getShipments,
  getCampaigns,
  getPartnerships,
  createShipment,
  updateShipment,
  requestAddressShipment,
  markReadyToShipShipment,
  markShippedShipment,
  markDeliveredShipment,
  markFailedShipment,
  cancelShipment
} from '../lib/api';
import {
  Package,
  Search,
  Plus,
  Truck,
  ExternalLink,
  ChevronDown,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';

export default function Shipments() {
  const navigate = useNavigate();
  const [shipments, setShipments] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [partnerships, setPartnerships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Filters
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedCarrier, setSelectedCarrier] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Dropdown states
  const [openActionDropdownId, setOpenActionDropdownId] = useState<string | null>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
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
    estimated_delivery: '',
    notes: '',
    recipient_name: '',
    shipping_address_line1: '',
    shipping_address_line2: '',
    shipping_city: '',
    shipping_state: '',
    shipping_zip: '',
    shipping_country: 'US'
  });

  useEffect(() => {
    if (editForm.tracking_number && ['pending', 'ready_to_ship', 'address_requested'].includes(editForm.status)) {
      setEditForm(prev => ({ ...prev, status: 'shipped' }));
    }
  }, [editForm.tracking_number]);

  const [emailForm, setEmailForm] = useState({
    subject: '',
    body: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = () => setOpenActionDropdownId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

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
      const linkedPartnership = partnerships.find(
        p => p.creator_id === createForm.creator_id && p.campaign_id === createForm.campaign_id
      );

      await createShipment({
        ...createForm,
        partnership_id: linkedPartnership ? linkedPartnership.id : undefined
      });
      setShowCreateModal(false);

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
      estimated_delivery: shipment.estimated_delivery ? shipment.estimated_delivery.substring(0, 10) : '',
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

  const handleMarkShippedClick = (s: any) => {
    setActiveShipment(s);
    setEditForm({
      status: 'shipped',
      carrier: s.carrier || '',
      tracking_number: s.tracking_number || '',
      tracking_url: s.tracking_url || '',
      estimated_delivery: s.estimated_delivery ? s.estimated_delivery.substring(0, 10) : '',
      notes: s.notes || '',
      recipient_name: s.recipient_name || '',
      shipping_address_line1: s.shipping_address_line1 || '',
      shipping_address_line2: s.shipping_address_line2 || '',
      shipping_city: s.shipping_city || '',
      shipping_state: s.shipping_state || '',
      shipping_zip: s.shipping_zip || '',
      shipping_country: s.shipping_country || 'US'
    });
    setShowEditModal(true);
  };

  const handleDirectMarkShipped = async (s: any) => {
    try {
      setLoading(true);
      const { markShippedShipment } = await import('../lib/api');
      await markShippedShipment(s.id, {
        carrier: s.carrier || '',
        tracking_number: s.tracking_number || '',
        tracking_url: s.tracking_url || '',
        estimated_delivery: s.estimated_delivery ? s.estimated_delivery.substring(0, 10) : null
      });
      const updatedList = await getShipments();
      setShipments(updatedList);
      setActiveShipment(s);
      setShowSuccessModal(true);
    } catch (err) {
      alert('Failed to mark shipped: ' + err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShipment) return;
    setSubmitting(true);
    try {
      const payload = {
        ...editForm,
        estimated_delivery: editForm.estimated_delivery || null
      };

      if (editForm.status === 'shipped' && activeShipment.status !== 'shipped') {
        await markShippedShipment(activeShipment.id, {
          carrier: editForm.carrier,
          tracking_number: editForm.tracking_number,
          tracking_url: editForm.tracking_url,
          estimated_delivery: editForm.estimated_delivery || null
        });
      } else {
        await updateShipment(activeShipment.id, payload);
      }

      setShowEditModal(false);
      setLoading(true);
      const updatedList = await getShipments();
      const updatedPartnerships = await getPartnerships();
      setShipments(updatedList);
      setPartnerships(updatedPartnerships);

      if (editForm.status === 'shipped') {
        setShowSuccessModal(true);
      }
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
      if (newStatus === 'address_requested') {
        const shipment = shipments.find(s => s.id === shipmentId);
        setActiveShipment(shipment);
        setEmailForm({
          subject: 'Action Required: Provide Shipping Address for Campaign',
          body: `Hi ${shipment?.Creator?.full_name || 'there'},\n\nWe are preparing to ship your product for the ${shipment?.Campaign?.name || 'campaign'}, but we need your shipping address.\n\nPlease provide it securely using the button below.\n\nThanks!`
        });
        setShowEmailModal(true);
        setLoading(false);
        return;
      } else if (newStatus === 'ready_to_ship') {
        await markReadyToShipShipment(shipmentId);
      } else if (newStatus === 'delivered') {
        await markDeliveredShipment(shipmentId);
      } else if (newStatus === 'failed') {
        await markFailedShipment(shipmentId);
      } else if (newStatus === 'cancelled') {
        await cancelShipment(shipmentId);
      } else {
        await updateShipment(shipmentId, { status: newStatus });
      }

      const updatedList = await getShipments();
      const updatedPartnerships = await getPartnerships();
      setShipments(updatedList);
      setPartnerships(updatedPartnerships);

      if (newStatus === 'shipped') {
        setShowSuccessModal(true);
      }
    } catch (err) {
      alert('Failed to update status: ' + err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendAddressRequest = async () => {
    if (!activeShipment) return;
    setSubmitting(true);
    try {
      await requestAddressShipment(activeShipment.id, {
        customSubject: emailForm.subject,
        customBody: emailForm.body
      });
      setShowEmailModal(false);
      setLoading(true);
      const updatedList = await getShipments();
      setShipments(updatedList);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || JSON.stringify(err);
      alert('Failed to send address request: ' + msg);
    } finally {
      setSubmitting(false);
      setLoading(false);
    }
  };


  // Extract unique carriers
  const uniqueCarriers = Array.from(
    new Set(shipments.map(s => s.carrier).filter(Boolean))
  ) as string[];

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
    const matchesCarrier = selectedCarrier ? s.carrier?.toLowerCase().includes(selectedCarrier.toLowerCase()) : true;

    let matchesDate = true;
    if (startDate || endDate) {
      const shipDate = s.createdAt ? new Date(s.createdAt) : (s.created_at ? new Date(s.created_at) : new Date());
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (shipDate < start) matchesDate = false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (shipDate > end) matchesDate = false;
      }
    }

    return matchesSearch && matchesCampaign && matchesStatus && matchesCarrier && matchesDate;
  });

  const availablePartners = partnerships.filter(p => p.campaign_id === createForm.campaign_id);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20 px-4 sm:px-0 animate-[fadeIn_0.3s_ease]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-normal text-gray-900 font-outfit uppercase tracking-tight">
            Product Shipments
          </h1>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary-600 text-white font-normal uppercase tracking-widest text-xs flex items-center gap-2 h-10 px-4"
        >
          <Plus size={16} /> New Shipment
        </Button>
      </div>

      {/* Filters Bar */}
      <Card className="border-none shadow-xl bg-white/80 backdrop-blur-md">
        <div className="p-6 border-b border-gray-100 bg-gray-50/30 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex gap-2 w-full sm:max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-3.5 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search shipments..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-xl text-sm font-normal text-gray-900 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all shadow-sm font-outfit"
                />
              </div>
            </div>
            <div className="text-sm text-gray-500 font-normal sm:ml-auto">
              {filteredShipments.length} records found
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Campaign Filter */}
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

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-white border border-gray-200 text-gray-700 text-xs font-normal uppercase tracking-tight rounded-lg py-2.5 px-3 focus:outline-none focus:ring-1 focus:ring-primary-500 font-outfit min-w-[150px]"
            >
              <option value="">All Statuses</option>
              <option value="address_requested">Address Requested</option>
              <option value="ready_to_ship">Ready to Ship</option>
              <option value="pending">Pending Dispatch</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
              <option value="returned">Returned</option>
            </select>

            {/* Carrier Filter */}
            <select
              value={selectedCarrier}
              onChange={(e) => setSelectedCarrier(e.target.value)}
              className="bg-white border border-gray-200 text-gray-700 text-xs font-normal uppercase tracking-tight rounded-lg py-2.5 px-3 focus:outline-none focus:ring-1 focus:ring-primary-500 font-outfit min-w-[150px]"
            >
              <option value="">All Carriers</option>
              {uniqueCarriers.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* Date Range Selector */}
            <div className="flex items-center gap-3 border border-gray-200 rounded-lg py-2.5 px-3 bg-white shadow-sm">
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

      {/* Shipments List */}
      <Card className="overflow-hidden border-none shadow-2xl bg-white">
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
            <table className="w-full text-left min-w-[1350px]">
              <thead>
                <tr className="text-[10px] font-normal text-gray-400 uppercase tracking-widest border-b border-gray-100 bg-gray-50/50">
                  <th className="px-6 py-4">Creator</th>
                  <th className="px-6 py-4">Campaign</th>
                  <th className="px-6 py-4">Product</th>
                  <th className="px-6 py-4 text-center">Quantity</th>
                  <th className="px-6 py-4 text-center">Shipment Status</th>
                  <th className="px-6 py-4">Carrier</th>
                  <th className="px-6 py-4">Tracking Number</th>
                  <th className="px-6 py-4">Shipped At</th>
                  <th className="px-6 py-4">Delivered At</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 bg-white">
                {filteredShipments.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => navigate(`/shipments/${s.id}`)}
                    className="hover:bg-primary-50/10 transition-colors cursor-pointer"
                  >
                    {/* Creator Info */}
                    <td className="px-6 py-3.5 align-middle">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex flex-shrink-0 items-center justify-center font-normal text-sm uppercase ring-2 ring-white shadow-sm overflow-hidden">
                          {s.Creator?.profile_pic ? (
                            <img src={s.Creator.profile_pic} alt="" className="w-full h-full object-cover" />
                          ) : (
                            (s.Creator?.full_name || s.Creator?.handle)?.charAt(0) || 'C'
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-normal text-gray-900 text-xs uppercase tracking-tight font-outfit leading-tight line-clamp-2 whitespace-normal break-words max-w-[150px]">
                            {s.Creator?.full_name || `@${s.Creator?.handle}`}
                          </div>
                          <div className="flex gap-2 mt-1.5">
                            <span className="text-[11px] text-gray-500 normal-case tracking-normal">@{s.Creator?.handle}</span>
                          </div>
                        </div>
                      </div>
                      {/* Address Missing Warning Badge */}
                      {(!s.Creator?.shipping_address_line1 || !s.Creator?.shipping_city) && ['pending', 'address_requested'].includes(s.status) && (
                        <div className="mt-2 inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-[9px] px-2 py-0.5 rounded-md font-medium border border-amber-200 uppercase tracking-widest font-outfit shadow-sm">
                          <span className="text-amber-500">⚠️</span> Address Not Provided
                        </div>
                      )}
                    </td>

                    {/* Campaign */}
                    <td className="px-6 py-3.5 align-middle text-xs font-normal text-gray-900 font-outfit uppercase tracking-tight truncate max-w-[150px] leading-tight">
                      {s.Campaign?.name}
                    </td>

                    {/* Product */}
                    <td className="px-6 py-3.5 align-middle text-xs">
                      <div className="font-normal text-gray-900 text-xs uppercase tracking-tight font-outfit leading-tight truncate max-w-[180px]" title={s.product_name}>{s.product_name}</div>
                      {s.product_sku && (
                        <div className="text-gray-500 mt-1 font-mono text-[10px] tracking-normal truncate max-w-[180px]">
                          SKU: {s.product_sku}
                        </div>
                      )}
                    </td>

                    {/* Quantity */}
                    <td className="px-6 py-3.5 align-middle text-center text-xs font-semibold text-gray-800 font-outfit">
                      {s.quantity}
                    </td>

                    {/* Shipment Status */}
                    <td className="px-6 py-3.5 text-center align-middle">
                      <StatusBadge status={s.status} />
                    </td>

                    {/* Carrier */}
                    <td className="px-6 py-3.5 align-middle text-xs text-gray-800 font-outfit capitalize">
                      {s.carrier || <span className="text-gray-450 italic">N/A</span>}
                    </td>

                    {/* Tracking Number */}
                    <td className="px-6 py-3.5 align-middle text-xs font-mono">
                      {s.tracking_number ? (
                        <div className="space-y-0.5">
                          <div className="font-medium text-gray-855">{s.tracking_number}</div>
                          {s.tracking_url && (
                            <a
                              href={s.tracking_url}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-[10px] text-primary-600 hover:underline flex items-center gap-0.5 font-mono"
                            >
                              Track <ExternalLink size={10} />
                            </a>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-450 italic">No tracking info</span>
                      )}
                    </td>

                    {/* Shipped At */}
                    <td className="px-6 py-3.5 align-middle text-xs text-gray-650 font-mono">
                      {s.shipped_at ? format(new Date(s.shipped_at), 'MMM d, yyyy') : <span className="text-gray-400 italic">---</span>}
                    </td>

                    {/* Delivered At */}
                    <td className="px-6 py-3.5 align-middle text-xs text-gray-650 font-mono">
                      {s.delivered_at ? format(new Date(s.delivered_at), 'MMM d, yyyy') : <span className="text-gray-400 italic">---</span>}
                    </td>

                    {/* Dropdown Action Menu */}
                    <td className="px-6 py-3.5 align-middle text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2 relative">
                        {(!s.Creator?.shipping_address_line1 || !s.Creator?.shipping_city) && ['pending', 'address_requested'].includes(s.status) && (
                          <Button
                            size="sm"
                            className="bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-200 font-bold uppercase tracking-widest text-[9px] min-h-[28px] px-3 shadow-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusChange(s.id, 'address_requested');
                            }}
                          >
                            {s.status === 'address_requested' ? 'Resend Request' : 'Request Address'}
                          </Button>
                        )}
                        {s.status === 'pending' && (
                          <Button
                            size="sm"
                            className={s.tracking_number ? "bg-primary-100 text-primary-700 hover:bg-primary-200 border border-primary-200 font-bold uppercase tracking-widest text-[9px] min-h-[28px] px-3 shadow-sm" : "bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border border-indigo-200 font-bold uppercase tracking-widest text-[9px] min-h-[28px] px-3 shadow-sm"}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (s.tracking_number) {
                                handleDirectMarkShipped(s);
                              } else {
                                openEditModal(s);
                              }
                            }}
                          >
                            {s.tracking_number ? 'Mark Shipped' : 'Update Shipment'}
                          </Button>
                        )}
                        {s.status === 'ready_to_ship' && (
                          <Button
                            size="sm"
                            className="bg-primary-100 text-primary-700 hover:bg-primary-200 border border-primary-200 font-bold uppercase tracking-widest text-[9px] min-h-[28px] px-3 shadow-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (s.tracking_number) {
                                handleDirectMarkShipped(s);
                              } else {
                                handleMarkShippedClick(s);
                              }
                            }}
                          >
                            Mark Shipped
                          </Button>
                        )}
                        {s.status === 'shipped' && (
                          <Button
                            size="sm"
                            className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border border-emerald-200 font-bold uppercase tracking-widest text-[9px] min-h-[28px] px-3 shadow-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusChange(s.id, 'delivered');
                            }}
                          >
                            Mark Delivered
                          </Button>
                        )}
                        <button
                          onClick={() => setOpenActionDropdownId(openActionDropdownId === s.id ? null : s.id)}
                          className="flex items-center gap-1 text-[10px] font-normal uppercase tracking-widest text-gray-500 hover:text-primary-600 border border-gray-200 hover:border-primary-200 px-2 py-1.5 rounded transition-colors bg-white font-outfit"
                        >
                          Actions <ChevronDown size={10} className={`transition-transform duration-200 ${openActionDropdownId === s.id ? 'rotate-180 text-primary-600' : ''}`} />
                        </button>

                        {openActionDropdownId === s.id && (
                          <div className="absolute right-0 mt-1 w-44 rounded-xl bg-white shadow-2xl border border-gray-100 py-1.5 z-50 text-left font-outfit animate-[fadeIn_0.15s_ease-out]">
                            <button
                              onClick={() => {
                                handleStatusChange(s.id, 'address_requested');
                                setOpenActionDropdownId(null);
                              }}
                              className="w-full px-3 py-1.5 text-[9px] uppercase tracking-widest text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors block text-left"
                            >
                              Request Address
                            </button>
                            <button
                              onClick={() => {
                                handleStatusChange(s.id, 'ready_to_ship');
                                setOpenActionDropdownId(null);
                              }}
                              className="w-full px-3 py-1.5 text-[9px] uppercase tracking-widest text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors block text-left"
                            >
                              Mark Ready To Ship
                            </button>
                            <button
                              onClick={() => {
                                handleMarkShippedClick(s);
                                setOpenActionDropdownId(null);
                              }}
                              className="w-full px-3 py-1.5 text-[9px] uppercase tracking-widest text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors block text-left"
                            >
                              Mark Shipped
                            </button>
                            <button
                              onClick={() => {
                                handleStatusChange(s.id, 'delivered');
                                setOpenActionDropdownId(null);
                              }}
                              className="w-full px-3 py-1.5 text-[9px] uppercase tracking-widest text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors block text-left"
                            >
                              Mark Delivered
                            </button>
                            <button
                              onClick={() => {
                                handleStatusChange(s.id, 'failed');
                                setOpenActionDropdownId(null);
                              }}
                              className="w-full px-3 py-1.5 text-[9px] uppercase tracking-widest text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors block text-left"
                            >
                              Mark Failed
                            </button>
                            <button
                              onClick={() => {
                                openEditModal(s);
                                setOpenActionDropdownId(null);
                              }}
                              className="w-full px-3 py-1.5 text-[9px] uppercase tracking-widest text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors block text-left border-t border-gray-100 pt-1.5 mt-1"
                            >
                              Edit Details
                            </button>
                            <button
                              onClick={() => {
                                handleStatusChange(s.id, 'cancelled');
                                setOpenActionDropdownId(null);
                              }}
                              className="w-full px-3 py-1.5 text-[9px] uppercase tracking-widest text-red-650 hover:bg-red-50 transition-colors block text-left border-t border-gray-50 pt-1.5 mt-1"
                            >
                              Cancel Shipment
                            </button>
                          </div>
                        )}
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
        <form onSubmit={handleCreateShipment} className="space-y-4 font-outfit">
          <div className="grid grid-cols-2 gap-4">
            {/* Campaign selection */}
            <div>
              <label className="block text-[10px] font-normal uppercase tracking-wider text-gray-500 mb-1">Campaign</label>
              <select
                required
                value={createForm.campaign_id}
                onChange={(e) => setCreateForm({ ...createForm, campaign_id: e.target.value, creator_id: '' })}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white font-outfit"
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
                  const creatorId = e.target.value;
                  const partner = availablePartners.find(p => p.creator_id === creatorId);
                  setCreateForm({
                    ...createForm,
                    creator_id: creatorId,
                    recipient_name: partner?.Creator?.full_name || '',
                    shipping_address_line1: partner?.Creator?.shipping_address_line1 || '',
                    shipping_address_line2: partner?.Creator?.shipping_address_line2 || '',
                    shipping_city: partner?.Creator?.shipping_city || '',
                    shipping_state: partner?.Creator?.shipping_state || '',
                    shipping_zip: partner?.Creator?.shipping_zip || '',
                    shipping_country: partner?.Creator?.shipping_country || 'US'
                  });
                }}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white font-outfit"
              >
                <option value="">Select Creator</option>
                {availablePartners.map(p => (
                  <option key={p.creator_id} value={p.creator_id}>@{p.Creator?.handle} - {p.Creator?.full_name}</option>
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
                placeholder="Product item name"
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
                required
                min={1}
                value={createForm.quantity}
                onChange={(e) => setCreateForm({ ...createForm, quantity: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 font-outfit"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Product SKU */}
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
            <h4 className="text-[10px] font-normal uppercase tracking-wider text-gray-700 mt-2 border-b border-gray-100 pb-1">Shipping Address</h4>

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
            <Button type="submit" disabled={submitting} className="bg-primary-600 text-white font-normal uppercase tracking-widest text-[10px] h-10 px-4">
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
                <option value="address_requested">Address Requested</option>
                <option value="ready_to_ship">Ready to Ship</option>
                <option value="pending">Pending Dispatch</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="failed">Failed</option>
                <option value="cancelled">Cancelled</option>
                <option value="returned">Returned</option>
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

            {/* Estimated Delivery */}
            <div>
              <label className="block text-[10px] font-normal uppercase tracking-wider text-gray-500 mb-1">Est. Delivery</label>
              <input
                type="date"
                value={editForm.estimated_delivery}
                onChange={(e) => setEditForm({ ...editForm, estimated_delivery: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 font-outfit"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Tracking URL */}
            <div className="col-span-2">
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
            <h4 className="text-[10px] font-normal uppercase tracking-wider text-gray-700 mt-2 border-b border-gray-100 pb-1">Delivery Address</h4>

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
            <Button type="submit" disabled={submitting} className="bg-primary-600 text-white font-normal uppercase tracking-widest text-[10px] h-10 px-4">
              {submitting ? 'Updating...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* SUCCESS REDIRECT MODAL */}
      <Modal isOpen={showSuccessModal} onClose={() => setShowSuccessModal(false)} title="Shipment Status Updated">
        <div className="p-6 text-center font-outfit">
          <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-4 animate-[scaleIn_0.3s_ease]">
            <Truck size={32} />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2 uppercase tracking-tight">Shipment Marked as Shipped</h3>
          <p className="text-sm font-normal text-gray-500 mb-6 max-w-xs mx-auto leading-relaxed">
            The shipment has been marked as <strong>SHIPPED</strong>. You can now activate this creator's campaign on the Partnerships page.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              className="flex-grow font-normal uppercase tracking-widest text-[10px] h-10 px-4"
              onClick={() => setShowSuccessModal(false)}
            >
              Stay on Shipments
            </Button>
            <Button
              className="flex-grow bg-primary-600 hover:bg-primary-700 text-white font-normal uppercase tracking-widest text-[10px] shadow-xl shadow-primary-500/20 h-10 px-4"
              onClick={() => {
                setShowSuccessModal(false);
                navigate('/partnerships');
              }}
            >
              Go to Partnerships
            </Button>
          </div>
        </div>
      </Modal>

      {/* REQUEST ADDRESS EMAIL MODAL */}
      <Modal isOpen={showEmailModal} onClose={() => setShowEmailModal(false)} title="Request Shipping Address">
        <div className="space-y-4 font-outfit">
          <p className="text-xs text-gray-500 mb-2">
            Send an email to the creator with a secure link to provide their shipping address.
          </p>
          <div>
            <label className="block text-[10px] font-normal uppercase tracking-wider text-gray-500 mb-1">Subject</label>
            <input
              type="text"
              value={emailForm.subject}
              onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-[10px] font-normal uppercase tracking-wider text-gray-500 mb-1">Email Body</label>
            <textarea
              rows={8}
              value={emailForm.body}
              onChange={(e) => setEmailForm({ ...emailForm, body: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={() => setShowEmailModal(false)}>Cancel</Button>
            <Button onClick={handleSendAddressRequest} disabled={submitting} className="bg-primary-600 text-white font-normal uppercase tracking-widest text-[10px] h-10 px-4">
              {submitting ? 'Sending...' : 'Send Email'}
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
