import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Table, Thead, Tbody, Tr, Th, Td } from '../components/ui/Table';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Button } from '../components/ui/Button';
import { Drawer } from '../components/ui/Drawer';
import { Search, Plus, Filter, Target, Megaphone } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { getCampaigns, createCampaign, getBrands } from '../lib/api';
import { format } from 'date-fns';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { LoadingState } from '../components/ui/LoadingState';
import { useAuth } from '../contexts/AuthContext';

interface Campaign {
  id: string;
  name: string;
  status: string;
  city: string;
  category: string;
  created_at: string;
  Brand?: {
    name: string;
  };
  Client?: {
    name: string;
  };
}

export default function Campaigns() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customCat, setCustomCat] = useState('');
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    brand_id: '',
    category: [] as string[],
    city: '',
    keywords: '',
    product_offer_notes: '',
    discovery_channels: ['instagram'] as string[]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [campaignsData, brandsData] = await Promise.all([
        getCampaigns(),
        getBrands()
      ]);
      setCampaigns(campaignsData);
      setBrands(brandsData);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.brand_id) {
      alert('Please select a Brand');
      return;
    }
    setIsSubmitting(true);
    try {
      const selectedBrand = brands.find(b => b.id === formData.brand_id);
      
      await createCampaign({
        name: formData.name,
        brand_id: formData.brand_id,
        client_id: selectedBrand?.client_id,
        category: formData.category.join(','),
        city: formData.city,
        keywords: formData.keywords.split(',').map(k => k.trim()).filter(Boolean),
        product_offer_notes: formData.product_offer_notes,
        offer_type: 'hybrid',
        discovery_channels: formData.discovery_channels,
        email_subject: 'Collaboration with {{campaign_name}}',
        email_body: 'Hey {{full_name}}, love your content! We would love to collaborate for our {{campaign_name}} campaign in {{city}}.\n\nOffer: {{product_offer_notes}}'
      });
      setIsModalOpen(false);
      setFormData({ name: '', brand_id: '', category: [], city: '', keywords: '', product_offer_notes: '', discovery_channels: ['instagram'] });
      setCustomCat('');
      fetchData();
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to create campaign';
      alert(`Error: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleCategory = (cat: string) => {
    setFormData(prev => ({
      ...prev,
      category: prev.category.includes(cat) 
        ? prev.category.filter(c => c !== cat) 
        : [...prev.category, cat]
    }));
  };

  const handleAddCustomCategory = () => {
    if (!customCat.trim()) return;
    if (!formData.category.includes(customCat.trim())) {
      setFormData(prev => ({
        ...prev,
        category: [...prev.category, customCat.trim()]
      }));
    }
    setCustomCat('');
  };

  const toggleChannel = (id: string) => {
    setFormData(prev => ({
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

  const filteredCampaigns = campaigns.filter(c => {
    const searchLower = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(searchLower) ||
      (c.Brand?.name || '').toLowerCase().includes(searchLower) ||
      (c.Client?.name || '').toLowerCase().includes(searchLower) ||
      (c.city || '').toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20 animate-[fadeIn_0.3s_ease]">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-normal text-gray-900 font-outfit uppercase tracking-tight">Campaigns</h1>
        </div>
        {['super_admin', 'admin', 'operator', 'client_admin'].includes(user?.role || '') && (
          <Button 
            onClick={() => setIsModalOpen(true)} 
            className="bg-primary-600 hover:bg-primary-700 shadow-xl shadow-primary-500/20"
            icon={<Plus size={20} />}
          >
            Launch Campaign
          </Button>
        )}
      </div>

      <Card className="border-none shadow-2xl bg-white/80 backdrop-blur-md overflow-hidden">
        <div className="p-5 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Filter by campaign, brand, client, city..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2.5 pl-10 pr-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
            />
          </div>
          <div className="text-[10px] font-normal text-gray-400 uppercase tracking-widest bg-gray-100 px-3 py-1.5 rounded-lg">
            {filteredCampaigns.length} Initiatives Active
          </div>
        </div>

        {loading ? (
          <div className="py-20">
            <LoadingState message="Synchronizing Outreach Data..." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-normal text-gray-400 uppercase tracking-widest border-b border-gray-100 bg-gray-50/50">
                  <th className="px-8 py-5">Campaign Identity</th>
                  <th className="px-8 py-5">Brand</th>
                  <th className="px-8 py-5">Client</th>
                  <th className="px-8 py-5 text-center">City</th>
                  <th className="px-8 py-5 text-center">Status</th>
                  <th className="px-8 py-5 text-right">Launch Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredCampaigns.map(c => (
                  <tr key={c.id} 
                    onClick={() => navigate(`/campaigns/${c.id}`)}
                    className="hover:bg-primary-50/30 transition-all group cursor-pointer"
                  >
                    <td className="px-8 py-6 align-top">
                      <div className="text-sm font-normal text-gray-900 group-hover:text-primary-600 transition-colors uppercase tracking-tight font-outfit">
                        {c.name}
                      </div>
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {c.category?.split(',').map(cat => cat.trim()).filter(Boolean).map(cat => (
                          <span key={cat} className="px-2 py-0.5 rounded text-[9px] font-normal uppercase tracking-widest bg-gray-100 text-gray-600 border border-gray-200">
                            {cat}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-8 py-6 align-top">
                      <div className="text-sm font-normal text-gray-900 uppercase tracking-tight font-outfit">
                        {c.Brand?.name || '---'}
                      </div>
                    </td>
                    <td className="px-8 py-6 align-top">
                      <div className="text-sm font-normal text-gray-900 uppercase tracking-tight font-outfit">
                        {c.Client?.name || '---'}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center align-top">
                      <div className="text-sm font-normal text-gray-900 uppercase tracking-tight font-outfit">
                        {c.city || 'Global'}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center align-top">
                      <StatusBadge status={c.status as any} />
                    </td>
                    <td className="px-8 py-6 text-right align-top">
                      <div className="text-sm font-normal text-gray-900 uppercase tracking-tight font-outfit whitespace-nowrap">
                        {(c.created_at || (c as any).createdAt) ? format(new Date(c.created_at || (c as any).createdAt), 'MMM d, yyyy') : '---'}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredCampaigns.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-20 text-gray-400 italic">No outreach initiatives mapped.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Launch New Campaign"
      >
        <form onSubmit={handleCreate} className="space-y-6">
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-normal text-gray-500 font-outfit uppercase tracking-widest mb-1.5">Campaign Name *</label>
              <Input
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="Summer Skincare 2026"
              />
            </div>
            <div>
              <label className="block text-xs font-normal text-gray-500 font-outfit uppercase tracking-widest mb-1.5">Brand *</label>
              <select
                required
                value={formData.brand_id}
                onChange={e => setFormData({ ...formData, brand_id: e.target.value })}
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
                    formData.category.includes(cat) 
                      ? 'bg-primary-600 text-white border-primary-600 shadow-lg shadow-primary-500/20' 
                      : 'bg-white text-gray-600 border-gray-100 hover:border-primary-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
              {formData.category.filter(c => !standardCategories.includes(c)).map(cat => (
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
                value={formData.keywords}
                onChange={e => setFormData({ ...formData, keywords: e.target.value })}
                placeholder="vegan, organic, eco"
              />
            </div>
            <div>
              <label className="block text-xs font-normal text-gray-500 font-outfit uppercase tracking-widest mb-1.5">Target City *</label>
              <Input
                required
                value={formData.city}
                onChange={e => setFormData({ ...formData, city: e.target.value })}
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
                    formData.discovery_channels.includes(p.id)
                      ? 'bg-white border-primary-500 ring-4 ring-primary-50 shadow-md transform scale-[1.05]'
                      : 'bg-gray-50 border-gray-100 text-gray-400 opacity-70 hover:bg-white hover:border-gray-200'
                  }`}
                >
                  <div className={`mb-1.5 p-1.5 rounded-lg ${formData.discovery_channels.includes(p.id) ? 'bg-white shadow-sm' : ''}`}>
                    {p.icon}
                  </div>
                  <span className={`text-[9px] font-bold uppercase tracking-widest ${formData.discovery_channels.includes(p.id) ? 'text-gray-900' : 'text-gray-400'}`}>
                    {p.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
             <label className="block text-xs font-normal text-gray-500 font-outfit uppercase tracking-widest mb-1.5">Offer Notes</label>
             <textarea
                value={formData.product_offer_notes}
                onChange={e => setFormData({ ...formData, product_offer_notes: e.target.value })}
                className="w-full px-4 py-3 border border-gray-100 bg-gray-50 rounded-xl text-sm font-normal text-gray-900 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all shadow-sm resize-none"
                rows={3}
                placeholder="Free access + 15% affiliate..."
             />
          </div>

          <div className="pt-4 border-t border-gray-50 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsModalOpen(false)} type="button" className="font-normal uppercase text-[10px] tracking-widest">Cancel</Button>
            <Button type="submit" disabled={isSubmitting} className="bg-primary-600 hover:bg-primary-700 shadow-xl shadow-primary-500/30 font-normal uppercase text-[10px] tracking-widest">
              {isSubmitting ? 'Starting Agent...' : 'Launch Campaign'}
            </Button>
          </div>
          
        </form>
      </Modal>
    </div>
  );
}
