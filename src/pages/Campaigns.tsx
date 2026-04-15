import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Campaign } from '../types'
import { getCampaigns, createCampaign, triggerDiscovery } from '../lib/api'
import CampaignForm from '../components/CampaignForm'
import TemplateEditor from '../components/TemplateEditor'

const statusColors: Record<string, string> = {
  draft: 'bg-outline/10 text-outline',
  active: 'bg-secondary/10 text-secondary',
  paused: 'bg-tertiary/10 text-tertiary',
  completed: 'bg-primary/10 text-primary',
  archived: 'bg-surface-container-high text-on-surface-variant',
}

export default function Campaigns() {
  const navigate = useNavigate()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [campaignForTemplate, setCampaignForTemplate] = useState<Campaign | null>(null)

  useEffect(() => {
    loadCampaigns()
  }, [])

  const loadCampaigns = async () => {
    try {
      setLoading(true)
      const data = await getCampaigns()
      setCampaigns(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load campaigns')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (data: any) => {
    try {
      setCreating(true)
      const campaign = await createCampaign(data)

      // Auto-trigger AI Discovery (like the Telegram bot)
      triggerDiscovery(data.category, data.city, campaign.id).catch(console.error)

      setShowForm(false)
      // Navigate to campaign detail immediately
      navigate(`/campaigns/${campaign.id}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create campaign')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="max-w-[1200px] mx-auto p-6 transition-all duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <span className="text-[10px] uppercase tracking-[0.2em] text-outline mb-2 block font-bold">Campaign Manager</span>
          <h2 className="font-headline text-3xl font-bold tracking-tight">Your Campaigns</h2>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-5 py-3 rounded-xl editorial-gradient text-white text-sm font-bold hover:opacity-90 active:scale-[0.98] transition-all shadow-lg"
        >
          <span className="material-symbols-outlined text-lg font-bold">add</span>
          New Campaign
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-error-container/30 text-error text-sm font-medium">
          {error}
          <button onClick={() => setError('')} className="ml-3 underline">Dismiss</button>
        </div>
      )}

      {/* Campaign Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <span className="material-symbols-outlined text-4xl text-primary animate-spin font-bold">progress_activity</span>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="h-20 w-20 bg-surface-container rounded-3xl flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-4xl text-outline font-bold">campaign</span>
          </div>
          <h3 className="font-headline text-xl font-bold mb-2 text-on-surface">No campaigns yet</h3>
          <p className="text-sm text-on-surface-variant mb-6 max-w-sm">Create your first campaign to start discovering and scoring influencers with AI.</p>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-xl editorial-gradient text-white text-sm font-bold hover:opacity-90 transition-all shadow-lg"
          >
            <span className="material-symbols-outlined text-lg font-bold">auto_awesome</span>
            Create First Campaign
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((c) => (
            <button
              key={c.id}
              onClick={() => navigate(`/campaigns/${c.id}`)}
              className="bg-surface-container-lowest p-6 rounded-3xl shadow-sm hover:shadow-xl transition-all text-left group relative border border-transparent hover:border-primary/20"
            >
              <div className="flex justify-between items-start mb-5">
                <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${statusColors[c.status] || statusColors.draft}`}>
                  {c.status}
                </span>
                <div className="flex items-center gap-2">
                  <span 
                    onClick={(e) => {
                      e.stopPropagation();
                      setCampaignForTemplate(c);
                    }}
                    className="material-symbols-outlined text-outline hover:text-primary transition-colors p-2 hover:bg-primary/5 rounded-full"
                    title="Edit Outreach Template"
                  >
                    mail
                  </span>
                  <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors">arrow_forward</span>
                </div>
              </div>
              <h3 className="font-headline text-xl font-bold mb-1 group-hover:text-primary transition-colors line-clamp-1">{c.name}</h3>
              {c.client_name && <p className="text-xs text-on-surface-variant mb-4 font-medium">{c.client_name}</p>}
              <div className="flex flex-wrap gap-2 mb-6">
                <span className="px-3 py-1.5 rounded-xl bg-primary/5 text-primary text-[10px] font-bold border border-primary/10">{c.category}</span>
                <span className="px-3 py-1.5 rounded-xl bg-tertiary/5 text-tertiary text-[10px] font-bold flex items-center gap-1 border border-tertiary/10">
                  <span className="material-symbols-outlined text-xs">location_on</span>
                  {c.city}
                </span>
                {(Array.isArray(c.discovery_channels) ? c.discovery_channels : (typeof c.discovery_channels === 'string' && c.discovery_channels.startsWith('[') ? JSON.parse(c.discovery_channels) : [])).map((channel: string) => (
                  <span key={channel} className="px-2.5 py-1.5 rounded-xl bg-surface-container border border-outline-variant/30 flex items-center justify-center">
                    <span className="material-symbols-outlined text-sm text-outline" title={channel}>
                      {channel === 'instagram' ? 'photo_camera' : channel === 'youtube' ? 'play_circle' : 'music_note'}
                    </span>
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-3 text-xs text-on-surface-variant pt-4 border-t border-surface-container mt-auto">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-primary font-bold">group</span>
                  <span className="font-bold text-on-surface">{c.lead_count ?? 0} Leads</span>
                </div>
                <span className="text-outline/40">•</span>
                <span className="font-medium">{new Date(c.created_at).toLocaleDateString()}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Campaign Creation Modal */}
      {showForm && (
        <CampaignForm onSubmit={handleCreate} onClose={() => setShowForm(false)} loading={creating} />
      )}

      {/* Template Management Modal */}
      {campaignForTemplate && (
        <TemplateEditor 
          campaignId={campaignForTemplate.id} 
          campaignName={campaignForTemplate.name}
          onClose={() => setCampaignForTemplate(null)}
        />
      )}
    </div>
  )
}
