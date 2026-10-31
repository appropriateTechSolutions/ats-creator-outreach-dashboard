import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { RefreshCw, MessageSquare, Mail, Search, ArrowLeft } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { LoadingState } from '../components/ui/LoadingState';
import { CreatorAvatar } from '../components/creators/CreatorIdentity';
import { getErrorMessage, syncConversations } from '../lib/api';
import { cleanMessageText } from '../lib/formatters';
import { buildThreads, filterThreads, getThreadNextAction } from '../lib/inboxThreads';
import { queryKeys } from '../lib/queryKeys';
import { useConversations, useConversationThread, usePartnership } from '../hooks/queries';
import { useDebounce } from '../hooks/useDebounce';
import { useInvalidate } from '../hooks/useInvalidate';

type ThreadFilter = 'all' | 'waiting';

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`px-3 py-1 rounded-full border text-xs font-medium transition-colors ${
        active
          ? 'bg-primary-600 border-primary-600 text-white'
          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
      }`}
    >
      {children}
    </button>
  );
}

export default function Conversations() {
  const { showToast } = useToast();
  const { data: rawConvos = [], isLoading: loading } = useConversations();
  const invalidate = useInvalidate();
  // The open thread lives in the URL (`?thread=<conversation id>`), so other pages can link
  // straight to it and a reload keeps your place.
  const [searchParams, setSearchParams] = useSearchParams();
  const activeId = searchParams.get('thread');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 250);
  const [filter, setFilter] = useState<ThreadFilter>('all');
  const [syncing, setSyncing] = useState(false);

  // One thread per creator × campaign, waiting-on-us first, then newest reply first.
  const threads = useMemo(() => buildThreads(rawConvos), [rawConvos]);
  const waitingCount = useMemo(() => threads.filter((t) => t.waitingOnUs).length, [threads]);
  const visibleThreads = useMemo(
    () => filterThreads(threads, { search: debouncedSearch, waitingOnly: filter === 'waiting' }),
    [threads, debouncedSearch, filter],
  );

  const selectThread = useCallback(
    (id: string | null) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          if (id) next.set('thread', id);
          else next.delete('thread');
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  // Open the first thread on desktop when the URL names none.
  useEffect(() => {
    if (window.innerWidth >= 768 && !activeId && threads.length > 0) selectThread(threads[0].id);
  }, [threads, activeId, selectThread]);

  // The open thread is looked up among all threads, not the filtered list, so searching
  // never closes it. Its messages are keyed by id, so switching threads just refetches.
  const activeThread = threads.find((t) => t.id === activeId) ?? null;
  const missingThread = !!activeId && !loading && !activeThread;
  const { data: messages = [], isLoading: loadingMessages } = useConversationThread(
    activeThread?.id,
  );
  // The list only has the partnership's id and status. The next step also depends on its
  // shipment and deliverables, so it comes from the full record, exactly as on the
  // partnership page; until that loads the header shows the status and no step.
  const listedPartnership = activeThread?.conversation.partnership ?? null;
  const { data: fullPartnership } = usePartnership(listedPartnership?.id);
  const nextStep = useMemo(
    () => (activeThread ? getThreadNextAction(activeThread, fullPartnership) : null),
    [activeThread, fullPartnership],
  );

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await syncConversations();
      const pulled = res.newMessages ?? res.synced ?? 0;
      showToast(
        `Sync complete! Pulled ${pulled} new ${pulled === 1 ? 'message' : 'messages'}.`,
        'success',
      );
      // New replies change the list and the open thread, and move partnerships along
      // (['conversations'] is a prefix of every thread's key).
      invalidate(queryKeys.conversations.all, queryKeys.partnerships.root);
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to sync inbox emails.'), 'error');
    } finally {
      setSyncing(false);
    }
  };

  const qualification = activeThread?.conversation.qualification_status;

  return (
    <div className="space-y-6 max-w-7xl mx-auto h-[calc(100vh-100px)] flex flex-col pb-6 animate-[fadeIn_0.2s_ease]">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl sm:text-3xl font-normal text-gray-900 mb-1 font-outfit uppercase tracking-tight">
            Inbox
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
          className={`w-full md:w-1/3 lg:w-1/4 border-r border-gray-200 bg-gray-50 flex flex-col h-[70vh] ${activeThread ? 'hidden md:flex' : 'flex'}`}
        >
          <div className="p-4 border-b border-gray-200 bg-white space-y-3">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={16} className="text-gray-400" aria-hidden="true" />
              </div>
              <input
                type="search"
                aria-label="Search conversations"
                title="Search by creator, handle, campaign or message"
                placeholder="Search inbox"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="block w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:outline-none focus:border-primary-500"
              />
            </div>
            <div role="group" aria-label="Filter conversations" className="flex flex-wrap gap-2">
              <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
                All
              </FilterChip>
              <FilterChip active={filter === 'waiting'} onClick={() => setFilter('waiting')}>
                Waiting on us ({waitingCount})
              </FilterChip>
            </div>
          </div>

          {missingThread && (
            <p role="status" className="px-4 py-3 text-xs text-gray-600 bg-white border-b">
              That conversation isn't in your inbox. It may have no reply yet.
            </p>
          )}

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="py-20">
                <LoadingState message="Loading Conversations..." />
              </div>
            ) : threads.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  icon={MessageSquare}
                  title="No Conversations"
                  description="No inbound replies yet."
                />
              </div>
            ) : visibleThreads.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  icon={Search}
                  title="No matching conversations"
                  description={
                    filter === 'waiting' && !debouncedSearch.trim()
                      ? 'Nothing is waiting on us right now.'
                      : 'Try a different search, or show all conversations.'
                  }
                />
              </div>
            ) : (
              <ul aria-label="Conversations" className="divide-y divide-gray-100">
                {visibleThreads.map((t) => {
                  const isActive = activeThread?.id === t.id;
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => selectThread(t.id)}
                        aria-current={isActive ? 'true' : undefined}
                        className={`w-full text-left p-4 hover:bg-white transition-colors block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500 ${isActive ? 'bg-white border-l-4 border-primary-500' : 'border-l-4 border-transparent'}`}
                      >
                        <div className="flex justify-between items-start gap-2 mb-1">
                          <span className="flex items-center gap-2 min-w-0">
                            {t.waitingOnUs && (
                              <span
                                role="img"
                                aria-label="Waiting on us"
                                title="Waiting on us"
                                className="w-2 h-2 rounded-full bg-warning-600 flex-shrink-0"
                              />
                            )}
                            <span className="font-normal text-gray-900 text-sm font-outfit tracking-tight truncate">
                              {t.creatorName}
                            </span>
                          </span>
                          <span className="text-xs text-gray-500 whitespace-nowrap">
                            {t.lastInboundAt
                              ? format(new Date(t.lastInboundAt), 'MMM d, h:mm a')
                              : ''}
                          </span>
                        </div>
                        {t.campaign && (
                          <div className="text-xs font-normal text-gray-600 truncate mb-1">
                            {t.campaign.name}
                          </div>
                        )}
                        <p className="text-xs text-gray-500 truncate max-w-full">{t.lastMessage}</p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Right Main Area - Thread View */}
        <div
          className={`w-full md:w-2/3 lg:w-3/4 bg-white flex flex-col h-[70vh] ${!activeThread ? 'hidden md:flex' : 'flex'}`}
        >
          {activeThread ? (
            <>
              {/* Header */}
              <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm z-10">
                <div className="flex items-center gap-4 min-w-0">
                  <button
                    type="button"
                    onClick={() => selectThread(null)}
                    aria-label="Back to conversations"
                    className="md:hidden p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors"
                  >
                    <ArrowLeft size={20} />
                  </button>
                  <CreatorAvatar
                    creator={activeThread.creator}
                    className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 font-outfit"
                  />
                  <div className="min-w-0">
                    <h2 className="text-lg font-normal text-gray-900 leading-tight font-outfit tracking-tight truncate">
                      <Link
                        to={`/creators/${activeThread.creator.id}`}
                        className="hover:text-primary-700 hover:underline"
                      >
                        {activeThread.creatorName}
                      </Link>
                    </h2>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500 mt-0.5">
                      {activeThread.campaign && (
                        <span>
                          Campaign:{' '}
                          <Link
                            to={`/campaigns/${activeThread.campaign.id}`}
                            className="text-primary-600 hover:underline"
                          >
                            {activeThread.campaign.name}
                          </Link>
                        </span>
                      )}
                      {activeThread.creatorName !== `@${activeThread.handle}` && (
                        <span>@{activeThread.handle}</span>
                      )}
                      {activeThread.creator.email && (
                        <span className="inline-flex items-center gap-1">
                          <Mail size={12} aria-hidden="true" /> {activeThread.creator.email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:items-end gap-1 flex-shrink-0">
                  {listedPartnership ? (
                    <Link to={`/partnerships/${listedPartnership.id}`} title="Open partnership">
                      <StatusBadge status={fullPartnership?.status ?? listedPartnership.status} />
                    </Link>
                  ) : (
                    qualification && <StatusBadge status={qualification} />
                  )}
                  {nextStep && nextStep.key !== 'none' && (
                    <span className="text-xs text-gray-500">
                      Next step:{' '}
                      <Link
                        to={`/creators/${activeThread.creator.id}`}
                        className="text-primary-600 hover:underline"
                      >
                        {nextStep.label}
                      </Link>
                    </span>
                  )}
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
                          {msg.direction === 'outbound' ? 'You' : activeThread.creatorName} •{' '}
                          {format(new Date(msg.message_time), 'MMM d, h:mm a')}
                        </div>
                        {msg.subject && <p className="text-sm font-medium mb-1">{msg.subject}</p>}
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
