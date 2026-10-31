import { Eye } from 'lucide-react';
import { Button } from '../ui/Button';
import { getNextAction, type NextActionKey } from '../../lib/nextAction';
import type { Creator, CreatorContent, Partnership, Shipment } from '../../types';

interface WorkflowActionEngineProps {
  creator: Creator;
  /** The creator's current partnership (see pickCurrentPartnership). */
  partnership?: Partnership | null;
  /** That partnership's shipment, if any. */
  shipment?: Shipment | null;
  /** That partnership's deliverables. */
  contents?: CreatorContent[];
  followUpDue?: boolean;
  onAction: (actionType: NextActionKey, payload?: unknown) => void;
}

// Button colour per next step — the same colours the hand-written tree used.
const ACTION_STYLES: Partial<Record<NextActionKey, string>> = {
  outreach: 'bg-indigo-600 hover:bg-indigo-700 text-white',
  follow_up: 'bg-amber-600 hover:bg-amber-700 text-white',
  draft_offer: 'bg-blue-600 hover:bg-blue-700 text-white',
  add_shipment: 'bg-purple-600 hover:bg-purple-700 text-white',
  view_shipments: 'bg-indigo-600 hover:bg-indigo-700 text-white',
  activate: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  review_content: 'bg-pink-600 hover:bg-pink-700 text-white',
  add_draft_url: 'bg-yellow-600 hover:bg-yellow-700 text-white',
  complete: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  add_live_url: 'bg-cyan-600 hover:bg-cyan-700 text-white',
};

const CHIP =
  'w-full text-[10px] uppercase tracking-widest font-bold text-gray-400 text-center block';

// With no next step the list shows where the creator stands, as it always has.
const statusLabel = (lifecycle: string | null | undefined): string | null => {
  if (!lifecycle) return null;
  if (lifecycle === 'not_respond') return 'Not responsive';
  return lifecycle.charAt(0).toUpperCase() + lifecycle.slice(1).replace(/_/g, ' ');
};

/** Renders the Creators list's "Next action" cell from the shared next-step engine. */
export function WorkflowActionEngine({
  creator,
  partnership,
  shipment,
  contents,
  followUpDue,
  onAction,
}: WorkflowActionEngineProps) {
  const action = getNextAction({ creator, partnership, shipment, contents, followUpDue });

  if (action.kind !== 'action') {
    return (
      <span className={CHIP}>
        {action.key === 'none'
          ? (statusLabel(creator.lifecycle_status) ?? action.label)
          : action.label}
      </span>
    );
  }

  // Drafting an offer keeps its side door: the reply (or the creator's feedback
  // on the last offer) one click away.
  const negotiating = partnership?.status === 'negotiating';
  const side =
    action.key !== 'draft_offer' || partnership?.status === 'qualified'
      ? null
      : negotiating
        ? {
            key: 'view_feedback' as const,
            title: 'View feedback',
            className: 'bg-orange-600 hover:bg-orange-700',
          }
        : {
            key: 'view_discussion' as const,
            title: partnership?.status === 'in_discussion' ? 'In discussion' : 'View reply',
            className: 'bg-amber-500 hover:bg-amber-600',
          };

  const style =
    action.key === 'draft_offer' && negotiating
      ? 'bg-primary-600 hover:bg-primary-700 text-white'
      : (ACTION_STYLES[action.key] ?? '');

  const primary = (
    <Button
      size="sm"
      className={`${side ? 'flex-1' : 'w-full'} min-h-[32px] py-1 text-xs font-medium ${style}`}
      onClick={() => onAction(action.key, action.payload)}
    >
      {action.label}
    </Button>
  );

  if (!side) return primary;

  return (
    <div className="flex w-full gap-1">
      {primary}
      <Button
        size="sm"
        className={`px-2 text-white flex items-center justify-center ${side.className}`}
        onClick={() => onAction(side.key)}
        title={side.title}
        aria-label={side.title}
      >
        <Eye size={14} aria-hidden="true" />
      </Button>
    </div>
  );
}
