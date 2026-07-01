import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { RefreshCw, Send, Sparkles } from 'lucide-react';

interface DiscussionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (subject: string, body: string, testEmailOverride?: string) => Promise<void>;
  creator: any;
  submitting: boolean;
}

export function DiscussionModal({
  isOpen,
  onClose,
  onSubmit,
  creator,
  submitting,
}: DiscussionModalProps) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [generating, setGenerating] = useState(false);
  const [toEmail, setToEmail] = useState(creator?.email || '');

  useEffect(() => {
    if (isOpen) {
      generateDraft();
      setToEmail(creator?.email || '');
    }
  }, [isOpen, creator]);

  const generateDraft = () => {
    setGenerating(true);
    // Simulate AI drafting
    setTimeout(() => {
      setSubject(`Quick Question re: Collaboration with Qui Tequila`);
      setBody(
        `Hi ${creator?.full_name?.split(' ')[0] || creator?.handle || 'there'},\n\nThanks for getting back to us! We're excited to potentially collaborate with you on our upcoming campaign.\n\nBefore we put together an official offer, we'd love to get a quick sense of your current rates and what deliverables you typically provide (e.g. 1 Reel + 1 Story). Also, do you have any timeline constraints we should be aware of?\n\nLet me know your thoughts and we'll get a formal draft offer over to you right away.\n\nBest,\nATS Outreach Team`,
      );
      setGenerating(false);
    }, 800);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !body.trim() || !toEmail.trim()) return;

    // If the toEmail is edited from the original creator email, treat it as a test email override
    const testEmailOverride = toEmail.trim() !== creator?.email ? toEmail.trim() : undefined;

    await onSubmit(subject, body, testEmailOverride);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Start Discussion">
      <form onSubmit={handleSubmit} className="space-y-4 font-outfit">
        {generating && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10 rounded-xl">
            <div className="flex flex-col items-center text-primary-600 gap-2">
              <Sparkles className="animate-pulse" size={24} />
              <span className="text-xs uppercase tracking-widest font-bold">Drafting email...</span>
            </div>
          </div>
        )}

        <div className="space-y-1">
          <label
            htmlFor="discussionmodal-1"
            className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block"
          >
            To:
          </label>
          <input
            id="discussionmodal-1"
            type="email"
            className="w-full text-sm font-medium border border-gray-200 rounded-lg p-2.5 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            value={toEmail}
            onChange={(e) => setToEmail(e.target.value)}
            required
            disabled={submitting || generating}
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="discussionmodal-2"
            className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block"
          >
            Subject Line
          </label>
          <input
            id="discussionmodal-2"
            type="text"
            className="w-full text-sm font-medium border border-gray-200 rounded-lg p-2.5 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
            disabled={submitting || generating}
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="discussionmodal-3"
            className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block"
          >
            Email Body
          </label>
          <textarea
            id="discussionmodal-3"
            className="w-full text-sm border border-gray-200 rounded-lg p-3 min-h-[250px] focus:border-primary-500 focus:ring-1 focus:ring-primary-500 font-sans"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            disabled={submitting || generating}
          />
        </div>

        <div className="flex gap-3 pt-4 border-t border-gray-100">
          <Button
            type="button"
            variant="outline"
            className="flex-1 font-normal text-xs uppercase tracking-widest"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            className="px-4 text-xs bg-gray-50 hover:bg-gray-100 text-gray-600"
            onClick={generateDraft}
            disabled={generating || submitting}
            title="Regenerate with AI"
          >
            <RefreshCw size={14} className={generating ? 'animate-spin' : ''} />
          </Button>
          <Button
            type="submit"
            disabled={submitting || generating || !subject || !body || !toEmail}
            className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-normal text-xs uppercase tracking-widest flex items-center justify-center gap-2"
          >
            {submitting ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
            Send Email
          </Button>
        </div>
      </form>
    </Modal>
  );
}
