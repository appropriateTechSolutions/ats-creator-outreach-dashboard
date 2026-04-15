import type { Campaign, Creator, AuthUser } from '../types'

const BASE = '/api'

function getToken(): string | null {
  return localStorage.getItem('ats_token')
}

function authHeaders(): Record<string, string> {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }
}

// ─── Auth ─────────────────────────────────────────────
export async function login(email: string, password: string): Promise<{ user: AuthUser; access_token: string }> {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  })
  const json = await res.json()
  if (!json.success) throw new Error(json.error?.message || json.error || 'Login failed')
  localStorage.setItem('ats_token', json.data.access_token)
  return json.data
}

export async function getMe(): Promise<AuthUser> {
  const res = await fetch(`${BASE}/auth/me`, { headers: authHeaders() })
  const json = await res.json()
  if (!json.success) throw new Error('Not authenticated')
  return json.data
}

export async function logout(): Promise<void> {
  await fetch(`${BASE}/auth/logout`, { method: 'POST', headers: authHeaders(), credentials: 'include' })
  localStorage.removeItem('ats_token')
}

// ─── Campaigns ────────────────────────────────────────
export async function getCampaigns(): Promise<Campaign[]> {
  const res = await fetch(`${BASE}/campaigns`, { headers: authHeaders() })
  const json = await res.json()
  if (!json.success) throw new Error(json.error)
  return json.data
}

export async function getCampaignById(id: string): Promise<Campaign> {
  const res = await fetch(`${BASE}/campaigns/${id}`, { headers: authHeaders() })
  const json = await res.json()
  if (!json.success) throw new Error(json.error)
  return json.data
}

export async function getCampaignTemplate(id: string): Promise<any> {
  const res = await fetch(`${BASE}/campaigns/${id}`, { headers: authHeaders() })
  const json = await res.json()
  if (!json.success) throw new Error(json.error)
  return json.data.template
}

export async function updateCampaignTemplate(id: string, data: { subject_line_template: string; body_template: string }): Promise<any> {
  const res = await fetch(`${BASE}/campaigns/${id}/template`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(data),
  })
  const json = await res.json()
  if (!json.success) throw new Error(json.error)
  return json.data
}

export async function createCampaign(data: Partial<Campaign>): Promise<Campaign> {
  const res = await fetch(`${BASE}/campaigns`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  })
  const json = await res.json()
  if (!json.success) throw new Error(json.error)
  return json.data
}

// ─── Campaign Leads ───────────────────────────────────
export async function getCampaignLeads(campaignId: string): Promise<Creator[]> {
  const res = await fetch(`${BASE}/campaigns/${campaignId}/leads`, { headers: authHeaders() })
  const json = await res.json()
  if (!json.success) throw new Error(json.error)
  return json.data
}

// ─── AI Discovery ─────────────────────────────────────
export async function triggerDiscovery(category: string, city: string, campaignId: string): Promise<unknown> {
  const res = await fetch(`${BASE}/creators/ai-discovery`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ category, city, campaign_id: campaignId }),
  })
  const json = await res.json()
  if (!json.success) throw new Error(json.error)
  return json.data
}

// ─── Conversions ──────────────────────────────────────
export async function bookMeeting(creatorId: string, campaignId: string, date: string, notes: string): Promise<unknown> {
  const res = await fetch(`${BASE}/conversions/book-meeting`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ creator_id: creatorId, campaign_id: campaignId, date, notes }),
  })
  const json = await res.json()
  if (!json.success) throw new Error(json.error)
  return json.meeting
}

export async function approvePartner(meetingId: string): Promise<unknown> {
  const res = await fetch(`${BASE}/conversions/approve-partner`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ meeting_id: meetingId, outcome: 'approved' }),
  })
  const json = await res.json()
  if (!json.success) throw new Error(json.error)
  return json.result
}

// ─── Review ───────────────────────────────────────────
export async function reviewLead(creatorId: string, action: 'approve' | 'reject'): Promise<unknown> {
  const res = await fetch(`${BASE}/creators/${creatorId}/review`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ action }),
  })
  const json = await res.json()
  if (!json.success) throw new Error(json.error)
  return json.data
}

// ─── Outreach ─────────────────────────────────────────
export async function sendCampaignOutreach(campaignId: string): Promise<{ sent: number; failed: number }> {
  const res = await fetch(`${BASE}/outreach/send`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ campaign_id: campaignId }),
  })
  const json = await res.json()
  if (!json.success) throw new Error(json.error)
  return json.stats
}
