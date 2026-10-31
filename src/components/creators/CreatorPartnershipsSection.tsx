import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Coins, Edit3 } from 'lucide-react';
import { Button } from '../ui/Button';
import { StatusBadge } from '../ui/StatusBadge';
import { LoadingState } from '../ui/LoadingState';
import { format } from 'date-fns';
import { useConfirm } from '../../contexts/ConfirmContext';
import { formatMoney, markAcceptedConfirmation } from '../../lib/formatters';
import {
  getPartnershipNextAction,
  pickPartnershipContents,
  pickPartnershipShipment,
  type NextAction,
} from '../../lib/nextAction';
import type { Creator, CreatorContent, Partnership, Shipment } from '../../types';

interface CreatorPartnershipsSectionProps {
  creator: Creator;
  partnerships: any[];
  /** The creator's shipments and deliverables (any partnership); each row picks its own. */
  shipments: readonly Shipment[];
  contents: readonly CreatorContent[];
  partnershipsLoading: boolean;
  handlePartnershipAction: (id: string, action: string) => Promise<void>;
  openOfferModal: (p: any) => void;
  openShipmentModal: (p: any) => void;
  openEditModal: (p: any) => void;
}

// Engine steps a row can run itself (the rest are waiting states or open elsewhere).
const ROW_ACTIONS: ReadonlySet<string> = new Set([
  'draft_offer',
  'add_shipment',
  'view_shipments',
  'activate',
  'complete',
  'review_content',
  'add_draft_url',
  'add_live_url',
]);

export function CreatorPartnershipsSection({
  creator,
  partnerships,
  shipments,
  contents,
  partnershipsLoading,
  handlePartnershipAction,
  openOfferModal,
  openShipmentModal,
  openEditModal,
}: CreatorPartnershipsSectionProps) {
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const backHere = { state: { fromCreatorId: creator.id } };

  // The same step the partnership page and the Partnerships list show for this row.
  const stepOf = (p: Partnership): NextAction =>
    getPartnershipNextAction({
      creator,
      partnership: p,
      shipment: pickPartnershipShipment(p, shipments),
      contents: pickPartnershipContents(p, contents),
    });

  const runStep = (p: Partnership, step: NextAction) => {
    switch (step.key) {
      case 'draft_offer':
        openOfferModal(p);
        break;
      case 'add_shipment':
        openShipmentModal(p);
        break;
      case 'view_shipments':
        navigate(`/shipments/${(step.payload as Shipment).id}`, backHere);
        break;
      case 'activate':
      case 'complete':
        void handlePartnershipAction(p.id, step.key);
        break;
      case 'review_content':
      case 'add_draft_url':
      case 'add_live_url':
        navigate(`/content/${(step.payload as CreatorContent).id}`, backHere);
        break;
      default:
        break;
    }
  };

  // Accepting on the creator's behalf commits the brand to the fee, so it is confirmed.
  const markAccepted = async (p: Partnership) => {
    if (await confirm(markAcceptedConfirmation(p))) await handlePartnershipAction(p.id, 'accept');
  };

  return (
    <div className="p-6">
      {partnershipsLoading ? (
        <LoadingState message="Syncing partnerships..." />
      ) : partnerships.length === 0 ? (
        <div className="text-center py-12 text-gray-400 italic text-sm font-outfit">
          No campaign partnerships found for this creator yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead>
              <tr className="text-[10px] font-normal text-gray-400 uppercase tracking-widest border-b border-gray-100 bg-gray-50/50">
                <th className="px-4 py-3">Campaign</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Tier</th>
                <th className="px-4 py-3">Offer parameters</th>
                <th className="px-4 py-3 text-center">Start Date</th>
                <th className="px-4 py-3 text-center">End Date</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {partnerships.map((p) => {
                const step = stepOf(p);
                return (
                  <tr
                    key={p.id}
                    onClick={() => navigate(`/partnerships/${p.id}`, backHere)}
                    className="hover:bg-primary-50/10 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-4 align-middle">
                      <div className="text-xs font-normal text-gray-900 font-outfit">
                        {p.Campaign?.name}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center align-middle">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-4 py-4 text-center align-middle">
                      <span className="px-2 py-0.5 rounded text-[10px] font-normal bg-gray-100 text-gray-600 uppercase tracking-wider">
                        {p.creator_tier?.replace('_', ' ') || 'unknown'}
                      </span>
                    </td>
                    <td className="px-4 py-4 align-middle text-xs">
                      {p.offer_type ? (
                        <div className="space-y-1">
                          <div className="font-medium text-gray-800 uppercase flex items-center gap-1">
                            <Coins size={10} className="text-amber-500" />{' '}
                            {p.offer_type.replace('_', ' ')}
                          </div>
                          {Number(p.flat_fee) > 0 && (
                            <div className="text-gray-500">
                              {formatMoney(p.flat_fee, p.currency)}
                            </div>
                          )}
                          {p.affiliate_enabled && (
                            <div className="text-primary-600 bg-primary-50/50 border border-primary-100/50 rounded px-1.5 py-0.5 inline-block text-[9px] uppercase font-mono mt-0.5">
                              Code: {p.affiliate_code || '---'} ({p.affiliate_percentage || 0}%)
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">No offer drafted</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center align-middle text-[11px] text-gray-500 font-mono">
                      {p.start_date ? format(new Date(p.start_date), 'MMM d, yyyy') : '---'}
                    </td>
                    <td className="px-4 py-4 text-center align-middle text-[11px] text-gray-500 font-mono">
                      {p.end_date ? format(new Date(p.end_date), 'MMM d, yyyy') : '---'}
                    </td>
                    <td
                      className="px-4 py-4 align-middle relative z-10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-center gap-2">
                        {step.kind === 'action' && ROW_ACTIONS.has(step.key) && (
                          <Button
                            size="sm"
                            className="!min-h-[28px] !px-2 !py-1 !text-xs whitespace-nowrap"
                            onClick={() => runStep(p, step)}
                          >
                            {step.label}
                          </Button>
                        )}
                        {step.kind === 'waiting' && (
                          <span className="text-xs leading-tight text-gray-500">{step.label}</span>
                        )}
                        {p.status === 'engaged' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="!min-h-[28px] !px-2 !py-1 !text-xs whitespace-nowrap"
                            onClick={() => handlePartnershipAction(p.id, 'qualify')}
                          >
                            Qualify
                          </Button>
                        )}
                        {p.status === 'offer_sent' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="!min-h-[28px] !px-2 !py-1 !text-xs whitespace-nowrap"
                            onClick={() => void markAccepted(p)}
                          >
                            Mark accepted for creator
                          </Button>
                        )}
                        <button
                          onClick={() => openEditModal(p)}
                          className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                          title="Edit parameters"
                        >
                          <Edit3 size={14} />
                        </button>
                        {p.status !== 'rejected' && p.status !== 'completed' && (
                          <button
                            onClick={() => handlePartnershipAction(p.id, 'reject')}
                            className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors font-bold text-sm leading-none"
                            title="Reject partnership"
                          >
                            &times;
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
