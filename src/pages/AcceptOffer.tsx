import { toast } from '../lib/toast';
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

export default function AcceptOffer() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [partnership, setPartnership] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [successType, setSuccessType] = useState<'accepted' | 'rejected' | null>(null);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [feedback, setFeedback] = useState('');

  const [form, setForm] = useState({
    shipping_address_line1: '',
    shipping_address_line2: '',
    shipping_city: '',
    shipping_state: '',
    shipping_zip: '',
    shipping_country: 'US',
    terms_accepted: false,
    signature: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const alreadyAccepted =
    partnership &&
    (partnership.status === 'offer_accepted' ||
      partnership.status === 'contract_signed' ||
      partnership.status === 'active');
  const alreadyRejected = partnership && partnership.status === 'negotiating';

  useEffect(() => {
    if (searchParams.get('reject') === 'true') {
      setShowRejectForm(true);
    }
  }, [searchParams]);

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081/api';
    fetch(`${apiUrl}/partnerships/public/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setPartnership(data.data);
          // Pre-fill if address exists on creator
          if (data.data.Creator) {
            setForm((f) => ({
              ...f,
              shipping_address_line1: data.data.Creator.shipping_address_line1 || '',
              shipping_address_line2: data.data.Creator.shipping_address_line2 || '',
              shipping_city: data.data.Creator.shipping_city || '',
              shipping_state: data.data.Creator.shipping_state || '',
              shipping_zip: data.data.Creator.shipping_zip || '',
              shipping_country: data.data.Creator.shipping_country || 'US',
            }));
          }
        } else {
          setError(data.error || 'Proposal not found');
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const startDrawing = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    const rect = canvas.getBoundingClientRect();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e: any) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const endDrawing = () => {
    setIsDrawing(false);
    if (canvasRef.current) {
      setForm((f) => ({ ...f, signature: canvasRef.current!.toDataURL() }));
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setForm((f) => ({ ...f, signature: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alreadyAccepted && (!form.terms_accepted || !form.signature)) {
      toast.error('Please accept the terms and provide a signature.');
      return;
    }
    setSubmitting(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081/api';
      const res = await fetch(`${apiUrl}/partnerships/public/${id}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        setSuccessType('accepted');
      } else {
        toast.error(data.error || 'Something went wrong');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) {
      toast.error('Please provide your feedback so we can review the offer terms.');
      return;
    }
    setSubmitting(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081/api';
      const res = await fetch(`${apiUrl}/partnerships/public/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        setSuccessType('rejected');
      } else {
        toast.error(data.error || 'Something went wrong');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center font-outfit text-gray-500">
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Proposal Not Found</h2>
          <p className="text-gray-500 mb-6">{error}</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex h-screen items-center justify-center font-outfit bg-gray-50">
        <div className="bg-white p-10 rounded-2xl shadow-xl max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">
            ✓
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {successType === 'rejected'
              ? 'Feedback Submitted'
              : alreadyAccepted
                ? 'Address Received!'
                : 'Offer Accepted!'}
          </h1>
          <p className="text-gray-600">
            {successType === 'rejected'
              ? 'Thank you for your feedback. We will review your notes and our campaign manager will be in touch shortly.'
              : alreadyAccepted
                ? 'Thank you for providing your shipping address. We will prepare your shipment shortly.'
                : 'Thank you for confirming. Your acceptance has been recorded, and the campaign manager will be in touch shortly.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          <div className="bg-primary-600 px-8 py-10 text-white text-center">
            <h1 className="text-3xl font-bold mb-2">
              {alreadyAccepted ? 'Provide Shipping Address' : 'Collaboration Proposal'}
            </h1>
            <p className="text-primary-100 text-lg opacity-90">{partnership?.Campaign?.name}</p>
          </div>

          <div className="p-8">
            <div className="mb-8 p-5 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-4">
              <img
                src={partnership?.Creator?.profile_pic || 'https://via.placeholder.com/60'}
                alt="Profile"
                className="w-16 h-16 rounded-full object-cover shadow-sm"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(partnership?.Creator?.full_name || partnership?.Creator?.handle || 'C')}&background=E0E7FF&color=4338CA`;
                }}
              />
              <div>
                <h3 className="font-semibold text-lg text-gray-900">
                  {partnership?.Creator?.full_name}
                </h3>
                <p className="text-gray-500 text-sm">@{partnership?.Creator?.handle}</p>
              </div>
            </div>

            {showRejectForm ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Provide Feedback</h3>
                <p className="text-sm text-gray-600">
                  Please let us know why you are declining the offer or what terms you would like to
                  negotiate.
                </p>
                <textarea
                  rows={4}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 px-4 py-2 border"
                  placeholder="Enter your feedback or counter-offer here..."
                  required
                />
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setShowRejectForm(false)}
                    className="flex-1 py-3 px-4 border border-gray-300 rounded-xl shadow-sm text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleReject}
                    disabled={submitting || !feedback.trim()}
                    className="flex-1 py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-all"
                  >
                    {submitting ? 'Submitting...' : 'Submit Feedback'}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                    Shipping Address (Optional)
                  </h3>
                  <p className="text-xs text-gray-500">
                    Provide your shipping address if you wish to receive products for this campaign.
                  </p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="col-span-2">
                      <label
                        htmlFor="acceptoffer-1"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Address Line 1
                      </label>
                      <input
                        id="acceptoffer-1"
                        type="text"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 px-4 py-2 border"
                        value={form.shipping_address_line1}
                        onChange={(e) =>
                          setForm({ ...form, shipping_address_line1: e.target.value })
                        }
                      />
                    </div>
                    <div className="col-span-2">
                      <label
                        htmlFor="acceptoffer-2"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Address Line 2
                      </label>
                      <input
                        id="acceptoffer-2"
                        type="text"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 px-4 py-2 border"
                        value={form.shipping_address_line2}
                        onChange={(e) =>
                          setForm({ ...form, shipping_address_line2: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="acceptoffer-3"
                        className="block text-sm font-medium text-gray-700"
                      >
                        City
                      </label>
                      <input
                        id="acceptoffer-3"
                        type="text"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 px-4 py-2 border"
                        value={form.shipping_city}
                        onChange={(e) => setForm({ ...form, shipping_city: e.target.value })}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="acceptoffer-4"
                        className="block text-sm font-medium text-gray-700"
                      >
                        State / Province
                      </label>
                      <input
                        id="acceptoffer-4"
                        type="text"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 px-4 py-2 border"
                        value={form.shipping_state}
                        onChange={(e) => setForm({ ...form, shipping_state: e.target.value })}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="acceptoffer-5"
                        className="block text-sm font-medium text-gray-700"
                      >
                        ZIP / Postal Code
                      </label>
                      <input
                        id="acceptoffer-5"
                        type="text"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 px-4 py-2 border"
                        value={form.shipping_zip}
                        onChange={(e) => setForm({ ...form, shipping_zip: e.target.value })}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="acceptoffer-6"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Country
                      </label>
                      <input
                        id="acceptoffer-6"
                        type="text"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 px-4 py-2 border"
                        value={form.shipping_country}
                        onChange={(e) => setForm({ ...form, shipping_country: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {!alreadyAccepted && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                      Agreements
                    </h3>

                    <div className="flex items-start">
                      <div className="flex h-5 items-center">
                        <input
                          id="terms"
                          type="checkbox"
                          required
                          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          checked={form.terms_accepted}
                          onChange={(e) => setForm({ ...form, terms_accepted: e.target.checked })}
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="terms" className="font-medium text-gray-700">
                          I accept the Terms & Conditions
                        </label>
                        <p className="text-gray-500">
                          By checking this box, you agree to the campaign deliverables and
                          requirements.
                        </p>
                      </div>
                    </div>

                    <div>
                      <span className="block text-sm font-medium text-gray-700 mb-2">
                        Signature <span className="text-red-500">*</span>
                      </span>
                      <div className="border border-gray-300 rounded-lg overflow-hidden bg-gray-50 relative">
                        <canvas
                          ref={canvasRef}
                          width={600}
                          height={200}
                          className="w-full bg-white cursor-crosshair"
                          onMouseDown={startDrawing}
                          onMouseMove={draw}
                          onMouseUp={endDrawing}
                          onMouseLeave={endDrawing}
                        />
                        <button
                          type="button"
                          onClick={clearSignature}
                          className="absolute bottom-2 right-2 text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-6 flex flex-col gap-4">
                  <button
                    type="submit"
                    disabled={
                      (!alreadyAccepted && (!form.terms_accepted || !form.signature)) || submitting
                    }
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {submitting
                      ? 'Submitting...'
                      : alreadyAccepted
                        ? 'Submit Address'
                        : 'Accept Offer'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
