import type { Campaign, Creator, AuthUser, OutreachTemplate } from '../types'

const BASE = import.meta.env.VITE_API_URL || '/api'

type ApiError = {
  message?: string
}

type ApiEnvelope<T> = {
  success: boolean
  data?: T
  error?: string | ApiError
}

type MeetingResponse = ApiEnvelope<never> & {
  meeting?: unknown
}

type PartnerResponse = ApiEnvelope<never> & {
  result?: unknown
}

type OutreachResponse = ApiEnvelope<never> & {
  stats?: { sent: number; failed: number }
}

function getToken(): string | null {
  return localStorage.getItem('ats_token')
}

function authHeaders(): Record<string, string> {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }
}

function getErrorMessage(error: string | ApiError | undefined, fallback: string): string {
  if (typeof error === 'string') return error
  if (error?.message) return error.message
  return fallback
}

// ─── Auth ─────────────────────────────────────────────
export async function login(email: string, password: string): Promise<{ user: AuthUser; access_token: string }> {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  })
  const json = (await res.json()) as ApiEnvelope<{ user: AuthUser; access_token: string }>
  if (!json.success || !json.data) throw new Error(getErrorMessage(json.error, 'Login failed'))
  localStorage.setItem('ats_token', json.data.access_token)
  return json.data
}

export async function getMe(): Promise<AuthUser> {
  const res = await fetch(`${BASE}/auth/me`, { headers: authHeaders() })
  const json = (await res.json()) as ApiEnvelope<AuthUser>
  if (!json.success || !json.data) throw new Error('Not authenticated')
  return json.data
}

export async function logout(): Promise<void> {
  await fetch(`${BASE}/auth/logout`, { method: 'POST', headers: authHeaders(), credentials: 'include' })
  localStorage.removeItem('ats_token')
}

// ─── Campaigns ────────────────────────────────────────
export async function getCampaigns(): Promise<Campaign[]> {
  const res = await fetch(`${BASE}/campaigns`, { headers: authHeaders() })
  const json = (await res.json()) as ApiEnvelope<Campaign[]>
  if (!json.success || !json.data) throw new Error(getErrorMessage(json.error, 'Failed to load campaigns'))
  return json.data
}

export async function getCampaignById(id: string): Promise<Campaign> {
  const res = await fetch(`${BASE}/campaigns/${id}`, { headers: authHeaders() })
  const json = (await res.json()) as ApiEnvelope<Campaign>
  if (!json.success || !json.data) throw new Error(getErrorMessage(json.error, 'Failed to load campaign'))
  return json.data
}

export async function getCampaignTemplate(id: string): Promise<OutreachTemplate | null> {
  const res = await fetch(`${BASE}/campaigns/${id}`, { headers: authHeaders() })
  const json = (await res.json()) as ApiEnvelope<Campaign>
  if (!json.success || !json.data) throw new Error(getErrorMessage(json.error, 'Failed to load template'))
  return json.data.template ?? null
}

export async function updateCampaignTemplate(
  id: string,
  data: { subject_line_template: string; body_template: string },
): Promise<OutreachTemplate> {
  const res = await fetch(`${BASE}/campaigns/${id}/template`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(data),
  })
  const json = (await res.json()) as ApiEnvelope<OutreachTemplate>
  if (!json.success || !json.data) throw new Error(getErrorMessage(json.error, 'Failed to update template'))
  return json.data
}

export async function createCampaign(data: Partial<Campaign>): Promise<Campaign> {
  const res = await fetch(`${BASE}/campaigns`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  })
  const json = (await res.json()) as ApiEnvelope<Campaign>
  if (!json.success || !json.data) throw new Error(getErrorMessage(json.error, 'Failed to create campaign'))
  return json.data
}

export async function updateCampaign(id: string, data: Partial<Campaign>): Promise<Campaign> {
  const res = await fetch(`${BASE}/campaigns/${id}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(data),
  })
  const json = (await res.json()) as ApiEnvelope<Campaign>
  if (!json.success || !json.data) throw new Error(getErrorMessage(json.error, 'Failed to update campaign'))
  return json.data
}

// ─── Campaign Leads ───────────────────────────────────
export async function getCampaignLeads(campaignId: string): Promise<Creator[]> {
  const res = await fetch(`${BASE}/campaigns/${campaignId}/leads`, { headers: authHeaders() })
  const json = (await res.json()) as ApiEnvelope<Creator[]>
  if (!json.success || !json.data) throw new Error(getErrorMessage(json.error, 'Failed to load leads'))
  return json.data
}

// ─── AI Discovery ─────────────────────────────────────
export async function triggerDiscovery(category: string, city: string, campaignId: string, keywords?: string[]): Promise<unknown> {
  const res = await fetch(`${BASE}/creators/ai-discovery`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ category, city, campaign_id: campaignId, keywords }),
  })
  const json = (await res.json()) as ApiEnvelope<unknown>
  if (!json.success) throw new Error(getErrorMessage(json.error, 'Failed to trigger discovery'))
  return json.data
}

// ─── Conversions ──────────────────────────────────────
export async function bookMeeting(creatorId: string, campaignId: string, date: string, notes: string): Promise<unknown> {
  const res = await fetch(`${BASE}/conversions/book-meeting`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ creator_id: creatorId, campaign_id: campaignId, date, notes }),
  })
  const json = (await res.json()) as MeetingResponse
  if (!json.success) throw new Error(getErrorMessage(json.error, 'Failed to book meeting'))
  return json.meeting
}

export async function approvePartner(meetingId: string): Promise<unknown> {
  const res = await fetch(`${BASE}/conversions/approve-partner`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ meeting_id: meetingId, outcome: 'approved' }),
  })
  const json = (await res.json()) as PartnerResponse
  if (!json.success) throw new Error(getErrorMessage(json.error, 'Failed to approve partner'))
  return json.result
}

// ─── Review ───────────────────────────────────────────
export async function reviewLead(creatorId: string, action: 'approve' | 'reject'): Promise<unknown> {
  const res = await fetch(`${BASE}/creators/${creatorId}/review`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ action }),
  })
  const json = (await res.json()) as ApiEnvelope<unknown>
  if (!json.success) throw new Error(getErrorMessage(json.error, 'Failed to review lead'))
  return json.data
}

// ─── Outreach ─────────────────────────────────────────
export async function sendCampaignOutreach(campaignId: string): Promise<{ sent: number; failed: number }> {
  const res = await fetch(`${BASE}/outreach/send`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ campaign_id: campaignId }),
  })
  const json = (await res.json()) as OutreachResponse
  if (!json.success || !json.stats) throw new Error(getErrorMessage(json.error, 'Failed to send outreach'))
  return json.stats
}
