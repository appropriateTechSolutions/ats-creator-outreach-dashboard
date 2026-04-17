import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Campaign, CampaignFormData } from '../types'
import { createCampaign, getCampaigns, triggerDiscovery } from '../lib/api'
import CampaignForm from '../components/CampaignForm'
import TemplateEditor from '../components/TemplateEditor'

type CampaignSortMode = 'active' | 'recent' | 'name' | 'leads'
type CampaignFilterMode = 'all' | Campaign['status']

const statusTone: Record<Campaign['status'], string> = {
  draft: 'status-chip border-outline-variant bg-surface-container-low text-on-surface-variant',
  active: 'status-chip border-primary/20 bg-primary/5 text-primary',
  paused: 'status-chip border-tertiary/20 bg-tertiary/5 text-tertiary',
  completed: 'status-chip border-secondary/20 bg-secondary/5 text-secondary',
  archived: 'status-chip border-outline-variant bg-surface-container-low text-on-surface-variant',
}

function getDiscoveryChannels(channels: Campaign['discovery_channels']): string[] {
  if (Array.isArray(channels)) return channels
  if (typeof channels !== 'string') return []

  try {
    const parsed = JSON.parse(channels) as unknown
    return Array.isArray(parsed) ? parsed.filter((channel): channel is string => typeof channel === 'string') : []
  } catch {
    return []
  }
}

function formatCampaignDate(value?: string): string {
  if (!value) return 'Date unavailable'

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Date unavailable'

  return parsed.toLocaleDateString()
}

function getStatusRank(status: Campaign['status']): number {
  switch (status) {
    case 'active':
      return 0
    case 'draft':
      return 1
    case 'paused':
      return 2
    case 'completed':
      return 3
    case 'archived':
      return 4
    default:
      return 5
  }
}

function getCampaignActionLabel(campaign: Campaign): string {
  if (campaign.status === 'draft') return 'Finish setup'
  if ((campaign.lead_count ?? 0) === 0) return 'Run discovery'
  if (campaign.status === 'paused') return 'Resume review'
  if (campaign.status === 'completed') return 'Audit outcomes'
  if (campaign.status === 'archived') return 'Reference only'
  return 'Review leads'
}

function getCampaignSummary(campaign: Campaign): string {
  if (campaign.status === 'draft') return 'Campaign is still in setup.'
  if ((campaign.lead_count ?? 0) === 0) return 'No leads have been added yet.'
  return `${campaign.lead_count ?? 0} leads currently attached to this campaign.`
}

function compareCampaigns(a: Campaign, b: Campaign, mode: CampaignSortMode): number {
  if (mode === 'recent') {
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  }

  if (mode === 'name') {
    return a.name.localeCompare(b.name)
  }

  if (mode === 'leads') {
    return (b.lead_count ?? 0) - (a.lead_count ?? 0) || new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  }

  return getStatusRank(a.status) - getStatusRank(b.status) || new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
}

export default function Campaigns() {
  const navigate = useNavigate()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [campaignForTemplate, setCampaignForTemplate] = useState<Campaign | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<CampaignFilterMode>('all')
  const [sortMode, setSortMode] = useState<CampaignSortMode>('active')

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

  const handleCreate = async (data: CampaignFormData) => {
    try {
      setCreating(true)
      const campaign = await createCampaign(data)
      triggerDiscovery(data.category, data.city, campaign.id, data.keywords).catch(console.error)
      setShowForm(false)
      navigate(`/campaigns/${campaign.id}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create campaign')
    } finally {
      setCreating(false)
    }
  }

  const normalizedSearch = search.trim().toLowerCase()
  const visibleCampaigns = campaigns
    .filter((campaign) => statusFilter === 'all' || campaign.status === statusFilter)
    .filter((campaign) => {
      if (!normalizedSearch) return true

      return [campaign.name, campaign.client_name, campaign.city, campaign.category].some((value) =>
        (value || '').toLowerCase().includes(normalizedSearch),
      )
    })
    .sort((a, b) => compareCampaigns(a, b, sortMode))

  return (
    <div className="page-shell pb-24 md:pb-8">
      <div className="mb-6 flex flex-col gap-4 border-b border-outline-variant/60 pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="page-title">Campaigns</h1>
          <p className="section-copy mt-1">Review active work, identify stalled campaigns, and jump into the next queue quickly.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary self-start">
          <span className="material-symbols-outlined text-[18px]">add</span>
          New campaign
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-error/20 bg-error-container/40 px-4 py-3 text-sm text-error">
          <div className="flex items-center justify-between gap-3">
            <span>{error}</span>
            <button onClick={() => setError('')} className="btn-ghost px-0 py-0 text-error hover:bg-transparent">
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="panel mb-5 p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1.6fr)_180px_180px]">
          <div>
            <label className="field-label">Search</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-control"
              placeholder="Search name, client, city, or category"
            />
          </div>
          <div>
            <label className="field-label">Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as CampaignFilterMode)} className="select-control">
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div>
            <label className="field-label">Sort</label>
            <select value={sortMode} onChange={(e) => setSortMode(e.target.value as CampaignSortMode)} className="select-control">
              <option value="active">Operational priority</option>
              <option value="recent">Recently updated</option>
              <option value="leads">Most leads</option>
              <option value="name">Name</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="panel flex items-center justify-center px-4 py-16 text-on-surface-variant">
          <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
        </div>
      ) : visibleCampaigns.length === 0 ? (
        <div className="panel p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-outline-variant/60 bg-surface-container-low text-on-surface-variant">
            <span className="material-symbols-outlined text-[20px]">campaign</span>
          </div>
          <h2 className="section-title">No campaigns match the current view</h2>
          <p className="section-copy mt-2">
            {campaigns.length === 0 ? 'Create a campaign to start discovery and review work.' : 'Adjust the search or filters to broaden the result set.'}
          </p>
          {campaigns.length === 0 && (
            <button onClick={() => setShowForm(true)} className="btn-primary mt-5">
              <span className="material-symbols-outlined text-[18px]">add</span>
              Create campaign
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visibleCampaigns.map((campaign) => {
            const channels = getDiscoveryChannels(campaign.discovery_channels)

            return (
              <div
                key={campaign.id}
                onClick={() => navigate(`/campaigns/${campaign.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    navigate(`/campaigns/${campaign.id}`)
                  }
                }}
                role="button"
                tabIndex={0}
                className="panel flex h-full cursor-pointer flex-col gap-4 p-4 text-left transition hover:border-primary/30 hover:bg-surface-container-low"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className={statusTone[campaign.status]}>{campaign.status}</div>
                    <h2 className="mt-3 line-clamp-2 text-base font-semibold text-on-surface">{campaign.name}</h2>
                    <div className="mt-1 text-sm text-on-surface-variant">
                      {campaign.client_name || campaign.city}
                      {campaign.client_name && <span className="text-outline"> · {campaign.city}</span>}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setCampaignForTemplate(campaign)
                    }}
                    className="btn-ghost shrink-0"
                    title="Edit outreach template"
                  >
                    <span className="material-symbols-outlined text-[18px]">mail</span>
                  </button>
                </div>

                <div className="panel-muted grid gap-3 px-3 py-3 text-sm md:grid-cols-2">
                  <div>
                    <div className="text-xs text-on-surface-variant">Next step</div>
                    <div className="mt-1 font-medium text-on-surface">{getCampaignActionLabel(campaign)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-on-surface-variant">Lead count</div>
                    <div className="mt-1 font-medium text-on-surface">{campaign.lead_count ?? 0}</div>
                  </div>
                </div>

                <p className="text-sm text-on-surface-variant">{getCampaignSummary(campaign)}</p>

                <div className="flex flex-wrap gap-2 text-xs text-on-surface-variant">
                  <span>{campaign.category}</span>
                  <span className="text-outline">•</span>
                  <span>{channels.length > 0 ? `${channels.length} platform${channels.length > 1 ? 's' : ''}` : 'No platforms set'}</span>
                  <span className="text-outline">•</span>
                  <span>Updated {formatCampaignDate(campaign.updated_at || campaign.created_at)}</span>
                </div>

                <div className="mt-auto flex items-center justify-between border-t border-outline-variant/50 pt-3">
                  <span className="text-sm font-medium text-primary">Open campaign</span>
                  <span className="material-symbols-outlined text-[18px] text-on-surface-variant">arrow_forward</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && <CampaignForm onSubmit={handleCreate} onClose={() => setShowForm(false)} loading={creating} />}

      {campaignForTemplate && (
        <TemplateEditor campaignId={campaignForTemplate.id} campaignName={campaignForTemplate.name} onClose={() => setCampaignForTemplate(null)} />
      )}
    </div>
  )
}
