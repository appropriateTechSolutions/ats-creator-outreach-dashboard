import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ShoppingBag, 
  ArrowLeft, 
  ArrowRight,
  Globe, 
  Tag, 
  FileText,
  Target,
  Megaphone,
  AlertCircle,
  Percent,
  Calendar,
  Building2,
  RefreshCw,
  ExternalLink,
  Shield,
  BarChart3,
  CheckCircle2,
  Users,
  Edit2,
  X,
  Info,
  Trash2,
  Loader2
} from 'lucide-react';
import * as api from '../lib/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { LoadingState } from '../components/ui/LoadingState';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';

interface Campaign {
  id: string;
  name: string;
  status: string;
  city?: string;
  category?: string;
  created_at: string;
}

interface Brand {
  id: string;
  name: string;
  website: string;
  industry: string;
  product_category: string;
  brand_description: string;
  target_audience: string;
  brand_voice: string;
  restrictions: string;
  affiliate_terms: string;
  product_offer_notes: string;
  default_commission_percent: string;
  status: string;
  notes: string;
  created_at: string;
  Client?: {
    id: string;
    name: string;
  };
  campaigns?: Campaign[];
}

export default function BrandDetail() {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuth();
  const [brand, setBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<Brand>>({});
  const [updateLoading, setUpdateLoading] = useState(false);
  const navigate = useNavigate();

  const fetchBrandData = async () => {
    if (!id) return;
    try {
      const data = await api.getBrandById(id);
      setBrand(data);
      setEditFormData(data);
    } catch (err) {
      console.error('Failed to fetch brand details', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrandData();
  }, [id]);

  const handleUpdateStatus = async (newStatus: string) => {
    if (!id) return;
    
    // Optimistic UI update
    if (brand) {
      setBrand({ ...brand, status: newStatus } as any);
    }
    
    try {
      await api.updateBrand(id, { status: newStatus });
      fetchBrandData(); // Refresh data
    } catch (err) {
      console.error(err);
      alert(`Failed to update brand status to ${newStatus}`);
      fetchBrandData(); // Reset on error
    }
  };

  const handleUpdateBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setUpdateLoading(true);
    try {
      await api.updateBrand(id, editFormData);
      await fetchBrandData();
      setIsEditModalOpen(false);
    } catch (err: any) {
      alert(err || 'Failed to update brand');
    } finally {
      setUpdateLoading(false);
    }
  };

  const canDeleteBrand =
    ['super_admin', 'admin'].includes(currentUser?.role || '') ||
    (currentUser?.role === 'client_admin' && currentUser.client_id === brand?.Client?.id);

  const handleDeleteBrand = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDeleteBrand = async () => {
    if (!id) return;
    setUpdateLoading(true);
    try {
      await api.deleteBrand(id);
      navigate('/brands');
    } catch (err: any) {
      alert(err || 'Failed to delete brand.');
    } finally {
      setUpdateLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="p-20">
        <LoadingState message="Accessing Brands Intelligence..." />
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="p-20 text-center">
        <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-normal text-gray-900 font-outfit uppercase tracking-tight">Identity Not Found</h2>
        <Link to="/brands" className="text-primary-600 font-normal mt-4 inline-block">Back to Brands</Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20 animate-[fadeIn_0.3s_ease] px-4 sm:px-0">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
        <div className="space-y-4">
          <Link to="/brands" className="inline-flex items-center text-[10px] font-normal text-gray-400 hover:text-primary-600 transition-colors group tracking-widest uppercase">
            <ArrowLeft size={14} className="mr-1 group-hover:-translate-x-1 transition-transform" /> BACK TO BRANDS
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl sm:text-4xl font-normal text-gray-900 font-outfit uppercase tracking-tight leading-tight">{brand.name}</h1>
            </div>
            <p className="text-gray-400 font-normal text-[10px] sm:text-xs uppercase tracking-widest mt-2">
              Agency Tenant: {brand.Client?.name || 'Internal'}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-start lg:items-end gap-3 lg:pt-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="flex flex-col items-start sm:items-end gap-2 sm:pl-6 border-gray-100">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-normal text-gray-400 uppercase tracking-widest">Brand Status</span>
                {['super_admin', 'admin'].includes(currentUser?.role || '') && (
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleUpdateStatus(brand.status === 'active' ? 'inactive' : 'active')}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${brand.status === 'active' ? 'bg-primary-600' : 'bg-gray-200'}`}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${brand.status === 'active' ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${brand.status === 'active' ? 'text-primary-600' : 'text-gray-400'}`}>
                      {brand.status === 'active' ? 'ON' : 'OFF'}
                    </span>
                  </div>
                )}
                {!['super_admin', 'admin'].includes(currentUser?.role || '') && (
                  <StatusBadge status={brand.status as any} />
                )}
              </div>
              {['super_admin', 'admin'].includes(currentUser?.role || '') && (
                <StatusBadge status={brand.status as any} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 1. Brand Intelligence Table */}
      <Card className="border-none shadow-2xl overflow-hidden bg-white">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
            Brand Intelligence
          </h2>
          <div className="text-[10px] font-normal text-primary-600 bg-primary-50 px-3 py-1 rounded-full uppercase tracking-widest border border-primary-100">
            {brand.industry}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <tbody className="divide-y divide-gray-50">
              <tr>
                <td className="px-6 sm:px-8 py-5 w-40 sm:w-64 bg-gray-50/30 text-[10px] font-normal text-gray-400 uppercase tracking-widest border-r border-gray-50">Product Category</td>
                <td className="px-6 sm:px-8 py-5 text-sm font-normal text-gray-900 uppercase tracking-tight">{brand.product_category || 'N/A'}</td>
              </tr>
              <tr>
                <td className="px-6 sm:px-8 py-5 bg-gray-50/30 text-[10px] font-normal text-gray-400 uppercase tracking-widest border-r border-gray-50">Official Website</td>
                <td className="px-6 sm:px-8 py-5">
                  <a href={brand.website} target="_blank" rel="noreferrer" className="text-primary-600 font-normal text-sm flex items-center gap-2 hover:underline truncate max-w-[200px] sm:max-w-none inline-flex">
                    <Globe size={14} className="shrink-0" /> <span className="truncate">{brand.website || 'No URL Provided'}</span>
                  </a>
                </td>
              </tr>
              <tr>
                <td className="px-6 sm:px-8 py-5 bg-gray-50/30 text-[10px] font-normal text-gray-400 uppercase tracking-widest border-r border-gray-50">Market Description</td>
                <td className="px-6 sm:px-8 py-5 text-sm font-normal text-gray-600 leading-relaxed">{brand.brand_description || 'No description provided.'}</td>
              </tr>
              <tr>
                <td className="px-6 sm:px-8 py-5 bg-gray-50/30 text-[10px] font-normal text-gray-400 uppercase tracking-widest border-r border-gray-50">Target Demographic</td>
                <td className="px-6 sm:px-8 py-5 text-sm font-normal text-gray-600">{brand.target_audience || 'Not specified.'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* 2. Creative Parameters Table */}
      <Card className="border-none shadow-2xl overflow-hidden bg-white">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
            Creative Parameters
          </h3>
        </div>
        <table className="w-full text-left">
          <tbody className="divide-y divide-gray-50">
            <tr>
              <td className="px-8 py-5 w-64 bg-gray-50/30 text-[10px] font-normal text-gray-400 uppercase tracking-widest border-r border-gray-50">Brand Voice</td>
              <td className="px-8 py-5 text-sm font-normal text-gray-900">{brand.brand_voice || 'N/A'}</td>
            </tr>
            <tr>
              <td className="px-8 py-5 bg-gray-50/30 text-[10px] font-normal text-gray-400 uppercase tracking-widest border-r border-gray-50">Content Restrictions</td>
              <td className="px-8 py-5 text-sm font-normal text-gray-600 italic">{brand.restrictions || 'None specified.'}</td>
            </tr>
          </tbody>
        </table>
      </Card>

      {/* 3. Commercial Terms Table */}
      <Card className="border-none shadow-2xl overflow-hidden bg-white">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
            Commercial Terms
          </h3>
        </div>
        <table className="w-full text-left">
          <tbody className="divide-y divide-gray-50">
            <tr>
              <td className="px-8 py-5 w-64 bg-gray-50/30 text-[10px] font-normal text-gray-400 uppercase tracking-widest border-r border-gray-50">Commission Basis</td>
              <td className="px-8 py-5 text-sm font-normal text-gray-900 uppercase tracking-widest font-black">{brand.default_commission_percent}% Default</td>
            </tr>
            <tr>
              <td className="px-8 py-5 bg-gray-50/30 text-[10px] font-normal text-gray-400 uppercase tracking-widest border-r border-gray-50">Affiliate Terms</td>
              <td className="px-8 py-5 text-sm font-normal text-gray-600 leading-relaxed whitespace-pre-line">{brand.affiliate_terms || 'Standard terms apply.'}</td>
            </tr>
            <tr>
              <td className="px-8 py-5 bg-gray-50/30 text-[10px] font-normal text-gray-400 uppercase tracking-widest border-r border-gray-50">Product Offerings</td>
              <td className="px-8 py-5 text-sm font-normal text-gray-600 italic">{brand.product_offer_notes || 'No specific offer details.'}</td>
            </tr>
          </tbody>
        </table>
      </Card>

      {/* 4. Operational Integrity Table */}
      <Card className="border-none shadow-2xl overflow-hidden bg-white">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
            Operational Integrity
          </h3>
        </div>
        <table className="w-full text-left">
          <tbody className="divide-y divide-gray-50">
            <tr>
              <td className="px-8 py-5 w-64 bg-gray-50/30 text-[10px] font-normal text-gray-400 uppercase tracking-widest border-r border-gray-50">Internal Notes</td>
              <td className="px-8 py-5 text-sm font-normal text-gray-600 italic">{brand.notes || 'No internal documentation available.'}</td>
            </tr>
          </tbody>
        </table>
      </Card>

      {/* 5. Campaigns Portfolio */}
      <Card className="border-none shadow-2xl overflow-hidden bg-white">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
            Campaigns Portfolio
          </h3>
          <span className="text-[10px] font-normal text-gray-400 uppercase tracking-widest">
            {brand.campaigns?.length || 0} Outreach Initiatives
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 text-[10px] font-normal text-gray-400 uppercase tracking-widest border-b border-gray-100">
                <th className="px-8 py-4">Campaign Name</th>
                <th className="px-8 py-4 text-center">City</th>
                <th className="px-8 py-4 text-center">Target Categories</th>
                <th className="px-8 py-4 text-center">Status</th>
                <th className="px-8 py-4 text-right">Created Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {brand.campaigns && brand.campaigns.length > 0 ? (
                brand.campaigns.map(c => (
                  <tr key={c.id} 
                    onClick={() => navigate(`/campaigns/${c.id}`, { state: { fromBrandId: brand.id, fromBrandName: brand.name } })}
                    className="hover:bg-primary-50/30 transition-all group cursor-pointer"
                  >
                    <td className="px-8 py-5">
                      <div className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors uppercase tracking-tight font-outfit text-sm">
                        {c.name}
                      </div>
                    </td>
                    <td className="px-8 py-5 text-center text-gray-500 capitalize text-xs">
                      {c.city || 'Global'}
                    </td>
                    <td className="px-8 py-5 text-center">
                      <div className="flex gap-1 justify-center flex-wrap">
                        {[...new Set(c.category?.split(',').map(cat => cat.trim()).filter(Boolean))].map((cat, index) => (
                          <span key={`${cat}-${index}`} className="px-2 py-0.5 rounded text-[9px] font-normal uppercase tracking-widest bg-gray-100 text-gray-600 break-keep capitalize border border-gray-200">
                            {cat}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <StatusBadge status={c.status as any} />
                    </td>
                    <td className="px-8 py-5 text-right text-gray-500 text-[10px] uppercase tracking-widest">
                      {(c.created_at || (c as any).createdAt) ? format(new Date(c.created_at || (c as any).createdAt), 'MMM d, yyyy') : 'Recently'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-8 py-16 text-center text-gray-400 italic text-sm font-light">
                    No outreach initiatives recorded for this brand.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Floating Actions */}
      {canDeleteBrand && (
        <button
          type="button"
          onClick={handleDeleteBrand}
          disabled={updateLoading}
          aria-label="Delete brand"
          title="Delete brand"
          className="fixed bottom-28 right-8 w-12 h-12 bg-white text-red-600 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-red-100 flex items-center justify-center hover:bg-red-50 hover:scale-110 active:scale-95 transition-all z-40 group disabled:cursor-not-allowed disabled:opacity-60"
        >
          {updateLoading ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <Trash2 size={21} className="group-hover:rotate-12 transition-transform" />
          )}
        </button>
      )}

      {['super_admin', 'admin', 'client_admin'].includes(currentUser?.role || '') && (
        <button
          type="button"
          onClick={() => setIsEditModalOpen(true)}
          aria-label="Edit brand"
          title="Edit brand"
          className="fixed bottom-8 right-8 w-14 h-14 bg-white text-primary-600 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40 group"
        >
          <Edit2 size={24} className="group-hover:rotate-12 transition-transform" />
        </button>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden p-0 border-none shadow-3xl animate-in zoom-in-95 duration-200 bg-white flex flex-col">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-white shrink-0">
              <div>
                <h2 className="text-2xl font-light text-gray-900 font-outfit uppercase tracking-tight flex items-center gap-3">
                  <Shield className="text-primary-600" size={28} /> Modify Brand Identity
                </h2>
                <p className="text-slate-400 text-[10px] font-light mt-1 uppercase tracking-widest font-outfit leading-relaxed">Update creative parameters and commercial terms.</p>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              <form id="edit-brand-form" onSubmit={handleUpdateBrand} className="space-y-8">
                {/* Basic Info Section */}
                <div className="space-y-6">
                  <h3 className="text-xs font-light text-slate-400 font-outfit uppercase tracking-widest flex items-center gap-2 mb-4">
                    <Building2 size={14} className="text-primary-600" /> Core Identity & Market
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-8 items-start">
                    <Input
                      label="Brand Name"
                      required
                      value={editFormData.name || ''}
                      onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                      placeholder="e.g. Luxury Cosmetics"
                    />
                    <Input
                      label="Industry Sector"
                      value={editFormData.industry || ''}
                      onChange={e => setEditFormData({ ...editFormData, industry: e.target.value })}
                      placeholder="e.g. Beauty & Fashion"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-8 items-start">
                    <Input
                      label="Product Category"
                      value={editFormData.product_category || ''}
                      onChange={e => setEditFormData({ ...editFormData, product_category: e.target.value })}
                      placeholder="e.g. Skincare / Organic"
                    />
                    <Input
                      label="Primary Website"
                      value={editFormData.website || ''}
                      onChange={e => setEditFormData({ ...editFormData, website: e.target.value })}
                      placeholder="https://example.com"
                      icon={<Globe size={16} />}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-8 items-start">
                    <div className="space-y-1.5">
                      <label className="text-xs font-light text-slate-500 block font-outfit uppercase tracking-widest">Commission (%)</label>
                      <div className="relative">
                        <Input
                          type="number"
                          value={editFormData.default_commission_percent || ''}
                          onChange={e => setEditFormData({ ...editFormData, default_commission_percent: e.target.value })}
                          placeholder="10"
                        />
                        <Percent className="absolute right-3 top-3 text-slate-300" size={16} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-light text-slate-500 block font-outfit uppercase tracking-widest">Brand Status</label>
                      <select
                        value={editFormData.status || ''}
                        onChange={e => setEditFormData({ ...editFormData, status: e.target.value })}
                        className="w-full bg-white/50 backdrop-blur-sm border border-slate-200 rounded-xl py-2.5 px-4 text-slate-900 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all font-outfit"
                      >
                        <option value="active">Active</option>
                        <option value="paused">Paused</option>
                        <option value="archived">Archived</option>
                      </select>
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
                        value={editFormData.brand_description || ''}
                        onChange={e => setEditFormData({ ...editFormData, brand_description: e.target.value })}
                        className="w-full bg-white/50 backdrop-blur-sm border border-slate-200 rounded-xl p-4 text-sm font-normal text-slate-900 h-24 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all font-outfit placeholder:text-slate-400"
                        placeholder="What makes this brand unique?"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-normal text-slate-500 block font-outfit uppercase tracking-widest">Target Audience</label>
                      <textarea
                        value={editFormData.target_audience || ''}
                        onChange={e => setEditFormData({ ...editFormData, target_audience: e.target.value })}
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
                      value={editFormData.brand_voice || ''}
                      onChange={e => setEditFormData({ ...editFormData, brand_voice: e.target.value })}
                      placeholder="e.g. Professional, Bold, Minimalist"
                    />
                    <Input
                      label="Content Restrictions"
                      value={editFormData.restrictions || ''}
                      onChange={e => setEditFormData({ ...editFormData, restrictions: e.target.value })}
                      placeholder="e.g. No profanity, specific mentions"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-8 items-start">
                    <div className="space-y-1.5">
                      <label className="text-xs font-normal text-slate-500 block font-outfit uppercase tracking-widest">Affiliate & Commission Terms</label>
                      <textarea
                        value={editFormData.affiliate_terms || ''}
                        onChange={e => setEditFormData({ ...editFormData, affiliate_terms: e.target.value })}
                        className="w-full bg-white/50 backdrop-blur-sm border border-slate-200 rounded-xl p-4 text-sm font-normal text-slate-900 h-24 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all font-outfit placeholder:text-slate-400"
                        placeholder="Standard commission structure and payment terms..."
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-normal text-slate-500 block font-outfit uppercase tracking-widest">Product Offer Notes</label>
                      <textarea
                        value={editFormData.product_offer_notes || ''}
                        onChange={e => setEditFormData({ ...editFormData, product_offer_notes: e.target.value })}
                        className="w-full bg-white/50 backdrop-blur-sm border border-slate-200 rounded-xl p-4 text-sm font-normal text-slate-900 h-24 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all font-outfit placeholder:text-slate-400"
                        placeholder="Details about product samples or creator offers..."
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 pb-4">
                  <label className="text-xs font-normal text-slate-500 block font-outfit uppercase tracking-widest">Notes</label>
                  <textarea
                    value={editFormData.notes || ''}
                    onChange={e => setEditFormData({ ...editFormData, notes: e.target.value })}
                    className="w-full bg-white/50 backdrop-blur-sm border border-slate-200 rounded-xl p-4 text-sm font-normal text-slate-900 h-20 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all font-outfit placeholder:text-slate-400"
                    placeholder="Private operational notes..."
                  />
                </div>
              </form>
            </div>

            <div className="p-8 border-t border-gray-100 bg-white rounded-b-2xl shrink-0 flex gap-4">
              <Button variant="ghost" className="flex-1 font-normal uppercase tracking-widest text-[10px] font-outfit" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
              <Button 
                type="submit" 
                form="edit-brand-form"
                loading={updateLoading}
                className="flex-[2] bg-primary-600 hover:bg-primary-700 shadow-xl shadow-primary-500/30 font-normal uppercase tracking-widest text-[10px] font-outfit"
              >
                Update Brand Identity
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-sm border-none shadow-3xl bg-white rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-xl font-normal text-gray-900 mb-2 font-outfit uppercase tracking-tight">Delete Brand?</h3>
              <p className="text-sm font-normal text-gray-500 mb-6 font-outfit">
                Are you sure you want to permanently delete <strong className="text-gray-900">{brand.name}</strong>?
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
                  onClick={confirmDeleteBrand}
                  disabled={updateLoading}
                >
                  {updateLoading ? <LoadingState mini /> : 'Delete Brand'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
