import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

export interface OfferForm {
  offer_type: string;
  flat_fee: number;
  affiliate_enabled: boolean;
  affiliate_percentage: number;
  affiliate_code: string;
  affiliate_link: string;
}

export interface PartnershipEditForm {
  creator_tier: string;
  contract_required: boolean;
  contract_signed: boolean;
  contract_url: string;
  start_date: string;
  end_date: string;
  activation_notes: string;
  internal_notes: string;
}

interface PartnershipOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  offerForm: OfferForm;
  setOfferForm: React.Dispatch<React.SetStateAction<OfferForm>>;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
}

export function PartnershipOfferModal({
  isOpen,
  onClose,
  offerForm,
  setOfferForm,
  onSubmit,
  submitting,
}: PartnershipOfferModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Draft & Send Campaign Offer">
      <form onSubmit={onSubmit} className="space-y-4 font-outfit">
        <div className="space-y-1">
          <label
            htmlFor="creatorpartnershipmodals-1"
            className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block"
          >
            Offer Compensation Type
          </label>
          <select
            id="creatorpartnershipmodals-1"
            value={offerForm.offer_type}
            onChange={(e) => setOfferForm((prev) => ({ ...prev, offer_type: e.target.value }))}
            className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm"
          >
            <option value="free_product">Free Product</option>
            <option value="affiliate_commission">Affiliate Commission Only</option>
            <option value="flat_fee">Flat Fee</option>
            <option value="hybrid">Hybrid (Flat Fee + Affiliate)</option>
          </select>
        </div>

        {(offerForm.offer_type === 'flat_fee' || offerForm.offer_type === 'hybrid') && (
          <div className="space-y-1">
            <label
              htmlFor="creatorpartnershipmodals-2"
              className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block"
            >
              Flat Fee Amount (USD)
            </label>
            <input
              id="creatorpartnershipmodals-2"
              type="number"
              value={offerForm.flat_fee}
              onChange={(e) =>
                setOfferForm((prev) => ({ ...prev, flat_fee: Number(e.target.value) }))
              }
              className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm"
              min="0"
            />
          </div>
        )}

        <div className="flex items-center gap-2 py-2">
          <input
            type="checkbox"
            id="affiliate_enabled_creator"
            checked={offerForm.affiliate_enabled}
            onChange={(e) =>
              setOfferForm((prev) => ({ ...prev, affiliate_enabled: e.target.checked }))
            }
            className="rounded text-primary-600 focus:ring-primary-500 h-4 w-4 border-gray-300"
          />
          <label htmlFor="affiliate_enabled_creator" className="text-sm text-gray-700 select-none">
            Enable Affiliate Parameters
          </label>
        </div>

        {offerForm.affiliate_enabled && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border border-dashed border-gray-100 rounded-xl p-4 bg-gray-50/50">
            <div className="space-y-1">
              <label
                htmlFor="creatorpartnershipmodals-3"
                className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block"
              >
                Percentage (%)
              </label>
              <input
                id="creatorpartnershipmodals-3"
                type="number"
                value={offerForm.affiliate_percentage}
                onChange={(e) =>
                  setOfferForm((prev) => ({
                    ...prev,
                    affiliate_percentage: Number(e.target.value),
                  }))
                }
                className="w-full bg-white border border-gray-200 rounded-lg p-2 text-sm"
                min="0"
                max="100"
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor="creatorpartnershipmodals-4"
                className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block"
              >
                Promo Code
              </label>
              <input
                id="creatorpartnershipmodals-4"
                type="text"
                value={offerForm.affiliate_code}
                onChange={(e) =>
                  setOfferForm((prev) => ({ ...prev, affiliate_code: e.target.value }))
                }
                className="w-full bg-white border border-gray-200 rounded-lg p-2 text-sm uppercase font-mono"
                placeholder="CODE20"
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor="creatorpartnershipmodals-5"
                className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block"
              >
                Tracking URL
              </label>
              <input
                id="creatorpartnershipmodals-5"
                type="text"
                value={offerForm.affiliate_link}
                onChange={(e) =>
                  setOfferForm((prev) => ({ ...prev, affiliate_link: e.target.value }))
                }
                className="w-full bg-white border border-gray-200 rounded-lg p-2 text-sm"
                placeholder="https://..."
              />
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-4 border-t border-gray-100">
          <Button
            type="button"
            variant="outline"
            className="flex-1 font-normal text-xs uppercase tracking-widest"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={submitting}
            className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-normal text-xs uppercase tracking-widest"
          >
            {submitting ? 'Sending Offer...' : 'Send Offer Proposal'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

interface PartnershipEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  editForm: PartnershipEditForm;
  setEditForm: React.Dispatch<React.SetStateAction<PartnershipEditForm>>;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
}

export function PartnershipEditModal({
  isOpen,
  onClose,
  editForm,
  setEditForm,
  onSubmit,
  submitting,
}: PartnershipEditModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Update Partnership Profile">
      <form onSubmit={onSubmit} className="space-y-4 font-outfit">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label
              htmlFor="creatorpartnershipmodals-6"
              className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block"
            >
              Creator Tier Size
            </label>
            <select
              id="creatorpartnershipmodals-6"
              value={editForm.creator_tier}
              onChange={(e) => setEditForm((prev) => ({ ...prev, creator_tier: e.target.value }))}
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
            <label
              htmlFor="creatorpartnershipmodals-7"
              className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block"
            >
              Contract Signature Link
            </label>
            <input
              id="creatorpartnershipmodals-7"
              type="text"
              value={editForm.contract_url}
              onChange={(e) => setEditForm((prev) => ({ ...prev, contract_url: e.target.value }))}
              className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm"
              placeholder="https://docusign.com/..."
            />
          </div>
        </div>

        <div className="flex gap-6 py-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="contract_required_creator"
              checked={editForm.contract_required}
              onChange={(e) =>
                setEditForm((prev) => ({ ...prev, contract_required: e.target.checked }))
              }
              className="rounded text-primary-600 focus:ring-primary-500 h-4 w-4 border-gray-300"
            />
            <label
              htmlFor="contract_required_creator"
              className="text-sm text-gray-700 select-none"
            >
              Contract Required
            </label>
          </div>

          {editForm.contract_required && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="contract_signed_creator"
                checked={editForm.contract_signed}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, contract_signed: e.target.checked }))
                }
                className="rounded text-primary-600 focus:ring-primary-500 h-4 w-4 border-gray-300"
              />
              <label
                htmlFor="contract_signed_creator"
                className="text-sm text-gray-700 select-none"
              >
                Contract Signed
              </label>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label
              htmlFor="creatorpartnershipmodals-8"
              className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block"
            >
              Campaign Start Date
            </label>
            <input
              id="creatorpartnershipmodals-8"
              type="date"
              value={editForm.start_date}
              onChange={(e) => setEditForm((prev) => ({ ...prev, start_date: e.target.value }))}
              className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label
              htmlFor="creatorpartnershipmodals-9"
              className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block"
            >
              Campaign End Date
            </label>
            <input
              id="creatorpartnershipmodals-9"
              type="date"
              value={editForm.end_date}
              onChange={(e) => setEditForm((prev) => ({ ...prev, end_date: e.target.value }))}
              className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="creatorpartnershipmodals-10"
            className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block"
          >
            Activation Notes
          </label>
          <textarea
            id="creatorpartnershipmodals-10"
            value={editForm.activation_notes}
            onChange={(e) => setEditForm((prev) => ({ ...prev, activation_notes: e.target.value }))}
            className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm min-h-[60px]"
            placeholder="Fulfillment parameters, specific agreements..."
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="creatorpartnershipmodals-11"
            className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block"
          >
            Internal CRM Notes
          </label>
          <textarea
            id="creatorpartnershipmodals-11"
            value={editForm.internal_notes}
            onChange={(e) => setEditForm((prev) => ({ ...prev, internal_notes: e.target.value }))}
            className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm min-h-[60px]"
            placeholder="Private details, scoring fits, follow up details..."
          />
        </div>

        <div className="flex gap-3 pt-4 border-t border-gray-100">
          <Button
            type="button"
            variant="outline"
            className="flex-1 font-normal text-xs uppercase tracking-widest"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={submitting}
            className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-normal text-xs uppercase tracking-widest"
          >
            {submitting ? 'Saving...' : 'Save Parameters'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
