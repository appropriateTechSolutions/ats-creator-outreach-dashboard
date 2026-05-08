import React, { useEffect, useState } from 'react';
import { 
  ShoppingBag, 
  Plus, 
  Search, 
  MoreVertical,
  ArrowRight,
  Filter,
  Building2,
  BarChart3,
  CheckCircle2,
  X,
  Globe,
  Tag,
  FileText,
  Target,
  Megaphone,
  AlertCircle,
  Percent
} from 'lucide-react';
import * as api from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { LoadingState } from '../components/ui/LoadingState';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useAuth } from '../contexts/AuthContext';

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
      let clientsPromise = Promise.resolve([]);
      if (user?.user_type === 'internal') {
        clientsPromise = api.getClients();
      }

      const [brandsData, clientsData] = await Promise.all([
        brandsPromise,
        clientsPromise
      ]);
      
      setBrands(brandsData);
      setClients(clientsData);
    } catch (err) {
      console.error('Failed to fetch brands/clients', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedClientId, user]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
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
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredBrands = brands.filter(b => 
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20 animate-[fadeIn_0.3s_ease]">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-normal text-gray-900 font-outfit uppercase tracking-tight">Brands</h1>
        </div>
        {['super_admin', 'admin', 'client_admin', 'client_marketing'].includes(user?.role || '') && (
          <Button 
            onClick={() => setIsModalOpen(true)}
            className="bg-primary-600 hover:bg-primary-700 shadow-xl shadow-primary-500/20"
            icon={<Plus size={20} />}
          >
            Register New Brand
          </Button>
        )}
      </div>

      {/* Filter Bar */}
      <Card className="border-none shadow-2xl bg-white/80 backdrop-blur-md overflow-hidden">
        <div className="p-5 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Filter brands..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2.5 pl-10 pr-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
            />
          </div>
          <div className="flex items-center gap-3">
             {/* Client Selection (Internal Only) */}
             {user?.user_type === 'internal' && (
               <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-4 py-2">
                  <Filter size={16} className="text-gray-400" />
                  <select 
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="bg-transparent text-sm font-normal text-gray-600 focus:outline-none cursor-pointer"
                  >
                    <option value="all">All Clients</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
               </div>
             )}
             <div className="text-[10px] font-normal text-gray-400 uppercase tracking-widest bg-gray-100 px-3 py-1.5 rounded-lg">
                {filteredBrands.length} Brands
             </div>
          </div>
        </div>

        {/* Brands Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-normal text-gray-400 uppercase tracking-widest border-b border-gray-100 bg-gray-50/50">
                <th className="px-8 py-5">Brand</th>
                <th className="px-8 py-5">Client</th>
                <th className="px-8 py-5 text-center">Status</th>
                <th className="px-8 py-5 text-center">Campaigns</th>
                <th className="px-8 py-5 text-right">Registration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-20">
                    <LoadingState message="Retrieving Brand Portfolio..." />
                  </td>
                </tr>
              ) : filteredBrands.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center text-gray-400 italic">No brand identities found.</td>
                </tr>
              ) : (
                filteredBrands.map((brand) => (
                  <tr 
                    key={brand.id} 
                    onClick={() => navigate(`/brands/${brand.id}`)}
                    className="hover:bg-primary-50/30 transition-all group cursor-pointer"
                  >
                    <td className="px-8 py-6">
                        <div>
                          <div className="text-sm font-normal text-gray-900 group-hover:text-primary-600 transition-colors uppercase tracking-tight font-outfit">{brand.name}</div>
                          <div className="text-[10px] text-gray-400 font-normal uppercase tracking-widest">{brand.industry || 'General Sector'}</div>
                        </div>
                    </td>
                    <td className="px-8 py-6">
                        <span className="text-sm font-normal text-gray-900 uppercase tracking-tight font-outfit">
                          {brand.Client?.name || 'Internal'}
                        </span>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <StatusBadge status={brand.status as any} />
                    </td>
                    <td className="px-8 py-6 text-center">
                       <div className="text-lg font-normal text-gray-900">{brand.campaigns?.length || 0}</div>
                       <div className="text-[9px] font-normal text-gray-400 uppercase tracking-tighter">Active Campaigns</div>
                    </td>
                    <td className="px-8 py-6 text-right">
                       <div className="text-sm font-normal text-gray-900 uppercase tracking-tighter whitespace-nowrap">
                         {brand.created_at || (brand as any).createdAt ? new Date(brand.created_at || (brand as any).createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '---'}
                       </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
                  <div className="grid grid-cols-2 gap-8 items-start">
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
                  <div className="grid grid-cols-2 gap-8 items-start">
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
                  <div className="grid grid-cols-2 gap-8 items-start">
                    <Input
                      label="Primary Website"
                      value={formData.website}
                      onChange={e => setFormData({ ...formData, website: e.target.value })}
                      placeholder="https://example.com"
                      icon={<Globe size={16} />}
                    />
                    <div className="grid grid-cols-2 gap-4 items-start">
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
                      <div className="grid grid-cols-2 gap-8 items-start">
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
                      <div className="grid grid-cols-2 gap-8 items-start">
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
                      <div className="grid grid-cols-2 gap-8 items-start">
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
    </div>
  );
}
