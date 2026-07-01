import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, ExternalLink, Edit3 } from 'lucide-react';
import { Button } from '../ui/Button';
import { StatusBadge } from '../ui/StatusBadge';
import { updateShipment } from '../../lib/api';

interface CreatorShipmentsSectionProps {
  creatorShipments: any[];
  creatorId: string;
  loadData: (silent?: boolean) => void;
}

export function CreatorShipmentsSection({
  creatorShipments,
  creatorId,
  loadData,
}: CreatorShipmentsSectionProps) {
  const navigate = useNavigate();

  if (creatorShipments.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 italic text-sm font-outfit">
        No shipments dispatched to this creator yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left min-w-[800px]">
        <thead>
          <tr className="text-[10px] font-normal text-gray-400 uppercase tracking-widest border-b border-gray-100 bg-gray-50/50">
            <th className="px-4 py-3">Campaign</th>
            <th className="px-4 py-3">Product Name</th>
            <th className="px-4 py-3">Recipient</th>
            <th className="px-4 py-3 text-center">Status</th>
            <th className="px-4 py-3">Tracking</th>
            <th className="px-4 py-3 text-center">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 bg-white">
          {creatorShipments.map((s) => (
            <tr
              key={s.id}
              onClick={() =>
                navigate(`/shipments/${s.id}`, { state: { fromCreatorId: creatorId } })
              }
              className="hover:bg-primary-50/10 transition-colors cursor-pointer"
            >
              <td className="px-4 py-4 align-middle">
                <div className="text-xs font-normal text-gray-900 font-outfit uppercase tracking-tight whitespace-nowrap">
                  {s.Campaign?.name}
                </div>
              </td>
              <td className="px-4 py-4 align-middle">
                <div className="text-xs font-medium text-gray-800">{s.product_name}</div>
                <div className="text-[10px] text-gray-400">
                  Qty: {s.quantity} {s.product_sku ? `(SKU: ${s.product_sku})` : ''}
                </div>
              </td>
              <td className="px-4 py-4 align-middle">
                <div className="text-xs text-gray-800">{s.recipient_name}</div>
                <div
                  className="text-[10px] text-gray-500 truncate max-w-[180px]"
                  title={s.shipping_address_line1}
                >
                  {s.shipping_address_line1}
                </div>
              </td>
              <td className="px-4 py-4 text-center align-middle">
                <StatusBadge status={s.status} />
              </td>
              <td className="px-4 py-4 align-middle">
                {s.tracking_number ? (
                  <div>
                    <div className="text-xs font-mono font-medium text-gray-800 flex items-center gap-1">
                      <Truck size={10} className="text-gray-400" /> {s.carrier}: {s.tracking_number}
                    </div>
                    {s.tracking_url && (
                      <a
                        href={s.tracking_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-primary-600 hover:underline inline-flex items-center gap-0.5 mt-0.5"
                      >
                        Track <ExternalLink size={8} />
                      </a>
                    )}
                  </div>
                ) : (
                  <span className="text-[10px] text-gray-400 italic">No tracking info</span>
                )}
              </td>
              <td
                className="px-4 py-4 align-middle text-center relative z-10"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-center gap-2">
                  {s.status === 'pending' && (
                    <Button
                      size="sm"
                      className="bg-indigo-600 text-white font-normal uppercase tracking-widest text-[9px] min-h-[28px] px-2"
                      onClick={() => {
                        updateShipment(s.id, { status: 'shipped' }).then(() => loadData(true));
                      }}
                    >
                      Ship
                    </Button>
                  )}
                  {s.status === 'shipped' && (
                    <Button
                      size="sm"
                      className="bg-green-600 text-white font-normal uppercase tracking-widest text-[9px] min-h-[28px] px-2"
                      onClick={() => {
                        updateShipment(s.id, { status: 'delivered' }).then(() => loadData(true));
                      }}
                    >
                      Deliver
                    </Button>
                  )}
                  <button
                    onClick={() => {
                      const carrier = prompt('Enter Carrier (e.g. USPS, UPS):', s.carrier || '');
                      const tracking = prompt('Enter Tracking Number:', s.tracking_number || '');
                      const tracking_url = prompt('Enter Tracking URL:', s.tracking_url || '');
                      if (carrier !== null && tracking !== null) {
                        updateShipment(s.id, {
                          carrier,
                          tracking_number: tracking,
                          tracking_url: tracking_url || undefined,
                        }).then(() => loadData(true));
                      }
                    }}
                    className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                    title="Quick Edit Tracking"
                  >
                    <Edit3 size={12} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
