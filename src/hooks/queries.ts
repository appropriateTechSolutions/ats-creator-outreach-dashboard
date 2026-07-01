import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import * as api from '../lib/api';

// Typed read hooks over the existing api.ts functions. Components use these
// instead of the useState + useEffect + setState fetch pattern; TanStack handles
// caching, request dedup (kills the StrictMode double-fetch), and loading/error
// state. During the transition the api functions still hit the hand-rolled cache;
// that layer is retired once every read is on a hook.

export function useCampaigns() {
  return useQuery({ queryKey: queryKeys.campaigns.all, queryFn: api.getCampaigns });
}

export function useCampaign(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.campaigns.detail(id!),
    queryFn: () => api.getCampaignById(id!),
    enabled: !!id,
  });
}

export function useCampaignLeads(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.campaigns.leads(id!),
    queryFn: () => api.getCampaignLeads(id!),
    enabled: !!id,
  });
}

export function useAllCreators() {
  return useQuery({ queryKey: queryKeys.creators.all, queryFn: api.getAllCreators });
}

export function useCreator(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.creators.detail(id!),
    queryFn: () => api.getCreatorById(id!),
    enabled: !!id,
  });
}

export function useDashboardStats(campaignId?: string) {
  return useQuery({
    queryKey: queryKeys.stats.dashboard(campaignId),
    queryFn: () => api.getDashboardStats(campaignId),
  });
}

export function usePartnerships(params?: Parameters<typeof api.getPartnerships>[0]) {
  return useQuery({
    queryKey: queryKeys.partnerships.list(params),
    queryFn: () => api.getPartnerships(params),
  });
}

export function useShipments(params?: Parameters<typeof api.getShipments>[0]) {
  return useQuery({
    queryKey: queryKeys.shipments.list(params),
    queryFn: () => api.getShipments(params),
  });
}

export function useContents(params?: Parameters<typeof api.getContents>[0]) {
  return useQuery({
    queryKey: queryKeys.content.list(params),
    queryFn: () => api.getContents(params),
  });
}

export function useClients() {
  return useQuery({ queryKey: queryKeys.clients.all, queryFn: api.getClients });
}

export function useBrands(clientId?: string) {
  return useQuery({
    queryKey: queryKeys.brands.all(clientId),
    queryFn: () => api.getBrands(clientId),
  });
}

export function useUsers() {
  return useQuery({ queryKey: queryKeys.users.all, queryFn: api.getUsers });
}

export function useMeetings() {
  return useQuery({ queryKey: queryKeys.meetings.all, queryFn: api.getMeetings });
}

export function useConversations() {
  return useQuery({ queryKey: queryKeys.conversations.all, queryFn: api.getConversations });
}

export function useOutreachLogs() {
  return useQuery({ queryKey: queryKeys.outreachLogs.all, queryFn: api.getOutreachLogs });
}

export function useClient(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.clients.detail(id!),
    queryFn: () => api.getClientById(id!),
    enabled: !!id,
  });
}

export function useBrand(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.brands.detail(id!),
    queryFn: () => api.getBrandById(id!),
    enabled: !!id,
  });
}

export function useUser(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.users.detail(id!),
    queryFn: () => api.getUserById(id!),
    enabled: !!id,
  });
}

export function useShipment(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.shipments.detail(id!),
    queryFn: () => api.getShipmentById(id!),
    enabled: !!id,
  });
}

export function usePartnership(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.partnerships.detail(id!),
    queryFn: () => api.getPartnershipById(id!),
    enabled: !!id,
  });
}

export function useContent(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.content.detail(id!),
    queryFn: () => api.getContentById(id!),
    enabled: !!id,
  });
}

export function useCreatorActivities(creatorId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.activities.creator(creatorId!),
    queryFn: () => api.getCreatorActivities(creatorId!),
    enabled: !!creatorId,
  });
}

export function useCampaignActivities(campaignId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.activities.campaign(campaignId!),
    queryFn: () => api.getCampaignActivities(campaignId!),
    enabled: !!campaignId,
  });
}

export function useConversationThread(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.conversations.thread(id!),
    queryFn: () => api.getConversationThread(id!),
    enabled: !!id,
  });
}

export function useAffiliatePerformance(campaignId?: string) {
  return useQuery({
    queryKey: queryKeys.affiliates.performance(campaignId),
    queryFn: () => api.getAffiliatePerformance(campaignId),
  });
}
