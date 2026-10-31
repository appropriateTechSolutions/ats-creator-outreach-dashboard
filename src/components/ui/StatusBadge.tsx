import React from 'react';
import { Badge } from './Badge';
import { getStatusLabel } from '../../lib/statusLabels';

export type StatusType =
  | 'active'
  | 'pending'
  | 'failed'
  | 'draft'
  | 'approved'
  | 'rejected'
  | 'contacted'
  | 'replied'
  | 'converted'
  | 'inactive'
  | 'not_respond'
  | string;

export function StatusBadge({ status }: { status: StatusType }) {
  let variant: React.ComponentProps<typeof Badge>['variant'] = 'gray';

  switch (status) {
    case 'active':
    case 'approved':
    case 'converted':
    case 'accepted': // "Offer accepted" is a win; it must not look like "Engaged".
    case 'live':
    case 'content_approved':
      variant = 'success';
      break;
    case 'replied':
    case 'pending':
    case 'pending_review':
    case 'shortlisted':
    case 'address_requested':
    case 'not_respond':
    case 'negotiating':
    case 'content_submitted':
      variant = 'warning';
      break;
    case 'shipped':
    case 'product_shipped':
    case 'content_pending':
      variant = 'secondary';
      break;
    case 'delivered':
    case 'product_delivered':
      variant = 'success';
      break;
    case 'failed':
    case 'rejected':
      variant = 'error';
      break;
    case 'ready_to_ship':
    case 'in_discussion':
    case 'engaged':
    case 'contacted':
    case 'offer_sent':
    case 'meeting_scheduled':
    case 'qualified':
    case 'activated':
      variant = 'primary';
      break;

    case 'inactive':
    case 'archived':
    case 'hold':
    case 'draft':
    default:
      variant = 'gray';
  }

  return <Badge variant={variant}>{getStatusLabel(status)}</Badge>;
}
