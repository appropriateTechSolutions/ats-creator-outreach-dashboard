import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import type { Campaign, CreatorPartnership } from '../../types';

export interface ShipmentCreateForm {
  campaign_id: string;
  creator_id: string;
  product_name: string;
  product_sku: string;
  quantity: number;
  recipient_name: string;
  shipping_address_line1: string;
  shipping_address_line2: string;
  shipping_city: string;
  shipping_state: string;
  shipping_zip: string;
  shipping_country: string;
  notes: string;
}

interface CreateShipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  createForm: ShipmentCreateForm;
  setCreateForm: React.Dispatch<React.SetStateAction<ShipmentCreateForm>>;
  campaigns: Campaign[];
  /** Partnerships already scoped to the selected campaign. */
  availablePartners: CreatorPartnership[];
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
}

const inputCls =
  'w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 font-outfit';

export function CreateShipmentModal({
  isOpen,
  onClose,
  createForm,
  setCreateForm,
  campaigns,
  availablePartners,
  onSubmit,
  submitting,
}: CreateShipmentModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Product Shipment">
      <form onSubmit={onSubmit} className="space-y-4 font-outfit">
        <div className="grid grid-cols-2 gap-4">
          {/* Campaign selection */}
          <div>
            <label
              htmlFor="createshipmentmodal-1"
              className="block text-[10px] font-normal uppercase tracking-wider text-gray-500 mb-1"
            >
              Campaign
            </label>
            <select
              id="createshipmentmodal-1"
              required
              value={createForm.campaign_id}
              onChange={(e) =>
                setCreateForm({ ...createForm, campaign_id: e.target.value, creator_id: '' })
              }
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white font-outfit"
            >
              <option value="">Select Campaign</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Creator selection */}
          <div>
            <label
              htmlFor="createshipmentmodal-2"
              className="block text-[10px] font-normal uppercase tracking-wider text-gray-500 mb-1"
            >
              Creator
            </label>
            <select
              id="createshipmentmodal-2"
              required
              disabled={!createForm.campaign_id}
              value={createForm.creator_id}
              onChange={(e) => {
                const creatorId = e.target.value;
                const partner = availablePartners.find((p) => p.creator_id === creatorId);
                setCreateForm({
                  ...createForm,
                  creator_id: creatorId,
                  recipient_name: partner?.Creator?.full_name || '',
                  shipping_address_line1: partner?.Creator?.shipping_address_line1 || '',
                  shipping_address_line2: partner?.Creator?.shipping_address_line2 || '',
                  shipping_city: partner?.Creator?.shipping_city || '',
                  shipping_state: partner?.Creator?.shipping_state || '',
                  shipping_zip: partner?.Creator?.shipping_zip || '',
                  shipping_country: partner?.Creator?.shipping_country || 'US',
                });
              }}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white font-outfit"
            >
              <option value="">Select Creator</option>
              {availablePartners.map((p) => (
                <option key={p.creator_id} value={p.creator_id}>
                  @{p.Creator?.handle} - {p.Creator?.full_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* Product Name */}
          <div className="col-span-2">
            <label
              htmlFor="createshipmentmodal-3"
              className="block text-[10px] font-normal uppercase tracking-wider text-gray-500 mb-1"
            >
              Product Name
            </label>
            <input
              id="createshipmentmodal-3"
              type="text"
              required
              placeholder="Product item name"
              value={createForm.product_name}
              onChange={(e) => setCreateForm({ ...createForm, product_name: e.target.value })}
              className={inputCls}
            />
          </div>

          {/* Quantity */}
          <div>
            <label
              htmlFor="createshipmentmodal-4"
              className="block text-[10px] font-normal uppercase tracking-wider text-gray-500 mb-1"
            >
              Quantity
            </label>
            <input
              id="createshipmentmodal-4"
              type="number"
              required
              min={1}
              value={createForm.quantity}
              onChange={(e) =>
                setCreateForm({ ...createForm, quantity: parseInt(e.target.value) || 1 })
              }
              className={inputCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Product SKU */}
          <div>
            <label
              htmlFor="createshipmentmodal-5"
              className="block text-[10px] font-normal uppercase tracking-wider text-gray-500 mb-1"
            >
              SKU (Optional)
            </label>
            <input
              id="createshipmentmodal-5"
              type="text"
              placeholder="SKU-12345"
              value={createForm.product_sku}
              onChange={(e) => setCreateForm({ ...createForm, product_sku: e.target.value })}
              className={inputCls}
            />
          </div>

          {/* Recipient Name */}
          <div>
            <label
              htmlFor="createshipmentmodal-6"
              className="block text-[10px] font-normal uppercase tracking-wider text-gray-500 mb-1"
            >
              Recipient Name
            </label>
            <input
              id="createshipmentmodal-6"
              type="text"
              required
              value={createForm.recipient_name}
              onChange={(e) => setCreateForm({ ...createForm, recipient_name: e.target.value })}
              className={inputCls}
            />
          </div>
        </div>

        {/* Shipping Address */}
        <div className="space-y-2">
          <h4 className="text-[10px] font-normal uppercase tracking-wider text-gray-700 mt-2 border-b border-gray-100 pb-1">
            Shipping Address
          </h4>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="createshipmentmodal-7"
                className="block text-[9px] font-normal uppercase tracking-wider text-gray-400 mb-1"
              >
                Address Line 1
              </label>
              <input
                id="createshipmentmodal-7"
                type="text"
                required
                placeholder="123 Main St"
                value={createForm.shipping_address_line1}
                onChange={(e) =>
                  setCreateForm({ ...createForm, shipping_address_line1: e.target.value })
                }
                className={inputCls}
              />
            </div>
            <div>
              <label
                htmlFor="createshipmentmodal-8"
                className="block text-[9px] font-normal uppercase tracking-wider text-gray-400 mb-1"
              >
                Address Line 2
              </label>
              <input
                id="createshipmentmodal-8"
                type="text"
                placeholder="Apt 4B"
                value={createForm.shipping_address_line2}
                onChange={(e) =>
                  setCreateForm({ ...createForm, shipping_address_line2: e.target.value })
                }
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-5 gap-2">
            <div className="col-span-2">
              <label
                htmlFor="createshipmentmodal-9"
                className="block text-[9px] font-normal uppercase tracking-wider text-gray-400 mb-1"
              >
                City
              </label>
              <input
                id="createshipmentmodal-9"
                type="text"
                required
                placeholder="City"
                value={createForm.shipping_city}
                onChange={(e) => setCreateForm({ ...createForm, shipping_city: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label
                htmlFor="createshipmentmodal-10"
                className="block text-[9px] font-normal uppercase tracking-wider text-gray-400 mb-1"
              >
                State
              </label>
              <input
                id="createshipmentmodal-10"
                type="text"
                required
                placeholder="State"
                value={createForm.shipping_state}
                onChange={(e) => setCreateForm({ ...createForm, shipping_state: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label
                htmlFor="createshipmentmodal-11"
                className="block text-[9px] font-normal uppercase tracking-wider text-gray-400 mb-1"
              >
                Zip Code
              </label>
              <input
                id="createshipmentmodal-11"
                type="text"
                required
                placeholder="Zip"
                value={createForm.shipping_zip}
                onChange={(e) => setCreateForm({ ...createForm, shipping_zip: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label
                htmlFor="createshipmentmodal-12"
                className="block text-[9px] font-normal uppercase tracking-wider text-gray-400 mb-1"
              >
                Country
              </label>
              <input
                id="createshipmentmodal-12"
                type="text"
                required
                placeholder="e.g. US, IN"
                value={createForm.shipping_country}
                onChange={(e) => setCreateForm({ ...createForm, shipping_country: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label
            htmlFor="createshipmentmodal-13"
            className="block text-[10px] font-normal uppercase tracking-wider text-gray-500 mb-1"
          >
            Internal Notes
          </label>
          <textarea
            id="createshipmentmodal-13"
            rows={2}
            placeholder="Any specific delivery instructions..."
            value={createForm.notes}
            onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
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
            {submitting ? 'Creating...' : 'Create Shipment'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
