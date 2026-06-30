import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Coins, Edit3 } from 'lucide-react';
import { Button } from '../ui/Button';
import { StatusBadge } from '../ui/StatusBadge';
import { LoadingState } from '../ui/LoadingState';
import { format } from 'date-fns';

interface CreatorPartnershipsSectionProps {
  partnerships: any[];
  partnershipsLoading: boolean;
  creatorId: string;
  handlePartnershipAction: (id: string, action: string) => Promise<void>;
  openOfferModal: (p: any) => void;
  openEditModal: (p: any) => void;
}

export function CreatorPartnershipsSection({
  partnerships,
  partnershipsLoading,
  creatorId,
  handlePartnershipAction,
  openOfferModal,
  openEditModal
}: CreatorPartnershipsSectionProps) {
  const navigate = useNavigate();

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
              {partnerships.map((p) => (
                <tr key={p.id} onClick={() => navigate(`/partnerships/${p.id}`, { state: { fromCreatorId: creatorId } })} className="hover:bg-primary-50/10 transition-colors cursor-pointer">
                  <td className="px-4 py-4 align-middle">
                    <div className="text-xs font-normal text-gray-900 font-outfit uppercase tracking-tight">
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
                          <Coins size={10} className="text-amber-500" /> {p.offer_type.replace('_', ' ')}
                        </div>
                        {p.flat_fee > 0 && <div className="text-gray-500">${p.flat_fee} {p.currency}</div>}
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
                  <td className="px-4 py-4 align-middle relative z-10" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-2">
                      {p.status === 'engaged' && (
                        <Button size="sm" className="bg-indigo-600 text-white font-normal uppercase tracking-widest text-[9px] min-h-[28px] px-2" onClick={() => handlePartnershipAction(p.id, 'qualify')}>
                          Qualify
                        </Button>
                      )}
                      {p.status === 'qualified' && (
                        <Button size="sm" className="bg-primary-600 text-white font-normal uppercase tracking-widest text-[9px] min-h-[28px] px-2" onClick={() => openOfferModal(p)}>
                          Send Offer
                        </Button>
                      )}
                      {p.status === 'offer_sent' && (
                        <Button size="sm" className="bg-green-600 text-white font-normal uppercase tracking-widest text-[9px] min-h-[28px] px-2" onClick={() => handlePartnershipAction(p.id, 'accept')}>
                          Accept Offer
                        </Button>
                      )}
                      {['accepted', 'product_shipped', 'product_delivered'].includes(p.status) && (
                        <Button size="sm" className="bg-amber-600 text-white font-normal uppercase tracking-widest text-[9px] min-h-[28px] px-2" onClick={() => handlePartnershipAction(p.id, 'activate')}>
                          Activate
                        </Button>
                      )}
                      {p.status === 'activated' && (
                        <Button size="sm" className="bg-gray-800 text-white font-normal uppercase tracking-widest text-[9px] min-h-[28px] px-2" onClick={() => handlePartnershipAction(p.id, 'complete')}>
                          Complete
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
