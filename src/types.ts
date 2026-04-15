export interface Campaign {
  id: string
  name: string
  client_name: string | null
  category: string
  city: string
  status: 'draft' | 'active' | 'paused' | 'completed' | 'archived'
  offer_type: 'free_product' | 'affiliate_commission' | 'hybrid'
  product_offer_notes: string | null
  discovery_channels?: string[]
  email_subject?: string
  email_body?: string
  template?: OutreachTemplate | null
  lead_count?: number
  created_at: string
  updated_at: string
}

export interface OutreachTemplate {
  id: string
  campaign_id: string | null
  template_name: string
  subject_line_template: string
  body_template: string
  is_active: boolean
}

export interface Creator {
  id: string
  handle: string
  full_name: string | null
  email: string | null
  bio: string | null
  city: string | null
  category: string | null
  has_email: boolean
  has_instagram: boolean
  has_youtube?: boolean
  has_tiktok?: boolean
  outreach_readiness_score: number | null
  scoring_notes: {
    initial_breakdown?: {
      category: number
      location: number
      follower_bracket: number
      contactability: number
      content_fit: number
      brand_fit: number
      source_confidence: number
      data_completeness: number
    }
  } | null
  review_status: string | null
  assigned_status: string
  meetings: Meeting[]
  affiliate: Affiliate | null
  outreach_logs: OutreachLog[]
  conversation: CreatorConversation | null
}

export interface Meeting {
  id: string
  creator_id: string
  campaign_id: string
  meeting_date: string
  status: 'scheduled' | 'completed' | 'no_show' | 'cancelled'
  outcome: 'pending' | 'approved' | 'rejected' | 'waitlisted'
  meeting_notes: string | null
  created_at: string
}

export interface Affiliate {
  id: string
  creator_id: string
  promo_code: string
  commission_rate_percent: string
  status: 'active' | 'paused' | 'revoked'
  total_clicks: number
  total_conversions: number
  total_revenue_generated: string
}

export interface OutreachLog {
  id: string
  creator_id: string
  campaign_id: string
  channel: string
  message_type: string
  subject_line: string | null
  delivery_status: 'pending' | 'sent' | 'failed' | 'blocked' | 'skipped'
  sent_at: string | null
  created_at: string
}

export interface CreatorConversation {
  id: string
  latest_inbound_message: string | null
  latest_inbound_at: string | null
  detected_intent: 'interested' | 'not_interested' | 'unclear' | null
  interested: boolean | null
  qualification_status: string
}

export interface AuthUser {
  id: string
  full_name: string
  email: string
  role: string
}
