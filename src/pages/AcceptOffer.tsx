import { toast } from '../lib/toast';
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { OfferSummary } from '../components/offer/OfferSummary';
import { getErrorMessage } from '../lib/api';
import { getOfferState } from '../lib/offerState';
import {
  acceptPublicOffer,
  fetchPublicOffer,
  rejectPublicOffer,
  type PublicOffer,
} from '../lib/publicOfferApi';

// What the API requires of an address when product ships (acceptOfferPublic). Line 2 and
// the pre-filled country are not required. ids match the inputs below.
const REQUIRED_ADDRESS_FIELDS = [
  { key: 'shipping_address_line1', id: 'acceptoffer-1', message: 'Address line 1 is required' },
  { key: 'shipping_city', id: 'acceptoffer-3', message: 'City is required' },
  { key: 'shipping_state', id: 'acceptoffer-4', message: 'State or province is required' },
  { key: 'shipping_zip', id: 'acceptoffer-5', message: 'ZIP or postal code is required' },
] as const;

function AddressField({
  id,
  label,
  value,
  onChange,
  className,
  required,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  required?: boolean;
  error?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <input
        id={id}
        type="text"
        className={`mt-1 block w-full rounded-md shadow-sm px-4 py-2 border ${
          error
            ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
            : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
        }`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

export default function AcceptOffer() {
  const { id = '' } = useParams();
  const [searchParams] = useSearchParams();
  // The signed link from the email. The API checks it (requireOfferToken) on every call.
  const token = searchParams.get('token');
  const exp = searchParams.get('exp');
  const [partnership, setPartnership] = useState<PublicOffer | null>(null);
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
  // Set by a submit attempt, so the inline "is required" messages don't show before then.
  const [showAddressErrors, setShowAddressErrors] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Stroke state lives in refs: pointermove fires faster than React re-renders, and
  // a second finger must not be able to hijack a stroke already in progress.
  const activePointerId = useRef<number | null>(null);
  const hasInk = useRef(false);

  const offerState = getOfferState(partnership?.status);
  const alreadyAccepted = offerState === 'accepted';
  const declined = offerState === 'declined';
  // `negotiating` is what the creator's own feedback sets: feedback sent, not a refusal.
  const feedbackSent = offerState === 'feedback_sent';

  // When product ships the API refuses an acceptance without an address.
  const addressRequired = !!partnership?.shipment_included;
  const missingAddressFields = addressRequired
    ? REQUIRED_ADDRESS_FIELDS.filter((field) => !form[field.key].trim())
    : [];
  const addressErrors: Record<string, string> = showAddressErrors
    ? Object.fromEntries(missingAddressFields.map((field) => [field.key, field.message]))
    : {};

  useEffect(() => {
    if (searchParams.get('reject') === 'true') {
      setShowRejectForm(true);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchPublicOffer(id, { token, exp })
      .then((offer) => {
        setPartnership(offer);
        // Pre-fill if address exists on creator
        if (offer.Creator) {
          const creator = offer.Creator;
          setForm((f) => ({
            ...f,
            shipping_address_line1: creator.shipping_address_line1 || '',
            shipping_address_line2: creator.shipping_address_line2 || '',
            shipping_city: creator.shipping_city || '',
            shipping_state: creator.shipping_state || '',
            shipping_zip: creator.shipping_zip || '',
            shipping_country: creator.shipping_country || 'US',
          }));
        }
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [id, token, exp]);

  // The canvas bitmap is 600x200 but CSS stretches it to the card width (about half
  // that on a phone), so scale pointer positions from CSS pixels into bitmap pixels.
  const toCanvasPoint = (canvas: HTMLCanvasElement, e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width > 0 ? canvas.width / rect.width : 1;
    const scaleY = rect.height > 0 ? canvas.height / rect.height : 1;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY, scaleX };
  };

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // One stroke at a time, primary button only: a right-click opens a context menu
    // that swallows the pointerup and would leave the stroke stuck open.
    if (activePointerId.current !== null || e.button !== 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const { x, y, scaleX } = toCanvasPoint(canvas, e);
    ctx.lineWidth = 2 * scaleX; // about 2 CSS px at whatever size the card renders
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    activePointerId.current = e.pointerId;
    try {
      // Keep this pointer's events coming after it leaves the canvas, so a stroke
      // that strays off the edge ends cleanly instead of sticking.
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // Drawing still works without capture; it just stops following the pointer off the pad.
    }
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerId !== activePointerId.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const { x, y } = toCanvasPoint(canvas, e);
    ctx.lineTo(x, y);
    ctx.stroke();
    // Restart the path so the next segment doesn't re-stroke (and darken) the whole line so far.
    ctx.beginPath();
    ctx.moveTo(x, y);
    hasInk.current = true;
  };

  // Pointer up and pointer cancel both end the stroke.
  const endDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerId !== activePointerId.current) return;
    activePointerId.current = null;
    // Only a stroke that put ink down is a signature; a tap leaves the canvas blank.
    if (hasInk.current && canvasRef.current) {
      const signature = canvasRef.current.toDataURL();
      setForm((f) => ({ ...f, signature }));
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasInk.current = false;
    setForm((f) => ({ ...f, signature: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alreadyAccepted && (!form.terms_accepted || !form.signature)) {
      toast.error('Please confirm you agree to the offer and add your signature.');
      return;
    }
    if (missingAddressFields.length > 0) {
      setShowAddressErrors(true);
      document.getElementById(missingAddressFields[0].id)?.focus();
      return;
    }
    setSubmitting(true);
    try {
      await acceptPublicOffer(id, { token, exp }, form);
      setSuccess(true);
      setSuccessType('accepted');
    } catch (err) {
      toast.error(getErrorMessage(err));
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
      await rejectPublicOffer(id, { token, exp }, feedback);
      setSuccess(true);
      setSuccessType('rejected');
    } catch (err) {
      toast.error(getErrorMessage(err));
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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">We couldn't open this proposal</h2>
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

  if (declined) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Proposal declined</h1>
          <p className="text-gray-500">
            This proposal has been declined and can no longer be accepted. If you have questions,
            please contact your campaign manager.
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

            {feedbackSent && !showRejectForm && (
              <p
                role="status"
                className="mb-8 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700"
              >
                Thanks, we've received your feedback. Our campaign manager will be in touch.
              </p>
            )}

            {partnership && <OfferSummary partnership={partnership} />}

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
                    {addressRequired ? 'Shipping address' : 'Shipping address (optional)'}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {addressRequired
                      ? "We'll ship your product here. Fields marked * are required."
                      : 'Provide your shipping address if you wish to receive products for this campaign.'}
                  </p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <AddressField
                      id="acceptoffer-1"
                      className="sm:col-span-2"
                      label="Address Line 1"
                      required={addressRequired}
                      error={addressErrors.shipping_address_line1}
                      value={form.shipping_address_line1}
                      onChange={(value) =>
                        setForm((f) => ({ ...f, shipping_address_line1: value }))
                      }
                    />
                    <AddressField
                      id="acceptoffer-2"
                      className="sm:col-span-2"
                      label="Address Line 2"
                      value={form.shipping_address_line2}
                      onChange={(value) =>
                        setForm((f) => ({ ...f, shipping_address_line2: value }))
                      }
                    />
                    <AddressField
                      id="acceptoffer-3"
                      label="City"
                      required={addressRequired}
                      error={addressErrors.shipping_city}
                      value={form.shipping_city}
                      onChange={(value) => setForm((f) => ({ ...f, shipping_city: value }))}
                    />
                    <AddressField
                      id="acceptoffer-4"
                      label="State / Province"
                      required={addressRequired}
                      error={addressErrors.shipping_state}
                      value={form.shipping_state}
                      onChange={(value) => setForm((f) => ({ ...f, shipping_state: value }))}
                    />
                    <AddressField
                      id="acceptoffer-5"
                      label="ZIP / Postal Code"
                      required={addressRequired}
                      error={addressErrors.shipping_zip}
                      value={form.shipping_zip}
                      onChange={(value) => setForm((f) => ({ ...f, shipping_zip: value }))}
                    />
                    <AddressField
                      id="acceptoffer-6"
                      label="Country"
                      value={form.shipping_country}
                      onChange={(value) => setForm((f) => ({ ...f, shipping_country: value }))}
                    />
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
                          I agree to the deliverables and compensation above.
                        </label>
                      </div>
                    </div>

                    <div>
                      <span className="block text-sm font-medium text-gray-700 mb-2">
                        Signature <span className="text-red-500">*</span>
                      </span>
                      <div className="border border-gray-300 rounded-lg overflow-hidden bg-gray-50">
                        {/* Pointer events cover mouse, touch and pen. touch-action: none stops a
                            phone treating the drag as a page scroll, which would never deliver the stroke. */}
                        <canvas
                          ref={canvasRef}
                          width={600}
                          height={200}
                          role="img"
                          aria-label="Signature pad"
                          className="w-full bg-white cursor-crosshair"
                          style={{ touchAction: 'none' }}
                          onPointerDown={startDrawing}
                          onPointerMove={draw}
                          onPointerUp={endDrawing}
                          onPointerCancel={endDrawing}
                        />
                      </div>
                      {/* Below the pad, not over it: on a phone the pad is only ~100px tall and a
                          button in its corner covers signing space and gets tapped by accident. */}
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={clearSignature}
                          className="px-2 py-3 text-sm font-medium text-gray-600 hover:text-gray-900 hover:underline"
                        >
                          Clear signature
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
