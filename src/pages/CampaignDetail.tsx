import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  getCampaignById, 
  getCampaignLeads, 
  triggerDiscovery,
  updateCampaignTemplate,
  reviewLead,
  updateCampaign,
  getBrands
} from '../lib/api';
import type { Campaign, Creator } from '../types';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Table, Thead, Tbody, Tr, Th, Td } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ScoreBadge } from '../components/ui/ScoreBadge';
import { OutreachPreviewModal } from '../components/ui/OutreachPreviewModal';
import { LoadingState } from '../components/ui/LoadingState';
import { ArrowLeft, Sparkles, Activity, Users, Mail, Info, Check, X, Edit2, Tag } from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { useAuth } from '../contexts/AuthContext';

export default function CampaignDetail() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [leads, setLeads] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [discovering, setDiscovering] = useState(false);
  const [templateSubject, setTemplateSubject] = useState('');
  const [templateBody, setTemplateBody] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [outreachModalCreatorId, setOutreachModalCreatorId] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [brands, setBrands] = useState<any[]>([]);
  const [customCat, setCustomCat] = useState('');
  const [editFormData, setEditFormData] = useState({
    name: '',
    brand_id: '',
    category: [] as string[],
    city: '',
    keywords: '',
    product_offer_notes: '',
    discovery_channels: ['instagram'] as string[]
  });
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchData = async (silent = false) => {
    if (!id) return;
    if (!silent) setLoading(true);
    try {
      const [camp, brandsData] = await Promise.all([
        getCampaignById(id),
        getBrands()
      ]);
      setCampaign(camp);
      setBrands(brandsData);
      setTemplateSubject(camp.template?.subject_line_template || '');
      setTemplateBody(camp.template?.body_template || '');
      setEditFormData({
        name: camp.name || '',
        brand_id: camp.brand_id || '',
        category: camp.category ? camp.category.split(',').map(c => c.trim()).filter(Boolean) : [],
        city: camp.city || '',
        keywords: Array.isArray(camp.keywords) ? camp.keywords.join(', ') : '',
        product_offer_notes: camp.product_offer_notes || '',
        discovery_channels: camp.discovery_channels || ['instagram']
      });
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

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setIsUpdating(true);
    try {
      await updateCampaign(id, {
        name: editFormData.name,
        brand_id: editFormData.brand_id,
        category: editFormData.category.join(','),
        city: editFormData.city,
        keywords: editFormData.keywords.split(',').map(k => k.trim()).filter(Boolean),
        product_offer_notes: editFormData.product_offer_notes,
        discovery_channels: editFormData.discovery_channels
      });
      setIsEditModalOpen(false);
      fetchData(true);
    } catch (err) {
      console.error(err);
      alert('Failed to update campaign.');
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleCategory = (cat: string) => {
    setEditFormData(prev => ({
      ...prev,
      category: prev.category.includes(cat) 
        ? prev.category.filter(c => c !== cat) 
        : [...prev.category, cat]
    }));
  };

  const handleAddCustomCategory = () => {
    if (!customCat.trim()) return;
    if (!editFormData.category.includes(customCat.trim())) {
      setEditFormData(prev => ({
        ...prev,
        category: [...prev.category, customCat.trim()]
      }));
    }
    setCustomCat('');
  };

  const toggleChannel = (id: string) => {
    setEditFormData(prev => ({
      ...prev,
      discovery_channels: prev.discovery_channels.includes(id) 
        ? (prev.discovery_channels.length > 1 ? prev.discovery_channels.filter(c => c !== id) : prev.discovery_channels)
        : [...prev.discovery_channels, id]
    }));
  };

  const standardCategories = ['Fashion', 'Beauty', 'Fitness', 'Food', 'Travel', 'Tech', 'Lifestyle', 'Health'];
  const platforms = [
    { 
      id: 'instagram', 
      label: 'Instagram',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#E1306C]">
          <rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect>
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
          <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"></line>
        </svg>
      )
    },
    { 
      id: 'youtube', 
      label: 'YouTube',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600">
          <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.42a2.78 2.78 0 0 0-1.94 2C1 8.14 1 12 1 12s0 3.86.46 5.58a2.78 2.78 0 0 0 1.94 2c1.72.42 8.6.42 8.6.42s6.88 0 8.6-.42a2.78 2.78 0 0 0 1.94-2C23 15.86 23 12 23 12s0-3.86-.46-5.58z"></path>
          <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"></polygon>
        </svg>
      )
    },
    { 
      id: 'tiktok', 
      label: 'TikTok',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-900">
          <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"></path>
        </svg>
      )
    }
  ];

  if (loading) {
    return (
      <div className="p-20">
        <LoadingState message="Accessing Campaign Intelligence..." />
      </div>
    );
  }

  if (!campaign) {
    return <div className="p-12 text-center text-error-500 text-lg">Campaign not found.</div>;
  }

  const handleUpdateStatus = async (newStatus: string) => {
    if (!id) return;
    
    // Optimistically update the status for instant feedback
    if (campaign) {
      setCampaign({ ...campaign, status: newStatus } as any);
    }
    
    try {
      await updateCampaign(id, { status: newStatus });
      fetchData(true); // Silent refresh in background
    } catch (err) {
      alert(`Failed to update campaign status to ${newStatus}`);
      fetchData(); // Reset on error
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-[fadeIn_0.3s_ease]">
      <Link to="/campaigns" className="inline-flex items-center text-sm font-normal text-gray-500 hover:text-gray-900 transition-colors uppercase tracking-widest">
        <ArrowLeft size={16} className="mr-1" /> Back to Campaigns
      </Link>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-normal text-gray-900 mb-2 font-outfit uppercase tracking-tight">{campaign.name}</h1>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <span className="capitalize">{campaign.city || 'Global'}</span>
            <span>•</span>
            <span className="capitalize">{campaign.category || 'Any Category'}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end gap-2 pr-6 border-r border-gray-100">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-normal text-gray-500 uppercase tracking-widest">Campaign Status</span>
              <button 
                onClick={() => handleUpdateStatus(campaign.status === 'active' ? 'archived' : 'active')}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${campaign.status === 'active' ? 'bg-primary-600' : 'bg-gray-200'}`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${campaign.status === 'active' ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
              <span className={`text-[10px] font-bold uppercase tracking-widest ${campaign.status === 'active' ? 'text-primary-600' : 'text-gray-400'}`}>
                {campaign.status === 'active' ? 'ON' : 'OFF'}
              </span>
            </div>
            <StatusBadge status={campaign.status as any} />
          </div>
          {['super_admin', 'admin', 'operator'].includes(user?.role || '') && (
            <Button 
              onClick={handleDiscovery} 
              disabled={discovering}
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/30 border-none"
              icon={discovering ? <LoadingState mini /> : <Sparkles size={16} />}
            >
              {discovering ? 'Executing AI...' : 'Run AI Discovery'}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
        <Card className="lg:col-span-2">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white rounded-t-[12px]">
            <h2 className="text-lg font-normal text-gray-900 font-outfit uppercase tracking-tight">Campaign Leads ({leads.length})</h2>
          </div>
          {leads.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-16 h-16 bg-primary-50 text-primary-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles size={32} />
              </div>
              <h3 className="text-lg font-normal text-gray-900 uppercase tracking-widest font-outfit">No leads found yet</h3>
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
                        <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-normal text-xs">
                          {(lead.full_name || lead.handle)?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <Link to={`/creators/${lead.id}`} className="font-normal text-gray-900 hover:text-primary-600 transition-colors">
                            {lead.full_name || `@${lead.handle}`}
                          </Link>
                          <div className="text-xs text-gray-500">{lead.platform}</div>
                        </div>
                      </div>
                    </Td>
                    <Td><ScoreBadge score={lead.relevance_score || 0} /></Td>
                    <Td><ScoreBadge score={lead.outreach_readiness_score || 0} /></Td>
                    <Td><StatusBadge status={lead.review_status as any || 'pending'} /></Td>
                    <Td className="text-right">
                      {['super_admin', 'admin', 'operator', 'client_admin', 'client_marketing'].includes(user?.role || '') && (lead.review_status === 'hold' || !lead.review_status || lead.review_status === 'pending_review' || lead.review_status === 'reviewed' || lead.review_status === 'pending') && lead.review_status !== 'approved' && lead.review_status !== 'rejected' && (
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
              <h2 className="text-sm font-normal text-gray-700 uppercase tracking-widest font-outfit">Target Profile</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-normal text-gray-500 uppercase tracking-widest">Keywords</p>
                <div className="flex gap-2 flex-wrap mt-2">
                  {campaign.keywords?.map(k => (
                    <span key={k} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-normal uppercase tracking-wider">{k}</span>
                  ))}
                  {!campaign.keywords?.length && <span className="text-sm text-gray-400">None provided</span>}
                </div>
              </div>
              
              <div className="pt-4 border-t border-gray-100">
                <p className="text-xs font-normal text-gray-500 uppercase tracking-widest mb-4">Metrics Intelligence</p>
                <div className="flex justify-between items-center text-sm mb-1">
                  <span className="text-gray-600">Pending Review</span>
                  <span className="font-normal text-gray-900">{leads.filter(l => l.review_status === 'pending').length}</span>
                </div>
                <div className="flex justify-between items-center text-sm mb-1">
                  <span className="text-gray-600">Approved</span>
                  <span className="font-normal text-success-600">{leads.filter(l => l.review_status === 'approved').length}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Rejected</span>
                  <span className="font-normal text-error-600">{leads.filter(l => l.review_status === 'rejected').length}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary-100 bg-primary-50/10">
            <CardHeader className="flex flex-row justify-between items-center pb-2">
              <h2 className="text-sm font-normal text-primary-700 uppercase tracking-widest flex items-center gap-2 font-outfit">
                <Mail size={16} /> Outreach Template
              </h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-normal text-gray-500 font-outfit uppercase tracking-widest mb-1.5">Email Subject</label>
                <input 
                  type="text" 
                  value={templateSubject}
                  onChange={(e) => setTemplateSubject(e.target.value)}
                  placeholder="e.g. Partnership Request for {{handle}}"
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-normal text-gray-500 font-outfit uppercase tracking-widest mb-1.5">Message Body</label>
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
                   <span className="text-[10px] font-normal uppercase tracking-widest">Placeholders</span>
                 </div>
                 <div className="flex flex-wrap gap-1.5">
                   {['handle', 'display_name', 'city', 'campaign_name'].map(p => (
                     <code key={p} className="text-[10px] bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded font-normal uppercase tracking-tighter">
                       {`{{${p}}}`}
                     </code>
                   ))}
                 </div>
              </div>

              {['super_admin', 'admin', 'operator', 'client_admin', 'client_marketing'].includes(user?.role || '') && (
                <Button 
                  onClick={handleSaveTemplate}
                  disabled={savingTemplate}
                  className="w-full bg-primary-600 hover:bg-primary-700 text-white shadow-md shadow-primary-500/20"
                  icon={savingTemplate ? <LoadingState mini /> : <Check size={16} />}
                >
                  {savingTemplate ? 'Saving...' : 'Save Campaign Template'}
                </Button>
              )}
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

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Campaign Parameters"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleEditSave} 
              disabled={isUpdating}
              className="bg-primary-600 hover:bg-primary-700 shadow-xl shadow-primary-500/30"
            >
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleEditSave} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-normal text-gray-500 font-outfit uppercase tracking-widest mb-1.5">Campaign Name *</label>
              <Input
                required
                value={editFormData.name}
                onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                placeholder="Summer Skincare 2026"
              />
            </div>
            <div>
              <label className="block text-xs font-normal text-gray-500 font-outfit uppercase tracking-widest mb-1.5">Brand *</label>
              <select
                required
                value={editFormData.brand_id}
                onChange={e => setEditFormData({ ...editFormData, brand_id: e.target.value })}
                className="w-full h-11 px-4 border border-gray-100 bg-gray-50 rounded-xl text-sm font-normal text-gray-900 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all shadow-sm"
              >
                <option value="">Select Brand</option>
                {brands.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-normal text-gray-500 font-outfit uppercase tracking-widest mb-2.5">Discovery Categories *</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {standardCategories.map(cat => (
                <button
                  type="button"
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-normal uppercase tracking-widest border transition-all ${
                    editFormData.category.includes(cat) 
                      ? 'bg-primary-600 text-white border-primary-600 shadow-lg shadow-primary-500/20' 
                      : 'bg-white text-gray-600 border-gray-100 hover:border-primary-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
              {editFormData.category.filter(c => !standardCategories.includes(c)).map(cat => (
                <button
                  type="button"
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className="px-3 py-1.5 rounded-full text-[10px] font-normal uppercase tracking-widest border bg-primary-50 text-primary-600 border-primary-200 shadow-sm"
                >
                  {cat}
                </button>
              ))}
            </div>
            
            <div className="flex gap-2">
              <Input 
                placeholder="Or enter custom category..." 
                value={customCat}
                onChange={e => setCustomCat(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), handleAddCustomCategory())}
                className="h-10 text-xs bg-gray-50/50"
              />
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleAddCustomCategory}
                className="h-10 text-[10px]"
              >
                Add
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-normal text-gray-500 font-outfit uppercase tracking-widest mb-1.5">Search Keywords</label>
              <Input
                value={editFormData.keywords}
                onChange={e => setEditFormData({ ...editFormData, keywords: e.target.value })}
                placeholder="vegan, organic, eco"
              />
            </div>
            <div>
              <label className="block text-xs font-normal text-gray-500 font-outfit uppercase tracking-widest mb-1.5">Target City *</label>
              <Input
                required
                value={editFormData.city}
                onChange={e => setEditFormData({ ...editFormData, city: e.target.value })}
                placeholder="London"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-normal text-gray-500 font-outfit uppercase tracking-widest mb-2.5">Platforms *</label>
            <div className="flex gap-3">
              {platforms.map(p => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => toggleChannel(p.id)}
                  className={`flex-1 py-3 rounded-2xl border flex flex-col items-center justify-center transition-all duration-300 ${
                    editFormData.discovery_channels.includes(p.id)
                      ? 'bg-white border-primary-500 ring-4 ring-primary-50 shadow-md transform scale-[1.05]'
                      : 'bg-gray-50 border-gray-100 text-gray-400 opacity-70 hover:bg-white hover:border-gray-200'
                  }`}
                >
                  <div className={`mb-1.5 p-1.5 rounded-lg ${editFormData.discovery_channels.includes(p.id) ? 'bg-white shadow-sm' : ''}`}>
                    {p.icon}
                  </div>
                  <span className={`text-[9px] font-bold uppercase tracking-widest ${editFormData.discovery_channels.includes(p.id) ? 'text-gray-900' : 'text-gray-400'}`}>
                    {p.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
             <label className="block text-xs font-normal text-gray-500 font-outfit uppercase tracking-widest mb-1.5">Offer Notes</label>
             <textarea
                value={editFormData.product_offer_notes}
                onChange={e => setEditFormData({ ...editFormData, product_offer_notes: e.target.value })}
                className="w-full px-4 py-3 border border-gray-100 bg-gray-50 rounded-xl text-sm font-normal text-gray-900 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all shadow-sm resize-none"
                rows={3}
                placeholder="Free access + 15% affiliate..."
             />
          </div>
        </form>
      </Modal>
      
      {/* Floating Edit Button */}
      {['super_admin', 'admin', 'operator', 'client_admin', 'client_marketing'].includes(user?.role || '') && (
        <button 
          onClick={() => setIsEditModalOpen(true)}
          className="fixed bottom-8 right-8 w-14 h-14 bg-white text-primary-600 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-[60] group"
          title="Edit Campaign Parameters"
        >
          <Edit2 size={24} className="group-hover:rotate-12 transition-transform" />
        </button>
      )}
    </div>
  );
}
