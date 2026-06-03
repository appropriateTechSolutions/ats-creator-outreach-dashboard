import { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import type { Campaign, Creator } from '../types';
import { Sparkles, X, CheckCircle2 } from 'lucide-react';

interface DiscoveryHandlers {
  onStatus?: (message: string) => void;
  onSaved?: (lead: Creator) => void;
  onEnriched?: (lead: Creator) => void;
  onCompleted?: (successCount: number) => void;
}

interface DiscoveryContextValue {
  activeCampaignId: string | null;
  activeCampaignName: string | null;
  /** True when a discovery run is active for the given campaign. */
  isDiscovering: (campaignId?: string | null) => boolean;
  startDiscovery: (campaign: Campaign) => void;
  /** Subscribe to live discovery events for a campaign while a view is mounted. Returns an unsubscribe fn. */
  subscribe: (campaignId: string, handlers: DiscoveryHandlers) => () => void;
}

const DiscoveryContext = createContext<DiscoveryContextValue | undefined>(undefined);

export const useDiscovery = (): DiscoveryContextValue => {
  const ctx = useContext(DiscoveryContext);
  if (!ctx) throw new Error('useDiscovery must be used within a DiscoveryProvider');
  return ctx;
};

export function DiscoveryProvider({ children }: { children: React.ReactNode }) {
  const esRef = useRef<EventSource | null>(null);
  const subscribersRef = useRef<Map<string, DiscoveryHandlers>>(new Map());

  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);
  const [activeCampaignName, setActiveCampaignName] = useState<string | null>(null);
  const [showStartModal, setShowStartModal] = useState(false);
  const [completion, setCompletion] = useState<{ name: string; count: number } | null>(null);

  const emit = useCallback((campaignId: string, fn: (h: DiscoveryHandlers) => void) => {
    const handlers = subscribersRef.current.get(campaignId);
    if (handlers) fn(handlers);
  }, []);

  const cleanup = useCallback(() => {
    esRef.current?.close();
    esRef.current = null;
    setActiveCampaignId(null);
    setActiveCampaignName(null);
  }, []);

  const subscribe = useCallback((campaignId: string, handlers: DiscoveryHandlers) => {
    subscribersRef.current.set(campaignId, handlers);
    return () => {
      if (subscribersRef.current.get(campaignId) === handlers) {
        subscribersRef.current.delete(campaignId);
      }
    };
  }, []);

  const startDiscovery = useCallback((campaign: Campaign) => {
    if (esRef.current) return; // a discovery run is already in progress

    const token = localStorage.getItem('ats_token') || '';
    const categoriesStr = campaign.category || '';
    const cityStr = campaign.city || 'global';
    const keywordsStr = Array.isArray(campaign.keywords) ? campaign.keywords.join(',') : '';

    const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081/api';
    const streamUrl = `${apiBaseUrl}/creators/ai-discovery-stream?campaign_id=${campaign.id}&categories=${encodeURIComponent(categoriesStr)}&city=${encodeURIComponent(cityStr)}&keywords=${encodeURIComponent(keywordsStr)}&token=${encodeURIComponent(token)}`;

    const eventSource = new EventSource(streamUrl);
    esRef.current = eventSource;
    setActiveCampaignId(campaign.id);
    setActiveCampaignName(campaign.name || 'this campaign');
    setShowStartModal(true);

    eventSource.addEventListener('status', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        emit(campaign.id, h => h.onStatus?.(data.message));
      } catch (err) { console.error(err); }
    });

    eventSource.addEventListener('saved', (e: MessageEvent) => {
      try {
        const newLead = JSON.parse(e.data);
        emit(campaign.id, h => h.onSaved?.(newLead));
      } catch (err) { console.error(err); }
    });

    eventSource.addEventListener('enriched', (e: MessageEvent) => {
      try {
        const enrichedLead = JSON.parse(e.data);
        emit(campaign.id, h => h.onEnriched?.(enrichedLead));
      } catch (err) { console.error(err); }
    });

    eventSource.addEventListener('completed', (e: MessageEvent) => {
      let count = 0;
      try {
        const data = JSON.parse(e.data);
        count = data.success_count || 0;
      } catch (err) { console.error(err); }
      emit(campaign.id, h => h.onCompleted?.(count));
      setCompletion({ name: campaign.name || 'your campaign', count });
      cleanup();
    });

    eventSource.addEventListener('error', (e: MessageEvent) => {
      let message = 'An error occurred during AI Discovery.';
      try {
        if (e.data) {
          const data = JSON.parse(e.data);
          message = data.error || data.message || message;
        }
      } catch (err) { console.error(err); }
      console.error('❌ SSE Stream Error:', e);
      alert(message);
      cleanup();
    });
  }, [emit, cleanup]);

  const isDiscovering = useCallback(
    (campaignId?: string | null) => !!campaignId && activeCampaignId === campaignId,
    [activeCampaignId]
  );

  // Auto-dismiss the completion toast after a short while
  useEffect(() => {
    if (!completion) return;
    const t = setTimeout(() => setCompletion(null), 9000);
    return () => clearTimeout(t);
  }, [completion]);

  // Warn the user before they refresh/close the tab while discovery is running —
  // a full reload would terminate the stream and stop discovery.
  useEffect(() => {
    if (!activeCampaignId) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = ''; // required for the native "Leave site?" prompt in Chrome
      return '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [activeCampaignId]);

  return (
    <DiscoveryContext.Provider value={{ activeCampaignId, activeCampaignName, isDiscovering, startDiscovery, subscribe }}>
      {children}

      {/* "Sit back and relax" start popup */}
      {showStartModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-[fadeIn_0.15s_ease]">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowStartModal(false)}
              aria-label="Dismiss"
              className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:bg-gray-100 transition-colors"
            >
              <X size={18} />
            </button>
            <div className="px-8 pt-10 pb-8 text-center">
              <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-5 animate-pulse">
                <Sparkles size={30} />
              </div>
              <h2 className="text-xl font-normal text-gray-900 font-outfit uppercase tracking-tight mb-2">
                The AI is on the hunt 🕵️
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-1">
                We're scouring the internet for the best creators for
                {activeCampaignName ? <span className="font-medium text-gray-800"> {activeCampaignName}</span> : ' your campaign'}.
              </p>
              <p className="text-sm text-gray-500 leading-relaxed mb-6">
                Sit back, grab a coffee ☕ and relax — feel free to keep working. We'll ping you the moment it's done.
              </p>
              <button
                onClick={() => setShowStartModal(false)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-3 text-[11px] font-normal uppercase tracking-widest transition-colors shadow-lg shadow-indigo-600/30"
              >
                Got it — I'll relax 😎
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Completion notification toast */}
      {completion && (
        <div className="fixed bottom-6 right-6 z-[120] w-full max-w-sm animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center shrink-0">
              <CheckCircle2 size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-normal text-gray-900 font-outfit uppercase tracking-tight">Discovery complete! 🎉</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                Found and processed <span className="font-medium text-gray-800">{completion.count}</span> creator{completion.count === 1 ? '' : 's'} for {completion.name}.
              </p>
            </div>
            <button
              onClick={() => setCompletion(null)}
              aria-label="Dismiss"
              className="p-1 rounded-full text-gray-400 hover:bg-gray-100 transition-colors shrink-0"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </DiscoveryContext.Provider>
  );
}
