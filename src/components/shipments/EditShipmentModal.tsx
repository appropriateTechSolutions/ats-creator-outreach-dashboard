import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

export interface ShipmentEditForm {
  status: string;
  carrier: string;
  tracking_number: string;
  tracking_url: string;
  estimated_delivery: string;
  notes: string;
  recipient_name: string;
  shipping_address_line1: string;
  shipping_address_line2: string;
  shipping_city: string;
  shipping_state: string;
  shipping_zip: string;
  shipping_country: string;
}

interface EditShipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  editForm: ShipmentEditForm;
  setEditForm: React.Dispatch<React.SetStateAction<ShipmentEditForm>>;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
}

const inputCls =
  'w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 font-outfit';

export function EditShipmentModal({
  isOpen,
  onClose,
  editForm,
  setEditForm,
  onSubmit,
  submitting,
}: EditShipmentModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Update Shipment Details & Tracking">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Shipment Status */}
          <div>
            <label
              htmlFor="editshipmentmodal-1"
              className="block text-[10px] font-normal uppercase tracking-wider text-gray-500 mb-1"
            >
              Shipment Status
            </label>
            <select
              id="editshipmentmodal-1"
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
            <label
              htmlFor="editshipmentmodal-2"
              className="block text-[10px] font-normal uppercase tracking-wider text-gray-500 mb-1"
            >
              Carrier
            </label>
            <input
              id="editshipmentmodal-2"
              type="text"
              placeholder="e.g., USPS, UPS, FedEx"
              value={editForm.carrier}
              onChange={(e) => setEditForm({ ...editForm, carrier: e.target.value })}
              className={inputCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Tracking Number */}
          <div>
            <label
              htmlFor="editshipmentmodal-3"
              className="block text-[10px] font-normal uppercase tracking-wider text-gray-500 mb-1"
            >
              Tracking Number
            </label>
            <input
              id="editshipmentmodal-3"
              type="text"
              placeholder="1Z999AA10123456784"
              value={editForm.tracking_number}
              onChange={(e) => setEditForm({ ...editForm, tracking_number: e.target.value })}
              className={inputCls}
            />
          </div>

          {/* Estimated Delivery */}
          <div>
            <label
              htmlFor="editshipmentmodal-4"
              className="block text-[10px] font-normal uppercase tracking-wider text-gray-500 mb-1"
            >
              Est. Delivery
            </label>
            <input
              id="editshipmentmodal-4"
              type="date"
              value={editForm.estimated_delivery}
              onChange={(e) => setEditForm({ ...editForm, estimated_delivery: e.target.value })}
              className={inputCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Tracking URL */}
          <div className="col-span-2">
            <label
              htmlFor="editshipmentmodal-5"
              className="block text-[10px] font-normal uppercase tracking-wider text-gray-500 mb-1"
            >
              Tracking Link
            </label>
            <input
              id="editshipmentmodal-5"
              type="url"
              placeholder="https://www.ups.com/track?..."
              value={editForm.tracking_url}
              onChange={(e) => setEditForm({ ...editForm, tracking_url: e.target.value })}
              className={inputCls}
            />
          </div>
        </div>

        {/* Delivery Recipient Name */}
        <div>
          <label
            htmlFor="editshipmentmodal-6"
            className="block text-[10px] font-normal uppercase tracking-wider text-gray-500 mb-1"
          >
            Recipient Name
          </label>
          <input
            id="editshipmentmodal-6"
            type="text"
            required
            value={editForm.recipient_name}
            onChange={(e) => setEditForm({ ...editForm, recipient_name: e.target.value })}
            className={inputCls}
          />
        </div>

        {/* Recipient Address */}
        <div className="space-y-2">
          <h4 className="text-[10px] font-normal uppercase tracking-wider text-gray-700 mt-2 border-b border-gray-100 pb-1">
            Delivery Address
          </h4>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="editshipmentmodal-7"
                className="block text-[9px] font-normal uppercase tracking-wider text-gray-400 mb-1"
              >
                Address Line 1
              </label>
              <input
                id="editshipmentmodal-7"
                type="text"
                required
                value={editForm.shipping_address_line1}
                onChange={(e) =>
                  setEditForm({ ...editForm, shipping_address_line1: e.target.value })
                }
                className={inputCls}
              />
            </div>
            <div>
              <label
                htmlFor="editshipmentmodal-8"
                className="block text-[9px] font-normal uppercase tracking-wider text-gray-400 mb-1"
              >
                Address Line 2
              </label>
              <input
                id="editshipmentmodal-8"
                type="text"
                value={editForm.shipping_address_line2}
                onChange={(e) =>
                  setEditForm({ ...editForm, shipping_address_line2: e.target.value })
                }
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-5 gap-2">
            <div className="col-span-2">
              <label
                htmlFor="editshipmentmodal-9"
                className="block text-[9px] font-normal uppercase tracking-wider text-gray-400 mb-1"
              >
                City
              </label>
              <input
                id="editshipmentmodal-9"
                type="text"
                required
                value={editForm.shipping_city}
                onChange={(e) => setEditForm({ ...editForm, shipping_city: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label
                htmlFor="editshipmentmodal-10"
                className="block text-[9px] font-normal uppercase tracking-wider text-gray-400 mb-1"
              >
                State
              </label>
              <input
                id="editshipmentmodal-10"
                type="text"
                required
                value={editForm.shipping_state}
                onChange={(e) => setEditForm({ ...editForm, shipping_state: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label
                htmlFor="editshipmentmodal-11"
                className="block text-[9px] font-normal uppercase tracking-wider text-gray-400 mb-1"
              >
                Zip Code
              </label>
              <input
                id="editshipmentmodal-11"
                type="text"
                required
                value={editForm.shipping_zip}
                onChange={(e) => setEditForm({ ...editForm, shipping_zip: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label
                htmlFor="editshipmentmodal-12"
                className="block text-[9px] font-normal uppercase tracking-wider text-gray-400 mb-1"
              >
                Country
              </label>
              <input
                id="editshipmentmodal-12"
                type="text"
                required
                value={editForm.shipping_country}
                onChange={(e) => setEditForm({ ...editForm, shipping_country: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label
            htmlFor="editshipmentmodal-13"
            className="block text-[10px] font-normal uppercase tracking-wider text-gray-500 mb-1"
          >
            Shipment Notes
          </label>
          <textarea
            id="editshipmentmodal-13"
            rows={2}
            value={editForm.notes}
            onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
            className={inputCls}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={submitting}
            className="bg-primary-600 text-white font-normal uppercase tracking-widest text-[10px] h-10 px-4"
          >
            {submitting ? 'Updating...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
