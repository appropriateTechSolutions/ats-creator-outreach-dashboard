import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import type { Campaign, Creator } from '../types'
import { getCampaignById, getCampaignLeads, triggerDiscovery, bookMeeting, approvePartner, reviewLead, sendCampaignOutreach } from '../lib/api'

function scoreColor(score: number): string {
  if (score >= 70) return 'text-secondary bg-secondary/10'
  if (score >= 40) return 'text-primary bg-primary/10'
  if (score >= 20) return 'text-tertiary bg-tertiary/10'
  return 'text-error bg-error-container/30'
}

function statusBadge(lead: Creator) {
  if (lead.affiliate) return <span className="px-2 py-0.5 rounded-md bg-secondary/10 text-secondary text-[11px] font-bold">✅ Converted</span>
  if (lead.conversation?.latest_inbound_message) {
    const intent = lead.conversation.detected_intent
    if (intent === 'interested') return <span className="px-2 py-0.5 rounded-md bg-secondary text-white text-[11px] font-bold">🌟 Interested</span>
    if (intent === 'not_interested') return <span className="px-2 py-0.5 rounded-md bg-error text-white text-[11px] font-bold">✗ Not Interested</span>
    return <span className="px-2 py-0.5 rounded-md bg-primary text-white text-[11px] font-bold">📩 Replied</span>
  }
  if (lead.outreach_logs?.some(l => l.delivery_status === 'sent')) return <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[11px] font-bold">📧 Contacted</span>
  if (lead.review_status === 'approved') return <span className="px-2 py-0.5 rounded-md bg-secondary/10 text-secondary text-[11px] font-bold">✓ Approved</span>
  if (lead.review_status === 'rejected') return <span className="px-2 py-0.5 rounded-md bg-error/10 text-error text-[11px] font-bold">✗ Rejected</span>
  return <span className="px-2 py-0.5 rounded-md bg-outline/10 text-outline text-[11px] font-bold">Pending Review</span>
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
  const [selectedLog, setSelectedLog] = useState<any>(null)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 4000) }

  const loadData = useCallback(async () => {
    if (!id) return
    try {
      setLoading(true)
      const [camp, lds] = await Promise.all([getCampaignById(id), getCampaignLeads(id)])
      setCampaign(camp)
      setLeads(lds)
    } catch (err) {
      console.error('Failed to load campaign data:', err)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { loadData() }, [loadData])

  const handleDiscover = async () => {
    if (!campaign || !id) return
    setDiscovering(true)
    try {
      await triggerDiscovery(campaign.category, campaign.city, id)
      showToast('🔍 AI Discovery triggered! Leads will appear shortly...')
      setTimeout(() => loadData(), 5000)
    } catch (err) {
      console.error('Discovery failed:', err)
    } finally {
      setDiscovering(false)
    }
  }

  const handleReview = async (creatorId: string, action: 'approve' | 'reject') => {
    setActionLoading(true)
    try {
      await reviewLead(creatorId, action)
      showToast(action === 'approve' ? '✅ Lead approved for outreach!' : '❌ Lead rejected')
      loadData()
    } catch (err) {
      console.error('Review failed:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const handleOutreach = async () => {
    if (!id) return
    setOutreaching(true)
    try {
      const stats = await sendCampaignOutreach(id)
      showToast(`📧 Outreach complete! Sent: ${stats.sent}, Failed: ${stats.failed}`)
      loadData()
    } catch (err: unknown) {
      showToast(`⚠️ ${err instanceof Error ? err.message : 'Outreach failed'}`)
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
      showToast('📅 Meeting booked successfully!')
      loadData()
    } catch (err) {
      console.error('Meeting booking failed:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const handleApprove = async (meetingId: string) => {
    setActionLoading(true)
    try {
      await approvePartner(meetingId)
      showToast('🎉 Partner approved! Affiliate code generated!')
      loadData()
    } catch (err) {
      console.error('Approval failed:', err)
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <span className="material-symbols-outlined text-4xl text-primary animate-spin">progress_activity</span>
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <p className="text-lg font-bold mb-4">Campaign not found</p>
        <button onClick={() => navigate('/')} className="text-primary font-semibold underline">Go Back</button>
      </div>
    )
  }

  const approvedCount = leads.filter(l => l.review_status === 'approved').length
  const contactedCount = leads.filter(l => l.outreach_logs?.some(log => log.delivery_status === 'sent')).length

  return (
    <div className="max-w-[1200px] mx-auto p-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-[100] bg-surface-container-lowest px-5 py-3 rounded-2xl shadow-xl border border-outline-variant/20 text-sm font-medium animate-[slideIn_0.3s_ease]">
          {toast}
        </div>
      )}

      {/* Back Button + Header */}
      <button onClick={() => navigate('/')} className="flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary mb-6 transition-colors">
        <span className="material-symbols-outlined text-lg">arrow_back</span>
        All Campaigns
      </button>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="font-headline text-3xl font-bold tracking-tight mb-2">{campaign.name}</h2>
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1 rounded-lg bg-primary/10 text-primary text-xs font-bold">{campaign.category}</span>
            <span className="px-3 py-1 rounded-lg bg-tertiary/10 text-tertiary text-xs font-bold flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">location_on</span>
              {campaign.city}
            </span>
            <span className="px-3 py-1 rounded-lg bg-secondary/10 text-secondary text-xs font-bold">{campaign.status}</span>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleDiscover}
            disabled={discovering}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl editorial-gradient text-white text-sm font-bold hover:opacity-90 active:scale-[0.98] transition-all shadow-lg disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-lg ${discovering ? 'animate-spin' : ''}`}>
              {discovering ? 'progress_activity' : 'auto_awesome'}
            </span>
            {discovering ? 'Discovering...' : 'Discover'}
          </button>
          {approvedCount > 0 && (
            <button
              onClick={handleOutreach}
              disabled={outreaching}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary text-white text-sm font-bold hover:opacity-90 active:scale-[0.98] transition-all shadow-lg disabled:opacity-50"
            >
              <span className={`material-symbols-outlined text-lg ${outreaching ? 'animate-spin' : ''}`}>
                {outreaching ? 'progress_activity' : 'send'}
              </span>
              {outreaching ? 'Sending...' : 'Send Outreach'}
            </button>
          )}
        </div>
      </div>

      {/* Pipeline Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
        {[
          { icon: 'group', label: 'Discovered', value: leads.length, color: 'text-primary' },
          { icon: 'verified', label: 'Approved', value: approvedCount, color: 'text-secondary' },
          { icon: 'mail', label: 'Contacted', value: contactedCount, color: 'text-tertiary' },
          { icon: 'calendar_today', label: 'Meetings', value: leads.reduce((a, l) => a + (l.meetings?.length || 0), 0), color: 'text-primary' },
          { icon: 'handshake', label: 'Converted', value: leads.filter(l => l.affiliate).length, color: 'text-secondary' },
        ].map((s) => (
          <div key={s.label} className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <span className={`material-symbols-outlined text-lg ${s.color}`} style={{ fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
              <span className="text-[10px] font-bold text-outline uppercase tracking-widest">{s.label}</span>
            </div>
            <div className="font-headline text-2xl font-bold">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Leads Table */}
      {leads.length === 0 ? (
        <div className="bg-surface-container-lowest p-12 rounded-3xl shadow-sm text-center">
          <span className="material-symbols-outlined text-4xl text-outline mb-4 block">person_search</span>
          <h3 className="font-headline text-lg font-bold mb-2">No leads discovered yet</h3>
          <p className="text-sm text-on-surface-variant mb-4">Click "Discover" to run the AI agent and find matched creators.</p>
        </div>
      ) : (
        <div className="bg-surface-container-lowest rounded-3xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-surface-container flex justify-between items-center">
            <h3 className="font-headline text-lg font-bold">Discovered Leads</h3>
            <span className="text-xs text-on-surface-variant font-medium">{leads.length} total</span>
          </div>

          {/* Table Header */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 text-[10px] font-bold text-outline uppercase tracking-widest border-b border-surface-container">
            <div className="col-span-3">Creator</div>
            <div className="col-span-2">Category</div>
            <div className="col-span-2 text-center">Platform</div>
            <div className="col-span-1 text-center">Score</div>
            <div className="col-span-2">Pipeline</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          {/* Table Rows */}
          {leads.map((lead) => {
            const score = Number(lead.outreach_readiness_score) || 0
            const isExpanded = expandedLead === lead.id
            const latestMeeting = lead.meetings?.[0]
            const isPendingReview = !lead.review_status || lead.review_status === 'pending_review'
            const isApproved = lead.review_status === 'approved'
            const isContacted = lead.outreach_logs?.some(l => l.delivery_status === 'sent')

            return (
              <div key={lead.id} className="border-b border-surface-container last:border-b-0">
                <div
                  className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-6 py-4 hover:bg-surface-container/30 cursor-pointer transition-colors items-center"
                  onClick={() => setExpandedLead(isExpanded ? null : lead.id)}
                >
                  <div className="col-span-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full editorial-gradient flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {lead.handle?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-sm">@{lead.handle}</div>
                      {lead.full_name && <div className="text-[11px] text-on-surface-variant">{lead.full_name}</div>}
                    </div>
                  </div>
                  <div className="col-span-2">
                    {lead.category && <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[11px] font-bold">{lead.category}</span>}
                  </div>
                  <div className="col-span-2 flex items-center justify-center gap-3">
                    {lead.has_instagram && (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="url(#ig-grad)" title="Instagram" className="drop-shadow-sm hover:scale-110 transition-transform">
                        <defs>
                          <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#f09433" />
                            <stop offset="25%" stopColor="#e6683c" />
                            <stop offset="50%" stopColor="#dc2743" />
                            <stop offset="75%" stopColor="#cc2366" />
                            <stop offset="100%" stopColor="#bc1888" />
                          </linearGradient>
                        </defs>
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                      </svg>
                    )}
                    {lead.has_youtube && (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="#FF0000" title="YouTube" className="drop-shadow-sm hover:scale-110 transition-transform">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                      </svg>
                    )}
                    {lead.has_tiktok && (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="#000000" title="TikTok" className="drop-shadow-sm hover:scale-110 transition-transform">
                        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 2.22-1.15 4.31-2.91 5.67-1.74 1.35-4.04 1.74-6.13 1.11-2.26-.67-4.04-2.58-4.52-4.88-.47-2.19.06-4.58 1.5-6.27 1.43-1.68 3.59-2.5 5.75-2.43 0 1.34.01 2.68 0 4.02-1.04-.04-2.1.28-2.9.96-.8.67-1.2 1.72-1.15 2.78.05 1.05.62 2.03 1.47 2.58.85.55 1.94.7 2.91.43 1.25-.33 2.18-1.44 2.36-2.74.05-.33.05-.67.05-1.01V.02z"/>
                      </svg>
                    )}
                    {!lead.has_instagram && !lead.has_youtube && !lead.has_tiktok && (
                      <span className="text-[10px] text-outline italic">N/A</span>
                    )}
                  </div>
                  <div className="col-span-1 text-center">
                    <span className={`inline-block px-2.5 py-1 rounded-lg text-sm font-bold ${scoreColor(score)}`}>
                      {Math.round(score)}
                    </span>
                  </div>
                  <div className="col-span-2">
                    {statusBadge(lead)}
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-2">
                    {isPendingReview && (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleReview(lead.id, 'approve') }}
                          disabled={actionLoading}
                          className="px-2 py-1.5 rounded-lg bg-secondary/10 text-secondary text-[10px] font-bold hover:bg-secondary/20 transition-all"
                        >
                          ✓ Approve
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleReview(lead.id, 'reject') }}
                          disabled={actionLoading}
                          className="px-2 py-1.5 rounded-lg bg-error/10 text-error text-[10px] font-bold hover:bg-error/20 transition-all"
                        >
                          ✗ Reject
                        </button>
                      </>
                    )}
                    {isApproved && !isContacted && !lead.email && (
                      <span className="text-[10px] text-outline italic">No email</span>
                    )}
                    <span className={`material-symbols-outlined text-outline transition-transform ${isExpanded ? 'rotate-180' : ''}`}>expand_more</span>
                  </div>
                </div>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div className="px-6 pb-6 bg-surface-container/20">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-5 pt-4">
                      {/* Score Breakdown */}
                      <div className="bg-surface-container-lowest p-5 rounded-2xl">
                        <h4 className="text-[10px] font-bold text-outline uppercase tracking-widest mb-4">Score Breakdown</h4>
                        {lead.scoring_notes?.initial_breakdown ? (
                          <div className="space-y-2">
                            {Object.entries(lead.scoring_notes.initial_breakdown).map(([key, val]) => (
                              <div key={key} className="flex justify-between items-center">
                                <span className="text-xs text-on-surface-variant capitalize">{key.replace(/_/g, ' ')}</span>
                                <span className="text-xs font-bold">{val as number}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-on-surface-variant">No breakdown available</p>
                        )}
                      </div>

                      {/* Outreach Status */}
                      <div className="bg-surface-container-lowest p-5 rounded-2xl">
                        <h4 className="text-[10px] font-bold text-outline uppercase tracking-widest mb-4">Outreach</h4>
                        {lead.outreach_logs && lead.outreach_logs.length > 0 ? (
                          <div className="space-y-2">
                            {lead.conversation?.latest_inbound_message && (
                              <div 
                                onClick={() => setSelectedLog({ 
                                  channel: 'email', 
                                  delivery_status: 'received', 
                                  subject_line: 'Influencer Reply', 
                                  message_content: lead.conversation.latest_inbound_message 
                                })}
                                className="bg-primary/5 p-3 rounded-xl border border-primary/10 mb-2 cursor-pointer hover:bg-primary/10 transition-colors"
                              >
                                <div className="text-[9px] font-bold text-primary uppercase tracking-widest mb-1 flex justify-between items-center">
                                  Latest Reply
                                  <span className="material-symbols-outlined text-[10px]">open_in_new</span>
                                </div>
                                <div className="text-xs italic text-on-surface line-clamp-3">"{lead.conversation.latest_inbound_message}"</div>
                              </div>
                            )}
                            {lead.outreach_logs.map((log) => (
                              <div key={log.id} className="flex justify-between text-xs">
                                <span className="text-on-surface-variant capitalize">{log.channel}</span>
                                <button 
                                  onClick={() => setSelectedLog(log)}
                                  className={`font-bold hover:underline ${log.delivery_status === 'sent' ? 'text-secondary' : 'text-error'}`}
                                >
                                  {log.delivery_status}
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-on-surface-variant">
                            {isApproved ? 'Ready for outreach. Click "Send Outreach" above.' : 'Approve this lead first, then send outreach.'}
                          </p>
                        )}
                        {lead.email && (
                          <div className="mt-3 pt-3 border-t border-surface-container">
                            <div className="flex items-center gap-1 text-xs text-on-surface-variant">
                              <span className="material-symbols-outlined text-sm text-secondary">mail</span>
                              <span className="truncate">{lead.email}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Meeting */}
                      <div className="bg-surface-container-lowest p-5 rounded-2xl">
                        <h4 className="text-[10px] font-bold text-outline uppercase tracking-widest mb-4">Meeting</h4>
                        {latestMeeting ? (
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                              <span className="text-on-surface-variant">Date</span>
                              <span className="font-semibold">{new Date(latestMeeting.meeting_date).toLocaleDateString()}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-on-surface-variant">Status</span>
                              <span className="font-semibold capitalize">{latestMeeting.status}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-on-surface-variant">Outcome</span>
                              <span className="font-semibold capitalize">{latestMeeting.outcome}</span>
                            </div>
                            {latestMeeting.outcome === 'pending' && (
                              <button
                                onClick={() => handleApprove(latestMeeting.id)}
                                disabled={actionLoading}
                                className="w-full mt-3 py-2 rounded-xl bg-secondary text-white text-xs font-bold hover:opacity-90 transition-all disabled:opacity-50"
                              >
                                ✅ Approve & Generate Code
                              </button>
                            )}
                          </div>
                        ) : (
                          <div>
                            <p className="text-xs text-on-surface-variant mb-3">No meeting scheduled</p>
                            <button
                              onClick={() => setMeetingModal(lead.id)}
                              className="w-full py-2 rounded-xl bg-primary text-white text-xs font-bold hover:opacity-90 transition-all"
                            >
                              📅 Book Meeting
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Affiliate */}
                      <div className="bg-surface-container-lowest p-5 rounded-2xl">
                        <h4 className="text-[10px] font-bold text-outline uppercase tracking-widest mb-4">Affiliate</h4>
                        {lead.affiliate ? (
                          <div className="space-y-3">
                            <div className="bg-secondary/10 p-3 rounded-xl text-center">
                              <div className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-1">Promo Code</div>
                              <div className="font-headline text-xl font-bold text-secondary">{lead.affiliate.promo_code}</div>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-on-surface-variant">Commission</span>
                              <span className="font-bold text-secondary">{lead.affiliate.commission_rate_percent}%</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-on-surface-variant">Conversions</span>
                              <span className="font-semibold">{lead.affiliate.total_conversions}</span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-on-surface-variant">Not yet converted. Book and approve a meeting first.</p>
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

      {/* Meeting Booking Modal */}
      {meetingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setMeetingModal(null)}>
          <div className="bg-surface-container-lowest w-full max-w-md rounded-3xl shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-headline text-xl font-bold mb-5">Book Meeting</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-outline uppercase tracking-widest mb-2">Date & Time *</label>
                <input
                  type="datetime-local"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-surface-container border border-outline-variant/30 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-outline uppercase tracking-widest mb-2">Notes</label>
                <textarea
                  value={meetingNotes}
                  onChange={(e) => setMeetingNotes(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-surface-container border border-outline-variant/30 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm resize-none"
                  rows={3}
                  placeholder="Meeting agenda or notes..."
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setMeetingModal(null)} className="flex-1 py-3 rounded-xl bg-surface-container text-on-surface text-sm font-bold hover:bg-surface-container-high transition-all">
                Cancel
              </button>
              <button
                onClick={() => handleBookMeeting(meetingModal)}
                disabled={actionLoading || !meetingDate}
                className="flex-1 py-3 rounded-xl editorial-gradient text-white text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50"
              >
                {actionLoading ? 'Booking...' : 'Book Meeting'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message Preview Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setSelectedLog(null)}>
          <div className="bg-surface-container-lowest w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-[slideUp_0.3s_ease]" onClick={(e) => e.stopPropagation()}>
            <div className="bg-secondary px-6 py-4 flex justify-between items-center text-white">
              <div>
                <h3 className="font-headline text-lg font-bold">Message Preview</h3>
                <p className="text-white/70 text-[10px] uppercase tracking-widest font-bold">Sent via {selectedLog.channel}</p>
              </div>
              <button onClick={() => setSelectedLog(null)} className="text-white/70 hover:text-white transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-[10px] font-bold text-outline uppercase tracking-widest mb-1">Subject</label>
                <div className="text-sm font-bold text-on-surface">{selectedLog.subject_line || 'No Subject'}</div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-outline uppercase tracking-widest mb-1">Message Content</label>
                <div className="bg-surface-container/50 p-4 rounded-2xl border border-outline-variant/20 text-sm whitespace-pre-wrap font-medium text-justify">
                  {selectedLog.message_content}
                </div>
              </div>
              <button 
                onClick={() => setSelectedLog(null)}
                className="w-full mt-6 py-3 rounded-xl bg-surface-container text-on-surface text-sm font-bold hover:bg-surface-container-high transition-all"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
