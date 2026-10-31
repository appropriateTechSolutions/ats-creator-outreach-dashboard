import { CreatorAvatar } from '../components/creators/CreatorIdentity';
import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { LoadingState } from '../components/ui/LoadingState';
import { Modal } from '../components/ui/Modal';
import { OfferModal } from '../components/workflow/OfferModal';
import { ShipmentModal } from '../components/workflow/ShipmentModal';
import {
  markQualified,
  markAccepted,
  activatePartnership,
  completePartnership,
  rejectPartnership,
  updatePartnership,
  getErrorMessage,
} from '../lib/api';
import { usePartnership, useCreator } from '../hooks/queries';
import {
  getPartnershipNextAction,
  pickPartnershipShipment,
  type NextAction,
} from '../lib/nextAction';
import { cleanMessageText, formatMoney } from '../lib/formatters';
import type { Creator, CreatorContent, Shipment } from '../types';
import { Edit3, ExternalLink, ArrowLeft } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const CAPTION = 'text-[10px] font-bold text-gray-400 uppercase tracking-widest';

// Next-step keys this page can act on (the rest are creator-level or waiting steps).
const PAGE_ACTIONS: ReadonlySet<string> = new Set([
  'draft_offer',
  'add_shipment',
  'view_shipments',
  'activate',
  'complete',
  'review_content',
  'add_draft_url',
  'add_live_url',
]);

const PLATFORM_LABELS: Readonly<Record<string, string>> = {
  instagram: 'Instagram',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  blog: 'Blog',
  website: 'Website',
  other: 'Other',
};

/** "instagram_reel" → "Instagram reel", "youtube_short" → "YouTube short". */
function contentTypeLabel(type: string): string {
  const [first = '', ...rest] = type.split('_');
  const lead = PLATFORM_LABELS[first] ?? first.charAt(0).toUpperCase() + first.slice(1);
  return [lead, ...rest].join(' ');
}

// due_date is a DATEONLY string; parse it as a local calendar day.
function formatDueDate(due: string | null | undefined): string {
  return due ? format(parseISO(due.slice(0, 10)), 'MMM d, yyyy') : '—';
}

function snippet(text: string, max = 240): string {
  const clean = cleanMessageText(text).trim() || text.trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

export default function PartnershipDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const fromCreatorId = location.state?.fromCreatorId;
  const fromPath = location.state?.fromPath;
  const fromLabel = location.state?.fromLabel;
  const { data: partnership, isLoading: loading, refetch: fetchPartnership } = usePartnership(id);
  // The detail payload's Creator has no review_status; the engine needs the full record.
  const { data: fullCreator } = useCreator(partnership?.creator_id);
  const [submitting, setSubmitting] = useState(false);

  const currentShipment = useMemo(
    () => (partnership ? pickPartnershipShipment(partnership, partnership.shipments) : null),
    [partnership],
  );
  const nextAction = useMemo<NextAction | null>(() => {
    if (!partnership) return null;
    const creator = { ...(partnership.Creator ?? {}), ...(fullCreator ?? {}) } as Creator;
    return getPartnershipNextAction({
      creator,
      partnership,
      shipment: currentShipment,
      contents: partnership.content ?? [],
    });
  }, [partnership, fullCreator, currentShipment]);

  // Shared Modals
  const [showSharedOfferModal, setShowSharedOfferModal] = useState(false);
  const [showSharedShipmentModal, setShowSharedShipmentModal] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    creator_tier: 'unknown',
    contract_required: false,
    contract_signed: false,
    contract_url: '',
    start_date: '',
    end_date: '',
    activation_notes: '',
    internal_notes: '',
  });

  const handleAction = async (action: string) => {
    if (!id || !partnership) return;
    try {
      setSubmitting(true);
      if (action === 'qualify') {
        await markQualified(id);
      } else if (action === 'accept') {
        await markAccepted(id);
      } else if (action === 'activate') {
        await activatePartnership(id);
      } else if (action === 'complete') {
        await completePartnership(id);
      } else if (action === 'reject') {
        const isConfirmed = await confirm({
          title: 'Reject Partnership',
          message: 'Are you sure you want to reject this partnership?',
          confirmText: 'Reject',
          isDestructive: true,
        });
        if (isConfirmed) {
          await rejectPartnership(id);
        } else {
          setSubmitting(false);
          return;
        }
      }
      await fetchPartnership();
    } catch (err) {
      showToast(getErrorMessage(err, 'Action failed.'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Accepting on the creator's behalf commits the brand to the fee, so it is confirmed.
  const handleMarkAccepted = async () => {
    if (!partnership) return;
    const fee = Number(partnership.flat_fee);
    const commits =
      partnership.flat_fee != null && Number.isFinite(fee) && fee > 0
        ? `This commits ${formatMoney(partnership.flat_fee, partnership.currency)}.`
        : 'This commits the product-only offer.';
    const isConfirmed = await confirm({
      title: 'Mark accepted for creator?',
      message: `Only do this if the creator agreed outside the offer link. ${commits}`,
      confirmText: 'Mark accepted',
      isDestructive: false,
    });
    if (isConfirmed) await handleAction('accept');
  };

  const runNextAction = (step: NextAction) => {
    switch (step.key) {
      case 'draft_offer':
        openOfferModal();
        break;
      case 'add_shipment':
        openShipmentModal();
        break;
      case 'view_shipments':
        navigate(`/shipments/${(step.payload as Shipment).id}`);
        break;
      case 'activate':
      case 'complete':
        void handleAction(step.key);
        break;
      case 'review_content':
      case 'add_draft_url':
      case 'add_live_url':
        navigate(`/content/${(step.payload as CreatorContent).id}`);
        break;
      default:
        break;
    }
  };

  const openOfferModal = () => {
    if (!partnership) return;
    setShowSharedOfferModal(true);
  };

  const openShipmentModal = () => {
    if (!partnership) return;
    setShowSharedShipmentModal(true);
  };

  const openEditModal = () => {
    if (!partnership) return;
    setEditForm({
      creator_tier: partnership.creator_tier || 'unknown',
      contract_required: partnership.contract_required || false,
      contract_signed: partnership.contract_signed || false,
      contract_url: partnership.contract_url || '',
      start_date: partnership.start_date || '',
      end_date: partnership.end_date || '',
      activation_notes: partnership.activation_notes || '',
      internal_notes: partnership.internal_notes || '',
    });
    setShowEditModal(true);
  };

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnership) return;
    setSubmitting(true);
    try {
      await updatePartnership(partnership.id, {
        creator_tier: editForm.creator_tier,
        contract_required: editForm.contract_required,
        contract_signed: editForm.contract_signed,
        contract_url: editForm.contract_url || null,
        start_date: editForm.start_date || null,
        end_date: editForm.end_date || null,
        activation_notes: editForm.activation_notes || null,
        internal_notes: editForm.internal_notes || null,
      });
      setShowEditModal(false);
      await fetchPartnership();
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to update details.'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 max-w-7xl mx-auto px-4 sm:px-0">
        <LoadingState message="Retrieving Partnership details..." />
      </div>
    );
  }

  if (!partnership) {
    return (
      <div className="py-20 max-w-7xl mx-auto px-4 sm:px-0 text-center">
        <h2 className="text-xl font-semibold text-gray-700">Partnership not found</h2>
        <Link
          to={fromCreatorId ? `/creators/${fromCreatorId}` : '/partnerships'}
          className="text-primary-600 hover:underline mt-4 inline-block"
        >
          Back to {fromCreatorId ? 'Creator Detail' : 'Partnerships'}
        </Link>
      </div>
    );
  }
  const contents = partnership.content ?? [];
  const shipments = partnership.shipments ?? [];
  const conversation = partnership.conversation ?? null;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20 px-4 sm:px-0 animate-[fadeIn_0.2s_ease]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          {fromPath ? (
            <button
              onClick={() => navigate(fromPath)}
              className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-gray-900 uppercase tracking-widest transition-colors mb-3"
            >
              <ArrowLeft size={14} /> Back to {fromLabel || 'Previous'}
            </button>
          ) : fromCreatorId ? (
            <button
              onClick={() => navigate(`/creators/${fromCreatorId}`)}
              className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-gray-900 uppercase tracking-widest transition-colors mb-3"
            >
              <ArrowLeft size={14} /> Back to Creator Detail
            </button>
          ) : (
            <button
              onClick={() => navigate('/partnerships')}
              className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-gray-900 uppercase tracking-widest transition-colors mb-3"
            >
              <ArrowLeft size={14} /> Back to Partnerships
            </button>
          )}
          <span className={CAPTION}>Partnership</span>
          <h1 className="text-2xl sm:text-3xl font-normal text-gray-900 font-outfit tracking-tight mt-1">
            <Link
              to={`/creators/${partnership.creator_id}`}
              className="hover:text-primary-700 hover:underline"
            >
              {partnership.Creator?.full_name || `@${partnership.Creator?.handle ?? 'creator'}`}
            </Link>
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Campaign:{' '}
            <Link
              to={`/campaigns/${partnership.campaign_id}`}
              className="text-primary-600 hover:underline"
            >
              {partnership.Campaign?.name || 'View campaign'}
            </Link>
          </p>
        </div>

        {/* Actions panel: the next step from the shared engine, then manual overrides */}
        <div className="flex flex-wrap items-center gap-2">
          {nextAction && nextAction.kind === 'action' && PAGE_ACTIONS.has(nextAction.key) && (
            <Button
              className="bg-primary-600 hover:bg-primary-700 text-white font-normal text-xs min-h-[40px] px-4"
              disabled={submitting}
              onClick={() => runNextAction(nextAction)}
            >
              {nextAction.label}
            </Button>
          )}
          {nextAction && (nextAction.kind === 'waiting' || nextAction.key === 'done') && (
            <div className="flex flex-col items-end mr-2">
              <span className={CAPTION}>Next step</span>
              <span className="text-sm text-gray-600">{nextAction.label}</span>
            </div>
          )}
          {partnership.status === 'engaged' && (
            <Button
              variant="outline"
              className="font-normal text-xs min-h-[40px] px-4"
              disabled={submitting}
              onClick={() => handleAction('qualify')}
            >
              Qualify
            </Button>
          )}
          {partnership.status === 'offer_sent' && (
            <Button
              variant="outline"
              className="font-normal text-xs min-h-[40px] px-4"
              disabled={submitting}
              onClick={handleMarkAccepted}
            >
              Mark accepted for creator
            </Button>
          )}
          <button
            onClick={openEditModal}
            className="p-2.5 text-gray-500 hover:text-gray-900 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-colors flex items-center justify-center"
            title="Edit parameters"
          >
            <Edit3 size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Creator overview & details */}
        <div className="space-y-8 lg:col-span-2">
          {/* Creator Profile Summary Card */}
          <Card className="border-none shadow-xl bg-white p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-b border-gray-100 pb-6">
              <div className="flex items-center gap-4">
                <CreatorAvatar
                  creator={partnership.Creator}
                  className="w-16 h-16 rounded-full bg-primary-100 text-primary-700 flex flex-shrink-0 items-center justify-center font-normal text-2xl uppercase ring-4 ring-white shadow-md overflow-hidden"
                />
                <div>
                  <div className="text-xl font-normal text-gray-900 font-outfit uppercase tracking-tight">
                    {partnership.Creator?.full_name || `@${partnership.Creator?.handle}`}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">@{partnership.Creator?.handle}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {partnership.Creator?.email || 'No email registered'}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Partnership Status
                </span>
                <StatusBadge status={partnership.status} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-6">
              {/* Settings */}
              <div className="space-y-4 font-outfit">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">
                      Compensation
                    </span>
                    <span className="text-sm font-normal text-gray-800 uppercase">
                      {partnership.offer_type
                        ? partnership.offer_type.replace('_', ' ')
                        : 'None drafted'}
                    </span>
                  </div>
                  {Number(partnership.flat_fee) > 0 && (
                    <div>
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">
                        Flat Fee
                      </span>
                      <span className="text-sm font-normal text-gray-800">
                        {formatMoney(partnership.flat_fee, partnership.currency)}
                      </span>
                    </div>
                  )}
                </div>

                {partnership.affiliate_enabled && (
                  <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-3 text-xs">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block border-b border-gray-100 pb-1">
                      Affiliate Details
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[9px] text-gray-400 block uppercase">Promo Code</span>
                        <span className="font-semibold text-gray-800 font-mono uppercase text-sm">
                          {partnership.affiliate_code || '---'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-400 block uppercase">
                          Commission Rate
                        </span>
                        <span className="font-semibold text-gray-800 text-sm">
                          {partnership.affiliate_percentage || 0}%
                        </span>
                      </div>
                    </div>
                    {partnership.affiliate_link && (
                      <div className="pt-2 border-t border-gray-100">
                        <span className="text-[9px] text-gray-400 block uppercase">
                          Tracking Link
                        </span>
                        <a
                          href={partnership.affiliate_link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary-600 hover:underline flex items-center gap-1 mt-0.5 truncate max-w-full font-mono"
                        >
                          {partnership.affiliate_link} <ExternalLink size={10} />
                        </a>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">
                      Start Date
                    </span>
                    <span className="text-sm font-normal text-gray-800">
                      {partnership.start_date
                        ? format(new Date(partnership.start_date), 'MMM d, yyyy')
                        : '---'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">
                      End Date
                    </span>
                    <span className="text-sm font-normal text-gray-800">
                      {partnership.end_date
                        ? format(new Date(partnership.end_date), 'MMM d, yyyy')
                        : '---'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Legal & Notes */}
              <div className="space-y-4 font-outfit">
                <div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">
                    Contract Status
                  </span>
                  <div className="mt-1 flex items-center gap-1.5 text-xs">
                    {partnership.contract_required ? (
                      partnership.contract_signed ? (
                        <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-semibold border border-green-200 uppercase tracking-wider text-[10px]">
                          Signed
                        </span>
                      ) : (
                        <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-semibold border border-amber-200 uppercase tracking-wider text-[10px]">
                          Pending Signature
                        </span>
                      )
                    ) : (
                      <span className="text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider text-[10px]">
                        Not Required
                      </span>
                    )}
                  </div>
                </div>

                {partnership.contract_url && (
                  <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">
                      Contract Link
                    </span>
                    <a
                      href={partnership.contract_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary-600 hover:underline flex items-center gap-1 mt-1 text-xs font-semibold"
                    >
                      View Executed Contract <ExternalLink size={12} />
                    </a>
                  </div>
                )}

                {partnership.creator_tier && (
                  <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">
                      Creator Tier Size
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-600 uppercase tracking-wider inline-block mt-1">
                      {partnership.creator_tier.replace('_', ' ')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Notes Section */}
            {(partnership.activation_notes || partnership.internal_notes) && (
              <div className="border-t border-gray-100 mt-6 pt-6 space-y-4 font-outfit">
                {partnership.activation_notes && (
                  <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">
                      Activation Notes
                    </span>
                    <p className="text-sm text-gray-650 mt-1.5 whitespace-pre-wrap leading-relaxed">
                      {partnership.activation_notes}
                    </p>
                  </div>
                )}

                {partnership.internal_notes && (
                  <div className="bg-yellow-50/45 border border-yellow-100/50 p-4 rounded-xl">
                    <span className="text-[9px] font-bold text-amber-800 uppercase tracking-wider block">
                      Internal Team Notes
                    </span>
                    <p className="text-sm text-gray-650 mt-1.5 whitespace-pre-wrap leading-relaxed">
                      {partnership.internal_notes}
                    </p>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Deliverables */}
          <Card className="border-none shadow-xl bg-white p-6 sm:p-8">
            <section aria-labelledby="partnership-deliverables" className="font-outfit">
              <h2 id="partnership-deliverables" className={`${CAPTION} mb-4`}>
                Deliverables
              </h2>
              {contents.length === 0 ? (
                <p className="text-sm text-gray-500">No deliverables on this partnership yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className={`${CAPTION} border-b border-gray-100`}>
                        <th className="py-2 pr-4 font-bold">Platform</th>
                        <th className="py-2 pr-4 font-bold">Type</th>
                        <th className="py-2 pr-4 font-bold">Due</th>
                        <th className="py-2 pr-4 font-bold">Status</th>
                        <th className="py-2 font-bold">
                          <span className="sr-only">Link</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {contents.map((c) => (
                        <tr key={c.id}>
                          <td className="py-3 pr-4 text-gray-800">
                            {PLATFORM_LABELS[c.platform] ?? c.platform}
                          </td>
                          <td className="py-3 pr-4 text-gray-800">
                            {contentTypeLabel(c.content_type)}
                          </td>
                          <td className="py-3 pr-4 text-gray-600">{formatDueDate(c.due_date)}</td>
                          <td className="py-3 pr-4">
                            <StatusBadge status={c.status} />
                          </td>
                          <td className="py-3 text-right">
                            <Link
                              to={`/content/${c.id}`}
                              className="text-primary-600 hover:underline text-xs font-medium whitespace-nowrap"
                            >
                              Open deliverable
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </Card>
        </div>

        {/* Right side: conversation and shipments */}
        <div className="space-y-8">
          <Card className="border-none shadow-xl bg-white p-6">
            <section aria-labelledby="partnership-latest-message" className="font-outfit">
              <h2 id="partnership-latest-message" className={`${CAPTION} mb-3`}>
                Latest message
              </h2>
              {conversation?.latest_inbound_message ? (
                <>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {snippet(conversation.latest_inbound_message)}
                  </p>
                  {conversation.latest_inbound_at && (
                    <p className="text-xs text-gray-400 mt-2">
                      {format(new Date(conversation.latest_inbound_at), 'MMM d, yyyy · h:mm a')}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-500">
                  {conversation
                    ? 'No reply from the creator yet.'
                    : 'No conversation for this campaign yet.'}
                </p>
              )}
              {conversation && (
                <Link
                  to={`/conversations?thread=${conversation.id}`}
                  className="text-primary-600 hover:underline text-xs font-medium inline-block mt-3"
                >
                  Open conversation
                </Link>
              )}
            </section>
          </Card>

          <Card className="border-none shadow-xl bg-white p-6">
            <section aria-labelledby="partnership-shipments" className="font-outfit">
              <h2 id="partnership-shipments" className={`${CAPTION} mb-3`}>
                Shipments
              </h2>
              {shipments.length === 0 ? (
                <p className="text-sm text-gray-500">
                  {partnership.shipment_included
                    ? 'No shipments yet.'
                    : 'No product shipment on this offer.'}
                </p>
              ) : (
                <ul className="space-y-4">
                  {shipments.map((sh) => {
                    const tracking = [sh.carrier, sh.tracking_number].filter(Boolean).join(' ');
                    return (
                      <li key={sh.id} className="border-b border-gray-50 last:border-0 pb-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm text-gray-800 truncate">
                            {sh.product_name || 'Shipment'}
                          </span>
                          <StatusBadge status={sh.status} />
                        </div>
                        <div className="text-xs text-gray-500 mt-1.5">
                          {tracking ? (
                            sh.tracking_url ? (
                              <a
                                href={sh.tracking_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary-600 hover:underline inline-flex items-center gap-1 font-mono"
                              >
                                {tracking} <ExternalLink size={10} aria-hidden="true" />
                              </a>
                            ) : (
                              <span className="font-mono">{tracking}</span>
                            )
                          ) : (
                            'No tracking yet'
                          )}
                        </div>
                        <Link
                          to={`/shipments/${sh.id}`}
                          className="text-primary-600 hover:underline text-xs font-medium inline-block mt-1.5"
                        >
                          Open shipment
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </Card>
        </div>
      </div>

      {/* ─── Edit Partnership Modal ─── */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Update Partnership Profile"
      >
        <form onSubmit={submitEdit} className="space-y-4 font-outfit">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label
                htmlFor="partnershipdetail-1"
                className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block"
              >
                Creator Tier Size
              </label>
              <select
                id="partnershipdetail-1"
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
                htmlFor="partnershipdetail-2"
                className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block"
              >
                Contract Signature Link
              </label>
              <input
                id="partnershipdetail-2"
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
                id="contract_required"
                checked={editForm.contract_required}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, contract_required: e.target.checked }))
                }
                className="rounded text-primary-600 focus:ring-primary-500 h-4 w-4 border-gray-300"
              />
              <label htmlFor="contract_required" className="text-sm text-gray-700 select-none">
                Contract Required
              </label>
            </div>

            {editForm.contract_required && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="contract_signed"
                  checked={editForm.contract_signed}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, contract_signed: e.target.checked }))
                  }
                  className="rounded text-primary-600 focus:ring-primary-500 h-4 w-4 border-gray-300"
                />
                <label htmlFor="contract_signed" className="text-sm text-gray-700 select-none">
                  Contract Signed
                </label>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label
                htmlFor="partnershipdetail-3"
                className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block"
              >
                Campaign Start Date
              </label>
              <input
                id="partnershipdetail-3"
                type="date"
                value={editForm.start_date}
                onChange={(e) => setEditForm((prev) => ({ ...prev, start_date: e.target.value }))}
                className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor="partnershipdetail-4"
                className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block"
              >
                Campaign End Date
              </label>
              <input
                id="partnershipdetail-4"
                type="date"
                value={editForm.end_date}
                onChange={(e) => setEditForm((prev) => ({ ...prev, end_date: e.target.value }))}
                className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="partnershipdetail-5"
              className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block"
            >
              Activation Notes
            </label>
            <textarea
              id="partnershipdetail-5"
              value={editForm.activation_notes}
              onChange={(e) =>
                setEditForm((prev) => ({ ...prev, activation_notes: e.target.value }))
              }
              className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm min-h-[60px]"
              placeholder="Fulfillment parameters, specific agreements..."
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="partnershipdetail-6"
              className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block"
            >
              Internal CRM Notes
            </label>
            <textarea
              id="partnershipdetail-6"
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
              onClick={() => setShowEditModal(false)}
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

      <OfferModal
        isOpen={showSharedOfferModal}
        onClose={() => setShowSharedOfferModal(false)}
        partnership={partnership}
        onSuccess={() => fetchPartnership()}
      />

      <ShipmentModal
        isOpen={showSharedShipmentModal}
        onClose={() => setShowSharedShipmentModal(false)}
        creator={partnership?.Creator}
        partnership={partnership}
        onSuccess={() => fetchPartnership()}
      />
    </div>
  );
}
