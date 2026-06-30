import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  getCampaignById,
  getCampaignLeads,
  updateCampaignTemplate,
  generateCampaignTemplate,
  reviewLead,
  updateCampaign,
  getBrands,
  deleteCampaign,
  getCampaignFunnel,
  getCampaignContentPerformance,
  recalculateCampaignPerformance,
  getCampaignActivities,
  syncCampaignCreators
} from '../lib/api';
import type { Campaign, Creator } from '../types';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Table, Thead, Tbody, Tr, Th, Td } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { OutreachPreviewModal } from '../components/ui/OutreachPreviewModal';
import { TemplateEditModal } from '../components/ui/TemplateEditModal';
import { LoadingState } from '../components/ui/LoadingState';
import { ArrowLeft, Sparkles, Activity, Mail, Check, X, Instagram, Youtube, Edit2, Trash2, Loader2, AlertCircle, Star, ChevronDown } from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { CampaignForm } from '../components/CampaignForm';
import { useAuth } from '../contexts/AuthContext';
import { useDiscovery } from '../contexts/DiscoveryContext';
import { matchesStatusFilter } from '../lib/creatorFilters';

import { CreatorPreviewDrawer } from '../components/CreatorPreviewDrawer';
import { CampaignTemplateEditor } from '../components/campaigns/CampaignTemplateEditor';
import { CampaignPerformancePanel } from '../components/campaigns/CampaignPerformancePanel';
import { CampaignLeadsTable } from '../components/campaigns/CampaignLeadsTable';
import { format } from 'date-fns';


const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo (Congo-Brazzaville)", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czechia (Czech Republic)", "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar (formerly Burma)", "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan", "Palau", "Palestine State", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Vanuatu", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
];

export const toNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const getFollowers = (c: Creator): number => {
  const direct = toNumber(c.followers_count ?? (c as any).followers);
  if (direct > 0) return direct;
  const fromProfiles = c.profiles?.map(p => toNumber(p.followers)) ?? [];
  return fromProfiles.length ? Math.max(...fromProfiles) : 0;
};

export const getEngagement = (c: Creator): number => {
  const direct = toNumber(c.engagement_rate);
  if (direct > 0) return direct;
  const fromProfiles = c.profiles?.map(p => toNumber(p.engagement_rate)) ?? [];
  return fromProfiles.length ? Math.max(...fromProfiles) : 0;
};

export const getErRating = (followers: number, er: number): { label: string; colorClass: string } | null => {
  if (followers <= 0 || er <= 0) return null;

  let goodThreshold = 0;
  let avgLower = 0;

  if (followers < 10000) {
    goodThreshold = 6.0;
    avgLower = 3.0;
  } else if (followers < 100000) {
    goodThreshold = 4.0;
    avgLower = 1.5;
  } else if (followers < 500000) {
    goodThreshold = 2.0;
    avgLower = 0.7;
  } else if (followers < 1000000) {
    goodThreshold = 1.5;
    avgLower = 0.5;
  } else {
    goodThreshold = 1.0;
    avgLower = 0.3;
  }

  if (er >= goodThreshold) {
    return { label: 'Good ER', colorClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200' };
  } else if (er >= avgLower) {
    return { label: 'Avg ER', colorClass: 'bg-blue-50 text-blue-700 border border-blue-200' };
  } else {
    return { label: 'Below Avg', colorClass: 'bg-rose-50 text-rose-700 border border-rose-200' };
  }
};

export const hasPublicProfileSignal = (c: Creator): boolean => {
  const hasProfileMetrics = c.profiles?.some(profile =>
    toNumber(profile.followers) > 0 ||
    toNumber(profile.avg_likes) > 0 ||
    toNumber(profile.avg_comments) > 0 ||
    toNumber(profile.engagement_rate) > 0
  );

  return Boolean(
    c.bio?.trim() ||
    getFollowers(c) > 0 ||
    toNumber(c.avg_likes) > 0 ||
    toNumber(c.avg_comments) > 0 ||
    getEngagement(c) > 0 ||
    hasProfileMetrics
  );
};

export const formatFollowers = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return String(n);
};

export const getPlatformHandle = (creator: Creator, platform: string) => {
  const profileHandle = creator.profiles?.find(p => p.platform.toLowerCase() === platform)?.handle;
  return (profileHandle || creator.handle || '').replace(/^@/, '');
};

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
  const { startDiscovery, isDiscovering, subscribe } = useDiscovery();
  const discovering = isDiscovering(id);
  const [templateSubject, setTemplateSubject] = useState('');
  const [templateBody, setTemplateBody] = useState('');
  const [generatingTemplate, setGeneratingTemplate] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [modalInitialSubject, setModalInitialSubject] = useState('');
  const [modalInitialBody, setModalInitialBody] = useState('');
  const [outreachModalCreatorId, setOutreachModalCreatorId] = useState<string | null>(null);
  const [outreachModalMessageType, setOutreachModalMessageType] = useState<string>('initial');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
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
    country: 'US',
    state: '',
    city: '',
    keywords: '',
    product_offer_notes: '',
    discovery_channels: ['instagram'] as string[]
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  // Sprint 4 states
  const [activeTab, setActiveTab] = useState<'leads' | 'analytics' | 'activity'>('leads');
  const [funnelData, setFunnelData] = useState<any>(null);
  const [perfData, setPerfData] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [recalculating, setRecalculating] = useState(false);
  const [syncingLeads, setSyncingLeads] = useState(false);

  // Reset to the first page whenever the filtered/sorted result set changes.
  // Ordered list of creator IDs found in the current discovery run (most recent first).
  // Used to pin freshly discovered creators to the top while discovery is running.
  const [discoveredOrder, setDiscoveredOrder] = useState<string[]>([]);

  const fetchAnalyticsAndActivities = async () => {
    if (!id) return;
    try {
      const [funnel, performance, campaignActivities] = await Promise.all([
        getCampaignFunnel(id),
        getCampaignContentPerformance(id),
        getCampaignActivities(id)
      ]);
      setFunnelData(funnel);
      setPerfData(performance);
      setActivities(campaignActivities);
    } catch (err) {
      console.error("Failed to load campaign analytics/activities:", err);
    }
  };

  const handleRecalculate = async () => {
    if (!id) return;
    try {
      setRecalculating(true);
      await recalculateCampaignPerformance(id);
      await Promise.all([fetchData(true), fetchAnalyticsAndActivities()]);
      alert("Campaign performance successfully recalculated!");
    } catch (err: any) {
      alert("Failed to recalculate: " + (err.message || err));
    } finally {
      setRecalculating(false);
    }
  };

  const handleSyncCampaignCreators = async () => {
    if (!id) return;
    try {
      setSyncingLeads(true);
      await syncCampaignCreators(id);
      await Promise.all([fetchData(true), fetchAnalyticsAndActivities()]);
      alert("Successfully synced all creators' Instagram profiles!");
    } catch (err: any) {
      console.error(err);
      alert("Failed to sync campaign creators: " + (err.response?.data?.error || err.message || err));
    } finally {
      setSyncingLeads(false);
    }
  };

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
        country: camp.country || 'US',
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

      // Fetch analytics in parallel
      await fetchAnalyticsAndActivities();
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
    setDiscoveredOrder([]);
    // Discovery runs in a global context so it keeps going if the user navigates away.
    startDiscovery(campaign);
  };

  const handleEndCampaign = () => {
    setShowEndConfirm(true);
  };

  const confirmEndCampaign = async () => {
    if (!campaign || !id) return;
    setShowEndConfirm(false);
    try {
      const now = new Date().toISOString();
      await updateCampaign(id, {
        status: 'inactive',
        end_date: now
      });
      setCampaign({
        ...campaign,
        status: 'inactive',
        end_date: now
      } as any);
      alert('Campaign ended successfully!');
    } catch (err: any) {
      alert(err || 'Failed to end campaign.');
    }
  };

  // While this campaign view is mounted, mirror live discovery events into the leads list.
  useEffect(() => {
    if (!id) return;
    const unsub = subscribe(id, {
      onSaved: (newLead) => {
        // Track find order so this creator stays pinned to the top during discovery
        setDiscoveredOrder((prev) => (prev.includes(newLead.id) ? prev : [newLead.id, ...prev]));
        setLeads((prevLeads) => (prevLeads.some((l) => l.id === newLead.id) ? prevLeads : [newLead, ...prevLeads]));
      },
      onEnriched: (enrichedLead) => {
        setLeads((prevLeads) => prevLeads.map((l) => (l.id === enrichedLead.id ? { ...l, ...enrichedLead } : l)));
        setPreviewCreator((prev) => (prev && prev.id === enrichedLead.id ? { ...prev, ...enrichedLead } : prev));
      },
      onCompleted: () => {
        // Search is done — drop the top-pinning and reload in the selected sort order
        setDiscoveredOrder([]);
        fetchData(true);
      },
    });
    return unsub;
  }, [id, subscribe]);

  const handleReview = async (creatorId: string, action: 'approve' | 'reject' | 'shortlist' | 'revoke') => {
    if (action === 'approve') {
      setOutreachModalMessageType('initial');
      setOutreachModalCreatorId(creatorId);
      return;
    }

    const previousLeads = [...leads];

    // Optimistically update the UI state immediately
    setLeads(prevLeads => prevLeads.map(lead => {
      if (lead.id === creatorId) {
        if (action === 'revoke') {
          return { ...lead, review_status: 'hold', lifecycle_status: 'new' };
        } else if (action === 'reject') {
          return { ...lead, review_status: 'rejected' };
        } else if (action === 'shortlist') {
          return { ...lead, review_status: 'shortlisted' };
        }
      }
      return lead;
    }));

    try {
      await reviewLead(creatorId, action);
      fetchData(true); // Silently reload in the background
    } catch (err) {
      setLeads(previousLeads); // Revert state on error
      alert('Failed to review lead: ' + err);
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

  const persistTemplate = async (subject: string, body: string) => {
    if (!id) return;
    await updateCampaignTemplate(id, {
      subject_line_template: subject,
      body_template: body
    });
    setTemplateSubject(subject);
    setTemplateBody(body);
  };

  const handleEditTemplate = () => {
    setModalInitialSubject(templateSubject);
    setModalInitialBody(templateBody);
    setIsTemplateModalOpen(true);
  };

  const handleGenerateTemplate = async () => {
    if (!id) return;
    setGeneratingTemplate(true);
    try {
      const generated = await generateCampaignTemplate(id);
      setModalInitialSubject(generated.subject_line_template || '');
      setModalInitialBody(generated.body_template || '');
      setIsTemplateModalOpen(true);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to generate template';
      alert(`AI generation failed: ${msg}`);
    } finally {
      setGeneratingTemplate(false);
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
        country: editFormData.country || 'US',
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
      await updateCampaign(id, { status: newStatus as Campaign['status'] });
      fetchData(true); // Silent refresh in background
    } catch (err) {
      alert(`Failed to update campaign status to ${newStatus}`);
      fetchData(); // Reset on error
    }
  };

  const filteredLeads = leads.filter(c => {
    if (!hasPublicProfileSignal(c)) return false;
    // Hide creators with fewer than 1k followers — except ones still being found in
    // the current discovery run (their follower counts only arrive during enrichment).
    if (getFollowers(c) < 1000 && !discoveredOrder.includes(c.id)) return false;

    if (selectedStatuses.length > 0) {
      return selectedStatuses.some(s => matchesStatusFilter(c, s));
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-[fadeIn_0.2s_ease] px-4 sm:px-0">
      <Link
        to={fromBrandsList ? "/brands" : (fromBrandId ? `/brands/${fromBrandId}` : "/campaigns")}
        className="inline-flex items-center text-[10px] font-normal text-gray-400 hover:text-primary-600 transition-colors group tracking-widest uppercase"
      >
        <ArrowLeft size={14} className="mr-1 group-hover:-translate-x-1 transition-transform" /> BACK TO {fromBrandsList ? 'BRANDS' : (fromBrandId ? 'BRAND' : 'CAMPAIGNS')}
      </Link>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-normal text-gray-900 font-outfit uppercase tracking-tight leading-tight">{campaign.name}</h1>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="flex flex-col items-start sm:items-end gap-2 sm:pl-6 border-gray-100">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-normal text-gray-500 uppercase tracking-widest">Campaign Status</span>
              {['super_admin', 'admin', 'operator', 'client_admin'].includes(user?.role || '') && (
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
              {!['super_admin', 'admin', 'operator', 'client_admin'].includes(user?.role || '') && (
                <StatusBadge status={campaign.status as any} />
              )}
            </div>
            {['super_admin', 'admin', 'operator', 'client_admin'].includes(user?.role || '') && (
              <StatusBadge status={campaign.status as any} />
            )}
          </div>
          {['super_admin', 'admin', 'operator', 'client_admin', 'client_marketing'].includes(user?.role || '') && campaign.status === 'active' && (
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleEndCampaign}
                className="w-full sm:w-auto bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 hover:border-red-300 rounded-lg h-11 px-6 font-normal uppercase tracking-widest text-[10px] transition-colors focus:outline-none flex items-center justify-center"
              >
                End Campaign
              </button>
              <Button
                onClick={handleDiscovery}
                disabled={discovering}
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/30 border-none h-11 px-6 font-normal uppercase tracking-widest text-[10px]"
                icon={discovering ? <LoadingState mini /> : <Sparkles size={16} />}
              >
                {discovering ? 'Executing AI...' : 'Run AI Discovery'}
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 pt-4">
        <Card className="lg:col-span-3">
          {/* Tab Header */}
          <div className="border-b border-gray-100 bg-white rounded-t-[12px] flex items-center justify-between px-6 pt-4">
            <div className="flex gap-6">
              <button
                type="button"
                onClick={() => setActiveTab('leads')}
                className={`pb-4 text-xs font-bold uppercase tracking-widest border-b-2 outline-none transition-all ${activeTab === 'leads'
                    ? 'border-primary-600 text-primary-700'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                  }`}
              >
                Leads ({filteredLeads.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('analytics')}
                className={`pb-4 text-xs font-bold uppercase tracking-widest border-b-2 outline-none transition-all ${activeTab === 'analytics'
                    ? 'border-primary-600 text-primary-700'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                  }`}
              >
                Campaign Analytics
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('activity')}
                className={`pb-4 text-xs font-bold uppercase tracking-widest border-b-2 outline-none transition-all ${activeTab === 'activity'
                    ? 'border-primary-600 text-primary-700'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                  }`}
              >
                Activity Timeline ({activities.length})
              </button>
            </div>
          </div>
          {activeTab === 'leads' && (
            <CampaignLeadsTable
              leads={leads}
              userRole={user?.role || ''}
              discovering={discovering}
              discoveredOrder={discoveredOrder}
              syncingLeads={syncingLeads}
              handleSyncCampaignCreators={handleSyncCampaignCreators}
              handleReview={handleReview}
              setPreviewCreator={setPreviewCreator}
              setIsPreviewOpen={setIsPreviewOpen}
              selectedStatuses={selectedStatuses}
              setSelectedStatuses={setSelectedStatuses}
            />
          )}

          {(activeTab === 'analytics' || activeTab === 'activity') && (
            <CampaignPerformancePanel
              activeTab={activeTab}
              perfData={perfData}
              funnelData={funnelData}
              activities={activities}
              recalculating={recalculating}
              handleRecalculate={handleRecalculate}
            />
          )}


        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-normal text-gray-700 uppercase tracking-widest font-outfit">Target Profile</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-normal text-gray-500 uppercase tracking-widest">Location</p>
                <p className="text-sm text-gray-800 capitalize mt-1">
                  {[campaign.city, campaign.state, campaign.country].map(v => v?.trim()).filter(Boolean).join(', ') || 'Global'}
                </p>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <p className="text-xs font-normal text-gray-500 uppercase tracking-widest">Categories</p>
                <div className="flex gap-2 flex-wrap mt-2">
                  {[...new Set(campaign.category?.split(',').map(c => c.trim()).filter(Boolean))].map(c => (
                    <span key={c} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-normal uppercase tracking-wider">{c}</span>
                  ))}
                  {!campaign.category?.trim() && <span className="text-sm text-gray-400">Any category</span>}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
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
                  onClick={() => setSelectedStatuses(selectedStatuses.includes('pending') ? [] : ['pending'])}
                  className={`flex justify-between items-center w-full text-sm mb-1.5 px-3 py-2 rounded-xl border transition-all duration-300 ${selectedStatuses.includes('pending')
                      ? 'bg-primary-50 text-primary-700 border-primary-200 shadow-sm'
                      : 'text-gray-600 border-transparent hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  title="Click to filter by Pending Review"
                >
                  <span className="font-outfit uppercase tracking-tight text-xs">Pending Review</span>
                  <span className={`font-normal text-xs ${selectedStatuses.includes('pending') ? 'text-primary-700 font-bold' : 'text-gray-900'}`}>
                    {leads.filter(l => l.review_status === 'shortlisted' || l.review_status === 'pending_review' || !l.review_status || l.review_status === 'pending' || l.review_status === 'reviewed').length}
                  </span>
                </button>
                <button
                  onClick={() => setSelectedStatuses(selectedStatuses.includes('approved') ? [] : ['approved'])}
                  className={`flex justify-between items-center w-full text-sm mb-1.5 px-3 py-2 rounded-xl border transition-all duration-300 ${selectedStatuses.includes('approved')
                      ? 'bg-green-50 text-green-700 border-green-200 shadow-sm'
                      : 'text-gray-600 border-transparent hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  title="Click to filter by Approved"
                >
                  <span className="font-outfit uppercase tracking-tight text-xs">Approved</span>
                  <span className={`font-normal text-xs ${selectedStatuses.includes('approved') ? 'text-green-700 font-bold' : 'text-success-600'}`}>
                    {leads.filter(l => l.review_status === 'approved').length}
                  </span>
                </button>
                <button
                  onClick={() => setSelectedStatuses(selectedStatuses.includes('rejected') ? [] : ['rejected'])}
                  className={`flex justify-between items-center w-full text-sm px-3 py-2 rounded-xl border transition-all duration-300 ${selectedStatuses.includes('rejected')
                      ? 'bg-red-50 text-red-700 border-red-200 shadow-sm'
                      : 'text-gray-600 border-transparent hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  title="Click to filter by Rejected"
                >
                  <span className="font-outfit uppercase tracking-tight text-xs">Rejected</span>
                  <span className={`font-normal text-xs ${selectedStatuses.includes('rejected') ? 'text-red-700 font-bold' : 'text-error-600'}`}>
                    {leads.filter(l => l.review_status === 'rejected').length}
                  </span>
                </button>
              </div>
            </CardContent>
          </Card>

          <CampaignTemplateEditor
            templateSubject={templateSubject}
            templateBody={templateBody}
            handleEditTemplate={handleEditTemplate}
            handleGenerateTemplate={handleGenerateTemplate}
            generatingTemplate={generatingTemplate}
            currentUserRole={user?.role || ''}
          />
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

      <TemplateEditModal
        isOpen={isTemplateModalOpen}
        initialSubject={modalInitialSubject}
        initialBody={modalInitialBody}
        onSave={persistTemplate}
        onClose={() => setIsTemplateModalOpen(false)}
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
      {['super_admin', 'admin', 'client_admin'].includes(user?.role || '') && (
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

      {showEndConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-sm border-none shadow-3xl bg-white rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-xl font-normal text-gray-900 mb-2 font-outfit uppercase tracking-tight">End Campaign?</h3>
              <p className="text-sm font-normal text-gray-500 mb-6 font-outfit">
                Are you sure you want to end <strong className="text-gray-900">{campaign.name}</strong>?
              </p>
              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  className="flex-1 font-normal uppercase tracking-widest text-[10px]"
                  onClick={() => setShowEndConfirm(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-normal uppercase tracking-widest text-[10px] shadow-xl shadow-red-500/20"
                  onClick={confirmEndCampaign}
                  disabled={isUpdating}
                >
                  {isUpdating ? <LoadingState mini /> : 'End Campaign'}
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
