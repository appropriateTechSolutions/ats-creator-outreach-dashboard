import React from 'react';
import { Eye } from 'lucide-react';
import { Button } from '../ui/Button';

interface WorkflowActionEngineProps {
  creator: any;
  partnership: any;
  shipment: any; // the most relevant shipment
  contents: any[];
  onAction: (actionType: string, payload?: any) => void;
}

export function WorkflowActionEngine({ creator, partnership, shipment, contents, onAction }: WorkflowActionEngineProps) {
  // Step 1: New / Not Reviewed
  if (!creator.review_status || creator.review_status === 'new') {
    return (
      <Button size="sm" className="w-full text-[10px] uppercase tracking-widest font-normal" onClick={() => onAction('review')}>
        Review Creator
      </Button>
    );
  }

  // Step 2: Approved, waiting for outreach
  if (creator.review_status === 'approved' && creator.lifecycle_status === 'new') {
    return (
      <Button size="sm" className="w-full text-[10px] uppercase tracking-widest font-normal bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => onAction('outreach')}>
        Send Outreach
      </Button>
    );
  }

  // Step 3: Contacted -> Awaiting Reply
  if (!partnership || partnership.status === 'engaged') {
    if (creator.lifecycle_status === 'contacted') {
      return (
        <span className="w-full text-[10px] uppercase tracking-widest font-bold text-gray-400 text-center block">
          Awaiting Reply
        </span>
      );
    }
  }

  // Step 4: Replied / In Discussion -> Show Draft Offer and Eye Icon to go to Conversation
  if (partnership?.status === 'replied' || partnership?.status === 'in_discussion' || creator.lifecycle_status === 'replied') {
    return (
      <div className="flex w-full gap-1">
        <Button size="sm" className="flex-1 text-[10px] uppercase tracking-widest font-normal bg-blue-600 hover:bg-blue-700 text-white" onClick={() => onAction('draft_offer')}>
          Draft Offer
        </Button>
        <Button size="sm" className="px-2 bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center" onClick={() => onAction('view_discussion')} title={partnership?.status === 'in_discussion' ? 'In Discussion' : 'View Reply'}>
          <Eye size={14} />
        </Button>
      </div>
    );
  }

  // Step 5: Qualified
  if (!partnership || partnership.status === 'qualified') {
    if (partnership && partnership.status === 'qualified') {
      return (
        <Button size="sm" className="w-full text-[10px] uppercase tracking-widest font-normal bg-blue-600 hover:bg-blue-700 text-white" onClick={() => onAction('draft_offer')}>
          Draft Offer
        </Button>
      );
    }
  }

  if (partnership) {
    // Negotiating Stage
    if (partnership.status === 'negotiating') {
      return (
        <div className="flex w-full gap-1">
          <Button size="sm" className="flex-1 text-[10px] uppercase tracking-widest font-normal bg-primary-600 hover:bg-primary-700 text-white" onClick={() => onAction('draft_offer')}>
            Reply
          </Button>
          <Button size="sm" className="px-2 bg-orange-600 hover:bg-orange-700 text-white" onClick={() => onAction('view_feedback')} title="View Feedback">
            <Eye size={14} />
          </Button>
        </div>
      );
    }

    // Step 4: Offer Sent -> Awaiting Acceptance from Creator
    if (partnership.status === 'offer_sent') {
      return (
        <span className="w-full text-[10px] uppercase tracking-widest font-bold text-gray-400 text-center block">
          Awaiting Acceptance
        </span>
      );
    }

    // Step 5: Accepted / Engaged (Check Shipment)
    if (partnership.status === 'accepted' || partnership.status === 'engaged') {
      if (partnership.shipment_included) {
        if (!shipment) {
          return (
            <Button size="sm" className="w-full text-[10px] uppercase tracking-widest font-normal bg-purple-600 hover:bg-purple-700 text-white" onClick={() => onAction('add_shipment')}>
              Add Shipment
            </Button>
          );
        } else {
          return (
            <Button size="sm" className="w-full text-[10px] uppercase tracking-widest font-normal bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => onAction('view_shipments')}>
              Update Shipment
            </Button>
          );
        }
      }
      return (
        <Button size="sm" className="w-full text-[10px] uppercase tracking-widest font-normal bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => onAction('activate')}>
          Activate Partnership
        </Button>
      );
    }

    // Shipment stages - ready for activation!
    if (partnership.status === 'product_shipped' || partnership.status === 'product_delivered') {
      return (
        <Button size="sm" className="w-full text-[10px] uppercase tracking-widest font-normal bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => onAction('activate')}>
          Activate Partnership
        </Button>
      );
    }

    // Step 6: Activated / Content Pending
    if (partnership.status === 'activated') {
      // Check if all contents are approved
      const pendingContents = contents.filter(c => c.status === 'pending' || c.status === 'revision_requested');
      const submittedContents = contents.filter(c => c.status === 'submitted');
      
      if (submittedContents.length > 0) {
        return (
          <Button size="sm" className="w-full text-[10px] uppercase tracking-widest font-normal bg-pink-600 hover:bg-pink-700 text-white" onClick={() => onAction('review_content', submittedContents[0])}>
            Review Draft
          </Button>
        );
      }

      if (pendingContents.length > 0) {
        return (
          <Button size="sm" className="w-full text-[10px] uppercase tracking-widest font-normal bg-yellow-600 hover:bg-yellow-700 text-white" onClick={() => onAction('add_draft_url', pendingContents[0])}>
            Add Draft URL
          </Button>
        );
      }

      return (
        <Button size="sm" className="w-full text-[10px] uppercase tracking-widest font-normal bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => onAction('complete')}>
          Complete Partnership
        </Button>
      );
    }

    // Step 7/8: Completed
    if (partnership.status === 'completed') {
      const pendingPublish = contents.filter(c => c.status === 'approved');
      if (pendingPublish.length > 0) {
        return (
          <Button size="sm" className="w-full text-[10px] uppercase tracking-widest font-normal bg-cyan-600 hover:bg-cyan-700 text-white" onClick={() => onAction('add_live_url', pendingPublish[0])}>
            Add Live URL
          </Button>
        );
      }
      return (
        <span className="w-full text-[10px] uppercase tracking-widest font-bold text-gray-400 text-center block">
          Completed
        </span>
      );
    }
  }

  // Fallback
  return (
    <span className="w-full text-[10px] uppercase tracking-widest font-bold text-gray-400 text-center block">
      {creator.lifecycle_status || 'Unknown'}
    </span>
  );
}
