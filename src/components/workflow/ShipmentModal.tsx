import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { createShipment } from '../../lib/api';

interface ShipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  creator: any;
  partnership: any;
  onSuccess: () => void;
}

export function ShipmentModal({ isOpen, onClose, creator, partnership, onSuccess }: ShipmentModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [shipmentForm, setShipmentForm] = useState({
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

  useEffect(() => {
    if (isOpen && creator && partnership) {
      // Pre-fill recipient name and address from creator
      setShipmentForm({
        product_name: partnership.Campaign?.product_offer_notes || '',
        product_sku: '',
        quantity: 1,
        recipient_name: creator.full_name || '',
        shipping_address_line1: creator.shipping_address_line1 || '',
        shipping_address_line2: creator.shipping_address_line2 || '',
        shipping_city: creator.shipping_city || '',
        shipping_state: creator.shipping_state || '',
        shipping_zip: creator.shipping_zip || '',
        shipping_country: creator.shipping_country || 'US',
        notes: ''
      });
    }
  }, [isOpen, creator, partnership]);

  const submitShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creator || !partnership) return;
    setSubmitting(true);
    try {
      await createShipment({
        ...shipmentForm,
        creator_id: creator.id,
        campaign_id: partnership.campaign_id,
        partnership_id: partnership.id
      });
      onSuccess();
      onClose();
    } catch (err) {
      alert('Failed to create shipment: ' + err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Dispatched Product Shipment" size="lg">
      <form onSubmit={submitShipment} className="space-y-4 font-outfit">
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Product Name</label>
            <input
              type="text"
              required
              value={shipmentForm.product_name}
              onChange={e => setShipmentForm(prev => ({ ...prev, product_name: e.target.value }))}
              className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm"
              placeholder="Product title"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Quantity</label>
            <input
              type="number"
              min="1"
              required
              value={shipmentForm.quantity}
              onChange={e => setShipmentForm(prev => ({ ...prev, quantity: Number(e.target.value) || 1 }))}
              className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">SKU / Item ID</label>
            <input
              type="text"
              value={shipmentForm.product_sku}
              onChange={e => setShipmentForm(prev => ({ ...prev, product_sku: e.target.value }))}
              className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm"
              placeholder="SKU-xyz"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Recipient Name</label>
            <input
              type="text"
              required
              value={shipmentForm.recipient_name}
              onChange={e => setShipmentForm(prev => ({ ...prev, recipient_name: e.target.value }))}
              className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm"
            />
          </div>
        </div>

        <div className="space-y-2 bg-gray-50/50 p-4 rounded-xl border border-dashed border-gray-200">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-700 pb-1">Delivery Address</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[9px] font-normal uppercase tracking-wider text-gray-400 mb-1">Address Line 1</label>
              <input
                type="text"
                placeholder="123 Main St"
                required
                value={shipmentForm.shipping_address_line1}
                onChange={e => setShipmentForm(prev => ({ ...prev, shipping_address_line1: e.target.value }))}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 font-outfit"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[9px] font-normal uppercase tracking-wider text-gray-400 mb-1">Address Line 2</label>
              <input
                type="text"
                placeholder="Apt 4B"
                value={shipmentForm.shipping_address_line2}
                onChange={e => setShipmentForm(prev => ({ ...prev, shipping_address_line2: e.target.value }))}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 font-outfit"
              />
            </div>
            <div>
              <label className="block text-[9px] font-normal uppercase tracking-wider text-gray-400 mb-1">City</label>
              <input
                type="text"
                placeholder="City"
                required
                value={shipmentForm.shipping_city}
                onChange={e => setShipmentForm(prev => ({ ...prev, shipping_city: e.target.value }))}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 font-outfit"
              />
            </div>
            <div>
              <label className="block text-[9px] font-normal uppercase tracking-wider text-gray-400 mb-1">State</label>
              <input
                type="text"
                placeholder="State"
                required
                value={shipmentForm.shipping_state}
                onChange={e => setShipmentForm(prev => ({ ...prev, shipping_state: e.target.value }))}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 font-outfit"
              />
            </div>
            <div>
              <label className="block text-[9px] font-normal uppercase tracking-wider text-gray-400 mb-1">Zip Code</label>
              <input
                type="text"
                placeholder="Zip"
                required
                value={shipmentForm.shipping_zip}
                onChange={e => setShipmentForm(prev => ({ ...prev, shipping_zip: e.target.value }))}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 font-outfit"
              />
            </div>
            <div>
              <label className="block text-[9px] font-normal uppercase tracking-wider text-gray-400 mb-1">Country</label>
              <input
                type="text"
                placeholder="e.g. US, IN"
                required
                value={shipmentForm.shipping_country}
                onChange={e => setShipmentForm(prev => ({ ...prev, shipping_country: e.target.value }))}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 font-outfit"
              />
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Internal Notes</label>
          <textarea
            value={shipmentForm.notes}
            onChange={e => setShipmentForm(prev => ({ ...prev, notes: e.target.value }))}
            className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm min-h-[60px]"
            placeholder="Delivery requests..."
          />
        </div>

        <div className="flex gap-3 pt-4 border-t border-gray-100">
          <Button type="button" variant="outline" className="flex-1 font-normal text-xs uppercase tracking-widest" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting} className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-normal text-xs uppercase tracking-widest">
            {submitting ? 'Creating...' : 'Create Shipment'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
