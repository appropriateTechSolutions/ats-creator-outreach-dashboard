import { logger } from '../../lib/logger';
import { toast } from '../../lib/toast';
import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { LoadingState } from '../ui/LoadingState';
import { previewOutreach, sendOffer } from '../../lib/api';
import { Plus, Trash2 } from 'lucide-react';

interface Deliverable {
  id: string;
  platform: string;
  content_type: string;
  due_date: string;
  notes: string;
}

interface OfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  partnership: any; // The active partnership object
  onSuccess: () => void; // Callback to refresh data
}

export function OfferModal({ isOpen, onClose, partnership, onSuccess }: OfferModalProps) {
  const [step, setStep] = useState<'form' | 'preview'>('form');
  const [submitting, setSubmitting] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Form State
  const [offerForm, setOfferForm] = useState({
    offer_type: 'free_product',
    flat_fee: 0,
    payment_timing: '',
    payment_method: '',
    shipment_included: false,
    affiliate_enabled: false,
    affiliate_percentage: 0,
    affiliate_code: '',
    affiliate_link: '',
  });

  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);

  // Preview State
  const [previewSubject, setPreviewSubject] = useState('');
  const [previewBody, setPreviewBody] = useState('');
  const [previewToEmail, setPreviewToEmail] = useState('');

  // Reset form when opened with a new partnership
  useEffect(() => {
    if (isOpen && partnership) {
      setStep('form');
      setOfferForm({
        offer_type: partnership.offer_type || 'free_product',
        flat_fee: partnership.flat_fee || 0,
        payment_timing: partnership.payment_timing || '',
        payment_method: partnership.payment_method || '',
        shipment_included: partnership.shipment_included || false,
        affiliate_enabled: partnership.affiliate_enabled || false,
        affiliate_percentage: partnership.affiliate_percentage || 0,
        affiliate_code: partnership.affiliate_code || '',
        affiliate_link: partnership.affiliate_link || '',
      });
      // Try to load existing content if any
      const existingDeliverables = partnership.content || [];
      if (existingDeliverables.length > 0) {
        setDeliverables(
          existingDeliverables.map((c: any) => ({
            id: c.id || Math.random().toString(),
            platform: c.platform,
            content_type: c.content_type,
            due_date: c.due_date ? c.due_date.split('T')[0] : '',
            notes: c.notes || '',
          })),
        );
      } else {
        setDeliverables([]);
      }
    }
  }, [isOpen, partnership]);

  const addDeliverable = () => {
    setDeliverables((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        platform: 'instagram',
        content_type: 'instagram_reel',
        due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default 2 weeks
        notes: '',
      },
    ]);
  };

  const removeDeliverable = (id: string) => {
    setDeliverables((prev) => prev.filter((d) => d.id !== id));
  };

  const updateDeliverable = (id: string, field: keyof Deliverable, value: string) => {
    setDeliverables((prev) => prev.map((d) => (d.id === id ? { ...d, [field]: value } : d)));
  };

  const handleContinueToPreview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnership) return;

    setStep('preview');
    setPreviewLoading(true);
    try {
      const extraParams = {
        offer_type: offerForm.offer_type,
        flat_fee: offerForm.flat_fee || undefined,
        affiliate_code: offerForm.affiliate_enabled ? offerForm.affiliate_code : undefined,
        affiliate_percentage: offerForm.affiliate_enabled
          ? offerForm.affiliate_percentage
          : undefined,
        deliverables: deliverables.length > 0 ? JSON.stringify(deliverables) : undefined,
      };

      const data = await previewOutreach(
        partnership.creator_id || partnership.Creator?.id,
        partnership.campaign_id,
        'qualification',
        extraParams,
      );
      setPreviewSubject(data.subject || '');
      setPreviewBody(data.body || '');
      setPreviewToEmail(data.to || partnership.Creator?.email || '');
    } catch (err) {
      logger.error(err);
      toast.error('Failed to load email preview.');
      setStep('form');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSendOfferEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnership) return;
    setSubmitting(true);
    try {
      await sendOffer(partnership.id, {
        offer_type: offerForm.offer_type,
        flat_fee: Number(offerForm.flat_fee) || undefined,
        payment_timing: offerForm.payment_timing || undefined,
        payment_method: offerForm.payment_method || undefined,
        shipment_included: offerForm.shipment_included,
        deliverables: deliverables.map((d) => ({
          platform: d.platform,
          content_type: d.content_type,
          due_date: d.due_date,
          notes: d.notes,
        })),
        affiliate_enabled: offerForm.affiliate_enabled,
        affiliate_percentage: offerForm.affiliate_enabled
          ? Number(offerForm.affiliate_percentage)
          : undefined,
        affiliate_code: offerForm.affiliate_enabled ? offerForm.affiliate_code : undefined,
        affiliate_link: offerForm.affiliate_enabled ? offerForm.affiliate_link : undefined,
        customSubject: previewSubject,
        customBody: previewBody,
        customTo: previewToEmail,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(
        'Failed to send offer email: ' + (err.error || err.message || JSON.stringify(err)),
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <Modal
        isOpen={step === 'form'}
        onClose={onClose}
        title="Draft & Send Campaign Offer"
        size="2xl"
      >
        <form onSubmit={handleContinueToPreview} className="space-y-8 font-outfit">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column: Compensation */}
            <div className="space-y-5">
              <h3 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3">
                Compensation Details
              </h3>

              <div className="space-y-1.5">
                <label
                  htmlFor="offermodal-1"
                  className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block"
                >
                  Offer Compensation Type
                </label>
                <select
                  id="offermodal-1"
                  value={offerForm.offer_type}
                  onChange={(e) =>
                    setOfferForm((prev) => ({ ...prev, offer_type: e.target.value }))
                  }
                  className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all outline-none"
                >
                  <option value="free_product">Free Product Only</option>
                  <option value="affiliate_commission">Affiliate Commission Only</option>
                  <option value="flat_fee">Flat Fee</option>
                  <option value="hybrid">Hybrid (Flat Fee + Affiliate)</option>
                </select>
              </div>

              {(offerForm.offer_type === 'flat_fee' || offerForm.offer_type === 'hybrid') && (
                <div className="space-y-4 p-4 bg-gray-50/50 rounded-xl border border-gray-100">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="offermodal-2001"
                      className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block"
                    >
                      Flat Fee Amount (USD)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                        $
                      </span>
                      <input
                        id="offermodal-2001"
                        type="number"
                        value={offerForm.flat_fee}
                        onChange={(e) =>
                          setOfferForm((prev) => ({ ...prev, flat_fee: Number(e.target.value) }))
                        }
                        className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-8 pr-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                        min="0"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label
                      htmlFor="offermodal-2"
                      className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block"
                    >
                      Payment Timing
                    </label>
                    <input
                      id="offermodal-2"
                      type="text"
                      placeholder="e.g. 50% upfront, 50% upon approval"
                      value={offerForm.payment_timing}
                      onChange={(e) =>
                        setOfferForm((prev) => ({ ...prev, payment_timing: e.target.value }))
                      }
                      className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label
                      htmlFor="offermodal-3"
                      className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block"
                    >
                      Payment Method
                    </label>
                    <input
                      id="offermodal-3"
                      type="text"
                      placeholder="e.g. PayPal, Bank Transfer"
                      value={offerForm.payment_method}
                      onChange={(e) =>
                        setOfferForm((prev) => ({ ...prev, payment_method: e.target.value }))
                      }
                      className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="space-y-3 pt-2">
                {/* Custom Toggle Switch for Shipment */}
                <label
                  htmlFor="offermodal-5001"
                  className={`flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-all ${offerForm.shipment_included ? 'border-primary-300 bg-primary-50/30 shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                >
                  <div>
                    <div className="text-sm font-semibold text-gray-900">
                      Include Product Shipment
                    </div>
                    <div className="text-[11px] text-gray-500 mt-0.5">
                      Creator must provide shipping address
                    </div>
                  </div>
                  <div
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${offerForm.shipment_included ? 'bg-primary-600' : 'bg-gray-200'}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${offerForm.shipment_included ? 'translate-x-6' : 'translate-x-1'}`}
                    />
                  </div>
                  <input
                    id="offermodal-5001"
                    type="checkbox"
                    checked={offerForm.shipment_included}
                    onChange={(e) =>
                      setOfferForm((prev) => ({ ...prev, shipment_included: e.target.checked }))
                    }
                    className="sr-only"
                  />
                </label>

                {/* Custom Toggle Switch for Affiliate */}
                <label
                  htmlFor="offermodal-5002"
                  className={`flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-all ${offerForm.affiliate_enabled ? 'border-primary-300 bg-primary-50/30 shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                >
                  <div>
                    <div className="text-sm font-semibold text-gray-900">
                      Enable Affiliate Tracking
                    </div>
                    <div className="text-[11px] text-gray-500 mt-0.5">
                      Assign promo codes to track sales
                    </div>
                  </div>
                  <div
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${offerForm.affiliate_enabled ? 'bg-primary-600' : 'bg-gray-200'}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${offerForm.affiliate_enabled ? 'translate-x-6' : 'translate-x-1'}`}
                    />
                  </div>
                  <input
                    id="offermodal-5002"
                    type="checkbox"
                    checked={offerForm.affiliate_enabled}
                    onChange={(e) =>
                      setOfferForm((prev) => ({ ...prev, affiliate_enabled: e.target.checked }))
                    }
                    className="sr-only"
                  />
                </label>

                {offerForm.affiliate_enabled && (
                  <div className="grid grid-cols-1 gap-4 p-5 border border-dashed border-gray-300 rounded-xl bg-white shadow-inner">
                    <div className="space-y-1.5">
                      <label
                        htmlFor="offermodal-4"
                        className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block"
                      >
                        Percentage (%)
                      </label>
                      <input
                        id="offermodal-4"
                        type="number"
                        value={offerForm.affiliate_percentage}
                        onChange={(e) =>
                          setOfferForm((prev) => ({
                            ...prev,
                            affiliate_percentage: Number(e.target.value),
                          }))
                        }
                        className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                        min="0"
                        max="100"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label
                        htmlFor="offermodal-5"
                        className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block"
                      >
                        Promo Code
                      </label>
                      <input
                        id="offermodal-5"
                        type="text"
                        value={offerForm.affiliate_code}
                        onChange={(e) =>
                          setOfferForm((prev) => ({ ...prev, affiliate_code: e.target.value }))
                        }
                        className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm uppercase font-mono focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                        placeholder="CODE20"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label
                        htmlFor="offermodal-6"
                        className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block"
                      >
                        Tracking URL
                      </label>
                      <input
                        id="offermodal-6"
                        type="text"
                        value={offerForm.affiliate_link}
                        onChange={(e) =>
                          setOfferForm((prev) => ({ ...prev, affiliate_link: e.target.value }))
                        }
                        className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Deliverables */}
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-base font-semibold text-gray-900">Content Deliverables</h3>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="text-[10px] h-8 px-3 hover:bg-gray-50"
                  onClick={addDeliverable}
                >
                  <Plus size={14} className="mr-1.5" /> Add Deliverable
                </Button>
              </div>

              {deliverables.length === 0 ? (
                <div className="text-center py-12 bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-200">
                  <div className="text-sm font-medium text-gray-500 mb-3">
                    No deliverables added yet.
                  </div>
                  <Button type="button" size="sm" variant="outline" onClick={addDeliverable}>
                    Add First Deliverable
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {deliverables.map((d, i) => (
                    <div
                      key={d.id}
                      className="p-5 border border-gray-200 bg-white rounded-2xl shadow-sm relative group hover:border-gray-300 transition-all"
                    >
                      <div className="absolute top-4 right-4 flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-300 uppercase tracking-widest bg-gray-50 px-2 py-1 rounded-md">
                          #{i + 1}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeDeliverable(d.id)}
                        className="absolute bottom-4 right-4 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        title="Remove Deliverable"
                      >
                        <Trash2 size={16} />
                      </button>

                      <div className="space-y-4 pr-10">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label
                              htmlFor="offermodal-7"
                              className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block"
                            >
                              Platform
                            </label>
                            <select
                              id="offermodal-7"
                              value={d.platform}
                              onChange={(e) => updateDeliverable(d.id, 'platform', e.target.value)}
                              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                            >
                              <option value="instagram">Instagram</option>
                              <option value="youtube">YouTube</option>
                              <option value="tiktok">TikTok</option>
                              <option value="blog">Blog/Website</option>
                            </select>
                          </div>
                          <div className="space-y-1.5">
                            <label
                              htmlFor="offermodal-8"
                              className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block"
                            >
                              Type
                            </label>
                            <select
                              id="offermodal-8"
                              value={d.content_type}
                              onChange={(e) =>
                                updateDeliverable(d.id, 'content_type', e.target.value)
                              }
                              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                            >
                              <option value="instagram_reel">IG Reel</option>
                              <option value="instagram_story">IG Story</option>
                              <option value="instagram_post">IG Post</option>
                              <option value="youtube_video">YT Video</option>
                              <option value="youtube_short">YT Short</option>
                              <option value="tiktok_video">TikTok Video</option>
                              <option value="blog_post">Blog Post</option>
                            </select>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label
                            htmlFor="offermodal-9"
                            className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block"
                          >
                            Due Date
                          </label>
                          <input
                            id="offermodal-9"
                            type="date"
                            value={d.due_date}
                            onChange={(e) => updateDeliverable(d.id, 'due_date', e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label
                            htmlFor="offermodal-10"
                            className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block"
                          >
                            Notes / Requirements
                          </label>
                          <textarea
                            id="offermodal-10"
                            placeholder="e.g. Include product in first 3s, tag @brand"
                            value={d.notes}
                            onChange={(e) => updateDeliverable(d.id, 'notes', e.target.value)}
                            rows={3}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all resize-none max-h-32 overflow-y-auto"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              className="font-normal text-xs uppercase tracking-widest px-8"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary-600 hover:bg-primary-700 text-white font-normal text-xs uppercase tracking-widest px-8 shadow-md hover:shadow-lg transition-all"
            >
              Continue to Preview Email
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={step === 'preview'}
        onClose={onClose}
        title="Review & Send Offer Email"
        size="lg"
      >
        {previewLoading ? (
          <div className="py-12">
            <LoadingState message="Generating Offer Preview..." />
          </div>
        ) : (
          <form onSubmit={handleSendOfferEmail} className="space-y-4 font-outfit">
            <div>
              <label
                htmlFor="offermodal-11"
                className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1"
              >
                To
              </label>
              <input
                id="offermodal-11"
                type="email"
                value={previewToEmail}
                onChange={(e) => setPreviewToEmail(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 font-mono focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                placeholder="No email on record"
              />
            </div>

            <div>
              <label
                htmlFor="offermodal-12"
                className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1"
              >
                Subject Line
              </label>
              <input
                id="offermodal-12"
                type="text"
                value={previewSubject}
                onChange={(e) => setPreviewSubject(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-sm"
                placeholder="Enter email subject"
                required
              />
            </div>

            <div>
              <label
                htmlFor="offermodal-13"
                className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1"
              >
                Message Body (Plain Text)
              </label>
              <textarea
                id="offermodal-13"
                value={previewBody}
                onChange={(e) => setPreviewBody(e.target.value)}
                rows={10}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all font-sans text-sm whitespace-pre-wrap"
                placeholder="Enter email body"
                required
              />
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                className="flex-1 font-normal text-xs uppercase tracking-widest"
                onClick={() => setStep('form')}
              >
                Back to Settings
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-normal text-xs uppercase tracking-widest"
              >
                {submitting ? 'Sending Offer...' : 'Send Offer Email'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
