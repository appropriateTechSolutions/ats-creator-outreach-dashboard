import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { RefreshCw, MessageSquare, Mail, Search } from 'lucide-react';
import { getConversations, syncConversations, getConversationThread } from '../lib/api';
import type { Creator, ConversationMessage } from '../types';
import { format } from 'date-fns';
import { LoadingState } from '../components/ui/LoadingState';

export default function Conversations() {
  const [conversations, setConversations] = useState<Creator[]>([]);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const fetchConvos = async () => {
    try {
      const data = await getConversations();
      // Only keep creators that have actual conversation data
      const filtered = data.filter(c => c.conversation?.latest_inbound_message);
      // Sort by latest message date
      filtered.sort((a, b) => {
        const dateA = new Date(a.conversation!.latest_inbound_at || 0).getTime();
        const dateB = new Date(b.conversation!.latest_inbound_at || 0).getTime();
        return dateB - dateA;
      });
      setConversations(filtered);
      if (filtered.length > 0 && !activeId) setActiveId(filtered[0].id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConvos();
  }, []);

  useEffect(() => {
    const fetchThread = async () => {
      if (!activeId) return;
      const convo = conversations.find(c => c.id === activeId);
      if (!convo?.conversation?.id) return;

      setLoadingMessages(true);
      try {
        const thread = await getConversationThread(convo.conversation.id);
        setMessages(thread);
      } catch (err) {
        console.error('Failed to fetch thread:', err);
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchThread();
  }, [activeId, conversations]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await syncConversations();
      alert(`Sync complete! Pulled ${res.synced || 0} new messages.`);
      fetchConvos();
    } catch (err) {
      alert('Failed to sync inbox emails.');
    } finally {
      setSyncing(false);
    }
  };

  // Helper to clean up email signatures and quoted replies
  const cleanMessageText = (text: string) => {
    if (!text) return '';
    // Normalize all line endings first and remove carriage returns
    const normalizedText = text.replace(/\r/g, '');
    const lines = normalizedText.split('\n');
    const cleanedLines = [];
    
    for (let line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine && cleanedLines.length === 0) continue; 

      // Aggressive stop for any common email reply headers
      if (
        /^\s*(On|From|Sent|To|Subject):/i.test(trimmedLine) || 
        /wrote:$/i.test(trimmedLine) ||
        trimmedLine.includes('Original Message') ||
        trimmedLine.startsWith('---') ||
        trimmedLine.startsWith('___')
      ) {
        break;
      }
      
      // Skip quoted lines
      if (trimmedLine.startsWith('>') || trimmedLine.startsWith('>>')) {
        continue;
      }
      
      cleanedLines.push(line);
    }
    
    return cleanedLines.join('\n').trim();
  };

  const activeConvo = conversations.find(c => c.id === activeId);

  return (
    <div className="space-y-6 max-w-7xl mx-auto h-[calc(100vh-100px)] flex flex-col pb-6 animate-[fadeIn_0.3s_ease]">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-normal text-gray-900 mb-1 font-outfit uppercase tracking-tight">Inbox & Conversations</h1>
          <p className="text-gray-500 font-normal">Manage replies and negotiate with leads.</p>
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
        <div className="w-1/4 border-r border-gray-200 bg-gray-50 flex flex-col h-[70vh]">
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
              <div className="p-8 text-center text-gray-500">
                <MessageSquare className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No inbound replies yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {conversations.map(c => (
                  <button 
                    key={c.id} 
                    onClick={() => setActiveId(c.id)}
                    className={`w-full text-left p-4 hover:bg-white transition-colors block focus:outline-none ${activeId === c.id ? 'bg-white border-l-4 border-primary-500' : 'border-l-4 border-transparent'}`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-normal text-gray-900 text-sm font-outfit uppercase tracking-tight">@{c.handle}</span>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {c.conversation?.latest_inbound_at ? format(new Date(c.conversation.latest_inbound_at), 'MMM d, h:mm a') : ''}
                      </span>
                    </div>
                    <div className="text-xs font-normal text-gray-600 truncate mb-1">
                      Re: Collab Opportunity
                    </div>
                    <p className="text-xs text-gray-500 truncate max-w-full">
                      {cleanMessageText(c.conversation?.latest_inbound_message || 'No message content')}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Main Area - Thread View */}
        <div className="w-3/4 bg-white flex flex-col h-[70vh]">
          {activeConvo ? (
            <>
              {/* Header */}
              <div className="p-5 border-b border-gray-100 flex justify-between items-center shadow-sm z-10">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-normal uppercase font-outfit">
                    {activeConvo.handle?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-lg font-normal text-gray-900 leading-tight font-outfit uppercase tracking-tight">@{activeConvo.handle}</h2>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                      <Mail size={12} /> {activeConvo.email}
                    </div>
                  </div>
                </div>
                <div>
                  <StatusBadge status={activeConvo.conversation?.qualification_status || 'interested'} />
                </div>
              </div>

              {/* Chat Thread */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/30">
                 {loadingMessages ? (
                    <div className="py-20 text-center text-gray-400 text-sm">Loading message history...</div>
                 ) : messages.length > 0 ? messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`rounded-2xl px-5 py-3 max-w-[80%] shadow-sm ${
                        msg.direction === 'outbound' 
                          ? 'bg-primary-600 text-white rounded-tr-sm' 
                          : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm'
                      }`}>
                        <div className={`text-xs font-normal mb-1 ${msg.direction === 'outbound' ? 'text-primary-100' : 'text-gray-400'}`}>
                          {msg.direction === 'outbound' ? 'You' : `@${activeConvo.handle}`} • {format(new Date(msg.message_time), 'MMM d, h:mm a')}
                        </div>
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">
                           {cleanMessageText(msg.message_text)}
                        </p>
                      </div>
                    </div>
                 )) : (
                    <div className="py-20 text-center text-gray-400 text-sm">No message history found.</div>
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
