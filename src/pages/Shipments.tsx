import { CreatorAvatar } from '../components/creators/CreatorIdentity';
import React, { useState, useEffect } from 'react';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { LoadingState } from '../components/ui/LoadingState';
import { Modal } from '../components/ui/Modal';
import { ActionMenu } from '../components/ui/DropdownMenu';
import {
  CreateShipmentModal,
  type ShipmentCreateForm,
} from '../components/shipments/CreateShipmentModal';
import {
  EditShipmentModal,
  type ShipmentEditForm,
} from '../components/shipments/EditShipmentModal';
import { useNavigate } from 'react-router-dom';
import {
  createShipment,
  updateShipment,
  requestAddressShipment,
  markReadyToShipShipment,
  markShippedShipment,
  markDeliveredShipment,
  markFailedShipment,
  cancelShipment,
} from '../lib/api';
import { useShipments, useCampaigns, usePartnerships } from '../hooks/queries';
import { useInvalidate } from '../hooks/useInvalidate';
import { queryKeys } from '../lib/queryKeys';
import {
  Package,
  Search,
  Plus,
  Truck,
  ExternalLink,
  ChevronDown,
  Calendar,
  SlidersHorizontal,
} from 'lucide-react';
import { format } from 'date-fns';

export default function Shipments() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const { data: shipments = [], isLoading: loading } = useShipments();
  const { data: campaigns = [] } = useCampaigns();
  const { data: partnerships = [] } = usePartnerships();
  const invalidate = useInvalidate();
  const refresh = () =>
    invalidate(queryKeys.shipments.root, queryKeys.partnerships.root, queryKeys.creators.all);
  const [search, setSearch] = useState('');

  // Filters
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedCarrier, setSelectedCarrier] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const activeFiltersCount =
    (selectedCampaign ? 1 : 0) +
    (selectedStatus ? 1 : 0) +
    (selectedCarrier ? 1 : 0) +
    (startDate || endDate ? 1 : 0);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [activeShipment, setActiveShipment] = useState<any | null>(null);

  // Form states
  const [createForm, setCreateForm] = useState<ShipmentCreateForm>({
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
    notes: '',
  });

  const [editForm, setEditForm] = useState<ShipmentEditForm>({
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
    shipping_country: 'US',
  });

  useEffect(() => {
    if (
      editForm.tracking_number &&
      ['pending', 'ready_to_ship', 'address_requested'].includes(editForm.status)
    ) {
      setEditForm((prev) => ({ ...prev, status: 'shipped' }));
    }
  }, [editForm.tracking_number]);

  const [emailForm, setEmailForm] = useState({
    subject: '',
    body: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleCreateShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.campaign_id || !createForm.creator_id || !createForm.product_name) {
      showToast('Campaign, Creator, and Product Name are required', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const linkedPartnership = partnerships.find(
        (p) => p.creator_id === createForm.creator_id && p.campaign_id === createForm.campaign_id,
      );

      await createShipment({
        ...createForm,
        partnership_id: linkedPartnership ? linkedPartnership.id : undefined,
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
        notes: '',
      });

      setSubmitting(true);
      refresh();
    } catch (err) {
      showToast('Failed to create shipment: ' + err, 'error');
    } finally {
      setSubmitting(false);
      setSubmitting(false);
    }
  };

  const openEditModal = (shipment: any) => {
    setActiveShipment(shipment);
    setEditForm({
      status: shipment.status || 'pending',
      carrier: shipment.carrier || '',
      tracking_number: shipment.tracking_number || '',
      tracking_url: shipment.tracking_url || '',
      estimated_delivery: shipment.estimated_delivery
        ? shipment.estimated_delivery.substring(0, 10)
        : '',
      notes: shipment.notes || '',
      recipient_name: shipment.recipient_name || '',
      shipping_address_line1: shipment.shipping_address_line1 || '',
      shipping_address_line2: shipment.shipping_address_line2 || '',
      shipping_city: shipment.shipping_city || '',
      shipping_state: shipment.shipping_state || '',
      shipping_zip: shipment.shipping_zip || '',
      shipping_country: shipment.shipping_country || 'US',
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
      shipping_country: s.shipping_country || 'US',
    });
    setShowEditModal(true);
  };

  const handleDirectMarkShipped = async (s: any) => {
    try {
      setSubmitting(true);
      const { markShippedShipment } = await import('../lib/api');
      await markShippedShipment(s.id, {
        carrier: s.carrier || '',
        tracking_number: s.tracking_number || '',
        tracking_url: s.tracking_url || '',
        estimated_delivery: s.estimated_delivery ? s.estimated_delivery.substring(0, 10) : null,
      });
      refresh();
      setActiveShipment(s);
      setShowSuccessModal(true);
    } catch (err) {
      showToast('Failed to mark shipped: ' + err, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShipment) return;
    setSubmitting(true);
    try {
      const payload = {
        ...editForm,
        estimated_delivery: editForm.estimated_delivery || null,
      };

      if (editForm.status === 'shipped' && activeShipment.status !== 'shipped') {
        await markShippedShipment(activeShipment.id, {
          carrier: editForm.carrier,
          tracking_number: editForm.tracking_number,
          tracking_url: editForm.tracking_url,
          estimated_delivery: editForm.estimated_delivery || null,
        });
      } else {
        await updateShipment(activeShipment.id, payload);
      }

      setShowEditModal(false);
      setSubmitting(true);
      refresh();

      if (editForm.status === 'shipped') {
        setShowSuccessModal(true);
      }
    } catch (err) {
      showToast('Failed to update shipment: ' + err, 'error');
    } finally {
      setSubmitting(false);
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (shipmentId: string, newStatus: string) => {
    try {
      setSubmitting(true);
      if (newStatus === 'address_requested') {
        const shipment = shipments.find((s) => s.id === shipmentId);
        setActiveShipment(shipment);
        setEmailForm({
          subject: 'Action Required: Provide Shipping Address for Campaign',
          body: `Hi ${shipment?.Creator?.full_name || 'there'},\n\nWe are preparing to ship your product for the ${shipment?.Campaign?.name || 'campaign'}, but we need your shipping address.\n\nPlease provide it securely using the button below.\n\nThanks!`,
        });
        setShowEmailModal(true);
        setSubmitting(false);
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

      refresh();

      if (newStatus === 'shipped') {
        setShowSuccessModal(true);
      }
    } catch (err) {
      showToast('Failed to update status: ' + err, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendAddressRequest = async () => {
    if (!activeShipment) return;
    setSubmitting(true);
    try {
      await requestAddressShipment(activeShipment.id, {
        customSubject: emailForm.subject,
        customBody: emailForm.body,
      });
      setShowEmailModal(false);
      setSubmitting(true);
      refresh();
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || JSON.stringify(err);
      showToast('Failed to send address request: ' + msg, 'error');
    } finally {
      setSubmitting(false);
      setSubmitting(false);
    }
  };

  // Extract unique carriers
  const uniqueCarriers = Array.from(
    new Set(shipments.map((s) => s.carrier).filter(Boolean)),
  ) as string[];

  // Filtered shipments
  const filteredShipments = shipments.filter((s) => {
    const creatorHandle = s.Creator?.handle || '';
    const creatorName = s.Creator?.full_name || '';
    const matchesSearch =
      creatorHandle.toLowerCase().includes(search.toLowerCase()) ||
      creatorName.toLowerCase().includes(search.toLowerCase()) ||
      s.product_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.tracking_number?.toLowerCase().includes(search.toLowerCase());

    const matchesCampaign = selectedCampaign ? s.campaign_id === selectedCampaign : true;
    const matchesStatus = selectedStatus ? s.status === selectedStatus : true;
    const matchesCarrier = selectedCarrier
      ? s.carrier?.toLowerCase().includes(selectedCarrier.toLowerCase())
      : true;

    let matchesDate = true;
    if (startDate || endDate) {
      const shipDate = s.createdAt
        ? new Date(s.createdAt)
        : s.created_at
          ? new Date(s.created_at)
          : new Date();
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

  const availablePartners = partnerships.filter((p) => p.campaign_id === createForm.campaign_id);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20 px-4 sm:px-0 animate-[fadeIn_0.2s_ease]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Product Shipments</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track and manage product deliveries to your creators.
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 shadow-soft hover:shadow-hover text-white flex items-center gap-2"
        >
          <Plus size={16} /> New Shipment
        </Button>
      </div>

      {/* Filters Bar */}
      <Card className="mb-6 border-none shadow-xl bg-white/80 backdrop-blur-md">
        <div className="p-6 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex gap-2 w-full sm:max-w-xl flex-1">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search shipments..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all font-outfit"
                />
              </div>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center justify-center gap-2 px-4 py-2 border rounded-lg text-sm font-outfit uppercase tracking-wider transition-all select-none min-h-[40px] ${
                  showFilters || activeFiltersCount > 0
                    ? 'bg-primary-600 border-primary-600 text-white font-medium shadow-md shadow-primary-500/20'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <SlidersHorizontal size={14} />
                <span>Filters</span>
                {activeFiltersCount > 0 && (
                  <span
                    className={`flex items-center justify-center rounded-full min-w-[18px] h-[18px] px-1 text-[10px] font-bold ${
                      showFilters || activeFiltersCount > 0
                        ? 'bg-white text-primary-700'
                        : 'bg-primary-600 text-white'
                    }`}
                  >
                    {activeFiltersCount}
                  </span>
                )}
              </button>
            </div>
            <div className="text-sm text-gray-500 font-normal sm:ml-auto">
              {filteredShipments.length} records found
            </div>
          </div>

          {/* Collapsible Filters Grid */}
          {showFilters && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 pt-5 border-t border-gray-100 animate-[fadeIn_0.2s_ease]">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="shipments-1"
                  className="text-[10px] font-bold text-gray-400 uppercase tracking-wider"
                >
                  Campaign
                </label>
                <select
                  id="shipments-1"
                  value={selectedCampaign}
                  onChange={(e) => setSelectedCampaign(e.target.value)}
                  className="w-full bg-white border border-gray-200 text-gray-700 text-xs font-normal uppercase tracking-tight rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-primary-500 font-outfit truncate"
                >
                  <option value="">All Campaigns</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="shipments-2"
                  className="text-[10px] font-bold text-gray-400 uppercase tracking-wider"
                >
                  Status
                </label>
                <select
                  id="shipments-2"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full bg-white border border-gray-200 text-gray-700 text-xs font-normal uppercase tracking-tight rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-primary-500 font-outfit"
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
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="shipments-3"
                  className="text-[10px] font-bold text-gray-400 uppercase tracking-wider"
                >
                  Carrier
                </label>
                <select
                  id="shipments-3"
                  value={selectedCarrier}
                  onChange={(e) => setSelectedCarrier(e.target.value)}
                  className="w-full bg-white border border-gray-200 text-gray-700 text-xs font-normal uppercase tracking-tight rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-primary-500 font-outfit"
                >
                  <option value="">All Carriers</option>
                  {uniqueCarriers.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Selector */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="shipments-2001"
                  className="text-[10px] font-bold text-gray-400 uppercase tracking-wider"
                >
                  Date
                </label>
                <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg py-2 px-3 shadow-sm text-xs font-outfit w-full">
                  <Calendar size={14} className="text-gray-400 flex-shrink-0" />
                  <input
                    id="shipments-2001"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-transparent border-none text-gray-700 outline-none focus:ring-0 p-0 cursor-pointer w-full text-xs placeholder-gray-400 font-medium"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Shipments List */}
      <Card className="overflow-hidden border-none shadow-2xl bg-white">
        {loading ? (
          <div className="py-16">
            <LoadingState message="Loading product shipments..." />
          </div>
        ) : filteredShipments.length === 0 ? (
          <div className="py-12">
            <EmptyState
              icon={Package}
              title="No Shipments Found"
              description="Create a new shipment or adjust your search filters."
            />
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
                        <CreatorAvatar
                          creator={s.Creator}
                          className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex flex-shrink-0 items-center justify-center font-normal text-sm uppercase ring-2 ring-white shadow-sm overflow-hidden"
                        />
                        <div className="min-w-0">
                          <div className="font-normal text-gray-900 text-xs uppercase tracking-tight font-outfit leading-tight line-clamp-2 whitespace-normal break-words max-w-[150px]">
                            {s.Creator?.full_name || `@${s.Creator?.handle}`}
                          </div>
                          <div className="flex gap-2 mt-1.5">
                            <span className="text-[11px] text-gray-500 normal-case tracking-normal">
                              @{s.Creator?.handle}
                            </span>
                          </div>
                        </div>
                      </div>
                      {/* Address Missing Warning Badge */}
                      {(!s.Creator?.shipping_address_line1 || !s.Creator?.shipping_city) &&
                        ['pending', 'address_requested'].includes(s.status) && (
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
                      <div
                        className="font-normal text-gray-900 text-xs uppercase tracking-tight font-outfit leading-tight truncate max-w-[180px]"
                        title={s.product_name}
                      >
                        {s.product_name}
                      </div>
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
                      {s.shipped_at ? (
                        format(new Date(s.shipped_at), 'MMM d, yyyy')
                      ) : (
                        <span className="text-gray-400 italic">---</span>
                      )}
                    </td>

                    {/* Delivered At */}
                    <td className="px-6 py-3.5 align-middle text-xs text-gray-650 font-mono">
                      {s.delivered_at ? (
                        format(new Date(s.delivered_at), 'MMM d, yyyy')
                      ) : (
                        <span className="text-gray-400 italic">---</span>
                      )}
                    </td>

                    {/* Dropdown Action Menu */}
                    <td
                      className="px-6 py-3.5 align-middle text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-2">
                        {(!s.Creator?.shipping_address_line1 || !s.Creator?.shipping_city) &&
                          ['pending', 'address_requested'].includes(s.status) && (
                            <Button
                              size="sm"
                              className="bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-200 font-bold uppercase tracking-widest text-[9px] min-h-[28px] px-3 shadow-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusChange(s.id, 'address_requested');
                              }}
                            >
                              {s.status === 'address_requested'
                                ? 'Resend Request'
                                : 'Request Address'}
                            </Button>
                          )}
                        {s.status === 'pending' && (
                          <Button
                            size="sm"
                            className={
                              s.tracking_number
                                ? 'bg-primary-100 text-primary-700 hover:bg-primary-200 border border-primary-200 font-bold uppercase tracking-widest text-[9px] min-h-[28px] px-3 shadow-sm'
                                : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border border-indigo-200 font-bold uppercase tracking-widest text-[9px] min-h-[28px] px-3 shadow-sm'
                            }
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
                            className="min-h-[32px] py-1 px-4 text-xs font-medium capitalize bg-primary-600 hover:bg-primary-700 text-white shadow-sm"
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
                            className="min-h-[32px] py-1 px-4 text-xs font-medium capitalize bg-primary-600 hover:bg-primary-700 text-white shadow-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusChange(s.id, 'delivered');
                            }}
                          >
                            Mark Delivered
                          </Button>
                        )}
                        <ActionMenu
                          ariaLabel="Shipment actions"
                          trigger={
                            <span className="flex items-center gap-1 text-[10px] font-normal uppercase tracking-widest text-gray-500 hover:text-primary-600 border border-gray-200 hover:border-primary-200 px-2 py-1.5 rounded transition-colors bg-white font-outfit">
                              Actions <ChevronDown size={10} />
                            </span>
                          }
                          items={[
                            {
                              label: 'Request Address',
                              onSelect: () => handleStatusChange(s.id, 'address_requested'),
                            },
                            {
                              label: 'Mark Ready To Ship',
                              onSelect: () => handleStatusChange(s.id, 'ready_to_ship'),
                            },
                            { label: 'Mark Shipped', onSelect: () => handleMarkShippedClick(s) },
                            {
                              label: 'Mark Delivered',
                              onSelect: () => handleStatusChange(s.id, 'delivered'),
                            },
                            {
                              label: 'Mark Failed',
                              onSelect: () => handleStatusChange(s.id, 'failed'),
                            },
                            { label: 'Edit Details', onSelect: () => openEditModal(s) },
                            {
                              label: 'Cancel Shipment',
                              onSelect: () => handleStatusChange(s.id, 'cancelled'),
                              destructive: true,
                            },
                          ]}
                        />
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
      <CreateShipmentModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        createForm={createForm}
        setCreateForm={setCreateForm}
        campaigns={campaigns}
        availablePartners={availablePartners}
        onSubmit={handleCreateShipment}
        submitting={submitting}
      />

      {/* EDIT/TRACK SHIPMENT MODAL */}
      <EditShipmentModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        editForm={editForm}
        setEditForm={setEditForm}
        onSubmit={handleUpdateShipment}
        submitting={submitting}
      />

      {/* SUCCESS REDIRECT MODAL */}
      <Modal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Shipment Status Updated"
      >
        <div className="p-6 text-center font-outfit">
          <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-4 animate-[scaleIn_0.3s_ease]">
            <Truck size={32} />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2 uppercase tracking-tight">
            Shipment Marked as Shipped
          </h3>
          <p className="text-sm font-normal text-gray-500 mb-6 max-w-xs mx-auto leading-relaxed">
            The shipment has been marked as <strong>SHIPPED</strong>. You can now activate this
            creator's campaign on the Partnerships page.
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
      <Modal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        title="Request Shipping Address"
      >
        <div className="space-y-4 font-outfit">
          <p className="text-xs text-gray-500 mb-2">
            Send an email to the creator with a secure link to provide their shipping address.
          </p>
          <div>
            <label
              htmlFor="shipments-4"
              className="block text-[10px] font-normal uppercase tracking-wider text-gray-500 mb-1"
            >
              Subject
            </label>
            <input
              id="shipments-4"
              type="text"
              value={emailForm.subject}
              onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div>
            <label
              htmlFor="shipments-5"
              className="block text-[10px] font-normal uppercase tracking-wider text-gray-500 mb-1"
            >
              Email Body
            </label>
            <textarea
              id="shipments-5"
              rows={8}
              value={emailForm.body}
              onChange={(e) => setEmailForm({ ...emailForm, body: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={() => setShowEmailModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSendAddressRequest}
              disabled={submitting}
              className="bg-primary-600 text-white font-normal uppercase tracking-widest text-[10px] h-10 px-4"
            >
              {submitting ? 'Sending...' : 'Send Email'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
