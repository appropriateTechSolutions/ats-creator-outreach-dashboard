import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { previewOutreach } from '../../lib/api';

interface OutreachPreviewModalProps {
  creatorId: string;
  campaignId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSend: (customSubject?: string, customBody?: string) => Promise<void>;
}

export function OutreachPreviewModal({
  creatorId,
  campaignId,
  isOpen,
  onClose,
  onSend,
}: OutreachPreviewModalProps) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (isOpen && creatorId) {
      setLoading(true);
      previewOutreach(creatorId, campaignId)
        .then((data) => {
          setSubject(data.subject || '');
          setBody(data.body || '');
        })
        .catch((err) => {
          console.error('Failed to load preview:', err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, creatorId, campaignId]);

  if (!isOpen) return null;

  const handleSend = async () => {
    setSending(true);
    try {
      await onSend(subject, body);
      onClose();
    } catch (error) {
      console.error(error);
      alert('Failed to send outreach');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-normal text-gray-900 font-outfit uppercase tracking-tight">Review Outreach Email</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-[10px] font-normal text-gray-700 mb-1 uppercase tracking-widest">
                  Subject Line
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                  placeholder="Enter email subject"
                />
              </div>

              <div>
                <label className="block text-[10px] font-normal text-gray-700 mb-1 uppercase tracking-widest">
                  Message Body
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={10}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all font-sans"
                  placeholder="Enter email body (HTML supported)"
                />
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50/50">
          <button
            onClick={onClose}
            disabled={sending}
            className="px-4 py-2 text-sm font-normal uppercase tracking-widest text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={loading || sending}
            className="px-6 py-2 text-sm font-normal uppercase tracking-widest text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {sending ? (
              <>
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                Sending...
              </>
            ) : (
              'Send Outreach'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
