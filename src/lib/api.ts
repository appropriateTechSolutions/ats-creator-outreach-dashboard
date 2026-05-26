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

api.interceptors.response.use(
  response => {
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

export const getUsers = (): Promise<any[]> => api.get('/users');
export const getUserById = (id: string): Promise<any> => api.get(`/users/${id}`);

export const verifyInvite = (token: string): Promise<any> => 
  api.get(`/auth/invite/verify?token=${token}`);

export const acceptInvite = (data: { token: string, password: string }): Promise<void> => api.post('/auth/invite/accept', data);

export const resendInvite = (id: string): Promise<any> => api.post(`/users/${id}/resend-invite`);

export const disableUser = (id: string): Promise<any> => api.post(`/users/${id}/disable`);
export const deleteUser = (id: string): Promise<any> => api.post(`/users/${id}/delete`);

// Clients
export const getClients = (): Promise<any[]> => api.get('/clients');
export const getClientById = (id: string): Promise<any> => api.get(`/clients/${id}`);
export const createClient = (data: any): Promise<any> => api.post('/clients', data);
export const updateClient = (id: string, data: any): Promise<any> => api.patch(`/clients/${id}`, data);
export const deleteClient = (id: string): Promise<any> => api.post(`/clients/${id}/delete`);

// Brands
export const getBrands = (clientId?: string): Promise<any[]> => api.get('/brands', { params: { client_id: clientId } });
export const getBrandById = (id: string): Promise<any> => api.get(`/brands/${id}`);
export const createBrand = (data: any): Promise<any> => api.post('/brands', data);
export const updateBrand = (id: string, data: any): Promise<any> => api.patch(`/brands/${id}`, data);
export const deleteBrand = (id: string): Promise<any> => api.post(`/brands/${id}/delete`);

// ─── Categories ───────────────────────────────────────
export const getCustomCategories = (clientId?: string): Promise<any[]> => {
  const params = clientId ? { client_id: clientId } : {};
  return api.get('/categories', { params });
};
export const createCustomCategory = (name: string, clientId?: string, brandId?: string): Promise<any> => 
  api.post('/categories', { name, client_id: clientId, brand_id: brandId });

// ─── Campaigns ────────────────────────────────────────
export const getCampaigns = (): Promise<Campaign[]> => api.get('/campaigns');
export const getCampaignById = (id: string): Promise<Campaign> => api.get(`/campaigns/${id}`);
export const createCampaign = (data: Partial<Campaign>): Promise<Campaign> => api.post('/campaigns', data);
export const updateCampaign = (id: string, data: Partial<Campaign>): Promise<Campaign> => api.patch(`/campaigns/${id}`, data);
export const deleteCampaign = (id: string): Promise<any> => api.post(`/campaigns/${id}/delete`);
export const getCampaignTemplate = (id: string): Promise<any> => api.get(`/campaigns/${id}`).then(res => (res as any).template);
export const updateCampaignTemplate = (id: string, data: any): Promise<any> => api.patch(`/campaigns/${id}/template`, data);

// ─── Campaign Leads ───────────────────────────────────
export const getCampaignLeads = (campaignId: string): Promise<Creator[]> => api.get(`/campaigns/${campaignId}/leads`);

// ─── Global Dashboard (NEW ENDPOINTS) ──────────────────
// Note: For testing the Dashboard pipeline UI, we fetch all campaigns and creators across the system
// to sum up the totals on the frontend until a dedicated /stats endpoint is built.
export const getAllCreators = (): Promise<Creator[]> => api.get('/creators');
export const getCreatorById = (creatorId: string): Promise<Creator> => api.get(`/creators/${creatorId}`);
// ─── Statistics ───────────────────────────────────────
export const getDashboardStats = (campaignId?: string): Promise<any> => 
  api.get('/stats/dashboard', { params: { campaignId } });

// ─── AI Discovery ─────────────────────────────────────
export const triggerDiscovery = (categories: string[], city: string, campaignId: string, keywords: string[] = []): Promise<unknown> => 
  api.post('/creators/ai-discovery', { categories, city, campaign_id: campaignId, keywords });

export const findSimilarCreators = (creatorId: string, campaignId: string): Promise<any> => 
  api.post(`/creators/${creatorId}/similar?campaignId=${campaignId}`);

export const bookMeeting = (creatorId: string, campaignId: string, date: string, notes: string): Promise<unknown> => 
  api.post('/conversions/book-meeting', { creator_id: creatorId, campaign_id: campaignId, date, notes });

export const getMeetings = (): Promise<any[]> => api.get('/conversions/meetings');

export const approvePartner = (meetingId: string): Promise<unknown> => 
  api.post('/conversions/approve-partner', { meeting_id: meetingId, outcome: 'approved' });

// ─── Review ───────────────────────────────────────────
export const reviewLead = (creatorId: string, action: 'approve' | 'reject' | 'shortlist', custom_subject?: string, custom_body?: string, message_type?: string): Promise<unknown> => 
  api.patch(`/creators/${creatorId}/review`, { action, custom_subject, custom_body, message_type });

// ─── Outreach ─────────────────────────────────────────
export const sendCampaignOutreach = (campaignId: string): Promise<{ sent: number; failed: number }> => 
  api.post('/outreach/send', { campaign_id: campaignId }).then((res: any) => res.stats || res);

export const sendSingleOutreach = (creatorId: string, campaignId?: string, customSubject?: string, customBody?: string, message_type?: string): Promise<any> =>
  api.post('/outreach/send-single', { creator_id: creatorId, campaign_id: campaignId, customSubject, customBody, message_type });

export const previewOutreach = (creatorId: string, campaignId?: string, message_type?: string): Promise<{ subject: string; body: string }> =>
  api.get('/outreach/preview', { params: { creator_id: creatorId, campaign_id: campaignId, message_type } }) as any;

export const getOutreachLogs = (): Promise<any[]> => api.get('/outreach/logs');

// ─── Conversations ────────────────────────────────────
export const getConversations = (): Promise<Creator[]> => api.get('/conversations');
export const syncConversations = (): Promise<{ synced: number }> => api.post('/conversations/sync');
export const getConversationThread = (id: string): Promise<any[]> => api.get(`/conversations/${id}`);

// ─── Affiliate Tracking ───────────────────────────────
export const getAffiliatePerformance = (campaign_id?: string): Promise<any[]> => 
  api.get('/affiliates/performance', { params: { campaign_id } });

export const linkAffiliate = (data: { campaign_id: string; creator_id: string; affiliate_code?: string; affiliate_link?: string }): Promise<any> =>
  api.post('/affiliates/link', data);

export const updateAffiliateStatus = (id: string, status: string): Promise<any> =>
  api.patch(`/affiliates/${id}/status`, { status });
