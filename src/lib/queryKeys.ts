// Centralized query-key factory. Keys are arrays; TanStack matches by prefix,
// so invalidating a root (e.g. ['partnerships']) clears every list/detail under
// it. This is what lets mutations invalidate exactly the right resources —
// including *cross-resource* ones (a partnership write also invalidates
// ['creators'] because the Creators list derives status from partnerships) —
// fixing the coarse, cross-resource-blind invalidation of the old cache (H5).
export const queryKeys = {
  creators: {
    all: ['creators'] as const,
    detail: (id: string) => ['creators', id] as const,
  },
  campaigns: {
    all: ['campaigns'] as const,
    detail: (id: string) => ['campaigns', id] as const,
    leads: (id: string) => ['campaigns', id, 'leads'] as const,
  },
  partnerships: {
    root: ['partnerships'] as const,
    list: (params?: unknown) => ['partnerships', 'list', params ?? {}] as const,
    detail: (id: string) => ['partnerships', 'detail', id] as const,
  },
  shipments: {
    root: ['shipments'] as const,
    list: (params?: unknown) => ['shipments', 'list', params ?? {}] as const,
    detail: (id: string) => ['shipments', 'detail', id] as const,
  },
  content: {
    root: ['content'] as const,
    list: (params?: unknown) => ['content', 'list', params ?? {}] as const,
    detail: (id: string) => ['content', 'detail', id] as const,
  },
  activities: {
    root: ['activities'] as const,
    creator: (id: string) => ['activities', 'creator', id] as const,
    campaign: (id: string) => ['activities', 'campaign', id] as const,
  },
  stats: {
    dashboard: (campaignId?: string) => ['stats', 'dashboard', campaignId ?? null] as const,
  },
  clients: {
    all: ['clients'] as const,
    detail: (id: string) => ['clients', id] as const,
  },
  brands: {
    all: (clientId?: string) => ['brands', clientId ?? null] as const,
    detail: (id: string) => ['brands', id] as const,
  },
  users: {
    all: ['users'] as const,
    detail: (id: string) => ['users', id] as const,
  },
  meetings: { all: ['meetings'] as const },
  conversations: {
    all: ['conversations'] as const,
    thread: (id: string) => ['conversations', id] as const,
  },
  outreachLogs: { all: ['outreach-logs'] as const },
  affiliates: { performance: (campaignId?: string) => ['affiliates', campaignId ?? null] as const },
};
