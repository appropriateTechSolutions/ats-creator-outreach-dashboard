import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { LoadingState } from '../components/ui/LoadingState';
import { Modal } from '../components/ui/Modal';
import { 
  getShipmentById,
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
  Truck, 
  Edit3,
  ExternalLink,
  ArrowLeft,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';

export default function ShipmentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const fromCreatorId = location.state?.fromCreatorId;
  const [shipment, setShipment] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Modals
  const [showEditModal, setShowEditModal] = useState(false);

  // Form states
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

  const fetchShipment = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await getShipmentById(id);
      setShipment(data);
    } catch (err) {
      console.error('Failed to load shipment:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShipment();
  }, [id]);

  const handleStatusChange = async (newStatus: string) => {
    if (!id || !shipment) return;
    try {
      setLoading(true);
      if (newStatus === 'address_requested') {
        await requestAddressShipment(id);
      } else if (newStatus === 'ready_to_ship') {
        await markReadyToShipShipment(id);
      } else if (newStatus === 'shipped') {
        await markShippedShipment(id, {
          carrier: shipment.carrier,
          tracking_number: shipment.tracking_number,
          tracking_url: shipment.tracking_url,
          estimated_delivery: shipment.estimated_delivery
        });
      } else if (newStatus === 'delivered') {
        await markDeliveredShipment(id);
      } else if (newStatus === 'failed') {
        await markFailedShipment(id);
      } else if (newStatus === 'cancelled') {
        await cancelShipment(id);
      } else {
        await updateShipment(id, { status: newStatus });
      }

      const updated = await getShipmentById(id);
      setShipment(updated);
    } catch (err) {
      alert('Action failed: ' + err);
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = () => {
    if (!shipment) return;
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

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shipment) return;
    setSubmitting(true);
    try {
      if (editForm.status === 'shipped' && shipment.status !== 'shipped') {
        await markShippedShipment(shipment.id, {
          carrier: editForm.carrier,
          tracking_number: editForm.tracking_number,
          tracking_url: editForm.tracking_url
        });
      } else {
        await updateShipment(shipment.id, editForm);
      }
      setShowEditModal(false);
      const updated = await getShipmentById(shipment.id);
      setShipment(updated);
    } catch (err) {
      alert('Failed to update shipment details: ' + err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 max-w-7xl mx-auto px-4 sm:px-0">
        <LoadingState message="Retrieving Shipment details..." />
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="py-20 max-w-7xl mx-auto px-4 sm:px-0 text-center">
        <h2 className="text-xl font-semibold text-gray-700">Shipment not found</h2>
        <Link to={fromCreatorId ? `/creators/${fromCreatorId}` : "/shipments"} className="text-primary-600 hover:underline mt-4 inline-block">
          Back to {fromCreatorId ? 'Creator Detail' : 'Shipments'}
        </Link>
      </div>
    );
  }

  // Define steps for shipment timeline
  const statuses = ['pending', 'shipped', 'delivered'];
  const currentStatusIndex = statuses.indexOf(shipment.status);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20 px-4 sm:px-0 animate-[fadeIn_0.3s_ease]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          {fromCreatorId ? (
            <button 
              onClick={() => navigate(`/creators/${fromCreatorId}`)}
              className="flex items-center gap-2 text-xs font-normal text-gray-500 hover:text-gray-900 uppercase tracking-widest transition-colors mb-3"
            >
              <ArrowLeft size={14} /> Back to Creator Detail
            </button>
          ) : (
            <button 
              onClick={() => navigate('/shipments')}
              className="flex items-center gap-2 text-xs font-normal text-gray-500 hover:text-gray-900 uppercase tracking-widest transition-colors mb-3"
            >
              <ArrowLeft size={14} /> Back to Shipments
            </button>
          )}
          <h1 className="text-2xl sm:text-3xl font-normal text-gray-900 font-outfit uppercase tracking-tight">
            Shipment Profile
          </h1>
        </div>

        {/* Actions panel */}
        <div className="flex items-center gap-2">
          {shipment.status === 'pending' && (
            <Button className="bg-indigo-600 text-white font-normal uppercase tracking-widest text-xs min-h-[40px] px-4" onClick={() => handleStatusChange('shipped')}>
              Mark Shipped
            </Button>
          )}
          {shipment.status === 'shipped' && (
            <Button className="bg-green-600 text-white font-normal uppercase tracking-widest text-xs min-h-[40px] px-4" onClick={() => handleStatusChange('delivered')}>
              Mark Delivered
            </Button>
          )}
          <button 
            onClick={openEditModal}
            className="p-2.5 text-gray-500 hover:text-gray-900 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-colors flex items-center justify-center"
            title="Edit Details"
          >
            <Edit3 size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Shipment details */}
        <div className="space-y-8 lg:col-span-2">
          <Card className="border-none shadow-xl bg-white p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-b border-gray-100 pb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary-100 text-primary-700 flex flex-shrink-0 items-center justify-center font-normal text-2xl uppercase ring-4 ring-white shadow-md overflow-hidden">
                  {shipment.Creator?.profile_pic ? (
                    <img src={shipment.Creator.profile_pic} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (shipment.Creator?.full_name || shipment.Creator?.handle)?.charAt(0) || 'C'
                  )}
                </div>
                <div>
                  <div className="text-xl font-normal text-gray-900 font-outfit uppercase tracking-tight">
                    {shipment.Creator?.full_name || `@${shipment.Creator?.handle}`}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">@{shipment.Creator?.handle}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{shipment.Creator?.email || 'No email registered'}</div>
                </div>
              </div>
              
              <div className="flex flex-col items-end gap-2">
                <span className="text-[10px] font-normal text-gray-400 uppercase tracking-widest">Shipment Status</span>
                <StatusBadge status={shipment.status} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-6">
              {/* Product Info */}
              <div className="space-y-4 font-outfit">
                <div className="space-y-3">
                  <div>
                    <span className="text-[9px] font-normal text-gray-400 uppercase tracking-wider block">Product Name</span>
                    <span className="text-sm font-normal text-gray-800">{shipment.product_name}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[9px] font-normal text-gray-400 uppercase tracking-wider block">SKU / Item ID</span>
                      <span className="text-sm font-normal text-gray-800 font-mono">{shipment.product_sku || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-normal text-gray-400 uppercase tracking-wider block">Quantity</span>
                      <span className="text-sm font-normal text-gray-800">{shipment.quantity}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Destination Address */}
              <div className="space-y-4 font-outfit">
                <div className="space-y-3">
                  <div>
                    <span className="text-[9px] font-normal text-gray-400 uppercase tracking-wider block">Recipient Name</span>
                    <span className="text-sm font-normal text-gray-800">{shipment.recipient_name || 'No Name'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-normal text-gray-400 uppercase tracking-wider block">Address</span>
                    <div className="text-sm text-gray-800 font-normal leading-relaxed bg-gray-50/50 border border-gray-100 rounded-xl p-3">
                      <div>{shipment.shipping_address_line1}</div>
                      {shipment.shipping_address_line2 && <div>{shipment.shipping_address_line2}</div>}
                      <div>
                        {shipment.shipping_city}, {shipment.shipping_state} {shipment.shipping_zip}
                      </div>
                      <div className="text-gray-400 uppercase tracking-wider text-[10px] mt-1">{shipment.shipping_country}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tracking and Notes */}
            <div className="border-t border-gray-100 mt-6 pt-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                {/* Tracking Details */}
                <div className="space-y-4 font-outfit">
                  <h4 className="text-xs font-normal text-indigo-600 uppercase tracking-widest flex items-center gap-1.5">
                    <Truck size={14} /> Carrier & Tracking Info
                  </h4>

                  {shipment.tracking_number ? (
                    <div className="space-y-3 bg-gray-50/50 border border-gray-100 rounded-xl p-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-[9px] text-gray-400 block uppercase">Carrier</span>
                          <span className="font-normal text-gray-800 uppercase text-xs">{shipment.carrier || '---'}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-gray-400 block uppercase">Tracking Number</span>
                          <span className="font-normal text-gray-800 font-mono text-xs">{shipment.tracking_number}</span>
                        </div>
                      </div>
                      {shipment.tracking_url && (
                        <div className="pt-2 border-t border-gray-100">
                          <span className="text-[9px] text-gray-400 block uppercase">Tracking link</span>
                          <a 
                            href={shipment.tracking_url} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="text-primary-600 hover:underline flex items-center gap-1 mt-0.5 truncate max-w-full font-mono text-xs"
                          >
                            Track Package <ExternalLink size={10} />
                          </a>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-400 italic">No tracking information added yet. Click edit to add tracking details.</div>
                  )}
                </div>

                {/* Date Milestones */}
                <div className="space-y-4 font-outfit">
                  <h4 className="text-xs font-normal text-indigo-600 uppercase tracking-widest flex items-center gap-1.5">
                    <Calendar size={14} /> Date Milestones
                  </h4>

                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                      <span className="text-gray-400 uppercase">Created At</span>
                      <span className="text-gray-750 font-normal">{shipment.createdAt ? format(new Date(shipment.createdAt), 'MMM d, yyyy h:mm a') : '---'}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                      <span className="text-gray-400 uppercase">Shipped At</span>
                      <span className="text-gray-750 font-normal">{shipment.shipped_at ? format(new Date(shipment.shipped_at), 'MMM d, yyyy h:mm a') : '---'}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-gray-400 uppercase">Delivered At</span>
                      <span className="text-gray-750 font-normal">{shipment.delivered_at ? format(new Date(shipment.delivered_at), 'MMM d, yyyy h:mm a') : '---'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {shipment.notes && (
                <div className="bg-yellow-50/45 border border-yellow-100/50 p-4 rounded-xl font-outfit">
                  <span className="text-[9px] font-normal text-amber-800 uppercase tracking-wider block">Shipment Notes</span>
                  <p className="text-sm text-gray-650 mt-1 whitespace-pre-wrap leading-relaxed">{shipment.notes}</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Side: Timeline & Campaign Link */}
        <div className="space-y-8 lg:col-span-1">
          {/* Progress Tracker */}
          <Card className="border-none shadow-xl bg-white p-6">
            <h3 className="text-sm font-normal text-gray-700 uppercase tracking-widest mb-6 font-outfit">Delivery Timeline</h3>
            
            <div className="relative pl-6 space-y-8 font-outfit before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100">
              {/* Step 1: Created */}
              <div className="relative">
                <div className={`absolute -left-[20px] top-1 w-[12px] h-[12px] rounded-full border-2 bg-white ${
                  currentStatusIndex >= 0 ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300'
                }`} />
                <div>
                  <h4 className="text-xs font-normal text-gray-800 uppercase tracking-wide">Shipment Registered</h4>
                  <p className="text-[10px] text-gray-400 mt-0.5">Shipment created for campaign dispatch.</p>
                  {shipment.createdAt && (
                    <span className="text-[9px] text-indigo-600 font-mono mt-1 block">
                      {format(new Date(shipment.createdAt), 'MMM d, h:mm a')}
                    </span>
                  )}
                </div>
              </div>

              {/* Step 2: Shipped */}
              <div className="relative">
                <div className={`absolute -left-[20px] top-1 w-[12px] h-[12px] rounded-full border-2 bg-white ${
                  currentStatusIndex >= 1 ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300'
                }`} />
                <div>
                  <h4 className="text-xs font-normal text-gray-800 uppercase tracking-wide">Shipped</h4>
                  <p className="text-[10px] text-gray-400 mt-0.5">Package dispatched via carrier.</p>
                  {shipment.shipped_at && (
                    <span className="text-[9px] text-indigo-600 font-mono mt-1 block">
                      {format(new Date(shipment.shipped_at), 'MMM d, h:mm a')}
                    </span>
                  )}
                </div>
              </div>

              {/* Step 3: Delivered */}
              <div className="relative">
                <div className={`absolute -left-[20px] top-1 w-[12px] h-[12px] rounded-full border-2 bg-white ${
                  currentStatusIndex >= 2 ? 'border-green-600 bg-green-600' : 'border-gray-300'
                }`} />
                <div>
                  <h4 className="text-xs font-normal text-gray-800 uppercase tracking-wide">Delivered</h4>
                  <p className="text-[10px] text-gray-400 mt-0.5">Package arrived at recipient destination.</p>
                  {shipment.delivered_at && (
                    <span className="text-[9px] text-green-600 font-mono mt-1 block">
                      {format(new Date(shipment.delivered_at), 'MMM d, h:mm a')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Linked Campaign Card */}
          <Card className="border-none shadow-xl bg-white p-6 space-y-4 font-outfit">
            <h3 className="text-sm font-normal text-gray-700 uppercase tracking-widest">Linked Campaign</h3>
            <div>
              <span className="text-[9px] text-gray-400 uppercase tracking-wider block">Campaign Name</span>
              <span className="text-sm font-normal text-gray-800 block mt-0.5">{shipment.Campaign?.name}</span>
            </div>
            {shipment.Campaign?.description && (
              <div>
                <span className="text-[9px] text-gray-400 uppercase tracking-wider block">Description</span>
                <p className="text-xs text-gray-500 mt-1 line-clamp-3 leading-relaxed">{shipment.Campaign.description}</p>
              </div>
            )}
            <div className="pt-2 border-t border-gray-100 flex gap-2">
              <Link 
                to={`/creators/${shipment.creator_id || shipment.Creator?.id}`}
                state={{ fromPath: location.pathname, fromLabel: 'SHIPMENT' }}
                className="text-xs text-primary-600 hover:underline font-normal flex items-center gap-1"
              >
                View Creator <ExternalLink size={12} />
              </Link>
              {shipment.partnership_id && (
                <Link 
                  to={`/partnerships/${shipment.partnership_id}`}
                  state={{ fromPath: location.pathname, fromLabel: 'SHIPMENT' }}
                  className="text-xs text-primary-600 hover:underline font-normal flex items-center gap-1 ml-auto"
                >
                  View Partnership <ExternalLink size={12} />
                </Link>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* EDIT SHIPMENT MODAL */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Update Shipment Details & Tracking">
        <form onSubmit={submitEdit} className="space-y-4 font-outfit">
          <div className="grid grid-cols-2 gap-4">
            {/* Shipment Status */}
            <div>
              <label className="block text-[10px] font-normal uppercase tracking-wider text-gray-500 mb-1">Shipment Status</label>
              <select
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm"
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
                className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm"
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
                className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm"
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
                className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm"
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
              className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm"
            />
          </div>

          {/* Recipient Address */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-700 mt-2 border-b border-gray-100 pb-1">Delivery Address</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] font-normal uppercase tracking-wider text-gray-450 mb-1">Address Line 1</label>
                <input
                  type="text"
                  required
                  placeholder="123 Main St"
                  value={editForm.shipping_address_line1}
                  onChange={(e) => setEditForm({ ...editForm, shipping_address_line1: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 font-outfit"
                />
              </div>
              <div>
                <label className="block text-[9px] font-normal uppercase tracking-wider text-gray-450 mb-1">Address Line 2</label>
                <input
                  type="text"
                  placeholder="Apt 4B"
                  value={editForm.shipping_address_line2}
                  onChange={(e) => setEditForm({ ...editForm, shipping_address_line2: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 font-outfit"
                />
              </div>
              <div>
                <label className="block text-[9px] font-normal uppercase tracking-wider text-gray-450 mb-1">City</label>
                <input
                  type="text"
                  required
                  placeholder="City"
                  value={editForm.shipping_city}
                  onChange={(e) => setEditForm({ ...editForm, shipping_city: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 font-outfit"
                />
              </div>
              <div>
                <label className="block text-[9px] font-normal uppercase tracking-wider text-gray-450 mb-1">State</label>
                <input
                  type="text"
                  required
                  placeholder="State"
                  value={editForm.shipping_state}
                  onChange={(e) => setEditForm({ ...editForm, shipping_state: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 font-outfit"
                />
              </div>
              <div>
                <label className="block text-[9px] font-normal uppercase tracking-wider text-gray-450 mb-1">Zip Code</label>
                <input
                  type="text"
                  required
                  placeholder="Zip"
                  value={editForm.shipping_zip}
                  onChange={(e) => setEditForm({ ...editForm, shipping_zip: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 font-outfit"
                />
              </div>
              <div>
                <label className="block text-[9px] font-normal uppercase tracking-wider text-gray-450 mb-1">Country</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. US, IN"
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
