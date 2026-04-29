import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  getCampaignById, 
  getCampaignLeads, 
  triggerDiscovery,
  updateCampaignTemplate,
  reviewLead
} from '../lib/api';
import type { Campaign, Creator } from '../types';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Table, Thead, Tbody, Tr, Th, Td } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ScoreBadge } from '../components/ui/ScoreBadge';
import { OutreachPreviewModal } from '../components/ui/OutreachPreviewModal';
import { ArrowLeft, Sparkles, Activity, Users, Mail, Info, Check, X } from 'lucide-react';

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [leads, setLeads] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [discovering, setDiscovering] = useState(false);
  const [templateSubject, setTemplateSubject] = useState('');
  const [templateBody, setTemplateBody] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [outreachModalCreatorId, setOutreachModalCreatorId] = useState<string | null>(null);

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const camp = await getCampaignById(id);
      setCampaign(camp);
      setTemplateSubject(camp.template?.subject_line_template || '');
      setTemplateBody(camp.template?.body_template || '');
      const campLeads = await getCampaignLeads(id);
      setLeads(campLeads);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleDiscovery = async () => {
    if (!campaign || !id) return;
    setDiscovering(true);
    try {
      await triggerDiscovery(
        campaign.category ? campaign.category.split(',') : [],
        campaign.city || 'global',
        id,
        campaign.keywords || []
      );
      alert('AI Discovery launched! The backend is scraping now.');
      fetchData(); // Reload leads
    } catch (err) {
      console.error(err);
      alert('Failed to trigger AI Discovery.');
    } finally {
      setDiscovering(false);
    }
  };

  const handleReview = async (creatorId: string, action: 'approve' | 'reject') => {
    const lead = campaign?.leads?.find((l: any) => l.creator?.id === creatorId)?.creator;
    if (action === 'approve' && (lead?.review_status === 'pending_review' || lead?.review_status === 'reviewed')) {
      setOutreachModalCreatorId(creatorId);
      return;
    }
    try {
      await reviewLead(creatorId, action);
      fetchData(); // Reload leads to reflect status change
    } catch (err) {
      alert('Failed to review lead: ' + err);
    }
  };

  const handleConfirmApprove = async (customSubject?: string, customBody?: string) => {
    if (!outreachModalCreatorId) return;
    try {
      await reviewLead(outreachModalCreatorId, 'approve', customSubject, customBody);
      fetchData();
    } catch (err) {
      alert('Failed to review lead: ' + err);
      throw err;
    }
  };
  
  const handleSaveTemplate = async () => {
    if (!id) return;
    setSavingTemplate(true);
    try {
      await updateCampaignTemplate(id, {
        subject_line_template: templateSubject,
        body_template: templateBody
      });
      alert('Outreach template saved successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to save template.');
    } finally {
      setSavingTemplate(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-gray-500">Loading campaign details...</div>;
  }

  if (!campaign) {
    return <div className="p-12 text-center text-error-500 text-lg">Campaign not found.</div>;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-[fadeIn_0.3s_ease]">
      <Link to="/campaigns" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
        <ArrowLeft size={16} className="mr-1" /> Back to Campaigns
      </Link>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{campaign.name}</h1>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <StatusBadge status={campaign.status as any} />
            <span>•</span>
            <span className="capitalize">{campaign.city || 'Global'}</span>
            <span>•</span>
            <span className="capitalize">{campaign.category || 'Any Category'}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            onClick={handleDiscovery} 
            disabled={discovering}
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/30 border-none"
            icon={discovering ? <Activity className="animate-spin" size={16} /> : <Sparkles size={16} />}
          >
            {discovering ? 'Executing AI...' : 'Run AI Discovery'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
        <Card className="lg:col-span-2">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white rounded-t-[12px]">
            <h2 className="text-lg font-bold text-gray-900">Campaign Leads ({leads.length})</h2>
          </div>
          {leads.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-16 h-16 bg-primary-50 text-primary-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles size={32} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">No leads found yet</h3>
              <p className="text-gray-500 mt-1 max-w-sm mx-auto">Trigger the AI Discovery engine to automatically scrape, score, and qualify influencers matching this campaign's target profile.</p>
            </div>
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th>Creator</Th>
                  <Th className="text-center">Relevance</Th>
                  <Th className="text-center">Readiness</Th>
                  <Th>Review Status</Th>
                  <Th className="text-right">Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {leads.map(lead => (
                  <Tr key={lead.id}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs">
                          {lead.handle?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <Link to={`/creators/${lead.id}`} className="font-semibold text-gray-900 hover:text-primary-600">@{lead.handle}</Link>
                          <div className="text-xs text-gray-500">{lead.platform}</div>
                        </div>
                      </div>
                    </Td>
                    <Td><ScoreBadge score={lead.relevance_score || 0} /></Td>
                    <Td><ScoreBadge score={lead.outreach_readiness_score || 0} /></Td>
                    <Td><StatusBadge status={lead.review_status as any || 'pending'} /></Td>
                    <Td className="text-right">
                      {(lead.review_status === 'hold' || !lead.review_status || lead.review_status === 'pending_review' || lead.review_status === 'reviewed' || lead.review_status === 'pending') && lead.review_status !== 'approved' && lead.review_status !== 'rejected' && (
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors" 
                            onClick={() => handleReview(lead.id, 'approve')}
                            title="Shortlist / Approve"
                          >
                            <Check size={16} />
                          </button>
                          <button 
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors" 
                            onClick={() => handleReview(lead.id, 'reject')}
                            title="Reject"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      )}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Target Profile</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">Keywords</p>
                <div className="flex gap-2 flex-wrap mt-2">
                  {campaign.keywords?.map(k => (
                    <span key={k} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">{k}</span>
                  ))}
                  {!campaign.keywords?.length && <span className="text-sm text-gray-400">None provided</span>}
                </div>
              </div>
              
              <div className="pt-4 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Metrics</p>
                <div className="flex justify-between items-center text-sm mb-1">
                  <span className="text-gray-600">Pending Review</span>
                  <span className="font-bold text-gray-900">{leads.filter(l => l.review_status === 'pending').length}</span>
                </div>
                <div className="flex justify-between items-center text-sm mb-1">
                  <span className="text-gray-600">Approved</span>
                  <span className="font-bold text-success-600">{leads.filter(l => l.review_status === 'approved').length}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Rejected</span>
                  <span className="font-bold text-error-600">{leads.filter(l => l.review_status === 'rejected').length}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary-100 bg-primary-50/10">
            <CardHeader className="flex flex-row justify-between items-center pb-2">
              <h2 className="text-sm font-bold text-primary-700 uppercase tracking-wide flex items-center gap-2">
                <Mail size={16} /> Outreach Template
              </h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Email Subject</label>
                <input 
                  type="text" 
                  value={templateSubject}
                  onChange={(e) => setTemplateSubject(e.target.value)}
                  placeholder="e.g. Partnership Request for {{handle}}"
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Message Body</label>
                <textarea 
                  rows={8}
                  value={templateBody}
                  onChange={(e) => setTemplateBody(e.target.value)}
                  placeholder="Hi {{handle}}, we loved your content in {{city}}..."
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all resize-none"
                />
              </div>

              <div className="bg-white/50 border border-primary-100 rounded-lg p-3 space-y-2">
                 <div className="flex items-center gap-2 text-primary-700">
                   <Info size={14} />
                   <span className="text-[10px] font-bold uppercase tracking-wider">Placeholders</span>
                 </div>
                 <div className="flex flex-wrap gap-1.5">
                   {['handle', 'display_name', 'city', 'campaign_name'].map(p => (
                     <code key={p} className="text-[10px] bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded font-bold">
                       {`{{${p}}}`}
                     </code>
                   ))}
                 </div>
              </div>

              <Button 
                onClick={handleSaveTemplate}
                disabled={savingTemplate}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white shadow-md shadow-primary-500/20"
                icon={savingTemplate ? <Activity className="animate-spin" size={16} /> : <Check size={16} />}
              >
                {savingTemplate ? 'Saving...' : 'Save Campaign Template'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <OutreachPreviewModal
        creatorId={outreachModalCreatorId || ''}
        campaignId={id}
        isOpen={!!outreachModalCreatorId}
        onClose={() => setOutreachModalCreatorId(null)}
        onSend={handleConfirmApprove}
      />
    </div>
  );
}
