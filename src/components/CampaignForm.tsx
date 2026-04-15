import { useState } from 'react'

interface CampaignFormProps {
  onSubmit: (data: { 
    name: string; 
    client_name: string; 
    category: string; 
    city: string; 
    product_offer_notes: string; 
    offer_type: string;
    discovery_channels: string[];
    email_subject: string;
    email_body: string;
  }) => void
  onClose: () => void
  loading: boolean
}

const categories = ['Fashion', 'Beauty', 'Fitness', 'Food', 'Travel', 'Tech', 'Lifestyle', 'Health', 'Finance', 'Education']
const availablePlatforms = [
  { id: 'instagram', name: 'Instagram', icon: 'photo_camera' },
  { id: 'youtube', name: 'YouTube', icon: 'play_circle' },
  { id: 'tiktok', name: 'TikTok', icon: 'music_note' }
]

export default function CampaignForm({ onSubmit, onClose, loading }: CampaignFormProps) {
  const [name, setName] = useState('')
  const [clientName, setClientName] = useState('')
  const [category, setCategory] = useState('')
  const [city, setCity] = useState('')
  const [notes, setNotes] = useState('')
  const [channels, setChannels] = useState<string[]>(['instagram'])


  const toggleChannel = (id: string) => {
    setChannels(prev => 
      prev.includes(id) 
        ? (prev.length > 1 ? prev.filter(c => c !== id) : prev) 
        : [...prev, id]
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({ 
      name, 
      client_name: clientName, 
      category, 
      city, 
      product_offer_notes: notes, 
      offer_type: 'hybrid',
      discovery_channels: channels,
      email_subject: 'Collaboration with {{campaign_name}}',
      email_body: 'Hey {{full_name}}, love your content! We would love to collaborate for our {{campaign_name}} campaign in {{city}}.\n\nOffer: {{product_offer_notes}}'
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-surface-container-lowest w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="editorial-gradient px-6 py-5 flex justify-between items-center shrink-0">
          <div>
            <h2 className="font-headline text-xl font-bold text-white">New Campaign</h2>
            <p className="text-white/70 text-xs mt-1">Define your campaign and audience criteria</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 gap-5">
            <div>
              <label className="block text-[10px] font-bold text-outline uppercase tracking-widest mb-2">Campaign Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-surface-container border border-outline-variant/30 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                placeholder="e.g. NYC Sustainable Fashion 2026"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-outline uppercase tracking-widest mb-2">Client Name</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-surface-container border border-outline-variant/30 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                placeholder="e.g. EcoVogue"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-outline uppercase tracking-widest mb-2">Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-surface-container border border-outline-variant/30 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm appearance-none"
                required
              >
                <option value="">Select...</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-outline uppercase tracking-widest mb-2">City *</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-surface-container border border-outline-variant/30 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                placeholder="e.g. New York"
                required
              />
            </div>
          </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-bold text-outline uppercase tracking-widest mb-2">Discovery Platforms *</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {availablePlatforms.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggleChannel(p.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all text-xs font-bold ${
                        channels.includes(p.id)
                          ? 'bg-primary/10 border-primary text-primary shadow-sm'
                          : 'bg-surface-container border-outline-variant/30 text-outline hover:border-outline'
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">{p.icon}</span>
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-outline uppercase tracking-widest mb-2">Offer / Contract Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-surface-container border border-outline-variant/30 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm resize-none font-medium"
                  rows={2}
                  placeholder="e.g. Free product + 15% commission"
                />
              </div>
            </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-8 py-4 rounded-2xl editorial-gradient text-white font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                Creating Campaign & Setting Queue...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-sm">rocket_launch</span>
                Create Campaign & Start Discovery
              </span>
            )}
          </button>
        </form>
      </div>
      </div>
    </div>
  )
}
