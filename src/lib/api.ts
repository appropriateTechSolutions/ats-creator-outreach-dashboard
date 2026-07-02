import { logger } from './logger';
import axios from 'axios';
import type {
  Campaign,
  Creator,
  AuthUser,
  AppUser,
  Client,
  Brand,
  Category,
  AffiliatePerformance,
  Shipment,
  Activity,
  DashboardStats,
  CreatorPartnership,
  CreatorContent,
  Meeting,
  OutreachLog,
  OutreachTemplate,
  ConversationMessage,
  ApiAck,
  InviteInfo,
} from '../types';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8081/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ats_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: unwrap the API envelope ({ success, data } → data) and
// normalize errors. Caching/dedup/invalidation is now handled entirely by
// TanStack Query (see src/hooks/queries.ts + queryKeys.ts) — the old hand-rolled
// GET cache was retired once every read moved onto query hooks.
api.interceptors.response.use(
  (response) => {
    if (!response.data.success && response.data.error) {
      return Promise.reject(new Error(response.data.error));
    }
    return response.data.data !== undefined ? response.data.data : response.data;
  },
  (error) => {
    // Enhanced error handling with more details
    const errorMessage =
      error?.response?.data?.error ||
      error?.response?.data?.message ||
      error?.message ||
      'An unexpected error occurred';

    // Log detailed error for debugging
    if (error?.response) {
      logger.error('API Error:', {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        data: error.response?.data,
      });
    }

    return Promise.reject(error?.response?.data || new Error(errorMessage));
  },
);

/**
 * Extracts a human-readable string from whatever a rejected API call throws.
 * The response interceptor above rejects with either the backend envelope
 * (`{ success, error }`) or a plain `Error` (network failures), so a caught
 * value can be an object, an Error, or a string. Passing the raw object into
 * `setError`/`showToast` — which feed React text nodes — renders it as a child
 * and crashes with "Objects are not valid as a React child". Always funnel
 * caught errors through this before displaying them.
 */
export function getErrorMessage(
  err: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  if (typeof err === 'string') return err || fallback;
  if (err && typeof err === 'object') {
    const e = err as { error?: unknown; message?: unknown };
    if (typeof e.error === 'string' && e.error) return e.error;
    if (typeof e.message === 'string' && e.message) return e.message;
  }
  return fallback;
}

// ─── Auth ─────────────────────────────────────────────
export const login = async (
  email: string,
  password: string,
): Promise<{ user: AuthUser; access_token: string }> => {
  const res = (await api.post('/auth/login', { email, password })) as unknown as {
    user: AuthUser;
    access_token: string;
  };
  localStorage.setItem('ats_token', res.access_token);
  return res;
};

export const forgotPassword = (email: string): Promise<{ success: boolean; message: string }> =>
  api.post('/auth/forgot-password', { email });

export const resetPassword = (data: {
  token: string;
  newPassword: string;
}): Promise<{ success: boolean; message: string }> => api.post('/auth/reset-password', data);

export const getMe = (): Promise<AuthUser> => api.get('/auth/me');

export const logout = async (): Promise<void> => {
  await api.post('/auth/logout');
  localStorage.removeItem('ats_token');
};

export const inviteUser = (data: {
  full_name: string;
  email: string;
  role: string;
  client_id?: string;
  user_type?: string;
}): Promise<AppUser> => api.post('/users/invite', data);

export const getUsers = (): Promise<AppUser[]> => api.get('/users');
export const getUserById = (id: string): Promise<AppUser> => api.get(`/users/${id}`);

export const verifyInvite = (token: string): Promise<InviteInfo> =>
  api.get(`/auth/invite/verify?token=${token}`);

export const acceptInvite = (data: { token: string; password: string }): Promise<void> =>
  api.post('/auth/invite/accept', data);

export const resendInvite = (id: string): Promise<ApiAck> => api.post(`/users/${id}/resend-invite`);

export const disableUser = (id: string): Promise<ApiAck> => api.post(`/users/${id}/disable`);
export const deleteUser = (id: string): Promise<ApiAck> => api.post(`/users/${id}/delete`);

// Clients
export const getClients = (): Promise<Client[]> => api.get('/clients');
export const getClientById = (id: string): Promise<Client> => api.get(`/clients/${id}`);
export const createClient = (data: Record<string, unknown>): Promise<Client> =>
  api.post('/clients', data);
export const updateClient = (id: string, data: Record<string, unknown>): Promise<Client> =>
  api.patch(`/clients/${id}`, data);
export const deleteClient = (id: string): Promise<ApiAck> => api.post(`/clients/${id}/delete`);

// Brands
export const getBrands = (clientId?: string): Promise<Brand[]> =>
  api.get('/brands', { params: { client_id: clientId } });
export const getBrandById = (id: string): Promise<Brand> => api.get(`/brands/${id}`);
export const createBrand = (data: Record<string, unknown>): Promise<Brand> =>
  api.post('/brands', data);
export const updateBrand = (id: string, data: Record<string, unknown>): Promise<Brand> =>
  api.patch(`/brands/${id}`, data);
export const deleteBrand = (id: string): Promise<ApiAck> => api.post(`/brands/${id}/delete`);

// ─── Categories ───────────────────────────────────────
export const getCustomCategories = (clientId?: string): Promise<Category[]> => {
  const params = clientId ? { client_id: clientId } : {};
  return api.get('/categories', { params });
};
export const createCustomCategory = (
  name: string,
  clientId?: string,
  brandId?: string,
): Promise<Category> => api.post('/categories', { name, client_id: clientId, brand_id: brandId });

// ─── Campaigns ────────────────────────────────────────
export const getCampaigns = (): Promise<Campaign[]> => api.get('/campaigns');
export const getCampaignById = (id: string): Promise<Campaign> => api.get(`/campaigns/${id}`);
export const createCampaign = (data: Partial<Campaign>): Promise<Campaign> =>
  api.post('/campaigns', data);
export const updateCampaign = (id: string, data: Partial<Campaign>): Promise<Campaign> =>
  api.patch(`/campaigns/${id}`, data);
export const deleteCampaign = (id: string): Promise<ApiAck> => api.post(`/campaigns/${id}/delete`);
export const getCampaignTemplate = (id: string): Promise<OutreachTemplate | null> =>
  api.get(`/campaigns/${id}`).then((res) => (res as unknown as Campaign).template ?? null);
export const updateCampaignTemplate = (
  id: string,
  data: Partial<OutreachTemplate>,
): Promise<OutreachTemplate> => api.patch(`/campaigns/${id}/template`, data);
export const generateCampaignTemplate = (
  id: string,
): Promise<{ subject_line_template: string; body_template: string }> =>
  api.post(`/campaigns/${id}/generate-template`);

// AI (Gemini) suggestions for the new/edit campaign form — work without a saved campaign id
export const suggestCampaignDescription = (payload: {
  name: string;
  categories: string[];
  brand_name?: string;
  keywords?: string[];
}): Promise<{ description: string }> => api.post('/campaigns/ai/suggest-description', payload);
export const suggestCampaignKeywords = (payload: {
  name: string;
  description?: string;
  categories: string[];
}): Promise<{ keywords: string[] }> => api.post('/campaigns/ai/suggest-keywords', payload);

// ─── Campaign Leads ───────────────────────────────────
export const getCampaignLeads = (campaignId: string): Promise<Creator[]> =>
  api.get(`/campaigns/${campaignId}/leads`);

// ─── Global Dashboard (NEW ENDPOINTS) ──────────────────
// Note: For testing the Dashboard pipeline UI, we fetch all campaigns and creators across the system
// to sum up the totals on the frontend until a dedicated /stats endpoint is built.
// Walk every page so the directory shows all creators, not just the first
// page. The backend caps pageSize at 500; we keep fetching until a short page
// signals the end. TanStack Query dedups concurrent callers and caches the
// fully-assembled list (see useAllCreators). C1 will replace this whole-dataset
// walk with server-side pagination/search.
export const getAllCreators = async (): Promise<Creator[]> => {
  const pageSize = 500;
  const token = localStorage.getItem('ats_token');

  // 1. Fetch first page with raw axios to bypass interceptor and read the 'total' count
  const firstRes = await axios.get(`${api.defaults.baseURL}/creators`, {
    params: { page: 1, pageSize },
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    withCredentials: true,
  });

  if (!firstRes.data || !firstRes.data.success) throw new Error('Failed to load creators');

  const all: Creator[] = firstRes.data.data || [];
  const total = firstRes.data.total || 0;

  // 2. Fetch all remaining pages perfectly in parallel
  if (total > pageSize) {
    const promises: Array<Promise<Creator[]>> = [];
    const totalPages = Math.ceil(total / pageSize);
    for (let p = 2; p <= totalPages; p++) {
      // We can safely use the 'api' instance here since the interceptor unwraps to the array
      promises.push(
        api.get('/creators', { params: { page: p, pageSize } }) as unknown as Promise<Creator[]>,
      );
    }
    const results = await Promise.all(promises);
    results.forEach((batch) => {
      if (Array.isArray(batch)) all.push(...batch);
    });
  }

  return all;
};
export const getCreatorById = (creatorId: string): Promise<Creator> =>
  api.get(`/creators/${creatorId}`);
// ─── Statistics ───────────────────────────────────────
export const getDashboardStats = (campaignId?: string): Promise<DashboardStats> =>
  api.get('/stats/dashboard', { params: { campaignId } });

// ─── AI Discovery ─────────────────────────────────────
export const triggerDiscovery = (
  categories: string[],
  city: string,
  campaignId: string,
  keywords: string[] = [],
): Promise<unknown> =>
  api.post('/creators/ai-discovery', { categories, city, campaign_id: campaignId, keywords });

export const findSimilarCreators = (creatorId: string, campaignId: string): Promise<Creator[]> =>
  api.post(`/creators/${creatorId}/similar?campaignId=${campaignId}`);

export const regenerateCreatorSummary = (creatorId: string): Promise<{ summary: string }> =>
  api.post(`/creators/${creatorId}/regenerate-summary`);

export const updateCreatorNotes = (creatorId: string, notes: string): Promise<Creator> =>
  api.put(`/creators/${creatorId}/notes`, { notes });

export const bookMeeting = (
  creatorId: string,
  campaignId: string,
  date: string,
  notes: string,
): Promise<Meeting> =>
  api.post('/conversions/book-meeting', {
    creator_id: creatorId,
    campaign_id: campaignId,
    date,
    notes,
  });

export const getMeetings = (): Promise<Meeting[]> => api.get('/conversions/meetings');

export const approvePartner = (meetingId: string): Promise<ApiAck> =>
  api.post('/conversions/approve-partner', { meeting_id: meetingId, outcome: 'approved' });

// ─── Review ───────────────────────────────────────────
export const reviewLead = (
  creatorId: string,
  action: 'approve' | 'reject' | 'shortlist' | 'revoke',
  custom_subject?: string,
  custom_body?: string,
  message_type?: string,
  custom_to?: string,
): Promise<ApiAck> =>
  api.patch(`/creators/${creatorId}/review`, {
    action,
    custom_subject,
    custom_body,
    message_type,
    custom_to,
  });

// ─── Outreach ─────────────────────────────────────────
export const sendCampaignOutreach = (
  campaignId: string,
): Promise<{ sent: number; failed: number }> =>
  api.post('/outreach/send', { campaign_id: campaignId }).then((res) => {
    const r = res as unknown as {
      stats?: { sent: number; failed: number };
      sent?: number;
      failed?: number;
    };
    return r.stats ?? { sent: r.sent ?? 0, failed: r.failed ?? 0 };
  });

export const sendSingleOutreach = (
  creatorId: string,
  campaignId?: string,
  customSubject?: string,
  customBody?: string,
  message_type?: string,
): Promise<ApiAck> =>
  api.post('/outreach/send-single', {
    creator_id: creatorId,
    campaign_id: campaignId,
    customSubject,
    customBody,
    message_type,
  });

export const previewOutreach = (
  creatorId: string,
  campaignId?: string,
  message_type?: string,
  extraParams?: Record<string, unknown>,
): Promise<{ subject: string; body: string; to: string | null }> =>
  api.get('/outreach/preview', {
    params: {
      creator_id: creatorId,
      campaign_id: campaignId,
      message_type,
      _t: Date.now(),
      ...extraParams,
    },
  });

export const getOutreachLogs = (): Promise<OutreachLog[]> => api.get('/outreach/logs');

// ─── Conversations ────────────────────────────────────
export const getConversations = (): Promise<Creator[]> => api.get('/conversations');
export const syncConversations = (): Promise<{ synced: number }> => api.post('/conversations/sync');
export const getConversationThread = (id: string): Promise<ConversationMessage[]> =>
  api.get(`/conversations/${id}`);

// ─── Affiliate Tracking ───────────────────────────────
export const getAffiliatePerformance = (campaign_id?: string): Promise<AffiliatePerformance[]> =>
  api.get('/affiliates/performance', { params: { campaign_id } });

export const linkAffiliate = (data: {
  campaign_id: string;
  creator_id: string;
  affiliate_code?: string;
  affiliate_link?: string;
}): Promise<AffiliatePerformance> => api.post('/affiliates/link', data);

export const updateAffiliateStatus = (id: string, status: string): Promise<AffiliatePerformance> =>
  api.patch(`/affiliates/${id}/status`, { status });

// ─── Media Kit Upload & Analytics ─────────────────────
export const uploadMediaKit = async (
  creatorId: string,
  file: File,
): Promise<{ success: boolean; media_kit_url: string; message: string }> => {
  const formData = new FormData();
  formData.append('media_kit', file);
  return api.post(`/media-kits/${creatorId}/upload-media-kit`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const getAudienceAnalytics = (
  creatorId: string,
): Promise<{
  profile: Record<string, unknown>;
  media_kit_url: string | null;
  media_kit_parsed_at: string | null;
} | null> => api.get(`/media-kits/${creatorId}/audience-analytics`);

// Returns a short-lived signed URL for the stored media kit PDF.
// download=true forces a save dialog; otherwise the PDF opens inline (preview).
export const getMediaKitUrl = (
  creatorId: string,
  download = false,
): Promise<{ success: boolean; url: string }> =>
  api.get(`/media-kits/${creatorId}/media-kit-url`, {
    params: download ? { download: 1 } : undefined,
  });

// ─── Partnerships ──────────────────────────────────────
export const getPartnerships = (params?: {
  campaign_id?: string;
  status?: string;
  creator_tier?: string;
  offer_type?: string;
}): Promise<CreatorPartnership[]> => api.get('/partnerships', { params });

export const getPartnershipById = (id: string): Promise<CreatorPartnership> =>
  api.get(`/partnerships/${id}`);

export const createPartnership = (data: {
  creator_id: string;
  campaign_id: string;
  status?: string;
  [key: string]: unknown;
}): Promise<CreatorPartnership> => api.post('/partnerships', data);

export const updatePartnership = (
  id: string,
  data: Record<string, unknown>,
): Promise<CreatorPartnership> => api.patch(`/partnerships/${id}`, data);

export const markQualified = (id: string): Promise<CreatorPartnership> =>
  api.post(`/partnerships/${id}/mark-qualified`);

export const sendDiscoveryEmail = (
  id: string,
  customSubject?: string,
  customBody?: string,
  testEmail?: string,
): Promise<ApiAck> =>
  api.post(`/partnerships/${id}/send-discovery`, { customSubject, customBody, testEmail });

export const sendOffer = (
  id: string,
  offerData: {
    offer_type: string;
    flat_fee?: number;
    payment_timing?: string;
    payment_method?: string;
    shipment_included?: boolean;
    deliverables?: { platform: string; content_type: string; due_date: string; notes: string }[];
    affiliate_enabled?: boolean;
    affiliate_percentage?: number;
    affiliate_code?: string;
    affiliate_link?: string;
    customSubject?: string;
    customBody?: string;
    customTo?: string;
  },
): Promise<CreatorPartnership> => api.post(`/partnerships/${id}/send-offer`, offerData);

export const markAccepted = (id: string): Promise<CreatorPartnership> =>
  api.post(`/partnerships/${id}/mark-accepted`);

export const activatePartnership = (id: string): Promise<CreatorPartnership> =>
  api.post(`/partnerships/${id}/activate`);

export const completePartnership = (id: string): Promise<CreatorPartnership> =>
  api.post(`/partnerships/${id}/complete`);

export const rejectPartnership = (id: string): Promise<CreatorPartnership> =>
  api.post(`/partnerships/${id}/reject`);

// ─── Activities ────────────────────────────────────────
export const getActivities = (params?: {
  creator_id?: string;
  campaign_id?: string;
  activity_type?: string;
}): Promise<Activity[]> => api.get('/activities', { params });

export const getCreatorActivities = (creatorId: string): Promise<Activity[]> =>
  api.get(`/activities/creators/${creatorId}`);

export const getCampaignActivities = (campaignId: string): Promise<Activity[]> =>
  api.get(`/activities/campaigns/${campaignId}`);

// ─── Shipments ──────────────────────────────────────────
export const getShipments = (params?: {
  campaign_id?: string;
  status?: string;
  creator_id?: string;
}): Promise<Shipment[]> => api.get('/shipments', { params });

export const getShipmentById = (id: string): Promise<Shipment> => api.get(`/shipments/${id}`);

export const createShipment = (data: {
  creator_id: string;
  campaign_id: string;
  partnership_id?: string;
  product_name: string;
  product_sku?: string;
  quantity?: number;
  recipient_name?: string;
  shipping_address_line1?: string;
  shipping_address_line2?: string;
  shipping_city?: string;
  shipping_state?: string;
  shipping_zip?: string;
  shipping_country?: string;
  notes?: string;
}): Promise<Shipment> => api.post('/shipments', data);

export const updateShipment = (
  id: string,
  data: {
    status?: string;
    carrier?: string;
    tracking_number?: string;
    tracking_url?: string;
    notes?: string;
    recipient_name?: string;
    shipping_address_line1?: string;
    shipping_address_line2?: string;
    shipping_city?: string;
    shipping_state?: string;
    shipping_zip?: string;
    shipping_country?: string;
    estimated_delivery?: string | null;
  },
): Promise<Shipment> => api.patch(`/shipments/${id}`, data);

export const requestAddressShipment = (
  id: string,
  data?: { customSubject?: string; customBody?: string },
): Promise<ApiAck> => api.post(`/shipments/${id}/request-address`, data);

export const markReadyToShipShipment = (id: string): Promise<Shipment> =>
  api.post(`/shipments/${id}/mark-ready-to-ship`);

export const markShippedShipment = (
  id: string,
  trackingData?: {
    carrier?: string;
    tracking_number?: string;
    tracking_url?: string;
    estimated_delivery?: string | null;
  },
): Promise<Shipment> => api.post(`/shipments/${id}/mark-shipped`, trackingData);

export const markDeliveredShipment = (id: string): Promise<Shipment> =>
  api.post(`/shipments/${id}/mark-delivered`);

export const markFailedShipment = (id: string): Promise<Shipment> =>
  api.post(`/shipments/${id}/mark-failed`);

export const cancelShipment = (id: string): Promise<Shipment> =>
  api.post(`/shipments/${id}/cancel`);

// --- CONTENT ENDPOINTS ---

export const getContents = (params?: {
  campaign_id?: string;
  status?: string;
  creator_id?: string;
  platform?: string;
}): Promise<CreatorContent[]> => api.get('/content', { params });

export const getContentById = (id: string): Promise<CreatorContent> => api.get(`/content/${id}`);

// Params stay loose: callers assemble these from <select>/<input> values typed
// as plain strings, so a strict Partial<CreatorContent> union would reject them.
export const createContent = (data: Record<string, unknown>): Promise<CreatorContent> =>
  api.post('/content', data);

export const updateContent = (id: string, data: Record<string, unknown>): Promise<CreatorContent> =>
  api.patch(`/content/${id}`, data);

export const markContentSubmitted = (
  id: string,
  data: { content_url?: string; draft_url?: string; caption?: string; thumbnail_url?: string },
): Promise<CreatorContent> => api.post(`/content/${id}/mark-submitted`, data);

export const approveContent = (id: string): Promise<CreatorContent> =>
  api.post(`/content/${id}/approve`);

export const requestContentRevision = (
  id: string,
  data: { notes: string },
): Promise<CreatorContent> => api.post(`/content/${id}/request-revision`, data);

export const markContentPublished = (
  id: string,
  data: { content_url?: string; published_url?: string; published_at?: string },
): Promise<CreatorContent> => api.post(`/content/${id}/mark-published`, data);

export const rejectContent = (id: string, data: { notes: string }): Promise<CreatorContent> =>
  api.post(`/content/${id}/reject`, data);

export const syncContentPerformance = (id: string): Promise<CreatorContent> =>
  api.post(`/content/${id}/sync-performance`);

// --- ANALYTICS ENDPOINTS ---

export const getDashboardAnalytics = (): Promise<unknown> => api.get('/analytics/dashboard');

export const getCampaignFunnel = (campaignId: string): Promise<unknown> =>
  api.get(`/analytics/campaigns/${campaignId}/funnel`);

export const getCampaignContentPerformance = (campaignId: string): Promise<unknown> =>
  api.get(`/analytics/campaigns/${campaignId}/content-performance`);

export const recalculateCampaignPerformance = (campaignId: string): Promise<unknown> =>
  api.post(`/analytics/campaigns/${campaignId}/recalculate`);

// --- SYNC ENDPOINTS ---

export const syncCreator = (id: string, campaignId?: string): Promise<ApiAck> =>
  api.post(`/creators/${id}/sync`, {}, { params: { campaignId } });

export const syncCampaignCreators = (campaignId: string): Promise<ApiAck> =>
  api.post(`/campaigns/${campaignId}/sync-creators`, {});
