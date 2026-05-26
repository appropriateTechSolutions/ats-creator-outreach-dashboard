import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  getCampaignById, 
  getCampaignLeads, 
  updateCampaignTemplate,
  reviewLead,
  updateCampaign,
  getBrands,
  deleteCampaign
} from '../lib/api';
import type { Campaign, Creator } from '../types';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Table, Thead, Tbody, Tr, Th, Td } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ScoreBadge } from '../components/ui/ScoreBadge';
import { OutreachPreviewModal } from '../components/ui/OutreachPreviewModal';
import { LoadingState } from '../components/ui/LoadingState';
import { ArrowLeft, Sparkles, Activity, Mail, Info, Check, X, Instagram, Youtube, Edit2, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { CampaignForm } from '../components/CampaignForm';
import { useAuth } from '../contexts/AuthContext';

import { CreatorPreviewDrawer } from '../components/CreatorPreviewDrawer';

const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo (Congo-Brazzaville)", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czechia (Czech Republic)", "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar (formerly Burma)", "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan", "Palau", "Palestine State", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Vanuatu", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
];

export default function CampaignDetail() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const fromBrandId = location.state?.fromBrandId;
  const fromBrandsList = location.state?.fromBrandsList;
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [leads, setLeads] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [discovering, setDiscovering] = useState(false);
  const [templateSubject, setTemplateSubject] = useState('');
  const [templateBody, setTemplateBody] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [outreachModalCreatorId, setOutreachModalCreatorId] = useState<string | null>(null);
  const [outreachModalMessageType, setOutreachModalMessageType] = useState<string>('initial');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [previewCreator, setPreviewCreator] = useState<Creator | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [brands, setBrands] = useState<any[]>([]);
  const [customCat, setCustomCat] = useState('');
  const [customState, setCustomState] = useState('');
  const [customCity, setCustomCity] = useState('');
  const [editFormData, setEditFormData] = useState({
    name: '',
    brand_id: '',
    campaign_description: '',
    category: [] as string[],
    country: '',
    state: '',
    city: '',
    keywords: '',
    product_offer_notes: '',
    discovery_channels: ['instagram'] as string[]
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');

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
        campaign_description: camp.description || '',
        category: camp.category ? camp.category.split(',').map(c => c.trim()).filter(Boolean) : [],
        country: camp.country || '',
        state: camp.state || '',
        city: camp.city || '',
        keywords: Array.isArray(camp.keywords) ? camp.keywords.join(', ') : '',
        product_offer_notes: camp.product_offer_notes || '',
        discovery_channels: camp.discovery_channels || ['instagram']
      });
      const campLeads = await getCampaignLeads(id);
      setLeads(campLeads);
      setPreviewCreator(prev => {
        if (!prev) return null;
        return campLeads.find(c => c.id === prev.id) || prev;
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleDiscovery = () => {
    if (!campaign || !id) return;
    setDiscovering(true);

    const token = localStorage.getItem('ats_token') || '';
    const categoriesStr = campaign.category || '';
    const cityStr = campaign.city || 'global';
    const keywordsStr = Array.isArray(campaign.keywords) ? campaign.keywords.join(',') : '';

    const apiBaseUrl = 'http://localhost:8081/api';
    const streamUrl = `${apiBaseUrl}/creators/ai-discovery-stream?campaign_id=${id}&categories=${encodeURIComponent(categoriesStr)}&city=${encodeURIComponent(cityStr)}&keywords=${encodeURIComponent(keywordsStr)}&token=${encodeURIComponent(token)}`;

    console.log('⚡ Connecting to AI Discovery SSE Stream at:', streamUrl);
    const eventSource = new EventSource(streamUrl);

    eventSource.onmessage = (event) => {
      console.log('📩 SSE message:', event);
    };

    eventSource.addEventListener('status', (e: any) => {
      try {
        const data = JSON.parse(e.data);
        console.log('🔄 Discovery Status:', data.message);
      } catch (err) {
        console.error(err);
      }
    });

    eventSource.addEventListener('saved', (e: any) => {
      try {
        const newLead = JSON.parse(e.data);
        console.log('✨ Lead Saved:', newLead);
        // Prepend/append new lead to the list if not already present
        setLeads((prevLeads) => {
          if (prevLeads.some((l) => l.id === newLead.id)) {
            return prevLeads;
          }
          return [newLead, ...prevLeads];
        });
      } catch (err) {
        console.error(err);
      }
    });

    eventSource.addEventListener('enriched', (e: any) => {
      try {
        const enrichedLead = JSON.parse(e.data);
        console.log('✅ Lead Enriched:', enrichedLead);
        // Update the lead in state
        setLeads((prevLeads) => {
          return prevLeads.map((l) => (l.id === enrichedLead.id ? { ...l, ...enrichedLead } : l));
        });
        // If the current preview drawer is open for this creator, update it too
        setPreviewCreator((prevPreview) => {
          if (prevPreview && prevPreview.id === enrichedLead.id) {
            return { ...prevPreview, ...enrichedLead };
          }
          return prevPreview;
        });
      } catch (err) {
        console.error(err);
      }
    });

    eventSource.addEventListener('completed', (e: any) => {
      try {
        const data = JSON.parse(e.data);
        alert(`AI Discovery Completed! ${data.success_count} leads processed successfully.`);
      } catch (err) {
        console.error(err);
      } finally {
        eventSource.close();
        setDiscovering(false);
      }
    });

    eventSource.addEventListener('error', (e: any) => {
      let message = 'An error occurred during AI Discovery stream.';
      try {
        if (e.data) {
          const data = JSON.parse(e.data);
          message = data.error || data.message || message;
        }
      } catch (err) {
        console.error(err);
      }
      console.error('❌ SSE Stream Error:', e);
      alert(message);
      eventSource.close();
      setDiscovering(false);
    });
  };

  const handleReview = async (creatorId: string, action: 'approve' | 'reject' | 'shortlist') => {
    if (action === 'approve') {
      setOutreachModalMessageType('initial');
      setOutreachModalCreatorId(creatorId);
      return;
    }
    
    setActionLoading(creatorId);
    try {
      await reviewLead(creatorId, action);
      fetchData(true); // Reload leads to reflect status change silently
    } catch (err) {
      alert('Failed to review lead: ' + err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmApprove = async (customSubject?: string, customBody?: string, messageType?: string) => {
    if (!outreachModalCreatorId) return;
    try {
      await reviewLead(outreachModalCreatorId, 'approve', customSubject, customBody, messageType);
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
    if (!getCommaValues(editFormData.city).length) {
      alert('Please add at least one target city');
      return;
    }
    setIsUpdating(true);
    try {
      await updateCampaign(id, {
        name: editFormData.name,
        brand_id: editFormData.brand_id,
        description: editFormData.campaign_description,
        category: editFormData.category.join(','),
        country: editFormData.country,
        state: getCommaValues(editFormData.state).join(', '),
        city: getCommaValues(editFormData.city).join(', '),
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

  const handleDeleteCampaign = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDeleteCampaign = async () => {
    if (!id) return;
    setIsUpdating(true);
    try {
      await deleteCampaign(id);
      navigate('/campaigns');
    } catch (err: any) {
      alert(err || 'Failed to delete campaign.');
    } finally {
      setIsUpdating(false);
      setShowDeleteConfirm(false);
    }
  };

  const getCommaValues = (value: string) =>
    value
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);

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
      await updateCampaign(id, { status: newStatus as any });
      fetchData(true); // Silent refresh in background
    } catch (err) {
      alert(`Failed to update campaign status to ${newStatus}`);
      fetchData(); // Reset on error
    }
  };

  const filteredLeads = leads.filter(c => {
    if (!statusFilter) return true;
    if (statusFilter === 'pending') {
      return c.review_status === 'pending_review' || c.review_status === 'shortlisted' || !c.review_status || c.review_status === 'pending';
    }
    return c.review_status === statusFilter;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-[fadeIn_0.3s_ease] px-4 sm:px-0">
      <Link 
        to={fromBrandsList ? "/brands" : (fromBrandId ? `/brands/${fromBrandId}` : "/campaigns")} 
        className="inline-flex items-center text-[10px] font-normal text-gray-400 hover:text-primary-600 transition-colors group tracking-widest uppercase"
      >
        <ArrowLeft size={14} className="mr-1 group-hover:-translate-x-1 transition-transform" /> BACK TO {fromBrandsList ? 'BRANDS' : (fromBrandId ? 'BRAND' : 'CAMPAIGNS')}
      </Link>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-normal text-gray-900 mb-2 font-outfit uppercase tracking-tight leading-tight">{campaign.name}</h1>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <span className="capitalize">{campaign.city || 'Global'}</span>
            <span>•</span>
            <span className="capitalize">{campaign.category || 'Any Category'}</span>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="flex flex-col items-start sm:items-end gap-2 sm:pl-6 border-gray-100">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-normal text-gray-500 uppercase tracking-widest">Campaign Status</span>
                {['super_admin', 'admin', 'operator'].includes(user?.role || '') && (
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleUpdateStatus(campaign.status === 'active' ? 'inactive' : 'active')}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${campaign.status === 'active' ? 'bg-primary-600' : 'bg-gray-200'}`}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${campaign.status === 'active' ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${campaign.status === 'active' ? 'text-primary-600' : 'text-gray-400'}`}>
                      {campaign.status === 'active' ? 'ON' : 'OFF'}
                    </span>
                  </div>
                )}
                {!['super_admin', 'admin', 'operator'].includes(user?.role || '') && (
                  <StatusBadge status={campaign.status as any} />
                )}
              </div>
              {['super_admin', 'admin', 'operator'].includes(user?.role || '') && (
                <StatusBadge status={campaign.status as any} />
              )}
          </div>
          {['super_admin', 'admin', 'operator', 'client_admin', 'client_marketing'].includes(user?.role || '') && (
            <Button 
              onClick={handleDiscovery} 
              disabled={discovering}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/30 border-none h-11 px-6 font-normal uppercase tracking-widest text-[10px]"
              icon={discovering ? <LoadingState mini /> : <Sparkles size={16} />}
            >
              {discovering ? 'Executing AI...' : 'Run AI Discovery'}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
        <Card className="lg:col-span-2">
          <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white rounded-t-[12px]">
            <h2 className="text-lg font-normal text-gray-900 font-outfit uppercase tracking-tight">Creators Leads ({filteredLeads.length})</h2>
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <select 
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="w-full sm:w-auto bg-white border border-gray-200 text-gray-700 text-sm rounded-lg py-1.5 px-3 focus:outline-none focus:ring-1 focus:ring-primary-500 min-w-[140px]"
              >
                <option value="">Any Status</option>
                <option value="pending">Pending Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
          {filteredLeads.length === 0 ? (
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
                {filteredLeads.map(lead => (
                  <Tr key={lead.id}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-normal text-xs">
                          {(lead.full_name || lead.handle)?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <button 
                            onClick={() => {
                              setPreviewCreator(lead);
                              setIsPreviewOpen(true);
                            }}
                            className="font-normal text-gray-900 hover:text-primary-600 transition-colors text-left text-sm uppercase tracking-tight font-outfit"
                          >
                            {lead.full_name || `@${lead.handle}`}
                          </button>
                          <div className="flex items-center gap-2 mt-1.5">
                            {((lead.primary_platform)?.toLowerCase() === 'instagram' || lead.has_instagram) && (
                              <a 
                                href={lead.profiles?.find(p => p.platform.toLowerCase() === 'instagram')?.profile_url || `https://instagram.com/${lead.handle?.replace(/^@/, '')}`} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="text-[#E1306C] hover:scale-110 transition-transform"
                                title="Instagram"
                              >
                                <Instagram size={14} />
                              </a>
                            )}
                            {((lead.primary_platform)?.toLowerCase() === 'youtube' || lead.has_youtube) && (
                              <a 
                                href={lead.profiles?.find(p => p.platform.toLowerCase() === 'youtube')?.profile_url || `https://youtube.com/@${lead.handle?.replace(/^@/, '')}`} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="text-[#FF0000] hover:scale-110 transition-transform"
                                title="YouTube"
                              >
                                <Youtube size={14} />
                              </a>
                            )}
                            {((lead.primary_platform)?.toLowerCase() === 'tiktok' || lead.has_tiktok) && (
                              <a 
                                href={lead.profiles?.find(p => p.platform.toLowerCase() === 'tiktok')?.profile_url || `https://tiktok.com/@${lead.handle?.replace(/^@/, '')}`} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="text-gray-900 hover:scale-110 transition-transform"
                                title="TikTok"
                              >
                                <Activity size={14} />
                              </a>
                            )}
                            {/* Fallback if no icon matches but platform info exists */}
                            {!(lead.primary_platform || lead.has_instagram || lead.has_youtube || lead.has_tiktok) && lead.primary_platform && (
                              <span className="text-[10px] text-gray-400 uppercase tracking-widest">{lead.primary_platform}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Td>
                    <Td><ScoreBadge score={lead.relevance_score || 0} /></Td>
                    <Td><ScoreBadge score={lead.outreach_readiness_score || 0} /></Td>
                    <Td><StatusBadge status={['not_respond'].includes(lead.lifecycle_status) ? lead.lifecycle_status : (lead.review_status as any || 'pending')} /></Td>
                    <Td className="text-right">
                      {['super_admin', 'admin', 'operator', 'client_admin', 'client_marketing'].includes(user?.role || '') && (
                        <div className="flex items-center justify-end gap-2">
                          {lead.review_status !== 'approved' && lead.review_status !== 'rejected' && lead.review_status !== 'shortlisted' && lead.review_status !== 'pending_review' && lead.lifecycle_status !== 'not_respond' && (
                            <>
                              <button 
                                onClick={() => handleReview(lead.id, 'approve')}
                                disabled={!!actionLoading}
                                className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                                title="Approve & Send Outreach"
                              >
                                <Check size={16} />
                              </button>
                              <button 
                                onClick={() => handleReview(lead.id, 'reject')}
                                disabled={!!actionLoading}
                                className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                title="Reject"
                              >
                                <X size={16} />
                              </button>
                              {lead.review_status !== 'shortlisted' && lead.review_status !== 'pending_review' && (
                                <button
                                  onClick={() => handleReview(lead.id, 'shortlist')}
                                  disabled={!!actionLoading}
                                  className="px-2.5 py-1 rounded text-[11px] font-normal uppercase tracking-wider bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors font-outfit"
                                  title="Shortlist → Move to Review Queue"
                                >
                                  Shortlist
                                </button>
                              )}
                            </>
                          )}
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
                <button 
                  onClick={() => setStatusFilter(statusFilter === 'pending' ? '' : 'pending')}
                  className={`flex justify-between items-center w-full text-sm mb-1.5 px-3 py-2 rounded-xl border transition-all duration-300 ${
                    statusFilter === 'pending'
                      ? 'bg-primary-50 text-primary-700 border-primary-200 shadow-sm'
                      : 'text-gray-600 border-transparent hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  title="Click to filter by Pending Review"
                >
                  <span className="font-outfit uppercase tracking-tight text-xs">Pending Review</span>
                  <span className={`font-normal text-xs ${statusFilter === 'pending' ? 'text-primary-700 font-bold' : 'text-gray-900'}`}>
                    {leads.filter(l => l.review_status === 'shortlisted' || l.review_status === 'pending_review' || !l.review_status || l.review_status === 'pending' || l.review_status === 'reviewed').length}
                  </span>
                </button>
                <button 
                  onClick={() => setStatusFilter(statusFilter === 'approved' ? '' : 'approved')}
                  className={`flex justify-between items-center w-full text-sm mb-1.5 px-3 py-2 rounded-xl border transition-all duration-300 ${
                    statusFilter === 'approved'
                      ? 'bg-green-50 text-green-700 border-green-200 shadow-sm'
                      : 'text-gray-600 border-transparent hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  title="Click to filter by Approved"
                >
                  <span className="font-outfit uppercase tracking-tight text-xs">Approved</span>
                  <span className={`font-normal text-xs ${statusFilter === 'approved' ? 'text-green-700 font-bold' : 'text-success-600'}`}>
                    {leads.filter(l => l.review_status === 'approved').length}
                  </span>
                </button>
                <button 
                  onClick={() => setStatusFilter(statusFilter === 'rejected' ? '' : 'rejected')}
                  className={`flex justify-between items-center w-full text-sm px-3 py-2 rounded-xl border transition-all duration-300 ${
                    statusFilter === 'rejected'
                      ? 'bg-red-50 text-red-700 border-red-200 shadow-sm'
                      : 'text-gray-600 border-transparent hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  title="Click to filter by Rejected"
                >
                  <span className="font-outfit uppercase tracking-tight text-xs">Rejected</span>
                  <span className={`font-normal text-xs ${statusFilter === 'rejected' ? 'text-red-700 font-bold' : 'text-error-600'}`}>
                    {leads.filter(l => l.review_status === 'rejected').length}
                  </span>
                </button>
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
        messageType={outreachModalMessageType}
        isOpen={!!outreachModalCreatorId}
        onClose={() => setOutreachModalCreatorId(null)}
        onSend={handleConfirmApprove}
      />

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Campaign Parameters"
      >
        <CampaignForm
          formData={editFormData}
          setFormData={setEditFormData}
          brands={brands}
          countries={COUNTRIES}
          isSubmitting={isUpdating}
          onSubmit={handleEditSave}
          onCancel={() => setIsEditModalOpen(false)}
          submitLabel="Save Changes"
          customCat={customCat}
          setCustomCat={setCustomCat}
          customState={customState}
          setCustomState={setCustomState}
          customCity={customCity}
          setCustomCity={setCustomCity}
        />
      </Modal>
      
      {/* Floating Actions */}
      {['super_admin', 'admin'].includes(user?.role || '') && (
        <button
          type="button"
          onClick={handleDeleteCampaign}
          disabled={isUpdating}
          className="fixed bottom-28 right-8 w-12 h-12 bg-white text-red-600 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-red-100 flex items-center justify-center hover:bg-red-50 hover:scale-110 active:scale-95 transition-all z-[60] group disabled:cursor-not-allowed disabled:opacity-60"
          aria-label="Delete campaign"
          title="Delete Campaign"
        >
          {isUpdating ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <Trash2 size={21} className="group-hover:rotate-12 transition-transform" />
          )}
        </button>
      )}

      {['super_admin', 'admin', 'operator', 'client_admin', 'client_marketing'].includes(user?.role || '') && (
        <button
          type="button"
          onClick={() => setIsEditModalOpen(true)}
          className="fixed bottom-8 right-8 w-14 h-14 bg-white text-primary-600 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-[60] group"
          aria-label="Edit campaign"
          title="Edit Campaign Parameters"
        >
          <Edit2 size={24} className="group-hover:rotate-12 transition-transform" />
        </button>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-sm border-none shadow-3xl bg-white rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-xl font-normal text-gray-900 mb-2 font-outfit uppercase tracking-tight">Delete Campaign?</h3>
              <p className="text-sm font-normal text-gray-500 mb-6 font-outfit">
                Are you sure you want to permanently delete <strong className="text-gray-900">{campaign.name}</strong>?
              </p>
              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  className="flex-1 font-normal uppercase tracking-widest text-[10px]"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-normal uppercase tracking-widest text-[10px] shadow-xl shadow-red-500/20"
                  onClick={confirmDeleteCampaign}
                  disabled={isUpdating}
                >
                  {isUpdating ? <LoadingState mini /> : 'Delete Campaign'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
      <CreatorPreviewDrawer 
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        creator={previewCreator}
        campaignId={id || ''}
        onActionComplete={() => fetchData(true)}
      />
    </div>
  );
}
