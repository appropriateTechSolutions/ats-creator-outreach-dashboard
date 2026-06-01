import { useEffect, useState } from 'react';
import { X, Info, Check } from 'lucide-react';
import { LoadingState } from './LoadingState';

interface TemplateEditModalProps {
  isOpen: boolean;
  initialSubject: string;
  initialBody: string;
  onSave: (subject: string, body: string) => Promise<void>;
  onClose: () => void;
}

const PLACEHOLDERS = ['display_name', 'full_name', 'handle', 'city', 'category', 'campaign_name', 'client_name'];

export function TemplateEditModal({ isOpen, initialSubject, initialBody, onSave, onClose }: TemplateEditModalProps) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSubject(initialSubject || '');
      setBody(initialBody || '');
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen, initialSubject, initialBody]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(subject, body);
      onClose();
    } catch (err) {
      console.error('Failed to save template:', err);
    } finally {
      setSaving(false);
    }
  };

  const insertPlaceholder = (tag: string) => {
    setBody(prev => `${prev}{{${tag}}}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={saving ? undefined : onClose} />

      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-lg font-normal text-gray-900 font-outfit uppercase tracking-tight">
            Edit Outreach Template
          </h2>
          <button
            onClick={onClose}
            disabled={saving}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-gray-100 disabled:opacity-40"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto">
          <div className="space-y-1">
            <label className="text-[10px] font-normal text-gray-500 uppercase tracking-widest">
              Email Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Collaboration opportunity with {{client_name}}"
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-normal text-gray-500 uppercase tracking-widest">
              Message Body
            </label>
            <textarea
              rows={14}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Hi {{display_name}}, ..."
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all resize-y font-sans leading-relaxed"
            />
            <p className="text-[10px] text-gray-400 italic">Plain text — line breaks are preserved in the sent email.</p>
          </div>

          <div className="bg-primary-50/40 border border-primary-100 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 text-primary-700">
              <Info size={14} />
              <span className="text-[10px] font-normal uppercase tracking-widest">Click to insert placeholder</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PLACEHOLDERS.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => insertPlaceholder(p)}
                  className="text-[10px] bg-primary-100 hover:bg-primary-200 text-primary-700 px-2 py-1 rounded font-normal uppercase tracking-tighter transition-colors"
                >
                  {`{{${p}}}`}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm font-normal uppercase tracking-widest text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !subject.trim() || !body.trim()}
            className="px-6 py-2 text-sm font-normal uppercase tracking-widest text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? <LoadingState mini /> : <Check size={16} />}
            {saving ? 'Saving...' : 'Save Campaign Template'}
          </button>
        </div>
      </div>
    </div>
  );
}
