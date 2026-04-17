import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import CampaignForm from '../components/CampaignForm'
import {
  approvePartner,
  bookMeeting,
  getCampaignById,
  getCampaignLeads,
  reviewLead,
  sendCampaignOutreach,
  triggerDiscovery,
  updateCampaign,
} from '../lib/api'
import type { Campaign, CampaignFormData, Creator, CreatorScoreDetails, Meeting, MessagePreview, OutreachLog } from '../types'

interface ActivityItem {
  id: string
  leadId: string
  handle: string
  kind: 'reply' | 'outreach'
  title: string
  subtitle: string
  occurredAt: number
  preview: MessagePreview
  toneClass: string
}

function normalizeHandle(handle: string): string {
  return handle.replace(/^@+/, '').trim()
}

function getInstagramUrl(handle: string): string {
  return `https://www.instagram.com/${normalizeHandle(handle)}/`
}

function getYoutubeUrl(handle: string): string {
  return `https://www.youtube.com/@${normalizeHandle(handle)}`
}

function scoreTone(score: number): string {
  if (score >= 70) return 'border-secondary/20 bg-secondary/5 text-secondary'
  if (score >= 40) return 'border-primary/20 bg-primary/5 text-primary'
  if (score >= 20) return 'border-tertiary/20 bg-tertiary/5 text-tertiary'
  return 'border-error/20 bg-error-container/40 text-error'
}

function hasSentOutreach(lead: Creator): boolean {
  return lead.outreach_logs?.some((log) => log.delivery_status === 'sent') ?? false
}

function getLatestMeeting(lead: Creator): Meeting | null {
  if (!lead.meetings?.length) return null

  return [...lead.meetings].sort(
    (a, b) => new Date(b.meeting_date || b.created_at).getTime() - new Date(a.meeting_date || a.created_at).getTime(),
  )[0]
}

function getPlatformSummary(lead: Creator): string {
  const platforms = []

  if (lead.has_instagram) platforms.push('Instagram')
  if (lead.has_youtube) platforms.push('YouTube')
  if (lead.has_tiktok) platforms.push('TikTok')

  return platforms.length > 0 ? platforms.join(', ') : 'No platforms available'
}

function getCampaignKeywords(keywords?: Campaign['keywords']): string[] {
  if (Array.isArray(keywords)) return keywords
  if (typeof keywords !== 'string') return []

  return keywords
    .split(',')
    .map((keyword) => keyword.trim())
    .filter(Boolean)
}

function getLeadStage(lead: Creator): { label: string; tone: string; priority: number; nextAction: string } {
  const latestMeeting = getLatestMeeting(lead)
  const hasReply = Boolean(lead.conversation?.latest_inbound_message)
  const contacted = hasSentOutreach(lead)

  if (lead.affiliate) {
    return {
      label: 'Converted',
      tone: 'status-chip border-secondary/20 bg-secondary/5 text-secondary',
      priority: 6,
      nextAction: 'Monitor affiliate performance',
    }
  }

  if (latestMeeting?.outcome === 'pending') {
    return {
      label: 'Awaiting approval',
      tone: 'status-chip border-tertiary/20 bg-tertiary/5 text-tertiary',
      priority: 4,
      nextAction: 'Review the meeting outcome',
    }
  }

  if (hasReply && lead.conversation?.detected_intent === 'interested') {
    return {
      label: 'Interested',
      tone: 'status-chip border-secondary/20 bg-secondary/5 text-secondary',
      priority: 2,
      nextAction: latestMeeting ? 'Meeting already booked' : 'Book a meeting',
    }
  }

  if (hasReply) {
    return {
      label: 'Replied',
      tone: 'status-chip border-primary/20 bg-primary/5 text-primary',
      priority: 3,
      nextAction: 'Review the latest reply',
    }
  }

  if (contacted) {
    return {
      label: 'Contacted',
      tone: 'status-chip border-primary/20 bg-primary/5 text-primary',
      priority: 3,
      nextAction: 'Wait for a reply',
    }
  }

  if (lead.review_status === 'approved') {
    return {
      label: 'Approved',
      tone: 'status-chip border-secondary/20 bg-secondary/5 text-secondary',
      priority: lead.email ? 1 : 2,
      nextAction: lead.email ? 'Ready for outreach' : 'Missing email',
    }
  }

  if (lead.review_status === 'rejected') {
    return {
      label: 'Rejected',
      tone: 'status-chip border-error/20 bg-error-container/40 text-error',
      priority: 5,
      nextAction: 'No further action required',
    }
  }

  return {
    label: 'Pending review',
    tone: 'status-chip border-outline-variant bg-surface-container-low text-on-surface-variant',
    priority: 0,
    nextAction: 'Approve or reject this lead',
  }
}

function getLeadPriority(lead: Creator): number {
  return getLeadStage(lead).priority
}

function getScoreDetails(lead: Creator): Array<[string, CreatorScoreDetails]> {
  return Object.entries(lead.scoring_notes?.initial_breakdown || {}) as Array<[string, CreatorScoreDetails]>
}

function getActivityItems(leads: Creator[]): ActivityItem[] {
  const items: ActivityItem[] = []

  leads.forEach((lead) => {
    if (lead.conversation?.latest_inbound_message) {
      items.push({
        id: `reply-${lead.id}`,
        leadId: lead.id,
        handle: lead.handle,
        kind: 'reply',
        title: `Reply from @${lead.handle}`,
        subtitle: lead.conversation.detected_intent ? `Intent: ${lead.conversation.detected_intent.replace(/_/g, ' ')}` : 'Inbound message received',
        occurredAt: lead.conversation.latest_inbound_at ? new Date(lead.conversation.latest_inbound_at).getTime() : 0,
        preview: {
          channel: 'email',
          delivery_status: 'received',
          subject_line: 'Inbound reply',
          message_content: lead.conversation.latest_inbound_message,
        },
        toneClass: 'border-secondary/20 bg-secondary/5 text-secondary',
      })
    }

    lead.outreach_logs?.forEach((log: OutreachLog) => {
      items.push({
        id: log.id,
        leadId: lead.id,
        handle: lead.handle,
        kind: 'outreach',
        title: `${log.channel} update for @${lead.handle}`,
        subtitle: `Delivery status: ${log.delivery_status.replace(/_/g, ' ')}`,
        occurredAt: new Date(log.sent_at || log.created_at).getTime(),
        preview: {
          channel: log.channel,
          delivery_status: log.delivery_status,
          subject_line: log.subject_line,
          message_content: log.message_content || null,
        },
        toneClass: log.delivery_status === 'sent' ? 'border-primary/20 bg-primary/5 text-primary' : 'border-error/20 bg-error-container/40 text-error',
      })
    })
  })

  return items.sort((a, b) => b.occurredAt - a.occurredAt)
}

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [leads, setLeads] = useState<Creator[]>([])
  const [loading, setLoading] = useState(true)
  const [discovering, setDiscovering] = useState(false)
  const [outreaching, setOutreaching] = useState(false)
  const [expandedLead, setExpandedLead] = useState<string | null>(null)
  const [meetingModal, setMeetingModal] = useState<string | null>(null)
  const [meetingDate, setMeetingDate] = useState('')
  const [meetingNotes, setMeetingNotes] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [toast, setToast] = useState('')
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const campaignKeywords = useMemo(() => getCampaignKeywords(campaign?.keywords), [campaign?.keywords])

  const showToast = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 4000)
  }

  const loadData = useCallback(async () => {
    if (!id) return

    try {
      setLoading(true)
      const [campaignData, leadData] = await Promise.all([getCampaignById(id), getCampaignLeads(id)])
      setCampaign(campaignData)
      setLeads(leadData)
    } catch (err) {
      console.error('Failed to load campaign data:', err)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadData()
  }, [loadData])

  const reviewQueue = [...leads].sort(
    (a, b) => getLeadPriority(a) - getLeadPriority(b) || (Number(b.outreach_readiness_score) || 0) - (Number(a.outreach_readiness_score) || 0),
  )
  const approvedLeads = leads.filter((lead) => lead.review_status === 'approved')
  const approvedReadyForOutreach = approvedLeads.filter((lead) => lead.email && !hasSentOutreach(lead))
  const interestedAwaitingMeeting = leads.filter(
    (lead) => lead.conversation?.detected_intent === 'interested' && !getLatestMeeting(lead) && !lead.affiliate,
  )
  const activityItems = getActivityItems(leads)
  const selectedActivity = activityItems.find((item) => item.id === selectedActivityId) || activityItems[0] || null
  const needsBooking = interestedAwaitingMeeting
  const awaitingApproval = leads.filter((lead) => {
    const meeting = getLatestMeeting(lead)
    return Boolean(meeting && meeting.outcome === 'pending' && !lead.affiliate)
  })
  const converted = leads.filter((lead) => Boolean(lead.affiliate))

  useEffect(() => {
    if (!selectedActivityId && activityItems.length > 0) {
      setSelectedActivityId(activityItems[0].id)
      return
    }

    if (selectedActivityId && !activityItems.some((item) => item.id === selectedActivityId)) {
      setSelectedActivityId(activityItems[0]?.id || null)
    }
  }, [activityItems, selectedActivityId])

  const handleDiscover = async () => {
    if (!campaign || !id) return

    setDiscovering(true)
    try {
      await triggerDiscovery(campaign.category, campaign.city, id, campaignKeywords)
      showToast('Discovery started. Refreshing lead data shortly.')
      window.setTimeout(() => loadData(), 5000)
    } catch (err) {
      console.error('Discovery failed:', err)
      showToast('Discovery could not be started.')
    } finally {
      setDiscovering(false)
    }
  }

  const handleReview = async (creatorId: string, action: 'approve' | 'reject') => {
    setActionLoading(true)
    try {
      await reviewLead(creatorId, action)
      showToast(action === 'approve' ? 'Lead approved for outreach.' : 'Lead rejected.')
      await loadData()
    } catch (err) {
      console.error('Review failed:', err)
      showToast('Lead review failed.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleOutreach = async () => {
    if (!id) return

    setOutreaching(true)
    try {
      const stats = await sendCampaignOutreach(id)
      showToast(`Outreach finished. Sent ${stats.sent}. Failed ${stats.failed}.`)
      await loadData()
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Outreach failed.')
    } finally {
      setOutreaching(false)
    }
  }

  const handleBookMeeting = async (creatorId: string) => {
    if (!id || !meetingDate) return

    setActionLoading(true)
    try {
      await bookMeeting(creatorId, id, meetingDate, meetingNotes)
      setMeetingModal(null)
      setMeetingDate('')
      setMeetingNotes('')
      showToast('Meeting booked.')
      await loadData()
    } catch (err) {
      console.error('Meeting booking failed:', err)
      showToast('Meeting booking failed.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleApprove = async (meetingId: string) => {
    setActionLoading(true)
    try {
      await approvePartner(meetingId)
      showToast('Partner approved.')
      await loadData()
    } catch (err) {
      console.error('Approval failed:', err)
      showToast('Partner approval failed.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleUpdateCampaign = async (data: CampaignFormData) => {
    if (!id) return

    try {
      setActionLoading(true)
      const updated = await updateCampaign(id, data)
      setCampaign(updated)
      setEditOpen(false)
      showToast('Campaign updated.')
      await loadData()
    } catch (err) {
      console.error('Campaign update failed:', err)
      showToast('Campaign update failed.')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="page-shell">
        <div className="panel flex items-center justify-center px-4 py-16 text-on-surface-variant">
          <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
        </div>
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="page-shell">
        <div className="panel flex flex-col items-center justify-center px-4 py-16 text-center">
          <h1 className="section-title">Campaign not found</h1>
          <button onClick={() => navigate('/')} className="btn-secondary mt-4">
            Back to campaigns
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page-shell pb-24 md:pb-8">
      {toast && (
        <div className="fixed right-4 top-4 z-[100] rounded-lg border border-outline-variant/60 bg-surface-container-lowest px-4 py-3 text-sm text-on-surface shadow-sm">
          {toast}
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="sticky top-20 space-y-4">
            <div className="panel p-3">
              <div className="mb-2 text-sm font-medium text-on-surface">Campaign sections</div>
              <div className="space-y-1.5">
                <button onClick={() => scrollToSection('campaign-overview')} className="btn-ghost w-full justify-start !items-start text-left leading-snug">
                  Overview
                </button>
                <button onClick={() => scrollToSection('review-queue')} className="btn-ghost w-full justify-start !items-start text-left leading-snug">
                  Review queue
                </button>
                <button onClick={() => scrollToSection('outreach-activity')} className="btn-ghost w-full justify-start !items-start text-left leading-snug">
                  Outreach activity
                </button>
                <button onClick={() => scrollToSection('meetings-conversions')} className="btn-ghost w-full justify-start !items-start text-left leading-snug">
                  Meetings and conversions
                </button>
              </div>
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <section id="campaign-overview" className="mb-6">
            <div className="mb-6 flex flex-col gap-4 border-b border-outline-variant/60 pb-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <button onClick={() => navigate('/')} className="btn-ghost mb-3 px-0 py-0 text-on-surface-variant">
                  <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                  Back to campaigns
                </button>

                <h1 className="page-title">{campaign.name}</h1>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="status-chip border-primary/20 bg-primary/5 text-primary">{campaign.status}</span>
                  <span className="status-chip border-outline-variant bg-surface-container-low text-on-surface">{campaign.category}</span>
                  <span className="status-chip border-outline-variant bg-surface-container-low text-on-surface">{campaign.city}</span>
                  {campaignKeywords.map((keyword) => (
                    <span key={keyword} className="status-chip border-primary/10 bg-primary/5 text-primary">
                      {keyword}
                    </span>
                  ))}
                </div>
                <p className="section-copy mt-3 max-w-3xl">
                  {approvedReadyForOutreach.length > 0
                    ? `${approvedReadyForOutreach.length} approved leads are ready for outreach.`
                    : reviewQueue.length > 0
                      ? `${reviewQueue.filter((lead) => getLeadStage(lead).label === 'Pending review').length} leads still need review.`
                      : 'No leads have been added to this campaign yet.'}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button onClick={() => setEditOpen(true)} className="btn-secondary">
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                  Edit campaign
                </button>
                <button onClick={handleDiscover} disabled={discovering} className="btn-secondary border-primary/20 bg-primary/5 text-primary hover:bg-primary/10">
                  <span className="material-symbols-outlined text-[18px]">{discovering ? 'progress_activity' : 'search'}</span>
                  {discovering ? 'Starting discovery' : 'Run discovery again'}
                </button>
                {approvedReadyForOutreach.length > 0 && (
                  <button onClick={handleOutreach} disabled={outreaching} className="btn-primary">
                    <span className="material-symbols-outlined text-[18px]">{outreaching ? 'progress_activity' : 'send'}</span>
                    {outreaching ? 'Sending outreach' : 'Send outreach'}
                  </button>
                )}
              </div>
            </div>

            <div className="panel p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="section-title">Next actions</h2>
                  <p className="section-copy mt-1">These counts reflect the queues that currently need operator attention.</p>
                </div>
              </div>
              <div className="grid gap-3 lg:grid-cols-3">
                <div className="panel-muted px-4 py-4">
                  <div className="text-sm font-medium text-on-surface">Review queue</div>
                  <div className="mt-1 text-2xl font-semibold text-on-surface">
                    {reviewQueue.filter((lead) => getLeadStage(lead).label === 'Pending review').length}
                  </div>
                  <p className="mt-2 text-sm text-on-surface-variant">Leads still waiting for an approve or reject decision.</p>
                  <button onClick={() => scrollToSection('review-queue')} className="btn-ghost mt-3 px-0">
                    Open review queue
                  </button>
                </div>

                <div className="panel-muted px-4 py-4">
                  <div className="text-sm font-medium text-on-surface">Ready for outreach</div>
                  <div className="mt-1 text-2xl font-semibold text-on-surface">{approvedReadyForOutreach.length}</div>
                  <p className="mt-2 text-sm text-on-surface-variant">Approved leads with an email address and no sent outreach yet.</p>
                  <button onClick={() => scrollToSection('outreach-activity')} className="btn-ghost mt-3 px-0">
                    Review outreach activity
                  </button>
                </div>

                <div className="panel-muted px-4 py-4">
                  <div className="text-sm font-medium text-on-surface">Need meeting follow-up</div>
                  <div className="mt-1 text-2xl font-semibold text-on-surface">{needsBooking.length + awaitingApproval.length}</div>
                  <p className="mt-2 text-sm text-on-surface-variant">Interested leads without a meeting plus meetings waiting for approval.</p>
                  <button onClick={() => scrollToSection('meetings-conversions')} className="btn-ghost mt-3 px-0">
                    Open meetings queue
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section id="review-queue" className="mb-6">
            <div className="mb-3">
              <h2 className="section-title">Review queue</h2>
              <p className="section-copy mt-1">Prioritized for action first: pending review, ready for outreach, reply follow-up, then completed outcomes.</p>
            </div>

            {reviewQueue.length === 0 ? (
              <div className="panel p-6">
                <p className="section-copy">No leads have been loaded for this campaign yet.</p>
              </div>
            ) : (
              <div className="panel overflow-hidden">
                <div className="hidden grid-cols-[minmax(0,2fr)_110px_170px_220px_170px_40px] gap-3 border-b border-outline-variant/60 px-4 py-3 md:grid">
                  <div className="table-header">Creator</div>
                  <div className="table-header">Score</div>
                  <div className="table-header">Pipeline</div>
                  <div className="table-header">Contact</div>
                  <div className="table-header">Next action</div>
                  <div className="table-header text-right">More</div>
                </div>

                {reviewQueue.map((lead) => {
                  const score = Number(lead.outreach_readiness_score) || 0
                  const stage = getLeadStage(lead)
                  const latestReply = lead.conversation?.latest_inbound_message
                  const details = getScoreDetails(lead)
                  const isExpanded = expandedLead === lead.id

                  return (
                    <div key={lead.id} className="border-b border-outline-variant/60 last:border-b-0">
                      <div className="grid gap-3 px-4 py-4 md:grid-cols-[minmax(0,2fr)_110px_170px_220px_170px_40px] md:items-center">
                        <div className="min-w-0">
                          <div className="flex items-start justify-between gap-3 md:block">
                            <div>
                              <div className="truncate text-sm font-medium text-on-surface">@{lead.handle}</div>
                              <div className="mt-1 text-sm text-on-surface-variant">
                                {lead.full_name || 'No full name'}
                                {lead.city && <span className="text-outline"> · {lead.city}</span>}
                              </div>
                            </div>

                            <div className="md:hidden">
                              <span className={stage.tone}>{stage.label}</span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <div className={`inline-flex rounded-md border px-2.5 py-1 text-sm font-medium ${scoreTone(score)}`}>{Math.round(score)}</div>
                        </div>

                        <div className="hidden md:block">
                          <span className={stage.tone}>{stage.label}</span>
                        </div>

                        <div className="text-sm text-on-surface-variant">
                          {lead.email ? <div className="truncate text-on-surface">{lead.email}</div> : <div>No email</div>}
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            {lead.has_instagram && (
                              <a
                                href={getInstagramUrl(lead.handle)}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#b42372] transition hover:bg-[#fff1f7]"
                                aria-label={`Open Instagram for ${lead.handle}`}
                                title="Open Instagram"
                              >
                                <span className="material-symbols-outlined text-[16px]">photo_camera</span>
                              </a>
                            )}
                            {lead.has_youtube && (
                              <a
                                href={getYoutubeUrl(lead.handle)}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#c62828] transition hover:bg-[#fff1f1]"
                                aria-label={`Open YouTube for ${lead.handle}`}
                                title="Open YouTube"
                              >
                                <span className="material-symbols-outlined text-[16px]">play_circle</span>
                              </a>
                            )}
                            {!lead.has_instagram && !lead.has_youtube && <span className="text-xs">No linked channels</span>}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 md:block">
                          <div className="text-sm text-on-surface">{stage.nextAction}</div>
                          {lead.review_status !== 'approved' && lead.review_status !== 'rejected' && (
                            <div className="mt-2 flex gap-2">
                              <button
                                onClick={() => handleReview(lead.id, 'approve')}
                                disabled={actionLoading}
                                className="inline-flex items-center justify-center rounded-lg border border-secondary/20 bg-secondary/5 px-2.5 py-2 text-xs font-medium text-secondary transition hover:bg-secondary/10 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleReview(lead.id, 'reject')}
                                disabled={actionLoading}
                                className="inline-flex items-center justify-center rounded-lg border border-error/20 bg-error-container/40 px-2.5 py-2 text-xs font-medium text-error transition hover:bg-error-container/70 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="flex justify-end">
                          <button
                            onClick={() => setExpandedLead(isExpanded ? null : lead.id)}
                            className="btn-ghost px-2"
                            aria-label={isExpanded ? 'Collapse lead details' : 'Expand lead details'}
                          >
                            <span className={`material-symbols-outlined text-[18px] transition-transform ${isExpanded ? 'rotate-180' : ''}`}>expand_more</span>
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="bg-surface-container-low px-4 py-4">
                          <div className="grid gap-4 lg:grid-cols-3">
                            <div className="panel px-4 py-4">
                              <div className="mb-3 text-sm font-medium text-on-surface">Assessment</div>
                              {details.length > 0 ? (
                                <div className="space-y-3">
                                  {details.map(([label, breakdown]) => (
                                    <div key={label} className="rounded-lg border border-outline-variant/50 bg-surface-container-low px-3 py-3">
                                      <div className="flex items-center justify-between gap-3 text-sm">
                                        <span className="font-medium capitalize text-on-surface">{label}</span>
                                        <span className="text-on-surface-variant">{breakdown.score || 0}</span>
                                      </div>
                                      {breakdown.breakdown && (
                                        <div className="mt-2 space-y-1 text-xs text-on-surface-variant">
                                          {Object.entries(breakdown.breakdown).map(([key, value]) => (
                                            <div key={key} className="flex items-center justify-between gap-3">
                                              <span>{key.replace(/_/g, ' ')}</span>
                                              <span>{value}</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-on-surface-variant">No detailed score breakdown is available for this lead.</p>
                              )}
                            </div>

                            <div className="panel px-4 py-4">
                              <div className="mb-3 text-sm font-medium text-on-surface">Contact</div>
                              <div className="space-y-2 text-sm">
                                <div>
                                  <div className="text-on-surface-variant">Email</div>
                                  <div className="mt-1 text-on-surface">{lead.email || 'No email available'}</div>
                                </div>
                                <div>
                                  <div className="text-on-surface-variant">Category</div>
                                  <div className="mt-1 text-on-surface">{lead.category || 'Unknown'}</div>
                                </div>
                                <div>
                                  <div className="text-on-surface-variant">Platforms</div>
                                  <div className="mt-1 text-on-surface">{getPlatformSummary(lead)}</div>
                                </div>
                              </div>
                            </div>

                            <div className="panel px-4 py-4">
                              <div className="mb-3 text-sm font-medium text-on-surface">Recent context</div>
                              {latestReply ? (
                                <div className="rounded-lg border border-outline-variant/50 bg-surface-container-low px-3 py-3 text-sm text-on-surface">
                                  <div className="mb-2 text-xs text-on-surface-variant">Latest reply</div>
                                  <div className="whitespace-pre-wrap">{latestReply}</div>
                                </div>
                              ) : (
                                <p className="text-sm text-on-surface-variant">No inbound reply has been recorded for this lead.</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          <section id="outreach-activity" className="mb-6">
            <div className="mb-3">
              <h2 className="section-title">Outreach activity</h2>
              <p className="section-copy mt-1">Recent outbound updates and replies, with inline preview for fast inspection.</p>
            </div>

            {activityItems.length === 0 ? (
              <div className="panel p-6">
                <p className="section-copy">No outreach activity has been recorded yet.</p>
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                <div className="panel overflow-hidden">
                  {activityItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedActivityId(item.id)}
                      className={`flex w-full items-start justify-between gap-3 border-b border-outline-variant/60 px-4 py-4 text-left last:border-b-0 ${
                        selectedActivity?.id === item.id ? 'bg-surface-container-low' : 'hover:bg-surface-container-low'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-on-surface">{item.title}</div>
                        <div className="mt-1 text-sm text-on-surface-variant">{item.subtitle}</div>
                        <div className="mt-1 text-xs text-on-surface-variant">{new Date(item.occurredAt).toLocaleString()}</div>
                      </div>
                      <span className={`status-chip shrink-0 ${item.toneClass}`}>{item.kind === 'reply' ? 'Reply' : 'Outreach'}</span>
                    </button>
                  ))}
                </div>

                <div className="panel p-4">
                  <div className="mb-3">
                    <h3 className="text-sm font-medium text-on-surface">{selectedActivity ? `Preview for @${selectedActivity.handle}` : 'Preview'}</h3>
                    <p className="section-copy mt-1">
                      {selectedActivity ? `${selectedActivity.preview.channel} · ${selectedActivity.preview.delivery_status}` : 'Select an activity item to inspect.'}
                    </p>
                  </div>

                  {selectedActivity ? (
                    <div className="space-y-4">
                      <div>
                        <div className="mb-1 text-xs text-on-surface-variant">Subject</div>
                        <div className="rounded-lg border border-outline-variant/50 bg-surface-container-low px-3 py-3 text-sm text-on-surface">
                          {selectedActivity.preview.subject_line || 'No subject'}
                        </div>
                      </div>

                      <div>
                        <div className="mb-1 text-xs text-on-surface-variant">Message</div>
                        <div className="min-h-[220px] rounded-lg border border-outline-variant/50 bg-surface-container-low px-3 py-3 text-sm text-on-surface">
                          <div className="whitespace-pre-wrap">
                            {selectedActivity.preview.message_content || 'No message preview available for this activity.'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-outline-variant/50 bg-surface-container-low px-4 py-10 text-sm text-on-surface-variant">
                      There is no message content to preview yet.
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

          <section id="meetings-conversions" className="mb-6 w-full">
            <div className="mb-3">
              <h2 className="section-title">Meetings and conversions</h2>
              <p className="section-copy mt-1">Queues for booking, approvals, and affiliate outcomes.</p>
            </div>

            <div className="grid w-full gap-4 xl:grid-cols-3">
              <div className="panel p-4">
                <div className="mb-3">
                  <h3 className="text-sm font-medium text-on-surface">Needs booking</h3>
                  <p className="section-copy mt-1">Interested leads without a meeting.</p>
                </div>

                {needsBooking.length === 0 ? (
                  <p className="text-sm text-on-surface-variant">No leads are currently waiting for a meeting to be booked.</p>
                ) : (
                  <div className="space-y-3">
                    {needsBooking.map((lead) => (
                      <div key={lead.id} className="panel-muted px-3 py-3">
                        <div className="text-sm font-medium text-on-surface">@{lead.handle}</div>
                        <div className="mt-1 text-sm text-on-surface-variant">{lead.email || 'No email available'}</div>
                        <button onClick={() => setMeetingModal(lead.id)} className="btn-secondary mt-3 w-full border-secondary/20 bg-secondary/5 text-secondary hover:bg-secondary/10">
                          Book meeting
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="panel p-4">
                <div className="mb-3">
                  <h3 className="text-sm font-medium text-on-surface">Awaiting approval</h3>
                  <p className="section-copy mt-1">Meetings that need a final partner decision.</p>
                </div>

                {awaitingApproval.length === 0 ? (
                  <p className="text-sm text-on-surface-variant">No meeting approvals are pending.</p>
                ) : (
                  <div className="space-y-3">
                    {awaitingApproval.map((lead) => {
                      const meeting = getLatestMeeting(lead)

                      if (!meeting) return null

                      return (
                        <div key={lead.id} className="panel-muted px-3 py-3">
                          <div className="text-sm font-medium text-on-surface">@{lead.handle}</div>
                          <div className="mt-1 text-sm text-on-surface-variant">Meeting date {new Date(meeting.meeting_date).toLocaleDateString()}</div>
                          <button onClick={() => handleApprove(meeting.id)} disabled={actionLoading} className="btn-primary mt-3 w-full bg-secondary hover:bg-[#005c20]">
                            Approve partner
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="panel p-4">
                <div className="mb-3">
                  <h3 className="text-sm font-medium text-on-surface">Converted</h3>
                  <p className="section-copy mt-1">Affiliate partners already approved and active.</p>
                </div>

                {converted.length === 0 ? (
                  <p className="text-sm text-on-surface-variant">No affiliate partners have been created yet.</p>
                ) : (
                  <div className="space-y-3">
                    {converted.map((lead) => (
                      <div key={lead.id} className="panel-muted px-3 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-medium text-on-surface">@{lead.handle}</div>
                            <div className="mt-1 text-sm text-on-surface-variant">{lead.affiliate?.promo_code}</div>
                          </div>
                          <span className="status-chip border-secondary/20 bg-secondary/5 text-secondary">{lead.affiliate?.total_conversions || 0} conversions</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      {meetingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" onClick={() => setMeetingModal(null)}>
          <div className="panel w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-outline-variant/60 px-5 py-4">
              <h3 className="section-title">Book meeting</h3>
              <p className="section-copy mt-1">Add the first scheduled meeting for this lead.</p>
            </div>

            <div className="space-y-4 p-5">
              <div>
                <label className="field-label">Date and time</label>
                <input type="datetime-local" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} className="input-control" required />
              </div>

              <div>
                <label className="field-label">Notes</label>
                <textarea
                  value={meetingNotes}
                  onChange={(e) => setMeetingNotes(e.target.value)}
                  className="textarea-control"
                  rows={4}
                  placeholder="Agenda, availability, or prep notes"
                />
              </div>

              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                <button onClick={() => setMeetingModal(null)} className="btn-secondary">
                  Cancel
                </button>
                <button onClick={() => handleBookMeeting(meetingModal)} disabled={actionLoading || !meetingDate} className="btn-primary bg-secondary hover:bg-[#005c20]">
                  {actionLoading ? 'Booking meeting' : 'Book meeting'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editOpen && <CampaignForm mode="edit" initialData={campaign} onSubmit={handleUpdateCampaign} onClose={() => setEditOpen(false)} loading={actionLoading} />}
    </div>
  )
}
