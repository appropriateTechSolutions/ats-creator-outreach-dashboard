import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { markContentSubmitted, markContentPublished } from '../../lib/api';

interface ContentPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionType: 'submit' | 'publish';
  contentId: string | null;
  initialValue: string;
  onSuccess: () => void;
}

export function ContentPromptModal({ isOpen, onClose, actionType, contentId, initialValue, onSuccess }: ContentPromptModalProps) {
  const [value, setValue] = useState(initialValue || '');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setValue(initialValue || '');
    }
  }, [isOpen, initialValue]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contentId) return;

    setSubmitting(true);
    try {
      if (actionType === 'submit') {
        await markContentSubmitted(contentId, { draft_url: value });
      } else if (actionType === 'publish') {
        await markContentPublished(contentId, { published_url: value });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      alert('Action failed: ' + (err.message || err));
    } finally {
      setSubmitting(false);
    }
  };

  const title = actionType === 'submit' ? 'Submit Content Draft' : 'Publish Content Deliverable';
  const label = actionType === 'submit' ? 'Draft URL' : 'Live Published URL';
  const placeholder = actionType === 'submit' ? 'https://instagram.com/p/mock_draft_url' : 'https://instagram.com/p/mock_published_url';

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</label>
          <input
            type="text"
            required
            value={value}
            onChange={e => setValue(e.target.value)}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-sm font-outfit"
            placeholder={placeholder}
          />
        </div>

        <div className="flex gap-3 pt-4 border-t border-gray-100">
          <Button type="button" variant="outline" className="flex-1 font-normal text-xs uppercase tracking-widest" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting} className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-normal text-xs uppercase tracking-widest">
            {submitting ? 'Saving...' : 'Save URL'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
