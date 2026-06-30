import React, { useEffect, useState } from 'react';
import { 
  ShoppingBag,
  Plus,
  Search,
  Filter,
  Building2,
  X,
  Globe,
  Target,
  Megaphone,
  Percent
} from 'lucide-react';
import * as api from '../lib/api';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { LoadingState } from '../components/ui/LoadingState';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';

interface Brand {
  id: string;
  name: string;
  website: string;
  industry: string;
  product_category: string;
  status: string;
  created_at: string;
  Client?: {
    name: string;
  };
  campaigns?: any[];
}

interface Client {
  id: string;
  name: string;
}

export default function Brands() {
  const { user } = useAuth();
  const location = useLocation();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();
  
  // New Brand Form
  const [formData, setFormData] = useState({
    name: '',
    client_id: '',
    website: '',
    industry: '',
    product_category: '',
    brand_description: '',
    target_audience: '',
    brand_voice: '',
    restrictions: '',
    affiliate_terms: '',
    product_offer_notes: '',
    default_commission_percent: 10,
    status: 'active',
    notes: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const brandsPromise = api.getBrands(selectedClientId === 'all' ? undefined : selectedClientId);
      
      // Only fetch all clients for internal staff
      let clientsPromise: Promise<any[]> = Promise.resolve([]);
      if (user?.user_type === 'internal') {
        clientsPromise = api.getClients();
      }

      const [brandsData, clientsData] = await Promise.all([
        brandsPromise,
        clientsPromise
      ]);
      
      setBrands(brandsData);
      
      if (user?.user_type === 'internal') {
        setClients(clientsData);
      } else if (user?.user_type === 'client' && user.client_id) {
        const clientName = brandsData.find(b => b.Client?.id === user.client_id)?.Client?.name 
          || brandsData[0]?.Client?.name 
          || 'Quantum Peak Agencyy';
        setClients([{ id: user.client_id, name: clientName }]);
        // Pre-select the client_id for the form
        setFormData(prev => ({ ...prev, client_id: user.client_id || '' }));
      }
    } catch (err) {
      console.error('Failed to fetch brands/clients', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    if (location.state?.openCreateModal) {
      setIsModalOpen(true);
      // Clear location state to prevent modal reopening on refresh
      window.history.replaceState({}, document.title);
    }
  }, [selectedClientId, user, location.state]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Auto-assign client_id for client users
      const finalData = { ...formData };
      if (user?.user_type === 'client' && user.client_id) {
        finalData.client_id = user.client_id;
      }

      await api.createBrand(finalData);
      setIsModalOpen(false);
      setFormData({
        name: '',
        client_id: '',
        website: '',
        industry: '',
        product_category: '',
        brand_description: '',
        target_audience: '',
        brand_voice: '',
        restrictions: '',
        affiliate_terms: '',
        product_offer_notes: '',
        default_commission_percent: 10,
        status: 'active',
        notes: ''
      });
      fetchData();
    } catch (err: any) {
      alert(err?.message || err || 'Failed to create brand');
    }
  };

  const filteredBrands = brands.filter(b => 
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20 animate-[fadeIn_0.2s_ease]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-normal text-gray-900 font-outfit uppercase tracking-tight">Brands</h1>
        </div>
        {['super_admin', 'admin', 'client_admin', 'client_marketing'].includes(user?.role || '') && (
          <Button 
            onClick={() => setIsModalOpen(true)}
            className="hidden sm:inline-flex bg-primary-600 hover:bg-primary-700 shadow-xl shadow-primary-500/20 whitespace-nowrap"
            icon={<Plus size={20} />}
          >
            Register New Brand
          </Button>
        )}
      </div>

      {/* Filter Bar */}
      <Card className="overflow-hidden border-none shadow-2xl bg-white/80 backdrop-blur-md">
        <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gray-50/30">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-4 top-3.5 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Filter by brand name..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-xl text-sm font-normal text-gray-900 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all shadow-sm"
            />
          </div>
          <div className="text-[10px] font-normal text-gray-400 uppercase tracking-widest bg-white px-3 py-1.5 rounded-lg border border-gray-100 whitespace-nowrap">
            {filteredBrands.length} Active Portfolios
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-6 py-4 bg-white border-b border-gray-50">
          {/* Client Selection (Internal Only) */}
          {user?.user_type === 'internal' && (
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 w-full sm:w-auto">
              <Filter size={16} className="text-gray-400" />
              <select 
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="bg-transparent text-sm font-normal text-gray-600 focus:outline-none cursor-pointer w-full sm:w-auto"
              >
                <option value="all">All Clients</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
          <div className="text-[10px] font-normal text-gray-400 uppercase tracking-widest bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200">
            {filteredBrands.length} Brands
          </div>
        </div>

        {/* Brands Table */}
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-normal text-gray-400 uppercase tracking-widest border-b border-gray-100 bg-gray-50/50">
                <th className="px-8 py-5">Brand</th>
                {user?.user_type === 'internal' && <th className="px-8 py-5">Client</th>}
                <th className="px-8 py-5 text-center">Campaigns</th>
                <th className="px-8 py-5 text-center">Status</th>
                <th className="px-8 py-5 text-right">Registration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={user?.user_type === 'internal' ? 5 : 4} className="py-20">
                    <LoadingState message="Retrieving Brand Portfolio..." />
                  </td>
                </tr>
              ) : filteredBrands.length === 0 ? (
                <tr>
                  <td colSpan={user?.user_type === 'internal' ? 5 : 4} className="px-8 py-20 text-center text-gray-400 italic">
                    No brands found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredBrands.map((brand) => (
                  <tr 
                    key={brand.id} 
                    onClick={() => navigate(`/brands/${brand.id}`)}
                    className="hover:bg-primary-50/30 transition-colors group cursor-pointer"
                  >
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="font-normal text-gray-900 text-sm leading-tight uppercase tracking-tight font-outfit group-hover:text-primary-600 transition-colors">{brand.name}</div>
                          <div className="text-[9px] text-gray-400 font-normal uppercase tracking-widest mt-1">{brand.product_category || 'General Category'}</div>
                        </div>
                      </div>
                    </td>
                    {user?.user_type === 'internal' && (
                      <td className="px-8 py-6">
                        <div className="text-sm font-normal text-gray-900 uppercase tracking-tight font-outfit">{brand.Client?.name || 'Internal'}</div>
                      </td>
                    )}
                    <td className="px-8 py-6 text-center">
                      <span 
                        onClick={(e) => {
                          e.stopPropagation();
                          const campaignList = brand.campaigns || [];
                          if (campaignList.length === 0) return;
                          
                          navigate('/campaigns', { 
                            state: { 
                              selectedBrandId: brand.id, 
                              selectedBrandName: brand.name, 
                              fromBrandsList: true 
                            } 
                          });
                        }}
                        className={`text-xs font-normal px-2.5 py-1 rounded transition-all select-none border ${
                          brand.campaigns?.length 
                            ? 'bg-primary-50 text-primary-700 hover:bg-primary-100/80 border-primary-200/50 cursor-pointer hover:scale-105 active:scale-95' 
                            : 'bg-gray-100 text-gray-400 border-gray-200/50 cursor-not-allowed'
                        }`}
                      >
                        {brand.campaigns?.length || 0}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <div className="flex justify-center">
                        <StatusBadge status={brand.status as any} />
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="text-sm font-normal text-gray-900 uppercase tracking-tight font-outfit whitespace-nowrap">
                        {(brand.created_at || (brand as any).createdAt) ? format(new Date(brand.created_at || (brand as any).createdAt), 'MMM d, yyyy') : '---'}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-gray-100 bg-white">
          {loading ? (
            <div className="py-20">
              <LoadingState message="Retrieving Brand Portfolio..." />
            </div>
          ) : filteredBrands.length === 0 ? (
            <div className="px-8 py-20 text-center text-gray-400 italic bg-white rounded-xl">
              No brands found matching your criteria.
            </div>
          ) : (
            filteredBrands.map((brand) => (
              <div 
                key={brand.id} 
                onClick={() => navigate(`/brands/${brand.id}`)}
                className="p-5 active:bg-gray-50 transition-all cursor-pointer space-y-4"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-normal text-gray-900 text-sm leading-tight uppercase tracking-tight font-outfit truncate">{brand.name}</h4>
                    <p className="text-[9px] text-gray-400 font-normal uppercase tracking-widest mt-1 truncate">{brand.product_category || 'General Category'}</p>
                  </div>
                  <div className="flex-shrink-0">
                    <StatusBadge status={brand.status as any} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 pt-1 text-xs">
                  {user?.user_type === 'internal' && (
                    <div>
                      <span className="text-[10px] font-normal text-gray-400 uppercase tracking-widest block mb-0.5">Client</span>
                      <span className="font-normal text-gray-900 uppercase tracking-tight font-outfit truncate block">
                        {brand.Client?.name || 'Internal'}
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-[10px] font-normal text-gray-400 uppercase tracking-widest block mb-0.5">Registration</span>
                    <span className="font-normal text-gray-900 uppercase tracking-tight font-outfit">
                      {(brand.created_at || (brand as any).createdAt) ? format(new Date(brand.created_at || (brand as any).createdAt), 'MMM d, yyyy') : '---'}
                    </span>
                  </div>
                  
                  <div className="col-span-2 pt-2 border-t border-slate-50">
                    <span className="text-[10px] font-normal text-gray-400 uppercase tracking-widest block mb-1">Campaigns</span>
                    <span 
                      onClick={(e) => {
                        e.stopPropagation();
                        const campaignList = brand.campaigns || [];
                        if (campaignList.length === 0) return;
                        
                        navigate('/campaigns', { 
                          state: { 
                            selectedBrandId: brand.id, 
                            selectedBrandName: brand.name, 
                            fromBrandsList: true 
                          } 
                        });
                      }}
                      className={`inline-flex text-xs font-normal px-2.5 py-1 rounded transition-all select-none border ${
                        brand.campaigns?.length 
                          ? 'bg-primary-50 text-primary-700 hover:bg-primary-100/80 border-primary-200/50 cursor-pointer hover:scale-105 active:scale-95' 
                          : 'bg-gray-100 text-gray-400 border-gray-200/50 cursor-not-allowed'
                      }`}
                    >
                      {brand.campaigns?.length || 0} Campaigns
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* New Brand Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-md z-50 flex items-start justify-center p-4 overflow-y-auto pt-10 pb-10">
          <Card className="w-full max-w-4xl p-0 border-none shadow-3xl animate-in zoom-in-95 duration-200 bg-white flex flex-col max-h-[90vh]">
            {/* Sticky Header */}
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-white z-10 rounded-t-2xl shrink-0">
              <div>
                <h2 className="text-2xl font-light text-gray-900 uppercase tracking-tight flex items-center gap-2 font-outfit">
                  <ShoppingBag className="text-primary-600" size={28} /> Register New Brand
                </h2>
                 <p className="text-slate-400 text-[10px] font-light mt-1 uppercase tracking-widest font-outfit leading-relaxed">Configure brand identity and operational parameters.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              <form id="brand-form" onSubmit={handleCreate} className="space-y-8">
                {/* Basic Info Section */}
                <div className="space-y-6">
                  <h3 className="text-xs font-light text-slate-400 font-outfit uppercase tracking-widest flex items-center gap-2 mb-4">
                    <Building2 size={14} className="text-primary-600" /> Core Identity & Market
                  </h3>
                  
                  {/* Row 1: Agency & Industry */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
                    <div className="space-y-1.5">
                      <label className="text-xs font-light text-slate-500 block font-outfit uppercase tracking-widest">Client</label>
                      <select
                        required
                        value={formData.client_id}
                        onChange={e => setFormData({ ...formData, client_id: e.target.value })}
                        className="w-full bg-white/50 backdrop-blur-sm border border-slate-200 rounded-xl py-2.5 px-4 text-slate-900 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all font-outfit"
                      >
                        <option value="">Select a client...</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <Input
                      label="Industry Sector"
                      value={formData.industry}
                      onChange={e => setFormData({ ...formData, industry: e.target.value })}
                      placeholder="e.g. Beauty & Fashion"
                    />
                  </div>

                  {/* Row 2: Brand Name & Category */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
                    <Input
                      label="Brand Name"
                      required
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Luxury Cosmetics"
                    />
                    <Input
                      label="Product Category"
                      value={formData.product_category}
                      onChange={e => setFormData({ ...formData, product_category: e.target.value })}
                      placeholder="e.g. Skincare / Organic"
                    />
                  </div>

                  {/* Row 3: Website & (Commission/Status) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
                    <Input
                      label="Primary Website"
                      value={formData.website}
                      onChange={e => setFormData({ ...formData, website: e.target.value })}
                      placeholder="https://example.com"
                      icon={<Globe size={16} />}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                      <div className="space-y-1.5">
                        <label className="text-xs font-light text-slate-500 block font-outfit uppercase tracking-widest">Commission (%)</label>
                        <div className="relative">
                          <Input
                            type="number"
                            value={formData.default_commission_percent}
                            onChange={e => setFormData({ ...formData, default_commission_percent: parseFloat(e.target.value) })}
                            placeholder="10"
                          />
                          <Percent className="absolute right-3 top-3 text-slate-300" size={16} />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-light text-slate-500 block font-outfit uppercase tracking-widest">Brand Status</label>
                        <select
                          value={formData.status}
                          onChange={e => setFormData({ ...formData, status: e.target.value })}
                          className="w-full bg-white/50 backdrop-blur-sm border border-slate-200 rounded-xl py-2.5 px-4 text-slate-900 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all font-outfit"
                        >
                          <option value="active">Active</option>
                          <option value="paused">Paused</option>
                          <option value="archived">Inactive</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                    {/* Brand Intelligence Section */}
                    <div className="space-y-6">
                      <h3 className="text-xs font-light text-slate-400 font-outfit uppercase tracking-widest flex items-center gap-2 mb-4">
                        <Target size={14} className="text-primary-600" /> Brand Intelligence
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
                        <div className="space-y-1.5">
                          <label className="text-xs font-normal text-slate-500 block font-outfit uppercase tracking-widest">Brand Description</label>
                          <textarea
                            value={formData.brand_description}
                            onChange={e => setFormData({ ...formData, brand_description: e.target.value })}
                            className="w-full bg-white/50 backdrop-blur-sm border border-slate-200 rounded-xl p-4 text-sm font-normal text-slate-900 h-24 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all font-outfit placeholder:text-slate-400"
                            placeholder="What makes this brand unique?"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-normal text-slate-500 block font-outfit uppercase tracking-widest">Target Audience</label>
                          <textarea
                            value={formData.target_audience}
                            onChange={e => setFormData({ ...formData, target_audience: e.target.value })}
                            className="w-full bg-white/50 backdrop-blur-sm border border-slate-200 rounded-xl p-4 text-sm font-normal text-slate-900 h-24 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all font-outfit placeholder:text-slate-400"
                            placeholder="Who is the ideal customer?"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Operational Parameters Section */}
                    <div className="space-y-6">
                      <h3 className="text-xs font-normal text-slate-400 font-outfit uppercase tracking-widest flex items-center gap-2 mb-4">
                        <Megaphone size={14} className="text-primary-600" /> Operational Parameters
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
                        <Input
                          label="Brand Voice"
                          value={formData.brand_voice}
                          onChange={e => setFormData({ ...formData, brand_voice: e.target.value })}
                          placeholder="e.g. Professional, Bold, Minimalist"
                        />
                        <Input
                          label="Content Restrictions"
                          value={formData.restrictions}
                          onChange={e => setFormData({ ...formData, restrictions: e.target.value })}
                          placeholder="e.g. No profanity, specific mentions"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
                        <div className="space-y-1.5">
                          <label className="text-xs font-normal text-slate-500 block font-outfit uppercase tracking-widest">Affiliate & Commission Terms</label>
                          <textarea
                            value={formData.affiliate_terms}
                            onChange={e => setFormData({ ...formData, affiliate_terms: e.target.value })}
                            className="w-full bg-white/50 backdrop-blur-sm border border-slate-200 rounded-xl p-4 text-sm font-normal text-slate-900 h-24 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all font-outfit placeholder:text-slate-400"
                            placeholder="Standard commission structure and payment terms..."
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-normal text-slate-500 block font-outfit uppercase tracking-widest">Product Offer Notes</label>
                          <textarea
                            value={formData.product_offer_notes}
                            onChange={e => setFormData({ ...formData, product_offer_notes: e.target.value })}
                            className="w-full bg-white/50 backdrop-blur-sm border border-slate-200 rounded-xl p-4 text-sm font-normal text-slate-900 h-24 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all font-outfit placeholder:text-slate-400"
                            placeholder="Details about product samples or creator offers..."
                          />
                        </div>
                      </div>
                    </div>

                    {/* Notes Section */}
                    <div className="space-y-1.5 pb-4">
                      <label className="text-xs font-normal text-slate-500 block font-outfit uppercase tracking-widest">Notes</label>
                      <textarea
                        value={formData.notes}
                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                        className="w-full bg-white/50 backdrop-blur-sm border border-slate-200 rounded-xl p-4 text-sm font-normal text-slate-900 h-20 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all font-outfit placeholder:text-slate-400"
                        placeholder="Private operational notes..."
                      />
                    </div>
                  </form>
                </div>

                {/* Sticky Footer */}
                <div className="p-8 border-t border-gray-100 bg-white rounded-b-2xl shrink-0 flex gap-4">
                  <Button variant="ghost" className="flex-1 font-normal uppercase tracking-widest text-[10px] font-outfit" onClick={() => setIsModalOpen(false)}>Cancel Registration</Button>
                  <Button 
                    type="submit" 
                    form="brand-form"
                    className="flex-[2] bg-primary-600 hover:bg-primary-700 shadow-xl shadow-primary-500/30 font-normal uppercase tracking-widest text-[10px] font-outfit"
                  >
                    Finalize Brand Identity
                  </Button>
                </div>
          </Card>
        </div>
      )}

      {/* Floating Action Button for Mobile */}
      {!isModalOpen && ['super_admin', 'admin', 'client_admin', 'client_marketing'].includes(user?.role || '') && (
        <button
          onClick={() => setIsModalOpen(true)}
          className="sm:hidden fixed bottom-6 right-6 z-50 bg-primary-600 hover:bg-primary-700 text-white rounded-full p-4 shadow-2xl shadow-primary-500/40 flex items-center justify-center transition-transform active:scale-95 border border-primary-500/20"
          aria-label="Register New Brand"
        >
          <Plus size={24} />
        </button>
      )}
    </div>
  );
}
