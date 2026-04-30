import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getCreatorById, getCampaignById, reviewLead, sendSingleOutreach, getConversationThread } from '../lib/api';
import type { Creator, Campaign } from '../types';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { ScoreBadge } from '../components/ui/ScoreBadge';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Button } from '../components/ui/Button';
import { ArrowLeft, Instagram, Youtube, UserCheck, Activity, Check, X, Mail, MapPin, ExternalLink, FileText, Users, Send, RefreshCw, Sparkles, MessageCircle } from 'lucide-react';
import { OutreachPreviewModal } from '../components/ui/OutreachPreviewModal';

export default function CreatorDetail() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [creator, setCreator] = useState<Creator | null>(null);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [outreachModalOpen, setOutreachModalOpen] = useState(false);

  // Helper to clean up email signatures and quoted replies
  const cleanMessageText = (text: string) => {
    if (!text) return '';
    const lines = text.split('\n');
    const cleanedLines = [];
    
    for (let line of lines) {
      // Stop completely if we hit the standard "On [date], [person] wrote:" email reply header
      if (/^On .* wrote:/i.test(line.trim())) {
        break;
      }
      // Skip quoted lines
      if (line.trim().startsWith('>')) {
        continue;
      }
      // Skip common antivirus signatures
      if (line.includes('Virus-free') || line.includes('avg.com')) {
        continue;
      }
      // Stop at common signature boundaries
      if (line.trim() === '--' || line.trim() === 'Sent from my iPhone') {
        break;
      }
      cleanedLines.push(line);
    }
    
    return cleanedLines.join('\n').trim();
  };

  const loadData = () => {
    if (!id) return;
    setLoading(true);
    
    getCreatorById(id)
      .then(async (data) => {
        setCreator(data);
        
        // Use the messages already bundled in the creator data
        if (data.conversation?.messages) {
          // Sort messages by time ASC
          const sorted = [...data.conversation.messages].sort((a: any, b: any) => 
            new Date(a.message_time).getTime() - new Date(b.message_time).getTime()
          );
          setMessages(sorted);
        }

        if (data.campaign_id) {
          try {
            const camp = await getCampaignById(data.campaign_id);
            setCampaign(camp);
          } catch (e) {
            console.error('No campaign found for lead');
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleReview = async (action: 'approve' | 'reject') => {
    if (!creator) return;
    setActionLoading(true);
    try {
      await reviewLead(creator.id, action);
      loadData();
    } catch (err) {
      alert('Action failed: ' + err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendOutreach = () => {
    if (!creator) return;
    setOutreachModalOpen(true);
  };

  const handleConfirmSendOutreach = async (customSubject?: string, customBody?: string) => {
    if (!creator) return;
    setSendingEmail(true);
    try {
      await sendSingleOutreach(creator.id, creator.campaign_id, customSubject, customBody);
      alert('Outreach email sent successfully!');
      loadData();
    } catch (err) {
      alert('Failed to send outreach: ' + err);
      throw err;
    } finally {
      setSendingEmail(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-gray-500">Loading creator profile...</div>;
  }

  if (!creator) {
    return <div className="p-12 text-center text-error-500">Creator not found.</div>;
  }

  // Parse scoring_notes safely (handle both snake_case and camelCase)
  let scoringNotes = creator.scoring_notes || (creator as any).scoringNotes;
  if (typeof scoringNotes === 'string') {
    try { scoringNotes = JSON.parse(scoringNotes); } catch { scoringNotes = {}; }
  }
  const breakdown = (scoringNotes as any)?.initial_breakdown || {};
  
  // Available platforms to check
  const platforms = [
    { key: 'instagram', label: 'Instagram', icon: <Instagram size={14} className="text-pink-600"/> },
    { key: 'youtube', label: 'YouTube', icon: <Youtube size={14} className="text-red-600"/> },
    { key: 'tiktok', label: 'TikTok', icon: <Activity size={14} className="text-black"/> }
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-[fadeIn_0.3s_ease]">
      <Link to="/creators" className="inline-flex items-center text-sm font-normal text-gray-500 hover:text-gray-900 transition-colors mb-4">
        <ArrowLeft size={16} className="mr-1" /> Back to Directory
      </Link>

      <Card>
        <div className="bg-gradient-to-r from-gray-50 to-white px-8 py-8 border-b border-gray-100 flex items-start justify-between rounded-t-[12px]">
          <div className="flex items-center gap-6">
             <div className="w-20 h-20 rounded-full bg-primary-600 text-white flex items-center justify-center font-normal text-4xl uppercase shadow-lg shadow-primary-500/30 ring-4 ring-white">
              {creator.handle?.charAt(0)}
            </div>
            <div>
               <h1 className="text-3xl font-normal text-gray-900 flex items-center gap-2 font-outfit uppercase tracking-tight">
                <a 
                  href={
                    (() => {
                      const profileUrl = creator.profiles?.[0]?.profile_url || creator.profile_url;
                      if (profileUrl && !profileUrl.includes('scontent')) return profileUrl;
                      return `https://instagram.com/${creator.handle?.replace(/^@/, '')}`;
                    })()
                  } 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-primary-600 transition-colors flex items-center gap-2 group"
                >
                  @{creator.handle?.replace(/^@/, '')}
                  <ExternalLink size={18} className="text-gray-300 group-hover:text-primary-400 transition-colors" />
                </a>
              </h1>
              <p className="text-gray-500 font-medium text-lg mt-1">{creator.full_name || 'No full name provided'}</p>
              <div className="flex gap-4 mt-3">
                {creator.has_instagram && (
                  <a href={`https://instagram.com/${creator.handle?.replace('@', '')}`} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-pink-600 transition-colors flex items-center gap-1">
                    <Instagram size={16} />
                     <span className="text-xs font-normal">Instagram</span>
                  </a>
                )}
                {creator.has_youtube && (
                  <a href={`https://youtube.com/@${creator.handle?.replace('@', '')}`} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-red-600 transition-colors flex items-center gap-1">
                    <Youtube size={16} />
                     <span className="text-xs font-normal">YouTube</span>
                  </a>
                )}
                {creator.has_tiktok && (
                  <a href={`https://tiktok.com/@${creator.handle?.replace('@', '')}`} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-black transition-colors flex items-center gap-1">
                    <Activity size={16} />
                     <span className="text-xs font-normal">TikTok</span>
                  </a>
                )}
              </div>
              
              <div className="flex gap-2 mt-3">
                {creator.category?.split(',').map(c => (
                   <span key={c} className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded text-xs font-normal uppercase tracking-wider">{c.trim()}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-3">
            <div className="flex gap-2 mb-2">
            </div>
            <StatusBadge status={creator.review_status as any || 'pending'} />
            <div className="flex items-center gap-2 mt-2">
               <span className="text-xs font-normal text-gray-400 uppercase">Master Readiness:</span>
               <ScoreBadge score={creator.outreach_readiness_score || 0} />
            </div>
            
            {/* Direct Send Button */}
            <Button 
              className="mt-4 w-full bg-primary-600 hover:bg-primary-700 shadow-md flex items-center justify-center gap-2"
              onClick={handleSendOutreach}
              disabled={sendingEmail || creator.review_status === 'rejected'}
            >
              {sendingEmail ? <RefreshCw className="animate-spin" size={16} /> : <Send size={16} />}
              {creator.outreach_logs?.length > 0 ? 'Resend Outreach' : 'Send Outreach Now'}
            </Button>
          </div>
        </div>

        {/* Creator Insights Section (Summary, Bio, Email, Location) */}
        <div className="px-8 py-6 bg-primary-50/30 border-b border-gray-100">
           <div className="mb-6">
              <h4 className="text-[10px] font-normal text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                <Sparkles size={12} className="text-primary-600" /> SUMMARY
              </h4>
              <p className="text-sm text-gray-700 leading-relaxed italic border-l-2 border-primary-200 pl-4">
                {creator.full_name} is a high-impact creator in the <span className="font-normal text-gray-900">{creator.category}</span> space. 
                With a strong base in <span className="font-normal text-gray-900">{creator.city}</span>, they align perfectly with your campaign's target demographics. 
                Their outreach readiness score of <span className="font-normal text-primary-600">{creator.outreach_readiness_score}</span> suggests a highly professional digital presence and high probability of collaboration success.
              </p>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="flex gap-3">
                <div className="mt-1 text-primary-600"><FileText size={18} /></div>
                <div>
                  <h4 className="text-[10px] font-normal text-gray-400 uppercase tracking-widest mb-1">About / Bio</h4>
                  <p className="text-sm text-gray-700 leading-relaxed italic">
                    {creator.bio || "No bio available for this creator."}
                  </p>
                </div>
             </div>
             <div className="flex gap-3">
                <div className="mt-1 text-primary-600"><Mail size={18} /></div>
                <div>
                  <h4 className="text-[10px] font-normal text-gray-400 uppercase tracking-widest mb-1">Direct Contact</h4>
                  <p className="text-sm font-normal text-gray-800">
                    {creator.email || "Email hidden or not found"}
                  </p>
                  {creator.has_email && <span className="text-[10px] text-green-600 font-normal flex items-center gap-1 mt-1"><Check size={10} /> Verified Email</span>}
                </div>
             </div>
             <div className="flex gap-3">
                <div className="mt-1 text-primary-600"><MapPin size={18} /></div>
                <div>
                  <h4 className="text-[10px] font-normal text-gray-400 uppercase tracking-widest mb-1">Target Location</h4>
                  <p className="text-sm font-normal text-gray-800 capitalize">
                    {creator.city ? `${creator.city}${creator.state ? `, ${creator.state}` : ''}${creator.country ? `, ${creator.country}` : ''}` : 'Location unknown'}
                  </p>
                  <span className="text-[10px] text-gray-500 font-medium">Primarily active in this region</span>
                </div>
             </div>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-8">
          
          {/* Platform Wise Scores */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-sm font-normal text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2">
              <UserCheck size={18} className="text-primary-600" /> Platform-wise Score Breakdown
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {platforms.map(platform => {
                const pData = breakdown[platform.key];
                // Display the platform card if data exists OR if the creator has this platform true (even if data is 0)
                const hasPlatform = creator[`has_${platform.key}` as keyof Creator];
                
                if (!pData && !hasPlatform) return null;

                const score = pData?.score || 0;
                const profile = creator.profiles?.find(p => p.platform.toLowerCase() === platform.key);
                
                return (
                  <div key={platform.key} className="bg-gray-50 border border-gray-200 rounded-xl p-5 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-2 font-normal text-gray-800 text-sm uppercase tracking-wide">
                        {platform.icon} {platform.label}
                      </div>
                      <div className={`text-xl font-normal ${
                        score >= 70 ? 'text-green-600' :
                        score >= 40 ? 'text-primary-600' : 'text-gray-500'
                      }`}>
                        {score} <span className="text-xs text-gray-400 font-medium">/ 100</span>
                      </div>
                    </div>

                    {/* Platform Stats */}
                    {profile && (
                      <div className="flex gap-4 mb-4 pb-4 border-b border-gray-200/50">
                        <div className="flex-1">
                          <p className="text-[10px] font-normal text-gray-400 uppercase tracking-widest mb-0.5">Followers</p>
                          <p className="text-sm font-normal text-gray-900 flex items-center gap-1">
                            <Users size={12} className="text-gray-400" />
                            {profile.followers?.toLocaleString() || 'N/A'}
                          </p>
                        </div>
                        <div className="flex-1">
                          <p className="text-[10px] font-normal text-gray-400 uppercase tracking-widest mb-0.5">Engagement</p>
                          <p className="text-sm font-normal text-gray-900">
                            {profile.engagement_rate ? `${(Number(profile.engagement_rate) * 100).toFixed(2)}%` : 'N/A'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Show detailed logic points if we have them */}
                    {pData?.breakdown ? (
                      <div className="space-y-2 mt-4 pt-4 border-t border-gray-100">
                        {Object.entries(pData.breakdown).map(([key, val]) => (
                           <div key={key} className="flex justify-between items-center text-xs">
                             <span className="text-gray-500 capitalize">{key.replace(/_/g, ' ')}</span>
                             <span className="font-normal text-gray-700">+{val as number} points</span>
                           </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic mt-4 pt-4 border-t border-gray-100">No algorithm breakdown points available.</p>
                    )}
                  </div>
                );
              })}
            </div>
            
            {Object.keys(breakdown).length === 0 && (
              <div className="bg-gray-50 p-6 rounded-xl border border-dashed border-gray-300 text-center text-gray-500 text-sm">
                 Detailed platform-wise algorithm breakdown was not collected for this lead. Total score: {creator.outreach_readiness_score || 0}/100.
              </div>
            )}
          </div>
          
          <div className="space-y-6">
            <div>
               <h3 className="text-sm font-normal text-gray-900 uppercase tracking-widest mb-4">Match Breakdown</h3>
               <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm space-y-4">
                 
                 <div className="flex justify-between items-center mb-2">
                   <span className="text-xs font-normal text-gray-900 uppercase tracking-widest">Total Match</span>
                   <span className="text-xl font-normal text-primary-600">{Math.round(Number(creator.relevance_score) || 0)}%</span>
                 </div>
                 
                 <div className="space-y-3 pl-3 border-l-2 border-primary-100">
                    {/* City Match */}
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500 font-medium">City Match</span>
                      <span className="text-sm font-normal text-gray-900">
                        {Number(creator.relevance_score) >= 33 ? '+33.3%' : '0%'}
                      </span>
                    </div>
                    
                    {/* Niche Match */}
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500 font-medium">Niche Match</span>
                      <span className="text-sm font-normal text-gray-900">
                        {Number(creator.relevance_score) >= 66 ? '+33.3%' : '0%'}
                      </span>
                    </div>
                    
                    {/* Keyword Match */}
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500 font-medium">Keyword Match</span>
                      <span className="text-sm font-normal text-gray-900">
                        {Number(creator.relevance_score) >= 67 
                          ? `+${(Number(creator.relevance_score) - 66.6).toFixed(1)}%` 
                          : Number(creator.relevance_score) > 33 && Number(creator.relevance_score) < 66
                            ? `+${(Number(creator.relevance_score) - 33.3).toFixed(1)}%`
                            : '0%'}
                      </span>
                    </div>
                 </div>

                 <p className="text-[10px] text-gray-400 leading-tight mt-4 pt-4 border-t border-gray-100 italic">
                   * Match % determines how well they fit your specific search filters defined in the campaign.
                 </p>
                 
               </div>
            </div>
          </div>

        </div>
      </Card>

      {/* Conversation History Section */}
      <Card>
        <CardHeader className="border-b border-gray-100 flex flex-row items-center justify-between py-4">
          <div className="flex items-center gap-2 font-normal text-gray-900 uppercase tracking-widest text-sm font-outfit">
            <MessageCircle size={18} className="text-primary-600" />
            Conversation History
          </div>
          {creator.conversation?.detected_intent && (
            <div className={`px-3 py-1 rounded-full text-[10px] font-normal uppercase tracking-wider ${
              creator.conversation.detected_intent === 'interested' ? 'bg-green-100 text-green-700' :
              creator.conversation.detected_intent === 'not_interested' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
            }`}>
              Intent: {creator.conversation.detected_intent.replace('_', ' ')}
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[400px] overflow-y-auto p-6 space-y-6 bg-gray-50/50">
            {messages.length === 0 && (creator.OutreachLogs?.length === 0 || !creator.OutreachLogs) ? (
              <div className="text-center py-12 text-gray-400 italic text-sm">
                No outreach messages or replies found for this creator yet.
              </div>
            ) : (
              <div className="space-y-4">
                {/* Show initial outreach attempts from logs */}
                {creator.OutreachLogs?.map((log: any, idx: number) => (
                  <div key={`outreach-${idx}`} className="flex flex-col items-end max-w-[80%] ml-auto">
                    <div className="bg-primary-600 text-white p-4 rounded-2xl rounded-tr-none shadow-sm text-sm">
                      <p className="font-bold mb-1 flex items-center gap-1 opacity-80 text-[10px] uppercase">
                        <Mail size={10} /> Outreach Sent ({log.channel})
                      </p>
                      {log.subject_line && <p className="font-bold border-b border-white/20 pb-2 mb-2">Sub: {log.subject_line}</p>}
                      <p className="whitespace-pre-wrap leading-relaxed opacity-95">{log.message_content || 'Initial outreach triggered by system.'}</p>
                    </div>
                    <span className="text-[10px] text-gray-400 mt-1 font-medium">{new Date(log.sent_at || log.sentAt || log.created_at || log.createdAt || Date.now()).toLocaleString()}</span>
                  </div>
                ))}

                {/* Show actual conversation thread */}
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex flex-col ${msg.direction === 'inbound' ? 'items-start mr-auto' : 'items-end ml-auto'} max-w-[85%]`}>
                    <div className={`p-4 rounded-2xl shadow-sm text-sm ${
                      msg.direction === 'inbound' 
                        ? 'bg-white text-gray-800 rounded-tl-none border border-gray-100' 
                        : 'bg-primary-600 text-white rounded-tr-none'
                    }`}>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">
                        {msg.direction === 'inbound' ? `Influencer (${msg.channel})` : 'You (ATS Agent)'}
                      </p>
                      <p className="whitespace-pre-wrap leading-relaxed">{cleanMessageText(msg.message_text)}</p>
                    </div>
                    <span className="text-[10px] text-gray-400 mt-1 font-medium">
                      {new Date(msg.message_time).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>


      
      <OutreachPreviewModal
        creatorId={creator?.id || ''}
        campaignId={creator?.campaign_id}
        isOpen={outreachModalOpen}
        onClose={() => setOutreachModalOpen(false)}
        onSend={handleConfirmSendOutreach}
      />
    </div>
  );
}
