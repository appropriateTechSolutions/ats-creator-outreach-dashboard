import axios from 'axios';
import type { Campaign, Creator, AuthUser } from '../types';

export const api = axios.create({
  baseURL: 'http://localhost:8081/api', 
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
    return Promise.reject(error?.response?.data?.error || error.message);
  }
);

// ─── Auth ─────────────────────────────────────────────
export const login = async (email: string, password: string): Promise<{ user: AuthUser; access_token: string }> => {
  const res = await api.post('/auth/login', { email, password });
  localStorage.setItem('ats_token', res.access_token);
  return res as any;
};

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

// Clients
export const getClients = (): Promise<any[]> => api.get('/clients');
export const getClientById = (id: string): Promise<any> => api.get(`/clients/${id}`);
export const createClient = (data: any): Promise<any> => api.post('/clients', data);

// Brands
export const getBrands = (clientId?: string): Promise<any[]> => api.get('/brands', { params: { client_id: clientId } });
export const getBrandById = (id: string): Promise<any> => api.get(`/brands/${id}`);
export const createBrand = (data: any): Promise<any> => api.post('/brands', data);

// ─── Campaigns ────────────────────────────────────────
export const getCampaigns = (): Promise<Campaign[]> => api.get('/campaigns');
export const getCampaignById = (id: string): Promise<Campaign> => api.get(`/campaigns/${id}`);
export const createCampaign = (data: Partial<Campaign>): Promise<Campaign> => api.post('/campaigns', data);
export const updateCampaign = (id: string, data: Partial<Campaign>): Promise<Campaign> => api.put(`/campaigns/${id}`, data);
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
export const getDashboardStats = (): Promise<any> => api.get('/stats/dashboard');

// ─── AI Discovery ─────────────────────────────────────
export const triggerDiscovery = (categories: string[], city: string, campaignId: string, keywords: string[] = []): Promise<unknown> => 
  api.post('/creators/ai-discovery', { categories, city, campaign_id: campaignId, keywords });

export const bookMeeting = (creatorId: string, campaignId: string, date: string, notes: string): Promise<unknown> => 
  api.post('/conversions/book-meeting', { creator_id: creatorId, campaign_id: campaignId, date, notes });

export const getMeetings = (): Promise<any[]> => api.get('/conversions/meetings');

export const approvePartner = (meetingId: string): Promise<unknown> => 
  api.post('/conversions/approve-partner', { meeting_id: meetingId, outcome: 'approved' });

// ─── Review ───────────────────────────────────────────
export const reviewLead = (creatorId: string, action: 'approve' | 'reject', custom_subject?: string, custom_body?: string): Promise<unknown> => 
  api.patch(`/creators/${creatorId}/review`, { action, custom_subject, custom_body });

// ─── Outreach ─────────────────────────────────────────
export const sendCampaignOutreach = (campaignId: string): Promise<{ sent: number; failed: number }> => 
  api.post('/outreach/send', { campaign_id: campaignId }).then((res: any) => res.stats || res);

export const sendSingleOutreach = (creatorId: string, campaignId?: string, customSubject?: string, customBody?: string): Promise<any> =>
  api.post('/outreach/send-single', { creator_id: creatorId, campaign_id: campaignId, customSubject, customBody });

export const previewOutreach = (creatorId: string, campaignId?: string): Promise<{ subject: string; body: string }> =>
  api.get('/outreach/preview', { params: { creator_id: creatorId, campaign_id: campaignId } }) as any;

export const getOutreachLogs = (): Promise<any[]> => api.get('/outreach/logs');

// ─── Conversations ────────────────────────────────────
export const getConversations = (): Promise<Creator[]> => api.get('/conversations');
export const syncConversations = (): Promise<{ synced: number }> => api.post('/conversations/sync');
export const getConversationThread = (id: string): Promise<any[]> => api.get(`/conversations/${id}`);
