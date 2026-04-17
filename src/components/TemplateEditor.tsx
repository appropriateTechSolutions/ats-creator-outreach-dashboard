import { useEffect, useState } from 'react'
import { getCampaignTemplate, updateCampaignTemplate } from '../lib/api'

interface TemplateEditorProps {
  campaignId: string
  campaignName: string
  onClose: () => void
  onSave?: () => void
}

const DEFAULT_SUBJECT = 'Collaboration with {{campaign_name}}'
const DEFAULT_BODY = 'Hey {{full_name}}, love your content! We would love to collaborate for our {{campaign_name}} campaign in {{city}}.\n\nOffer: {{product_offer_notes}}'
const SUPPORTED_TAGS = ['{{handle}}', '{{full_name}}', '{{city}}', '{{category}}', '{{client_name}}', '{{product_offer_notes}}']

export default function TemplateEditor({ campaignId, campaignName, onClose, onSave }: TemplateEditorProps) {
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchTemplate() {
      try {
        setLoading(true)
        const template = await getCampaignTemplate(campaignId)
        if (template) {
          setSubject(template.subject_line_template || '')
          setBody(template.body_template || '')
        } else {
          setSubject(DEFAULT_SUBJECT)
          setBody(DEFAULT_BODY)
        }
      } catch (err: unknown) {
        console.error('Template load failed, using defaults:', err)
        setSubject(DEFAULT_SUBJECT)
        setBody(DEFAULT_BODY)
      } finally {
        setLoading(false)
      }
    }

    fetchTemplate()
  }, [campaignId])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setSaving(true)
      setError('')
      await updateCampaignTemplate(campaignId, {
        subject_line_template: subject,
        body_template: body,
      })
      if (onSave) onSave()
      onClose()
    } catch {
      setError('Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/35 p-4" onClick={onClose}>
      <div className="panel w-full max-w-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-outline-variant/60 px-5 py-4">
          <div>
            <h2 className="section-title">Outreach template</h2>
            <p className="section-copy mt-1">{campaignName}</p>
          </div>
          <button onClick={onClose} className="btn-ghost">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center px-5 py-16 text-on-surface-variant">
            <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-5 p-5">
            {error && <div className="rounded-lg border border-error/20 bg-error-container/40 px-3 py-2 text-sm text-error">{error}</div>}

            <div>
              <label className="field-label">Subject line</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="input-control"
                placeholder={DEFAULT_SUBJECT}
                required
              />
            </div>

            <div>
              <label className="field-label">Email body</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="textarea-control min-h-[220px]"
                rows={10}
                placeholder="Add the message operators will send to approved leads."
                required
              />
            </div>

            <div className="panel-muted px-4 py-3">
              <div className="mb-2 text-sm font-medium text-on-surface">Supported tags</div>
              <div className="flex flex-wrap gap-2">
                {SUPPORTED_TAGS.map((tag) => (
                  <code key={tag} className="rounded-md border border-outline-variant/60 bg-surface-container-lowest px-2 py-1 text-xs text-on-surface">
                    {tag}
                  </code>
                ))}
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-outline-variant/60 pt-4 sm:flex-row sm:justify-end">
              <button type="button" onClick={onClose} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="btn-primary">
                <span className="material-symbols-outlined text-[18px]">{saving ? 'progress_activity' : 'save'}</span>
                {saving ? 'Saving changes' : 'Save template'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
