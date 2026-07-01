import { cleanMessageText } from '../lib/formatters';
import { useState, useEffect, useMemo } from 'react';
import { useToast } from '../contexts/ToastContext';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { RefreshCw, MessageSquare, Mail, Search, ArrowLeft } from 'lucide-react';
import { syncConversations } from '../lib/api';
import { useConversations, useConversationThread } from '../hooks/queries';
import { format } from 'date-fns';
import { LoadingState } from '../components/ui/LoadingState';

export default function Conversations() {
  const { showToast } = useToast();
  const { data: rawConvos = [], isLoading: loading, refetch: refetchConvos } = useConversations();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  // Only creators with a real inbound message, newest first.
  const conversations = useMemo(() => {
    const filtered = rawConvos.filter((c) => c.conversation?.latest_inbound_message);
    filtered.sort((a, b) => {
      const dateA = new Date(a.conversation!.latest_inbound_at || 0).getTime();
      const dateB = new Date(b.conversation!.latest_inbound_at || 0).getTime();
      return dateB - dateA;
    });
    return filtered;
  }, [rawConvos]);

  // Auto-select the first conversation on desktop once loaded.
  useEffect(() => {
    if (window.innerWidth >= 768 && conversations.length > 0 && !activeId) {
      setActiveId(conversations[0].id);
    }
  }, [conversations, activeId]);

  // The active conversation's thread — keyed, so switching threads just refetches.
  const activeConvo = conversations.find((c) => c.id === activeId);
  const { data: messages = [], isLoading: loadingMessages } = useConversationThread(
    activeConvo?.conversation?.id,
  );

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await syncConversations();
      showToast(`Sync complete! Pulled ${res.synced || 0} new messages.`, 'success');
      refetchConvos();
    } catch (err) {
      showToast('Failed to sync inbox emails.', 'error');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto h-[calc(100vh-100px)] flex flex-col pb-6 animate-[fadeIn_0.2s_ease]">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl sm:text-3xl font-normal text-gray-900 mb-1 font-outfit uppercase tracking-tight">
            Inbox & Conversations
          </h1>
        </div>
        <Button
          onClick={handleSync}
          disabled={syncing}
          variant="outline"
          icon={syncing ? <LoadingState mini /> : <RefreshCw size={16} />}
        >
          {syncing ? 'Syncing Gmail...' : 'Sync Inbox'}
        </Button>
      </div>

      <Card className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Thread List */}
        <div
          className={`w-full md:w-1/3 lg:w-1/4 border-r border-gray-200 bg-gray-50 flex flex-col h-[70vh] ${activeId ? 'hidden md:flex' : 'flex'}`}
        >
          <div className="p-4 border-b border-gray-200 bg-white">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={16} className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search messages..."
                className="block w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:outline-none focus:border-primary-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="py-20">
                <LoadingState message="Loading Conversations..." />
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  icon={MessageSquare}
                  title="No Conversations"
                  description="No inbound replies yet."
                />
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {conversations.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setActiveId(c.id)}
                    className={`w-full text-left p-4 hover:bg-white transition-colors block focus:outline-none ${activeId === c.id ? 'bg-white border-l-4 border-primary-500' : 'border-l-4 border-transparent'}`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-normal text-gray-900 text-sm font-outfit uppercase tracking-tight">
                        @{c.handle}
                      </span>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {c.conversation?.latest_inbound_at
                          ? format(new Date(c.conversation.latest_inbound_at), 'MMM d, h:mm a')
                          : ''}
                      </span>
                    </div>
                    <div className="text-xs font-normal text-gray-600 truncate mb-1">
                      Re: Collab Opportunity
                    </div>
                    <p className="text-xs text-gray-500 truncate max-w-full">
                      {cleanMessageText(
                        c.conversation?.latest_inbound_message || 'No message content',
                      )}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Main Area - Thread View */}
        <div
          className={`w-full md:w-2/3 lg:w-3/4 bg-white flex flex-col h-[70vh] ${!activeId ? 'hidden md:flex' : 'flex'}`}
        >
          {activeConvo ? (
            <>
              {/* Header */}
              <div className="p-5 border-b border-gray-100 flex justify-between items-center shadow-sm z-10">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setActiveId(null)}
                    className="md:hidden p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors"
                  >
                    <ArrowLeft size={20} />
                  </button>
                  <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-normal uppercase font-outfit">
                    {activeConvo.handle?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-lg font-normal text-gray-900 leading-tight font-outfit uppercase tracking-tight">
                      @{activeConvo.handle}
                    </h2>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                      <Mail size={12} /> {activeConvo.email}
                    </div>
                  </div>
                </div>
                <div>
                  <StatusBadge
                    status={activeConvo.conversation?.qualification_status || 'interested'}
                  />
                </div>
              </div>

              {/* Chat Thread */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/30">
                {loadingMessages ? (
                  <div className="py-20 text-center text-gray-400 text-sm">
                    Loading message history...
                  </div>
                ) : messages.length > 0 ? (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`rounded-2xl px-5 py-3 max-w-[80%] shadow-sm ${
                          msg.direction === 'outbound'
                            ? 'bg-primary-600 text-white rounded-tr-sm'
                            : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm'
                        }`}
                      >
                        <div
                          className={`text-xs font-normal mb-1 ${msg.direction === 'outbound' ? 'text-primary-100' : 'text-gray-400'}`}
                        >
                          {msg.direction === 'outbound' ? 'You' : `@${activeConvo.handle}`} •{' '}
                          {format(new Date(msg.message_time), 'MMM d, h:mm a')}
                        </div>
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">
                          {cleanMessageText(msg.message_text)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-20 text-center text-gray-400 text-sm">
                    No message history found.
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <MessageSquare size={48} className="mb-4 opacity-20" />
              <p className="font-normal">Select a conversation to view.</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
