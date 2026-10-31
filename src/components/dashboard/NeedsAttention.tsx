import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarClock,
  FileSignature,
  MailWarning,
  MapPin,
  MessageSquare,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { useAttention } from '../../hooks/queries';
import { getErrorMessage } from '../../lib/api';
import { getRelativeTime } from '../../lib/formatters';
import type { AttentionItem, AttentionType } from '../../types';

// Rows shown before "Show all" (the card this replaced listed ten).
const COLLAPSED_ROWS = 10;

interface AttentionKind {
  type: AttentionType;
  label: string;
  icon: LucideIcon;
  /** Where a row of this type goes, from its entity_id. */
  to: (entityId: string) => string;
}

// Chip order, chip labels and the record each type opens.
const KINDS: AttentionKind[] = [
  {
    type: 'reply_waiting',
    label: 'Replies waiting',
    icon: MessageSquare,
    to: (id) => `/conversations?thread=${id}`,
  },
  {
    type: 'offer_unsigned',
    label: 'Offers not signed',
    icon: FileSignature,
    to: (id) => `/partnerships/${id}`,
  },
  {
    type: 'address_needed',
    label: 'Addresses needed',
    icon: MapPin,
    to: (id) => `/shipments/${id}`,
  },
  {
    type: 'deliverable_overdue',
    label: 'Overdue deliverables',
    icon: CalendarClock,
    to: (id) => `/content/${id}`,
  },
  // A failed email belongs to the creator (that is the entity), not to a record of its own.
  {
    type: 'send_failed',
    label: 'Failed emails',
    icon: MailWarning,
    to: (id) => `/creators/${id}`,
  },
];

const KIND_BY_TYPE = Object.fromEntries(KINDS.map((kind) => [kind.type, kind])) as Record<
  AttentionType,
  AttentionKind
>;

// send_failed rows repeat type + entity_id (the creator) across campaigns, so the
// campaign is part of the key.
const rowKey = (item: AttentionItem) => `${item.type}:${item.entity_id}:${item.campaign_id}`;

interface NeedsAttentionProps {
  /** Narrows the list to one campaign; every campaign when omitted. */
  campaignId?: string;
  className?: string;
}

/** What needs a person today, from GET /stats/attention: counts per type, then the rows. */
export function NeedsAttention({ campaignId, className = '' }: NeedsAttentionProps) {
  const query = useAttention(campaignId);
  const [expanded, setExpanded] = useState(false);

  let body: ReactNode;
  if (query.isPending) {
    body = (
      <div role="status" className="p-12 text-center text-sm text-gray-500">
        Loading what needs attention…
      </div>
    );
  } else if (query.isError) {
    // An unloaded list is not an empty one: never tell the user nothing needs them.
    body = (
      <div role="alert" className="flex flex-col items-center gap-3 p-12 text-center">
        <p className="text-sm text-gray-700">Couldn&apos;t load what needs attention.</p>
        <p className="text-xs text-gray-500">{getErrorMessage(query.error)}</p>
        <Button variant="outline" size="sm" onClick={() => query.refetch()}>
          Retry
        </Button>
      </div>
    );
  } else if (query.data.items.length === 0) {
    body = (
      <div className="p-12 text-center text-sm text-gray-500">Nothing needs you right now.</div>
    );
  } else {
    const { counts, items } = query.data;
    const total = KINDS.reduce((sum, kind) => sum + counts[kind.type], 0);
    // The backend lists at most 50, so the counts can add up to more than the rows.
    const truncated = total > items.length;
    const canExpand = items.length > COLLAPSED_ROWS;
    const rows = expanded ? items : items.slice(0, COLLAPSED_ROWS);

    body = (
      <>
        <ul aria-label="Counts by type" className="flex flex-wrap gap-2 px-6 py-4">
          {KINDS.map(({ type, label }) => (
            <li
              key={type}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${
                counts[type] > 0
                  ? 'border-primary-100 bg-primary-50 text-primary-800'
                  : 'border-gray-100 bg-gray-50 text-gray-400'
              }`}
            >
              <span>{label}</span>
              <span className="font-semibold tabular-nums">{counts[type]}</span>
            </li>
          ))}
        </ul>

        <ul
          aria-label="Items that need attention"
          className="divide-y divide-gray-100 border-t border-gray-100"
        >
          {rows.map((item) => {
            const kind = KIND_BY_TYPE[item.type];
            // A type the backend added after this page was loaded has no icon or route
            // here; skip it rather than take the whole dashboard down.
            if (!kind) return null;
            const { icon: Icon, to } = kind;
            return (
              <li key={rowKey(item)}>
                <Link
                  to={to(item.entity_id)}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 px-6 py-3 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500"
                >
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-700">
                    <Icon size={15} aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-normal tracking-tight text-gray-900 font-outfit">
                      {item.creator_name}
                    </div>
                    {item.campaign_name && (
                      <div className="truncate text-xs text-gray-600">{item.campaign_name}</div>
                    )}
                  </div>
                  <div className="w-full pl-11 sm:w-auto sm:flex-shrink-0 sm:pl-0 sm:text-right">
                    <div className="text-sm text-gray-700">{item.detail}</div>
                    <div className="text-xs text-gray-500">{getRelativeTime(item.since)}</div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>

        {(truncated || canExpand) && (
          <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 px-6 py-3">
            {truncated && (
              <p className="text-xs text-gray-500">
                The list holds the {items.length} longest-waiting of {total}.
              </p>
            )}
            {canExpand && (
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto"
                onClick={() => setExpanded((open) => !open)}
              >
                {expanded ? 'Show fewer' : `Show all ${items.length}`}
              </Button>
            )}
          </div>
        )}
      </>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <h2 className="text-base font-semibold text-gray-900 tracking-tight">Needs attention</h2>
      </CardHeader>
      {body}
    </Card>
  );
}
