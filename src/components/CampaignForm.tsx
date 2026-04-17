import { useState } from 'react'
import type { Campaign, CampaignFormData } from '../types'

interface CampaignFormProps {
  onSubmit: (data: CampaignFormData) => void
  onClose: () => void
  loading: boolean
  mode?: 'create' | 'edit'
  initialData?: Partial<Campaign> | null
}

const categorySuggestions = [
  'Fashion',
  'Beauty',
  'Fitness',
  'Food',
  'Travel',
  'Tech',
  'Lifestyle',
  'Health',
  'Finance',
  'Education',
  'Alcohol',
  'Tequila',
  'Party',
  'Nightlife',
  'Cocktails',
  'Hospitality',
]

const availablePlatforms = [
  { id: 'instagram', name: 'Instagram', icon: 'photo_camera' },
  { id: 'youtube', name: 'YouTube', icon: 'play_circle' },
  { id: 'tiktok', name: 'TikTok', icon: 'music_note' },
]

function normalizeKeywordInput(value: string[] | string | null | undefined): string {
  if (Array.isArray(value)) {
    return value.join(', ')
  }

  return value || ''
}

function normalizeChannels(value: Campaign['discovery_channels']): string[] {
  if (Array.isArray(value)) return value
  if (typeof value !== 'string') return ['instagram']

  try {
    const parsed = JSON.parse(value) as unknown
    return Array.isArray(parsed) && parsed.every((item) => typeof item === 'string') ? parsed : ['instagram']
  } catch {
    return ['instagram']
  }
}

export default function CampaignForm({ onSubmit, onClose, loading, mode = 'create', initialData }: CampaignFormProps) {
  const [name, setName] = useState(() => initialData?.name || '')
  const [clientName, setClientName] = useState(() => initialData?.client_name || '')
  const [category, setCategory] = useState(() => initialData?.category || '')
  const [city, setCity] = useState(() => initialData?.city || '')
  const [keywords, setKeywords] = useState(() => normalizeKeywordInput(initialData?.keywords))
  const [notes, setNotes] = useState(() => initialData?.product_offer_notes || '')
  const [channels, setChannels] = useState<string[]>(() => normalizeChannels(initialData?.discovery_channels))

  const toggleChannel = (id: string) => {
    setChannels((prev) => (prev.includes(id) ? (prev.length > 1 ? prev.filter((channel) => channel !== id) : prev) : [...prev, id]))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    onSubmit({
      name,
      client_name: clientName,
      category,
      city,
      keywords: keywords
        .split(',')
        .map((keyword) => keyword.trim())
        .filter(Boolean),
      product_offer_notes: notes,
      offer_type: 'hybrid',
      discovery_channels: channels,
      email_subject: 'Collaboration with {{campaign_name}}',
      email_body:
        'Hey {{full_name}}, love your content! We would love to collaborate for our {{campaign_name}} campaign in {{city}}.\n\nOffer: {{product_offer_notes}}',
    })
  }

  const isEditMode = mode === 'edit'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" onClick={onClose}>
      <div className="panel max-h-[90vh] w-full max-w-3xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-outline-variant/60 px-5 py-4">
          <div>
            <h2 className="section-title">{isEditMode ? 'Edit campaign' : 'New campaign'}</h2>
            <p className="section-copy mt-1">
              {isEditMode ? 'Update targeting and discovery inputs for this campaign.' : 'Set the targeting inputs and start the discovery queue.'}
            </p>
          </div>
          <button onClick={onClose} className="btn-ghost">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-5 p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="field-label">Campaign name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-control"
                  placeholder="NYC Sustainable Fashion 2026"
                  required
                />
              </div>

              <div>
                <label className="field-label">Client name</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="input-control"
                  placeholder="EcoVogue"
                />
              </div>

              <div>
                <label className="field-label">Category</label>
                <input
                  type="text"
                  list="campaign-category-suggestions"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="input-control"
                  placeholder="Type or select a category"
                  required
                />
                <datalist id="campaign-category-suggestions">
                  {categorySuggestions.map((item) => (
                    <option key={item} value={item} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="field-label">City</label>
                <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className="input-control" placeholder="New York" required />
              </div>

              <div>
                <label className="field-label">Keywords</label>
                <input
                  type="text"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  className="input-control"
                  placeholder="tequila, nightlife, parties, rooftop"
                />
              </div>

              <div className="md:col-span-2">
                <label className="field-label">Offer notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="textarea-control"
                  rows={3}
                  placeholder="Free product + 15% commission"
                />
              </div>
            </div>

            <div>
              <label className="field-label">Discovery platforms</label>
              <div className="flex flex-wrap gap-2">
                {availablePlatforms.map((platform) => {
                  const selected = channels.includes(platform.id)

                  return (
                    <button
                      key={platform.id}
                      type="button"
                      onClick={() => toggleChannel(platform.id)}
                      className={selected ? 'btn-secondary border-primary bg-primary/5 text-primary' : 'btn-secondary text-on-surface-variant'}
                    >
                      <span className="material-symbols-outlined text-[18px]">{platform.icon}</span>
                      {platform.name}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-outline-variant/60 pt-4 sm:flex-row sm:justify-end">
              <button type="button" onClick={onClose} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={loading} className="btn-primary">
                <span className="material-symbols-outlined text-[18px]">{loading ? 'progress_activity' : isEditMode ? 'save' : 'add_circle'}</span>
                {loading ? (isEditMode ? 'Saving campaign' : 'Creating campaign') : isEditMode ? 'Save changes' : 'Create campaign'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
