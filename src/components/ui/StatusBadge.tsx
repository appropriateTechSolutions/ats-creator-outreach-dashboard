import React from 'react';
import { Badge } from './Badge';

export type StatusType = 'active' | 'pending' | 'failed' | 'draft' | 'approved' | 'rejected' | 'contacted' | 'replied' | 'converted' | 'inactive' | 'not_respond' | string;

export function StatusBadge({ status }: { status: StatusType }) {
  let variant: React.ComponentProps<typeof Badge>['variant'] = 'gray';

  switch (status) {
    case 'active':
    case 'approved':
    case 'converted':
      variant = 'success';
      break;
    case 'replied':
    case 'pending':
    case 'pending_review':
    case 'shortlisted':
    case 'address_requested':
    case 'not_respond':
      variant = 'warning';
      break;
    case 'shipped':
    case 'product_shipped':
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
    case 'accepted':
    case 'qualified':
    case 'activated':
      variant = 'primary';
      break;
    case 'not_respond':
      variant = 'warning';
      break;
    case 'inactive':
    case 'archived':
    case 'hold':
    case 'draft':
    default:
      variant = 'gray';
  }

  let label = status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
  if (status === 'hold') label = 'Discovered';
  if (status === 'archived') label = 'Inactive';
  if (status === 'not_respond') label = 'Not Responsive';
  if (status === 'inactive') label = 'Inactive';
  if (status === 'accepted') label = 'Engaged';
  if (status === 'pending_review' || status === 'shortlisted') label = 'Shortlisted';
  if (status === 'pending') label = 'Pending';
  if (status === 'address_requested') label = 'Address Requested';
  if (status === 'ready_to_ship') label = 'Ready to Ship';

  return <Badge variant={variant}>{label}</Badge>;
}
