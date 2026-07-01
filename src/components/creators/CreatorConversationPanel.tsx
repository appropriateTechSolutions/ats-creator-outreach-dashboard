import React from 'react';
import { Mail, MessageCircle } from 'lucide-react';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';

interface CreatorConversationPanelProps {
  creator: any;
  messages: any[];
  cleanMessageText: (text: string) => string;
  partnerships: any[];
  setActivePartnership: (p: any) => void;
  setShowDiscussionModal: (show: boolean) => void;
  setShowOfferModal: (show: boolean) => void;
}

export function CreatorConversationPanel({
  creator,
  messages,
  cleanMessageText,
  partnerships,
  setActivePartnership,
  setShowDiscussionModal,
  setShowOfferModal,
}: CreatorConversationPanelProps) {
  return (
    <Card className="no-print" id="conversation-section">
      <CardHeader className="border-b border-gray-100 flex flex-row items-center justify-between py-4">
        <div className="flex items-center gap-2 font-normal text-gray-900 uppercase tracking-widest text-sm font-outfit">
          <MessageCircle size={18} className="text-primary-600" />
          Conversation History
        </div>
        {creator?.conversation?.detected_intent && (
          <div
            className={`px-3 py-1 rounded-full text-[10px] font-normal uppercase tracking-wider ${
              creator.conversation.detected_intent === 'interested'
                ? 'bg-green-100 text-green-700'
                : creator.conversation.detected_intent === 'not_interested'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-gray-100 text-gray-600'
            }`}
          >
            Intent: {creator.conversation.detected_intent.replace('_', ' ')}
          </div>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[400px] overflow-y-auto p-6 space-y-6 bg-gray-50/50">
          {messages.length === 0 &&
          ((creator as any).OutreachLogs?.length === 0 || !(creator as any).OutreachLogs) ? (
            <div className="text-center py-12 text-gray-400 italic text-sm">
              No outreach messages or replies found for this creator yet.
            </div>
          ) : (
            <div className="space-y-4">
              {(() => {
                const combined = [
                  ...((creator as any).OutreachLogs || []).map((log: any) => {
                    const logTime =
                      log.sent_at || log.sentAt || log.created_at || log.createdAt || Date.now();
                    return {
                      id: log.id,
                      type: 'outreach',
                      direction: 'outbound',
                      channel: log.channel,
                      subject: log.subject_line,
                      text: log.message_content,
                      time: new Date(logTime).getTime(),
                      message_type: log.message_type,
                    };
                  }),
                  ...messages.map((msg: any) => ({
                    id: msg.id,
                    type: 'message',
                    direction: msg.direction,
                    channel: msg.channel,
                    text: msg.message_text,
                    time: new Date(msg.message_time || msg.messageTime || Date.now()).getTime(),
                  })),
                ].sort((a, b) => a.time - b.time);

                return combined.map((item, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${item.direction === 'inbound' ? 'items-start mr-auto' : 'items-end ml-auto'} max-w-[85%]`}
                  >
                    <div
                      className={`p-4 rounded-2xl shadow-md text-sm ${
                        item.direction === 'inbound'
                          ? 'bg-gray-100 text-gray-900 rounded-tl-none border border-gray-200'
                          : 'bg-indigo-600 text-white rounded-tr-none'
                      }`}
                    >
                      <p
                        className={`text-[10px] font-black uppercase tracking-widest mb-1.5 flex items-center gap-1 ${
                          item.direction === 'inbound' ? 'text-gray-500' : 'text-indigo-100'
                        }`}
                      >
                        {item.direction === 'inbound' ? (
                          <>
                            {creator.full_name || creator.handle} ({item.channel})
                          </>
                        ) : (
                          <>
                            <Mail size={10} />{' '}
                            {item.type === 'outreach'
                              ? item.message_type === 'discovery'
                                ? `Discussion Sent (${item.channel})`
                                : `Outreach Sent (${item.channel})`
                              : 'You (ATS Agent)'}
                          </>
                        )}
                      </p>
                      {item.subject && (
                        <p
                          className={`font-bold border-b pb-2 mb-2 ${
                            item.direction === 'inbound' ? 'border-gray-200' : 'border-white/20'
                          }`}
                        >
                          Sub: {item.subject}
                        </p>
                      )}
                      <p className="whitespace-pre-wrap leading-relaxed font-medium">
                        {item.type === 'message'
                          ? cleanMessageText(item.text)
                          : item.text || 'Initial outreach triggered by system.'}
                      </p>
                    </div>
                    <span className="text-[10px] text-gray-500 mt-1.5 font-semibold">
                      {new Date(item.time).toLocaleString()}
                    </span>
                  </div>
                ));
              })()}
            </div>
          )}
        </div>

        {/* Action Buttons for Conversation */}
        {partnerships.length > 0 && (
          <div className="p-4 border-t border-gray-100 bg-white flex justify-end gap-3">
            {(partnerships[0].status === 'replied' ||
              partnerships[0].status === 'in_discussion' ||
              creator.lifecycle_status === 'replied') && (
              <>
                <Button
                  onClick={() => {
                    setActivePartnership(partnerships[0]);
                    setShowDiscussionModal(true);
                  }}
                  variant="outline"
                  className="text-gray-700 text-xs uppercase tracking-widest font-normal border-gray-200"
                >
                  Start / Continue Discussion
                </Button>
                <Button
                  onClick={() => {
                    setActivePartnership(partnerships[0]);
                    setShowOfferModal(true);
                  }}
                  className="bg-primary-600 hover:bg-primary-700 text-white text-xs uppercase tracking-widest font-normal"
                >
                  Draft Offer
                </Button>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
