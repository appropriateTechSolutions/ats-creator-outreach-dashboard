import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import type { CreatorPartnership } from '../../types';

export interface ContentForm {
  campaign_id: string;
  platform: string;
  content_type: string;
  due_date: string;
  notes: string;
}

export interface EditContentForm {
  id: string;
  platform: string;
  content_type: string;
  due_date: string;
  notes: string;
  draft_url: string;
  published_url: string;
}

/** Platform -> default content_type used by both the add and edit content forms. */
function defaultContentType(platform: string): string {
  if (platform === 'instagram') return 'instagram_reel';
  if (platform === 'youtube') return 'youtube_video';
  if (platform === 'tiktok') return 'tiktok_video';
  if (platform === 'blog') return 'blog_post';
  return 'other';
}

/** The content_type <option> set, keyed off the currently selected platform. */
function ContentTypeOptions({ platform }: { platform: string }) {
  return (
    <>
      {platform === 'instagram' && (
        <>
          <option value="instagram_reel">Instagram Reel</option>
          <option value="instagram_story">Instagram Story</option>
          <option value="instagram_post">Instagram Post</option>
        </>
      )}
      {platform === 'youtube' && (
        <>
          <option value="youtube_video">YouTube Video</option>
          <option value="youtube_short">YouTube Short</option>
        </>
      )}
      {platform === 'tiktok' && <option value="tiktok_video">TikTok Video</option>}
      {platform === 'blog' && <option value="blog_post">Blog Post</option>}
      {!['instagram', 'youtube', 'tiktok', 'blog'].includes(platform) && (
        <option value="other">Other</option>
      )}
    </>
  );
}

interface AddContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: ContentForm;
  setForm: React.Dispatch<React.SetStateAction<ContentForm>>;
  partnerships: CreatorPartnership[];
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
}

export function AddContentModal({
  isOpen,
  onClose,
  form,
  setForm,
  partnerships,
  onSubmit,
  submitting,
}: AddContentModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Content Deliverable">
      <form onSubmit={onSubmit} className="space-y-4 font-outfit">
        <div className="space-y-1">
          <label
            htmlFor="creatorcontentmodals-1"
            className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block"
          >
            Select Campaign
          </label>
          <select
            id="creatorcontentmodals-1"
            value={form.campaign_id}
            onChange={(e) => setForm((prev) => ({ ...prev, campaign_id: e.target.value }))}
            className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm"
            required
          >
            <option value="" disabled>
              Choose a Campaign...
            </option>
            {partnerships.map((p) => (
              <option key={p.id} value={p.Campaign?.id || p.campaign_id}>
                {p.Campaign?.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label
              htmlFor="creatorcontentmodals-2"
              className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block"
            >
              Platform
            </label>
            <select
              id="creatorcontentmodals-2"
              value={form.platform}
              onChange={(e) => {
                const plat = e.target.value;
                setForm((prev) => ({
                  ...prev,
                  platform: plat,
                  content_type: defaultContentType(plat),
                }));
              }}
              className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm"
            >
              <option value="instagram">Instagram</option>
              <option value="tiktok">TikTok</option>
              <option value="youtube">YouTube</option>
              <option value="blog">Blog</option>
              <option value="website">Website</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="creatorcontentmodals-3"
              className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block"
            >
              Content Type
            </label>
            <select
              id="creatorcontentmodals-3"
              value={form.content_type}
              onChange={(e) => setForm((prev) => ({ ...prev, content_type: e.target.value }))}
              className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm"
            >
              <ContentTypeOptions platform={form.platform} />
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="creatorcontentmodals-4"
            className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block"
          >
            Due Date
          </label>
          <input
            id="creatorcontentmodals-4"
            type="date"
            value={form.due_date}
            onChange={(e) => setForm((prev) => ({ ...prev, due_date: e.target.value }))}
            className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm"
            required
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="creatorcontentmodals-5"
            className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block"
          >
            Notes & Requirements
          </label>
          <textarea
            id="creatorcontentmodals-5"
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm min-h-[80px]"
            placeholder="e.g. mention the product in first 5 seconds, use promo code..."
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
            type="submit"
            disabled={submitting}
            className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-normal text-xs uppercase tracking-widest"
          >
            {submitting ? 'Creating...' : 'Create Requirement'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

interface EditContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: EditContentForm;
  setForm: React.Dispatch<React.SetStateAction<EditContentForm>>;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
}

export function EditContentModal({
  isOpen,
  onClose,
  form,
  setForm,
  onSubmit,
  submitting,
}: EditContentModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Content Deliverable">
      <form onSubmit={onSubmit} className="space-y-4 font-outfit">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label
              htmlFor="creatorcontentmodals-6"
              className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block"
            >
              Platform
            </label>
            <select
              id="creatorcontentmodals-6"
              value={form.platform}
              onChange={(e) => {
                const plat = e.target.value;
                setForm((prev) => ({
                  ...prev,
                  platform: plat,
                  content_type: defaultContentType(plat),
                }));
              }}
              className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm"
            >
              <option value="instagram">Instagram</option>
              <option value="tiktok">TikTok</option>
              <option value="youtube">YouTube</option>
              <option value="blog">Blog</option>
              <option value="website">Website</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="creatorcontentmodals-7"
              className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block"
            >
              Content Type
            </label>
            <select
              id="creatorcontentmodals-7"
              value={form.content_type}
              onChange={(e) => setForm((prev) => ({ ...prev, content_type: e.target.value }))}
              className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm"
            >
              <ContentTypeOptions platform={form.platform} />
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="creatorcontentmodals-8"
            className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block"
          >
            Due Date
          </label>
          <input
            id="creatorcontentmodals-8"
            type="date"
            value={form.due_date}
            onChange={(e) => setForm((prev) => ({ ...prev, due_date: e.target.value }))}
            className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm"
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="creatorcontentmodals-9"
            className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block"
          >
            Draft URL (Triggers Submitted State)
          </label>
          <input
            id="creatorcontentmodals-9"
            type="text"
            value={form.draft_url}
            onChange={(e) => setForm((prev) => ({ ...prev, draft_url: e.target.value }))}
            className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm"
            placeholder="https://drive.google.com/..."
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="creatorcontentmodals-10"
            className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block"
          >
            Published URL (Triggers Live State)
          </label>
          <input
            id="creatorcontentmodals-10"
            type="text"
            value={form.published_url}
            onChange={(e) => setForm((prev) => ({ ...prev, published_url: e.target.value }))}
            className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm"
            placeholder="https://instagram.com/p/..."
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="creatorcontentmodals-11"
            className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block"
          >
            Notes & Requirements
          </label>
          <textarea
            id="creatorcontentmodals-11"
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm min-h-[80px]"
            placeholder="e.g. guidelines..."
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
            type="submit"
            disabled={submitting}
            className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-normal text-xs uppercase tracking-widest"
          >
            {submitting ? 'Saving...' : 'Save Deliverable'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

interface PromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  label: string;
  placeholder: string;
  value: string;
  setValue: React.Dispatch<React.SetStateAction<string>>;
  onSubmit: (e: React.FormEvent) => void;
}

export function PromptModal({
  isOpen,
  onClose,
  title,
  label,
  placeholder,
  value,
  setValue,
  onSubmit,
}: PromptModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={onSubmit} className="space-y-4 font-outfit">
        <div className="space-y-1.5">
          <label
            htmlFor="creatorcontentmodals-12"
            className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block"
          >
            {label}
          </label>
          <input
            id="creatorcontentmodals-12"
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
            required
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
            type="submit"
            className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-normal text-xs uppercase tracking-widest"
          >
            Confirm Action
          </Button>
        </div>
      </form>
    </Modal>
  );
}

interface RevisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  subject: string;
  setSubject: React.Dispatch<React.SetStateAction<string>>;
  body: string;
  setBody: React.Dispatch<React.SetStateAction<string>>;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
}

export function RevisionModal({
  isOpen,
  onClose,
  subject,
  setSubject,
  body,
  setBody,
  onSubmit,
  submitting,
}: RevisionModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Request Content Revision">
      <form onSubmit={onSubmit} className="space-y-4 font-outfit">
        <div className="space-y-1">
          <label
            htmlFor="creatorcontentmodals-13"
            className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block"
          >
            Email Subject
          </label>
          <input
            id="creatorcontentmodals-13"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm"
            required
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="creatorcontentmodals-14"
            className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block"
          >
            Email Message Body (Sent to Creator & Saved to CRM)
          </label>
          <textarea
            id="creatorcontentmodals-14"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm min-h-[200px]"
            required
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
            type="submit"
            disabled={submitting}
            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-normal text-xs uppercase tracking-widest"
          >
            {submitting ? 'Sending Request...' : 'Send Revision Request'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

interface ContentEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  subject: string;
  setSubject: React.Dispatch<React.SetStateAction<string>>;
  body: string;
  setBody: React.Dispatch<React.SetStateAction<string>>;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
}

export function ContentEmailModal({
  isOpen,
  onClose,
  subject,
  setSubject,
  body,
  setBody,
  onSubmit,
  submitting,
}: ContentEmailModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Send Deliverables to Creator">
      <form onSubmit={onSubmit} className="space-y-4 font-outfit">
        <div className="space-y-1">
          <label
            htmlFor="creatorcontentmodals-15"
            className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block"
          >
            Email Subject
          </label>
          <input
            id="creatorcontentmodals-15"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm"
            required
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="creatorcontentmodals-16"
            className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block"
          >
            Email Message Body
          </label>
          <textarea
            id="creatorcontentmodals-16"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm min-h-[220px]"
            required
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
            type="submit"
            disabled={submitting}
            className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-normal text-xs uppercase tracking-widest"
          >
            {submitting ? 'Sending...' : 'Send Email'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
