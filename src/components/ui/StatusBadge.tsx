import React from 'react';
import { Badge } from './Badge';

export type StatusType = 'active' | 'pending' | 'failed' | 'draft' | 'approved' | 'rejected' | 'contacted' | 'replied' | 'converted';

export function StatusBadge({ status }: { status: StatusType }) {
  let variant: React.ComponentProps<typeof Badge>['variant'] = 'gray';

  switch (status) {
    case 'active':
    case 'approved':
    case 'converted':
      variant = 'success';
      break;
    case 'pending':
    case 'pending_review':
      variant = 'warning';
      break;
    case 'failed':
    case 'rejected':
      variant = 'error';
      break;
    case 'replied':
    case 'contacted':
      variant = 'primary';
      break;
    case 'hold':
      variant = 'gray';
      break;
    case 'draft':
    default:
      variant = 'gray';
  }

  let label = status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
  if (status === 'hold') label = 'Discovered';

  return <Badge variant={variant}>{label}</Badge>;
}
