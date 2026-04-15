import { useState, useEffect } from 'react'
import { getCampaignTemplate, updateCampaignTemplate } from '../lib/api'

interface TemplateEditorProps {
  campaignId: string
  campaignName: string
  onClose: () => void
  onSave?: () => void
}

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
          // Fallback to defaults if null/undefined
          setSubject('Collaboration with {{campaign_name}}')
          setBody('Hey {{full_name}}, love your content! We would love to collaborate for our {{campaign_name}} campaign in {{city}}.\n\nOffer: {{product_offer_notes}}')
        }
      } catch (err: any) {
        console.error("Template load failed, using defaults:", err);
        // Fallback to defaults on error to keep the UI working
        setSubject('Collaboration with {{campaign_name}}')
        setBody('Hey {{full_name}}, love your content! We would love to collaborate for our {{campaign_name}} campaign in {{city}}.\n\nOffer: {{product_offer_notes}}')
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
      await updateCampaignTemplate(campaignId, {
        subject_line_template: subject,
        body_template: body
      })
      if (onSave) onSave()
      onClose()
    } catch (err: any) {
      setError('Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-surface-container-lowest w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-[slideUp_0.3s_ease]" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-primary px-6 py-5 flex justify-between items-center text-white">
          <div>
            <h2 className="font-headline text-lg font-bold">Manage Outreach Template</h2>
            <p className="text-white/70 text-xs mt-0.5">{campaignName}</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center">
            <span className="material-symbols-outlined text-3xl text-primary animate-spin">progress_activity</span>
          </div>
        ) : (
          <form onSubmit={handleSave} className="p-6 space-y-5">
            {error && <div className="p-3 rounded-xl bg-error-container text-error text-xs font-bold">{error}</div>}

            <div>
              <label className="block text-[10px] font-bold text-outline uppercase tracking-widest mb-2">Subject Line</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-surface-container border border-outline-variant/30 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm font-medium"
                placeholder="Collaboration with {{campaign_name}}"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-outline uppercase tracking-widest mb-2">Email Body</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-surface-container border border-outline-variant/30 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm resize-none font-medium text-justify"
                rows={8}
                placeholder="Hey {{full_name}}..."
                required
              />
              <div className="mt-3 p-3 bg-surface-container/50 rounded-xl border border-outline-variant/20">
                <p className="text-[9px] font-bold text-outline uppercase mb-2">Supported Magic Tags:</p>
                <div className="flex flex-wrap gap-2">
                  {['{{handle}}', '{{full_name}}', '{{city}}', '{{category}}', '{{client_name}}', '{{product_offer_notes}}'].map(tag => (
                    <code key={tag} className="text-[9px] text-primary bg-primary/5 px-1.5 py-0.5 rounded font-mono font-bold border border-primary/10">{tag}</code>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                type="button" 
                onClick={onClose} 
                className="flex-1 py-3.5 rounded-2xl bg-surface-container text-on-surface text-sm font-bold hover:bg-surface-container-high transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-3.5 rounded-2xl bg-primary text-white text-sm font-bold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
              >
                {saving ? 'Saving...' : 'Update Template'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
