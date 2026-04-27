import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Table, Thead, Tbody, Tr, Th, Td } from '../components/ui/Table';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Button } from '../components/ui/Button';
import { Drawer } from '../components/ui/Drawer';
import { Search, Plus, Filter } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { getCampaigns, createCampaign } from '../lib/api';
import type { Campaign } from '../types';
import { format } from 'date-fns';

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();

  // Form State matching V1
  const [formData, setFormData] = useState({
    name: '',
    client_name: '',
    category: [] as string[],
    city: '',
    keywords: '',
    product_offer_notes: '',
    discovery_channels: ['instagram'] as string[]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCampaigns = () => {
    getCampaigns().then(data => setCampaigns(data)).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const newCampaign = await createCampaign({
        name: formData.name,
        client_name: formData.client_name,
        category: formData.category.join(','),
        city: formData.city,
        keywords: formData.keywords.split(',').map(k => k.trim()).filter(Boolean),
        product_offer_notes: formData.product_offer_notes,
        offer_type: 'hybrid',
        discovery_channels: formData.discovery_channels,
        email_subject: 'Collaboration with {{campaign_name}}',
        email_body: 'Hey {{full_name}}, love your content! We would love to collaborate for our {{campaign_name}} campaign in {{city}}.\n\nOffer: {{product_offer_notes}}'
      });
      setDrawerOpen(false);
      setFormData({ name: '', client_name: '', category: [], city: '', keywords: '', product_offer_notes: '', discovery_channels: ['instagram'] });
      fetchCampaigns();
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

  const toggleChannel = (id: string) => {
    setFormData(prev => ({
      ...prev,
      discovery_channels: prev.discovery_channels.includes(id) 
        ? (prev.discovery_channels.length > 1 ? prev.discovery_channels.filter(c => c !== id) : prev.discovery_channels)
        : [...prev.discovery_channels, id]
    }));
  };

  const standardCategories = ['Fashion', 'Beauty', 'Fitness', 'Food', 'Travel', 'Tech', 'Lifestyle', 'Health'];
  const platforms = [{ id: 'instagram', icon: '📸' }, { id: 'youtube', icon: '▶️' }, { id: 'tiktok', icon: '🎵' }];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Campaigns</h1>
          <p className="text-sm text-gray-500">Manage your outreach campaigns and segments.</p>
        </div>
        <Button onClick={() => setDrawerOpen(true)} icon={<Plus size={16} />}>Create Campaign</Button>
      </div>

      <Card>
        <div className="p-4 border-b border-gray-100 flex flex-wrap gap-4 items-center justify-between bg-white rounded-t-[12px]">
          <div className="flex gap-3 items-center flex-1 max-w-2xl">
            <div className="relative w-full max-w-xs">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={16} className="text-gray-400" />
              </div>
              <input 
                type="text" 
                placeholder="Search campaigns..." 
                className="block w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-500">Loading campaigns...</div>
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>Campaign Name</Th>
                <Th>City</Th>
                <Th>Target Categories</Th>
                <Th>Status</Th>
                <Th>Created Date</Th>
              </Tr>
            </Thead>
            <Tbody>
              {campaigns.map(c => (
                <Tr key={c.id}>
                  <Td>
                    <Link to={`/campaigns/${c.id}`} className="font-semibold text-gray-900 hover:text-primary-600">
                      {c.name}
                    </Link>
                  </Td>
                  <Td className="text-gray-500 capitalize">{c.city || 'Global'}</Td>
                  <Td>
                    <div className="flex gap-1 flex-wrap">
                      {c.category?.split(',').map(cat => cat.trim()).filter(Boolean).map(cat => (
                        <span key={cat} className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-600 break-keep capitalize">{cat}</span>
                      ))}
                    </div>
                  </Td>
                  <Td><StatusBadge status={c.status as any} /></Td>
                  <Td className="text-gray-500 text-xs">
                    {c.created_at ? format(new Date(c.created_at), 'MMM d, yyyy') : 'Recently'}
                  </Td>
                </Tr>
              ))}
              {campaigns.length === 0 && (
                <Tr>
                  <Td colSpan={5} className="text-center py-8 text-gray-500">No campaigns found.</Td>
                </Tr>
              )}
            </Tbody>
          </Table>
        )}
      </Card>

      <Drawer 
        isOpen={isDrawerOpen} 
        onClose={() => setDrawerOpen(false)} 
        title="Create New Campaign"
      >
        <form onSubmit={handleCreate} className="space-y-6 pb-24 overflow-y-auto custom-scrollbar pr-2">
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Campaign Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                placeholder="Summer Skincare 2026"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Client Name</label>
              <input
                type="text"
                value={formData.client_name}
                onChange={e => setFormData({ ...formData, client_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                placeholder="Brand Name"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Discovery Categories *</label>
            <div className="flex flex-wrap gap-2">
              {standardCategories.map(cat => (
                <button
                  type="button"
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    formData.category.includes(cat) 
                      ? 'bg-primary-600 text-white border-primary-600' 
                      : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Search Keywords</label>
              <input
                type="text"
                value={formData.keywords}
                onChange={e => setFormData({ ...formData, keywords: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                placeholder="vegan, organic, eco"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Target City *</label>
              <input
                type="text"
                required
                value={formData.city}
                onChange={e => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                placeholder="London"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Platforms *</label>
            <div className="flex gap-2">
              {platforms.map(p => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => toggleChannel(p.id)}
                  className={`flex-1 py-3 rounded-lg border flex flex-col items-center justify-center transition-all ${
                    formData.discovery_channels.includes(p.id)
                      ? 'bg-primary-50 border-primary-500 text-primary-700'
                      : 'bg-white border-gray-200 text-gray-400 opacity-60'
                  }`}
                >
                  <span className="text-xl mb-1">{p.icon}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider">{p.id}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
             <label className="block text-sm font-semibold text-gray-700 mb-1">Offer Notes</label>
             <textarea
                value={formData.product_offer_notes}
                onChange={e => setFormData({ ...formData, product_offer_notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm resize-none"
                rows={3}
                placeholder="Free access + 15% affiliate..."
             />
          </div>

          <div className="pt-4 mt-6 border-t border-gray-100 flex justify-end gap-3 pb-8">
            <Button variant="outline" onClick={() => setDrawerOpen(false)} type="button">Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Starting Agent...' : 'Launch Campaign'}
            </Button>
          </div>
          
        </form>
      </Drawer>
    </div>
  );
}
