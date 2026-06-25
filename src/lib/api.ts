import axios from 'axios';
import type { Campaign, Creator, AuthUser } from '../types';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8081/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('ats_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Lightweight GET cache + in-flight dedup ──────────────────────────
// The dashboard talks to a US-hosted API; every request is a long-haul round
// trip. This layer (a) collapses concurrent/duplicate identical GETs into one
// network call (kills StrictMode double-fire and overlapping fetches) and
// (b) serves repeat reads from memory for a short window so switching tabs is
// instant instead of re-fetching the same lists. Any write clears the cache.
const CACHE_TTL = 60000; // 60s — sit under the backend's cache horizon
const responseCache = new Map<string, { data: any; ts: number }>();
const inFlight = new Map<string, Promise<any>>();

function cachedGet<T>(key: string, fetcher: () => Promise<T>, ttl = CACHE_TTL): Promise<T> {
  const hit = responseCache.get(key);
  if (hit && Date.now() - hit.ts < ttl) {
    return Promise.resolve(hit.data as T);
  }
  const pending = inFlight.get(key);
  if (pending) return pending as Promise<T>;

  const p = fetcher()
    .then(data => {
      responseCache.set(key, { data, ts: Date.now() });
      inFlight.delete(key);
      return data;
    })
    .catch(err => {
      inFlight.delete(key);
      throw err;
    });
  inFlight.set(key, p);
  return p;
}

// Clear cached reads. Called automatically after any write (see interceptor).
export function invalidateCache(prefix?: string) {
  if (!prefix) {
    responseCache.clear();
    return;
  }
  for (const k of Array.from(responseCache.keys())) {
    if (k.startsWith(prefix)) responseCache.delete(k);
  }
}

// Map URL patterns → the cache key prefix they should invalidate.
// Only the resource that changed is cleared — everything else stays warm.
const MUTATION_INVALIDATION_MAP: Array<{ pattern: RegExp; prefix: string }> = [
  { pattern: /\/partnerships/, prefix: 'partnerships' },
  { pattern: /\/shipments/, prefix: 'shipments' },
  { pattern: /\/content/, prefix: 'content' },
  { pattern: /\/activities/, prefix: 'activities' },
  { pattern: /\/campaigns/, prefix: 'campaigns' },
  { pattern: /\/creators/, prefix: 'creators' },
  { pattern: /\/outreach/, prefix: 'outreach-logs' },
  { pattern: /\/conversations/, prefix: 'conversations' },
];

api.interceptors.response.use(
  response => {
    // Any successful mutation invalidates only the related cache prefix.
    const method = (response.config.method || 'get').toLowerCase();
    if (method !== 'get') {
      const url = response.config.url || '';
      const matched = MUTATION_INVALIDATION_MAP.find(({ pattern }) => pattern.test(url));
      if (matched) {
        invalidateCache(matched.prefix);
      } else {
        // Unknown endpoint — fall back to clearing everything to be safe
        invalidateCache();
      }
    }
    if (!response.data.success && response.data.error) {
      return Promise.reject(new Error(response.data.error));
    }
    return response.data.data !== undefined ? response.data.data : response.data;
  },
  error => {
    // Enhanced error handling with more details
    const errorMessage = error?.response?.data?.error
      || error?.response?.data?.message
      || error?.message
      || 'An unexpected error occurred';

    // Log detailed error for debugging
    if (error?.response) {
      console.error('API Error:', {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        data: error.response?.data
      });
    }

    return Promise.reject(error?.response?.data || new Error(errorMessage));
  }
);

// ─── Auth ─────────────────────────────────────────────
export const login = async (email: string, password: string): Promise<{ user: AuthUser; access_token: string }> => {
  const res = await api.post('/auth/login', { email, password }) as any;
  localStorage.setItem('ats_token', res.access_token);
  return res;
};

export const forgotPassword = (email: string): Promise<{ success: boolean; message: string }> =>
  api.post('/auth/forgot-password', { email });

export const resetPassword = (data: { token: string, newPassword: string }): Promise<{ success: boolean; message: string }> =>
  api.post('/auth/reset-password', data);

export const getMe = (): Promise<AuthUser> => api.get('/auth/me');

export const logout = async (): Promise<void> => {
  await api.post('/auth/logout');
  localStorage.removeItem('ats_token');
};

export const inviteUser = (data: { full_name: string, email: string, role: string, client_id?: string, user_type?: string }) =>
  api.post('/users/invite', data);

export const getUsers = (): Promise<any[]> => cachedGet('users', () => api.get('/users'));
export const getUserById = (id: string): Promise<any> => api.get(`/users/${id}`);

export const verifyInvite = (token: string): Promise<any> =>
  api.get(`/auth/invite/verify?token=${token}`);

export const acceptInvite = (data: { token: string, password: string }): Promise<void> => api.post('/auth/invite/accept', data);

export const resendInvite = (id: string): Promise<any> => api.post(`/users/${id}/resend-invite`);

export const disableUser = (id: string): Promise<any> => api.post(`/users/${id}/disable`);
export const deleteUser = (id: string): Promise<any> => api.post(`/users/${id}/delete`);

// Clients
export const getClients = (): Promise<any[]> => cachedGet('clients', () => api.get('/clients'));
export const getClientById = (id: string): Promise<any> => api.get(`/clients/${id}`);
export const createClient = (data: any): Promise<any> => api.post('/clients', data);
export const updateClient = (id: string, data: any): Promise<any> => api.patch(`/clients/${id}`, data);
export const deleteClient = (id: string): Promise<any> => api.post(`/clients/${id}/delete`);

// Brands
export const getBrands = (clientId?: string): Promise<any[]> =>
  cachedGet(`brands:${clientId || ''}`, () => api.get('/brands', { params: { client_id: clientId } }));
export const getBrandById = (id: string): Promise<any> => api.get(`/brands/${id}`);
export const createBrand = (data: any): Promise<any> => api.post('/brands', data);
export const updateBrand = (id: string, data: any): Promise<any> => api.patch(`/brands/${id}`, data);
export const deleteBrand = (id: string): Promise<any> => api.post(`/brands/${id}/delete`);

// ─── Categories ───────────────────────────────────────
export const getCustomCategories = (clientId?: string): Promise<any[]> => {
  const params = clientId ? { client_id: clientId } : {};
  return cachedGet(`categories:${clientId || ''}`, () => api.get('/categories', { params }));
};
export const createCustomCategory = (name: string, clientId?: string, brandId?: string): Promise<any> =>
  api.post('/categories', { name, client_id: clientId, brand_id: brandId });

// ─── Campaigns ────────────────────────────────────────
export const getCampaigns = (): Promise<Campaign[]> => cachedGet('campaigns', () => api.get('/campaigns'));
export const getCampaignById = (id: string): Promise<Campaign> => cachedGet(`campaigns:${id}`, () => api.get(`/campaigns/${id}`));
export const createCampaign = (data: Partial<Campaign>): Promise<Campaign> => api.post('/campaigns', data);
export const updateCampaign = (id: string, data: Partial<Campaign>): Promise<Campaign> => api.patch(`/campaigns/${id}`, data);
export const deleteCampaign = (id: string): Promise<any> => api.post(`/campaigns/${id}/delete`);
export const getCampaignTemplate = (id: string): Promise<any> => api.get(`/campaigns/${id}`).then(res => (res as any).template);
export const updateCampaignTemplate = (id: string, data: any): Promise<any> => api.patch(`/campaigns/${id}/template`, data);
export const generateCampaignTemplate = (id: string): Promise<{ subject_line_template: string; body_template: string }> =>
  api.post(`/campaigns/${id}/generate-template`) as any;

// AI (Gemini) suggestions for the new/edit campaign form — work without a saved campaign id
export const suggestCampaignDescription = (payload: { name: string; categories: string[]; brand_name?: string; keywords?: string[] }): Promise<{ description: string }> =>
  api.post('/campaigns/ai/suggest-description', payload) as any;
export const suggestCampaignKeywords = (payload: { name: string; description?: string; categories: string[] }): Promise<{ keywords: string[] }> =>
  api.post('/campaigns/ai/suggest-keywords', payload) as any;

// ─── Campaign Leads ───────────────────────────────────
export const getCampaignLeads = (campaignId: string): Promise<Creator[]> =>
  cachedGet(`campaigns:leads:${campaignId}`, () => api.get(`/campaigns/${campaignId}/leads`));

// ─── Global Dashboard (NEW ENDPOINTS) ──────────────────
// Note: For testing the Dashboard pipeline UI, we fetch all campaigns and creators across the system
// to sum up the totals on the frontend until a dedicated /stats endpoint is built.
// Walk every page so the directory shows all creators, not just the first
// page. The backend caps pageSize at 500; we request 200 and keep fetching
// until a short page signals the end. cachedGet dedups concurrent callers and
// caches the fully-assembled list.
export const getAllCreators = (): Promise<Creator[]> =>
  cachedGet('creators', async () => {
    const pageSize = 200;
    const all: Creator[] = [];
    for (let page = 1; ; page++) {
      const batch = (await api.get('/creators', { params: { page, pageSize } })) as unknown as Creator[];
      all.push(...batch);
      if (!batch || batch.length < pageSize) break;
    }
    return all;
  });
export const getCreatorById = (creatorId: string): Promise<Creator> => api.get(`/creators/${creatorId}`);
// ─── Statistics ───────────────────────────────────────
export const getDashboardStats = (campaignId?: string): Promise<any> =>
  cachedGet(`stats:${campaignId || ''}`, () => api.get('/stats/dashboard', { params: { campaignId } }));

// ─── AI Discovery ─────────────────────────────────────
export const triggerDiscovery = (categories: string[], city: string, campaignId: string, keywords: string[] = []): Promise<unknown> =>
  api.post('/creators/ai-discovery', { categories, city, campaign_id: campaignId, keywords });

export const findSimilarCreators = (creatorId: string, campaignId: string): Promise<any> =>
  api.post(`/creators/${creatorId}/similar?campaignId=${campaignId}`);

export const regenerateCreatorSummary = (creatorId: string): Promise<{ summary: string }> =>
  api.post(`/creators/${creatorId}/regenerate-summary`);

export const updateCreatorNotes = (creatorId: string, notes: string): Promise<Creator> =>
  api.put(`/creators/${creatorId}/notes`, { notes });

export const bookMeeting = (creatorId: string, campaignId: string, date: string, notes: string): Promise<unknown> =>
  api.post('/conversions/book-meeting', { creator_id: creatorId, campaign_id: campaignId, date, notes });

export const getMeetings = (): Promise<any[]> => cachedGet('meetings', () => api.get('/conversions/meetings'));

export const approvePartner = (meetingId: string): Promise<unknown> =>
  api.post('/conversions/approve-partner', { meeting_id: meetingId, outcome: 'approved' });

// ─── Review ───────────────────────────────────────────
export const reviewLead = (creatorId: string, action: 'approve' | 'reject' | 'shortlist' | 'revoke', custom_subject?: string, custom_body?: string, message_type?: string, custom_to?: string): Promise<unknown> =>
  api.patch(`/creators/${creatorId}/review`, { action, custom_subject, custom_body, message_type, custom_to });

// ─── Outreach ─────────────────────────────────────────
export const sendCampaignOutreach = (campaignId: string): Promise<{ sent: number; failed: number }> =>
  api.post('/outreach/send', { campaign_id: campaignId }).then((res: any) => res.stats || res);

export const sendSingleOutreach = (creatorId: string, campaignId?: string, customSubject?: string, customBody?: string, message_type?: string): Promise<any> =>
  api.post('/outreach/send-single', { creator_id: creatorId, campaign_id: campaignId, customSubject, customBody, message_type });

export const previewOutreach = (creatorId: string, campaignId?: string, message_type?: string, extraParams?: any): Promise<{ subject: string; body: string; to: string | null }> =>
  api.get('/outreach/preview', { params: { creator_id: creatorId, campaign_id: campaignId, message_type, _t: Date.now(), ...extraParams } }) as any;

export const getOutreachLogs = (): Promise<any[]> => cachedGet('outreach-logs', () => api.get('/outreach/logs'));

// ─── Conversations ────────────────────────────────────
export const getConversations = (): Promise<Creator[]> => cachedGet('conversations', () => api.get('/conversations'));
export const syncConversations = (): Promise<{ synced: number }> => api.post('/conversations/sync');
export const getConversationThread = (id: string): Promise<any[]> => api.get(`/conversations/${id}`);

// ─── Affiliate Tracking ───────────────────────────────
export const getAffiliatePerformance = (campaign_id?: string): Promise<any[]> =>
  cachedGet(`affiliates:${campaign_id || ''}`, () => api.get('/affiliates/performance', { params: { campaign_id } }));

export const linkAffiliate = (data: { campaign_id: string; creator_id: string; affiliate_code?: string; affiliate_link?: string }): Promise<any> =>
  api.post('/affiliates/link', data);

export const updateAffiliateStatus = (id: string, status: string): Promise<any> =>
  api.patch(`/affiliates/${id}/status`, { status });

// ─── Media Kit Upload & Analytics ─────────────────────
export const uploadMediaKit = async (creatorId: string, file: File): Promise<{ success: boolean; media_kit_url: string; message: string }> => {
  const formData = new FormData();
  formData.append('media_kit', file);
  return api.post(`/media-kits/${creatorId}/upload-media-kit`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  }) as any;
};

export const getAudienceAnalytics = (creatorId: string): Promise<{ profile: any; media_kit_url: string | null; media_kit_parsed_at: string | null } | null> =>
  api.get(`/media-kits/${creatorId}/audience-analytics`) as any;

// Returns a short-lived signed URL for the stored media kit PDF.
// download=true forces a save dialog; otherwise the PDF opens inline (preview).
export const getMediaKitUrl = (creatorId: string, download = false): Promise<{ success: boolean; url: string }> =>
  api.get(`/media-kits/${creatorId}/media-kit-url`, {
    params: download ? { download: 1 } : undefined
  }) as any;

// ─── Partnerships ──────────────────────────────────────
export const getPartnerships = (params?: { campaign_id?: string; status?: string; creator_tier?: string; offer_type?: string }): Promise<any[]> =>
  cachedGet(`partnerships:${JSON.stringify(params || {})}`, () => api.get('/partnerships', { params }) as any);

export const getPartnershipById = (id: string): Promise<any> =>
  cachedGet(`partnerships:${id}`, () => api.get(`/partnerships/${id}`) as any);

export const createPartnership = (data: { creator_id: string; campaign_id: string; status?: string;[key: string]: any }): Promise<any> =>
  api.post('/partnerships', data) as any;

export const updatePartnership = (id: string, data: any): Promise<any> =>
  api.patch(`/partnerships/${id}`, data) as any;

export const markQualified = (id: string): Promise<any> =>
  api.post(`/partnerships/${id}/mark-qualified`) as any;

export const sendDiscoveryEmail = (id: string, customSubject?: string, customBody?: string, testEmail?: string): Promise<any> =>
  api.post(`/partnerships/${id}/send-discovery`, { customSubject, customBody, testEmail }) as any;

export const sendOffer = (id: string, offerData: {
  offer_type: string;
  flat_fee?: number;
  payment_timing?: string;
  payment_method?: string;
  shipment_included?: boolean;
  deliverables?: { platform: string, content_type: string, due_date: string, notes: string }[];
  affiliate_enabled?: boolean;
  affiliate_percentage?: number;
  affiliate_code?: string;
  affiliate_link?: string;
  customSubject?: string;
  customBody?: string;
  customTo?: string;
}): Promise<any> =>
  api.post(`/partnerships/${id}/send-offer`, offerData) as any;

export const markAccepted = (id: string): Promise<any> =>
  api.post(`/partnerships/${id}/mark-accepted`) as any;

export const activatePartnership = (id: string): Promise<any> =>
  api.post(`/partnerships/${id}/activate`) as any;

export const completePartnership = (id: string): Promise<any> =>
  api.post(`/partnerships/${id}/complete`) as any;

export const rejectPartnership = (id: string): Promise<any> =>
  api.post(`/partnerships/${id}/reject`) as any;

// ─── Activities ────────────────────────────────────────
export const getActivities = (params?: { creator_id?: string; campaign_id?: string; activity_type?: string }): Promise<any[]> =>
  cachedGet(`activities:${JSON.stringify(params || {})}`, () => api.get('/activities', { params }) as any);

export const getCreatorActivities = (creatorId: string): Promise<any[]> =>
  cachedGet(`activities:creator:${creatorId}`, () => api.get(`/activities/creators/${creatorId}`) as any);

export const getCampaignActivities = (campaignId: string): Promise<any[]> =>
  cachedGet(`activities:campaign:${campaignId}`, () => api.get(`/activities/campaigns/${campaignId}`) as any);

// ─── Shipments ──────────────────────────────────────────
export const getShipments = (params?: { campaign_id?: string; status?: string; creator_id?: string }): Promise<any[]> =>
  cachedGet(`shipments:${JSON.stringify(params || {})}`, () => api.get('/shipments', { params }) as any);

export const getShipmentById = (id: string): Promise<any> =>
  cachedGet(`shipments:${id}`, () => api.get(`/shipments/${id}`) as any);

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
}): Promise<any> =>
  api.post('/shipments', data) as any;

export const updateShipment = (id: string, data: {
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
}): Promise<any> =>
  api.patch(`/shipments/${id}`, data) as any;

export const requestAddressShipment = (id: string, data?: { customSubject?: string; customBody?: string }): Promise<any> =>
  api.post(`/shipments/${id}/request-address`, data) as any;

export const markReadyToShipShipment = (id: string): Promise<any> =>
  api.post(`/shipments/${id}/mark-ready-to-ship`) as any;

export const markShippedShipment = (id: string, trackingData?: {
  carrier?: string;
  tracking_number?: string;
  tracking_url?: string;
  estimated_delivery?: string | null;
}): Promise<any> =>
  api.post(`/shipments/${id}/mark-shipped`, trackingData) as any;

export const markDeliveredShipment = (id: string): Promise<any> =>
  api.post(`/shipments/${id}/mark-delivered`) as any;

export const markFailedShipment = (id: string): Promise<any> =>
  api.post(`/shipments/${id}/mark-failed`) as any;

export const cancelShipment = (id: string): Promise<any> =>
  api.post(`/shipments/${id}/cancel`) as any;

// --- CONTENT ENDPOINTS ---

export const getContents = (params?: { campaign_id?: string; status?: string; creator_id?: string; platform?: string }): Promise<any[]> =>
  cachedGet(`content:${JSON.stringify(params || {})}`, () => api.get('/content', { params }) as any);

export const getContentById = (id: string): Promise<any> =>
  cachedGet(`content:${id}`, () => api.get(`/content/${id}`) as any);

export const createContent = (data: Partial<any>): Promise<any> =>
  api.post('/content', data) as any;

export const updateContent = (id: string, data: Partial<any>): Promise<any> =>
  api.patch(`/content/${id}`, data) as any;

export const markContentSubmitted = (id: string, data: { content_url?: string; draft_url?: string; caption?: string; thumbnail_url?: string }): Promise<any> =>
  api.post(`/content/${id}/mark-submitted`, data) as any;

export const approveContent = (id: string): Promise<any> =>
  api.post(`/content/${id}/approve`) as any;

export const requestContentRevision = (id: string, data: { notes: string }): Promise<any> =>
  api.post(`/content/${id}/request-revision`, data) as any;

export const markContentPublished = (id: string, data: { content_url?: string; published_url?: string; published_at?: string }): Promise<any> =>
  api.post(`/content/${id}/mark-published`, data) as any;

export const rejectContent = (id: string, data: { notes: string }): Promise<any> =>
  api.post(`/content/${id}/reject`, data) as any;

export const syncContentPerformance = (id: string): Promise<any> =>
  api.post(`/content/${id}/sync-performance`) as any;

// --- ANALYTICS ENDPOINTS ---

export const getDashboardAnalytics = (): Promise<any> =>
  api.get('/analytics/dashboard') as any;

export const getCampaignFunnel = (campaignId: string): Promise<any> =>
  api.get(`/analytics/campaigns/${campaignId}/funnel`) as any;

export const getCampaignContentPerformance = (campaignId: string): Promise<any> =>
  api.get(`/analytics/campaigns/${campaignId}/content-performance`) as any;

export const recalculateCampaignPerformance = (campaignId: string): Promise<any> =>
  api.post(`/analytics/campaigns/${campaignId}/recalculate`) as any;

// --- SYNC ENDPOINTS ---

export const syncCreator = (id: string, campaignId?: string): Promise<any> =>
  api.post(`/creators/${id}/sync`, {}, { params: { campaignId } }) as any;

export const syncCampaignCreators = (campaignId: string): Promise<any> =>
  api.post(`/campaigns/${campaignId}/sync-creators`, {}) as any;


