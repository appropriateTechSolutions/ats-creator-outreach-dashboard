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
    affiliate_link: ''
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
        affiliate_link: partnership.affiliate_link || ''
      });
      // Try to load existing content if any
      const existingDeliverables = partnership.content || [];
      if (existingDeliverables.length > 0) {
        setDeliverables(existingDeliverables.map((c: any) => ({
          id: c.id || Math.random().toString(),
          platform: c.platform,
          content_type: c.content_type,
          due_date: c.due_date ? c.due_date.split('T')[0] : '',
          notes: c.notes || ''
        })));
      } else {
        setDeliverables([]);
      }
    }
  }, [isOpen, partnership]);

  const addDeliverable = () => {
    setDeliverables(prev => [
      ...prev,
      {
        id: Math.random().toString(),
        platform: 'instagram',
        content_type: 'instagram_reel',
        due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default 2 weeks
        notes: ''
      }
    ]);
  };

  const removeDeliverable = (id: string) => {
    setDeliverables(prev => prev.filter(d => d.id !== id));
  };

  const updateDeliverable = (id: string, field: keyof Deliverable, value: string) => {
    setDeliverables(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));
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
        affiliate_percentage: offerForm.affiliate_enabled ? offerForm.affiliate_percentage : undefined,
        deliverables: deliverables.length > 0 ? JSON.stringify(deliverables) : undefined
      };
      
      const data = await previewOutreach(
        partnership.creator_id || partnership.Creator?.id,
        partnership.campaign_id,
        'qualification',
        extraParams
      );
      setPreviewSubject(data.subject || '');
      setPreviewBody(data.body || '');
      setPreviewToEmail(data.to || partnership.Creator?.email || '');
    } catch (err) {
      console.error(err);
      alert('Failed to load email preview.');
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
        deliverables: deliverables.map(d => ({
          platform: d.platform,
          content_type: d.content_type,
          due_date: d.due_date,
          notes: d.notes
        })),
        affiliate_enabled: offerForm.affiliate_enabled,
        affiliate_percentage: offerForm.affiliate_enabled ? Number(offerForm.affiliate_percentage) : undefined,
        affiliate_code: offerForm.affiliate_enabled ? offerForm.affiliate_code : undefined,
        affiliate_link: offerForm.affiliate_enabled ? offerForm.affiliate_link : undefined,
        customSubject: previewSubject,
        customBody: previewBody,
        customTo: previewToEmail
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      alert('Failed to send offer email: ' + (err.error || err.message || JSON.stringify(err)));
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <Modal isOpen={step === 'form'} onClose={onClose} title="Draft & Send Campaign Offer" size="xl">
        <form onSubmit={handleContinueToPreview} className="space-y-6 font-outfit">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-900 border-b border-gray-100 pb-2">Compensation Details</h3>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Offer Compensation Type</label>
                <select
                  value={offerForm.offer_type}
                  onChange={e => setOfferForm(prev => ({ ...prev, offer_type: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm"
                >
                  <option value="free_product">Free Product Only</option>
                  <option value="affiliate_commission">Affiliate Commission Only</option>
                  <option value="flat_fee">Flat Fee</option>
                  <option value="hybrid">Hybrid (Flat Fee + Affiliate)</option>
                </select>
              </div>

              {(offerForm.offer_type === 'flat_fee' || offerForm.offer_type === 'hybrid') && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Flat Fee Amount (USD)</label>
                    <input
                      type="number"
                      value={offerForm.flat_fee}
                      onChange={e => setOfferForm(prev => ({ ...prev, flat_fee: Number(e.target.value) }))}
                      className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm"
                      min="0"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Payment Timing</label>
                    <input
                      type="text"
                      placeholder="e.g. 50% upfront, 50% upon approval"
                      value={offerForm.payment_timing}
                      onChange={e => setOfferForm(prev => ({ ...prev, payment_timing: e.target.value }))}
                      className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Payment Method</label>
                    <input
                      type="text"
                      placeholder="e.g. PayPal, Bank Transfer"
                      value={offerForm.payment_method}
                      onChange={e => setOfferForm(prev => ({ ...prev, payment_method: e.target.value }))}
                      className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="pt-2">
                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl bg-gray-50/50 cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={offerForm.shipment_included}
                    onChange={e => setOfferForm(prev => ({ ...prev, shipment_included: e.target.checked }))}
                    className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900">Include Product Shipment</div>
                    <div className="text-[11px] text-gray-500">Requires creator to provide shipping address before accepting</div>
                  </div>
                </label>
              </div>

              <div className="pt-2 space-y-3">
                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl bg-gray-50/50 cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={offerForm.affiliate_enabled}
                    onChange={e => setOfferForm(prev => ({ ...prev, affiliate_enabled: e.target.checked }))}
                    className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900">Enable Affiliate Tracking</div>
                    <div className="text-[11px] text-gray-500">Assign promo codes and track performance</div>
                  </div>
                </label>

                {offerForm.affiliate_enabled && (
                  <div className="grid grid-cols-1 gap-3 p-4 border border-dashed border-gray-200 rounded-xl bg-white">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Percentage (%)</label>
                      <input
                        type="number"
                        value={offerForm.affiliate_percentage}
                        onChange={e => setOfferForm(prev => ({ ...prev, affiliate_percentage: Number(e.target.value) }))}
                        className="w-full bg-white border border-gray-200 rounded-lg p-2 text-sm"
                        min="0"
                        max="100"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Promo Code</label>
                      <input
                        type="text"
                        value={offerForm.affiliate_code}
                        onChange={e => setOfferForm(prev => ({ ...prev, affiliate_code: e.target.value }))}
                        className="w-full bg-white border border-gray-200 rounded-lg p-2 text-sm uppercase font-mono"
                        placeholder="CODE20"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Tracking URL</label>
                      <input
                        type="text"
                        value={offerForm.affiliate_link}
                        onChange={e => setOfferForm(prev => ({ ...prev, affiliate_link: e.target.value }))}
                        className="w-full bg-white border border-gray-200 rounded-lg p-2 text-sm"
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <h3 className="text-sm font-medium text-gray-900">Content Deliverables</h3>
                <Button type="button" size="sm" variant="outline" className="text-[10px] h-7 px-2" onClick={addDeliverable}>
                  <Plus size={12} className="mr-1" /> Add Deliverable
                </Button>
              </div>

              {deliverables.length === 0 ? (
                <div className="text-center py-8 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                  <div className="text-sm text-gray-500 mb-2">No deliverables added yet.</div>
                  <Button type="button" size="sm" variant="outline" onClick={addDeliverable}>
                    Add First Deliverable
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {deliverables.map((d, i) => (
                    <div key={d.id} className="p-3 border border-gray-200 bg-white rounded-xl shadow-sm space-y-3 relative group">
                      <button 
                        type="button" 
                        onClick={() => removeDeliverable(d.id)}
                        className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={14} />
                      </button>
                      <div className="grid grid-cols-2 gap-3 pr-6">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Platform</label>
                          <select
                            value={d.platform}
                            onChange={e => updateDeliverable(d.id, 'platform', e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs"
                          >
                            <option value="instagram">Instagram</option>
                            <option value="youtube">YouTube</option>
                            <option value="tiktok">TikTok</option>
                            <option value="blog">Blog/Website</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Type</label>
                          <select
                            value={d.content_type}
                            onChange={e => updateDeliverable(d.id, 'content_type', e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs"
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
                      <div className="grid grid-cols-2 gap-3 pr-6">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Due Date</label>
                          <input
                            type="date"
                            value={d.due_date}
                            onChange={e => updateDeliverable(d.id, 'due_date', e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Notes/Requirements</label>
                          <input
                            type="text"
                            placeholder="e.g. Include product in first 3s"
                            value={d.notes}
                            onChange={e => updateDeliverable(d.id, 'notes', e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-6 border-t border-gray-100">
            <Button type="button" variant="outline" className="flex-1 font-normal text-xs uppercase tracking-widest" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-normal text-xs uppercase tracking-widest">
              Continue to Preview Email
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={step === 'preview'} onClose={onClose} title="Review & Send Offer Email" size="lg">
        {previewLoading ? (
          <div className="py-12">
            <LoadingState message="Generating Offer Preview..." />
          </div>
        ) : (
          <form onSubmit={handleSendOfferEmail} className="space-y-4 font-outfit">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                To
              </label>
              <input
                type="email"
                value={previewToEmail}
                onChange={(e) => setPreviewToEmail(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 font-mono focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                placeholder="No email on record"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                Subject Line
              </label>
              <input
                type="text"
                value={previewSubject}
                onChange={(e) => setPreviewSubject(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-sm"
                placeholder="Enter email subject"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                Message Body (Plain Text)
              </label>
              <textarea
                value={previewBody}
                onChange={(e) => setPreviewBody(e.target.value)}
                rows={10}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all font-sans text-sm whitespace-pre-wrap"
                placeholder="Enter email body"
                required
              />
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <Button type="button" variant="outline" className="flex-1 font-normal text-xs uppercase tracking-widest" onClick={() => setStep('form')}>
                Back to Settings
              </Button>
              <Button type="submit" disabled={submitting} className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-normal text-xs uppercase tracking-widest">
                {submitting ? 'Sending Offer...' : 'Send Offer Email'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
