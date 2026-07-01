export interface Campaign {
  id: string;
  name: string;
  client_id: string | null;
  brand_id: string | null;
  owner_user_id: string | null;
  category: string; // Comma-separated for multi-niche: "Fashion,Beauty,Fitness"
  description?: string;
  country?: string;
  state?: string;
  city: string;
  keywords: string[];
  status: 'draft' | 'active' | 'paused' | 'completed' | 'archived' | 'inactive';
  offer_type: 'free_product' | 'affiliate_commission' | 'hybrid';
  product_offer_notes: string | null;
  discovery_channels?: string[];
  email_subject?: string;
  email_body?: string;
  template?: OutreachTemplate | null;
  lead_count?: number;
  approved_count?: number;
  delivered_count?: number;
  Brand?: { id: string; name: string };
  Client?: { id: string; name: string };
  start_date?: string | null;
  end_date?: string | null;
  created_at: string;
  updated_at: string;
}

export interface OutreachTemplate {
  id: string;
  campaign_id: string | null;
  template_name: string;
  subject_line_template: string;
  body_template: string;
  is_active: boolean;
}

export interface OutreachLog {
  id: string;
  campaign_id: string;
  creator_id: string;
  channel: string;
  message_type: string;
  follow_up_count?: number;
  next_followup_at?: string | null;
  is_dismissed?: boolean;
  response_received?: boolean;
  subject_line?: string | null;
  delivery_status?: 'pending' | 'sent' | 'failed' | 'blocked' | 'skipped';
  sent_at: string | null;
  created_at?: string;
  createdAt?: string;
  Creator?: Creator;
}

export interface Creator {
  id: string;
  handle: string;
  full_name: string | null;
  email: string | null;
  bio: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  category: string | null;
  has_email: boolean;
  has_instagram: boolean;
  has_youtube?: boolean;
  has_tiktok?: boolean;
  primary_platform?: string | null;
  profile_url?: string | null;
  profile_pic?: string | null;
  latest_outreach?: OutreachLog | null;
  outreach_readiness_score: number | null;
  relevance_score: number | null;
  scoring_notes: {
    initial_breakdown?: {
      category: number;
      location: number;
      follower_bracket: number;
      contactability: number;
      content_fit: number;
      brand_fit: number;
      source_confidence: number;
      data_completeness: number;
    };
  } | null;
  review_status: ReviewStatus | null;
  lifecycle_status?: LifecycleStatus | null;
  notes?: string | null;
  summary?: string | null;
  campaign_id: string | null;
  campaign_ids: string[];
  assigned_status: string;
  meetings: Meeting[];
  affiliate: Affiliate | null;
  outreach_logs: OutreachLog[];
  OutreachLogs?: OutreachLog[];
  conversation: CreatorConversation | null;
  profiles: CreatorPlatformProfile[];
  // Optional fields populated from various API responses
  platform?: string | null;
  followers_count?: number | null;
  followers?: number | null;
  avg_likes?: number | null;
  avg_comments?: number | null;
  engagement_rate?: number | null;
  research_summary?: string | null;
  affiliate_code?: string | null;
  affiliate_link?: string | null;
  AffiliateTracking?: AffiliateTracking | null;
  media_kit_url?: string | null;
  media_kit_parsed_at?: string | null;
  // Shipping address (used when creating product shipments)
  shipping_address_line1?: string | null;
  shipping_address_line2?: string | null;
  shipping_city?: string | null;
  shipping_state?: string | null;
  shipping_zip?: string | null;
  shipping_country?: string | null;
}

export interface CreatorPlatformAudienceLocation {
  id: string;
  platform_profile_id: string;
  data_source: string;
  location_type: 'country' | 'state' | 'city' | 'region';
  slug: string | null;
  name: string;
  percentage: number;
  captured_at: string;
}

export interface CreatorPlatformAudienceDemographic {
  id: string;
  platform_profile_id: string;
  data_source: string;
  demographic_type: 'gender' | 'age' | 'gender_age';
  gender: 'male' | 'female' | null;
  age_range: string | null;
  percentage: number;
  captured_at: string;
}

export interface CreatorPlatformAudienceQuality {
  id: string;
  platform_profile_id: string;
  data_source: string;
  real_percent: number | null;
  influencer_percent: number | null;
  suspicious_percent: number | null;
  massfollowers_percent: number | null;
  fake_followers_percent: number | null;
  reachability_0_500: number | null;
  reachability_500_1000: number | null;
  reachability_1000_1500: number | null;
  reachability_1500_plus: number | null;
  quality_score: number | null;
  brand_safety: any | null;
  captured_at: string;
}

export interface CreatorPlatformProfile {
  id: string;
  creator_id: string;
  platform: string;
  handle: string | null;
  profile_url: string | null;
  followers: number | null;
  avg_likes: number | null;
  avg_comments: number | null;
  engagement_rate: number | null;
  media_count?: number | null;
  audience_locations?: CreatorPlatformAudienceLocation[];
  audience_demographics?: CreatorPlatformAudienceDemographic[];
  audience_qualities?: CreatorPlatformAudienceQuality[];
}

export interface Meeting {
  id: string;
  creator_id: string;
  campaign_id: string;
  meeting_date: string;
  status: 'scheduled' | 'completed' | 'no_show' | 'cancelled';
  outcome: 'pending' | 'approved' | 'rejected' | 'waitlisted';
  meeting_notes: string | null;
  created_at: string;
  Creator?: Partial<Creator> & { display_name?: string | null };
  Campaign?: Campaign;
}

export interface Affiliate {
  id: string;
  creator_id: string;
  promo_code: string;
  commission_rate_percent: string;
  status: 'active' | 'paused' | 'revoked';
  total_clicks: number;
  total_conversions: number;
  total_revenue_generated: string;
}

export interface CreatorConversation {
  id: string;
  latest_channel: string | null;
  latest_inbound_message: string | null;
  latest_inbound_at: string | null;
  detected_intent: 'interested' | 'not_interested' | 'unclear' | null;
  interested: boolean | null;
  qualification_status: string;
  messages?: ConversationMessage[];
}

export interface AffiliateTracking {
  affiliate_code?: string | null;
  affiliate_link?: string | null;
  clicks?: number;
  conversions?: number;
  revenue_generated?: number | string | null;
  commission_owed?: number | string | null;
}

export interface ConversationMessage {
  id: string;
  conversation_id: string;
  direction: 'inbound' | 'outbound';
  channel: string;
  message_text: string;
  message_time: string;
  provider_message_id: string | null;
}

export interface AuthUser {
  id: string;
  full_name: string;
  email: string;
  role: string;
  user_type: 'internal' | 'client';
  client_id: string | null;
}

export interface CreatorContent {
  id: string;
  creator_id: string;
  campaign_id: string;
  partnership_id?: string | null;
  platform: 'instagram' | 'youtube' | 'tiktok' | 'blog' | 'website' | 'other';
  content_type:
    | 'instagram_reel'
    | 'instagram_story'
    | 'instagram_post'
    | 'youtube_video'
    | 'youtube_short'
    | 'tiktok_video'
    | 'blog_post'
    | 'other';
  title?: string | null;
  caption?: string | null;
  content_url?: string | null;
  thumbnail_url?: string | null;
  draft_url?: string | null;
  published_url?: string | null;
  due_date?: string | null;
  submitted_at?: string | null;
  approved_at?: string | null;
  published_at?: string | null;
  status:
    | 'pending'
    | 'submitted'
    | 'revision_requested'
    | 'approved'
    | 'published'
    | 'rejected'
    | 'cancelled';
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
  engagement_rate?: number | null;
  // Aggregate/analytics variants returned by the performance endpoints
  avg_engagement_rate?: number | null;
  views_count?: number | null;
  likes_count?: number | null;
  comments_count?: number | null;
  shares_count?: number | null;
  saves_count?: number | null;
  performance_last_synced_at?: string | null;
  notes?: string | null;
  internal_notes?: string | null;
  created_at: string;
  updated_at: string;
  Campaign?: Campaign;
  Creator?: Creator;
}

export interface CreatorPartnership {
  id: string;
  creator_id: string;
  campaign_id: string;
  status: PartnershipStatus;
  creator_tier?: 'unknown' | 'nano' | 'micro' | 'mid_tier' | 'macro' | 'celebrity' | null;
  offer_type?: OfferType | null;
  flat_fee?: number | null;
  currency?: string;
  payment_timing?: string | null;
  payment_method?: string | null;
  shipment_included?: boolean;
  affiliate_enabled?: boolean;
  affiliate_percentage?: number | null;
  affiliate_code?: string | null;
  affiliate_link?: string | null;
  contract_required?: boolean;
  contract_signed?: boolean;
  contract_url?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  activation_notes?: string | null;
  internal_notes?: string | null;
  creator_feedback?: string | null;
  created_at: string;
  createdAt?: string;
  updated_at: string;
  Campaign?: Campaign;
  Creator?: Creator;
  content?: CreatorContent[];
}

// ─── Shared status & role unions ──────────────────────────────────────
// Single source of truth for the string literals used across the app. Verified
// against every comparison/assignment site (Phase 1). Keep these as supersets —
// a missing member turns a valid comparison into a tsc "no-overlap" error.

export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'operator'
  | 'analyst'
  | 'client_admin'
  | 'client_marketing'
  | 'client_viewer';

export type ReviewStatus =
  | 'new'
  | 'hold'
  | 'pending'
  | 'pending_review'
  | 'reviewed'
  | 'shortlisted'
  | 'approved'
  | 'rejected';

export type LifecycleStatus =
  | 'new'
  | 'contacted'
  | 'replied'
  | 'engaged'
  | 'qualified'
  | 'converted'
  | 'in_discussion'
  | 'not_respond'
  | 'failed';

export type PartnershipStatus =
  | 'engaged'
  | 'meeting_scheduled'
  | 'replied'
  | 'in_discussion'
  | 'negotiating'
  | 'qualified'
  | 'offer_sent'
  | 'offer_accepted'
  | 'accepted'
  | 'activated'
  | 'active'
  | 'contract_signed'
  | 'completed'
  | 'rejected'
  | 'product_shipped'
  | 'product_delivered';

export type ShipmentStatus =
  | 'pending'
  | 'address_requested'
  | 'ready_to_ship'
  | 'shipped'
  | 'delivered'
  | 'failed'
  | 'cancelled';

export type ContentStatus =
  | 'pending'
  | 'submitted'
  | 'revision_requested'
  | 'approved'
  | 'published'
  | 'rejected'
  | 'cancelled';

export type OfferType = 'free_product' | 'affiliate_commission' | 'flat_fee' | 'hybrid';

// ─── Directory / tenancy entities ─────────────────────────────────────

export interface AppUser {
  id: string;
  full_name: string;
  email: string;
  role: string;
  user_type: 'internal' | 'client';
  status?: string | null;
  client_id?: string | null;
  created_at?: string;
  last_login_at?: string | null;
  Client?: { id: string; name: string };
}

export interface Client {
  id: string;
  name: string;
  legal_name?: string;
  website?: string;
  industry?: string;
  primary_contact_name?: string;
  primary_contact_email?: string;
  primary_contact_phone?: string;
  plan_type?: string;
  billing_status?: string;
  status?: string;
  notes?: string;
  created_at?: string;
  campaign_count?: number;
  brands?: Brand[];
  users?: AppUser[];
}

export interface Brand {
  id: string;
  name: string;
  website?: string;
  industry?: string;
  product_category?: string;
  brand_description?: string;
  target_audience?: string;
  brand_voice?: string;
  restrictions?: string;
  affiliate_terms?: string;
  product_offer_notes?: string;
  default_commission_percent?: string;
  status?: string;
  notes?: string;
  client_id?: string;
  created_at?: string;
  campaigns?: Campaign[];
  Client?: { id: string; name: string };
}

export interface Category {
  id: string;
  name: string;
  client_id?: string | null;
  brand_id?: string | null;
}

export interface AffiliatePerformance {
  id: string;
  affiliate_code?: string | null;
  affiliate_link?: string | null;
  clicks?: number;
  conversions?: number;
  revenue_generated?: number | string | null;
  commission_owed?: number | string | null;
  status?: string;
  Creator?: Creator;
  Campaign?: Campaign;
}

// ─── Shipments & activities ───────────────────────────────────────────

export interface Shipment {
  id: string;
  creator_id: string;
  campaign_id: string;
  partnership_id?: string | null;
  product_name: string;
  product_sku?: string | null;
  quantity?: number;
  status: ShipmentStatus;
  carrier?: string | null;
  tracking_number?: string | null;
  tracking_url?: string | null;
  recipient_name?: string | null;
  shipping_address_line1?: string | null;
  shipping_address_line2?: string | null;
  shipping_city?: string | null;
  shipping_state?: string | null;
  shipping_zip?: string | null;
  shipping_country?: string | null;
  estimated_delivery?: string | null;
  notes?: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;
  created_at: string;
  createdAt?: string;
  updated_at: string;
  Campaign?: Campaign;
  Creator?: Creator;
}

export interface Activity {
  id: string;
  creator_id?: string | null;
  campaign_id?: string | null;
  activity_type: string;
  message?: string | null;
  description?: string | null;
  status?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  createdAt?: string;
  Campaign?: Campaign;
}

// ─── Dashboard stats ──────────────────────────────────────────────────

export interface KpiMetric {
  value: number;
  trend?: number;
}

export interface DashboardStats {
  kpis: {
    totalCreators: KpiMetric;
    totalCampaigns: KpiMetric;
    totalClients: KpiMetric;
    contacted: KpiMetric;
    replied: KpiMetric;
    qualified: KpiMetric;
    converted: KpiMetric;
  };
  funnel: {
    contacted: number;
    replied: number;
    qualified: number;
    converted: number;
  };
  recentActivity: Array<{
    type: string;
    message: string;
    timestamp: string;
    status?: string;
  }>;
}

// ─── Generic paginated envelope (server-side pagination, Phase 3) ──────

export interface Paginated<T> {
  data: T[];
  total: number;
  page?: number;
  pageSize?: number;
}

// ─── Lightweight API result shapes ────────────────────────────────────

/** Generic acknowledgement returned by side-effect mutations. */
export interface ApiAck {
  success?: boolean;
  message?: string;
}

/** Payload returned when verifying an invite token. */
export interface InviteInfo {
  user: {
    id?: string;
    email: string;
    full_name?: string | null;
    role?: string | null;
  };
  valid?: boolean;
}
