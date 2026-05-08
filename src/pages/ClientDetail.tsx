import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  Building2, 
  ArrowLeft, 
  Shield, 
  Globe, 
  Tag, 
  Mail, 
  Phone, 
  Plus, 
  Users, 
  User as UserIcon,
  ShoppingBag,
  CreditCard,
  Calendar,
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  FileText,
  UserPlus,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  X,
  Loader2,
  Wand2,
  Edit2,
  Info,
  Target,
  Megaphone,
  Percent
} from 'lucide-react';
import * as api from '../lib/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { LoadingState } from '../components/ui/LoadingState';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';

interface Brand {
  id: string;
  name: string;
  website: string;
  industry: string;
}

interface User {
  id: string;
  full_name: string;
  email: string;
  role: string;
  status: string;
}

interface Client {
  id: string;
  name: string;
  legal_name: string;
  website: string;
  industry: string;
  primary_contact_name: string;
  primary_contact_email: string;
  primary_contact_phone: string;
  plan_type: string;
  billing_status: string;
  status: string;
  notes: string;
  created_at: string;
  brands: Brand[];
  users: User[];
}

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddBrandModalOpen, setIsAddBrandModalOpen] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  
  // Invite Form State
  const [inviteLoading, setInviteLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteFormData, setInviteFormData] = useState({
    full_name: '',
    email: '',
    role: 'client_admin',
    user_type: 'client',
    client_id: id || ''
  });

  // Edit Form State
  const [editFormData, setEditFormData] = useState<Partial<Client>>({});

  // New Brand Form State
  const [newBrandFormData, setNewBrandFormData] = useState({
    name: '',
    client_id: id || '',
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

  const fetchClientData = async () => {
    if (!id) return;
    try {
      const data = await api.getClientById(id);
      setClient(data);
      setEditFormData(data);
    } catch (err) {
      console.error('Failed to fetch client details', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientData();
  }, [id]);

  const handleUpdateStatus = async (newStatus: string) => {
    if (!id) return;
    
    // Optimistic UI update
    if (client) {
      setClient({ ...client, status: newStatus } as any);
    }
    
    try {
      await api.updateClient(id, { status: newStatus });
      fetchClientData(); // Refresh list
    } catch (err) {
      console.error(err);
      alert(`Failed to update client status to ${newStatus}`);
      fetchClientData(); // Reset on error
    }
  };

  const handleSubmitInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await api.inviteUser(inviteFormData);
      setSuccess(true);
      setInviteFormData({ ...inviteFormData, full_name: '', email: '' });
      fetchClientData(); // Refresh list
      setTimeout(() => {
        setIsInviteModalOpen(false);
        setSuccess(false);
      }, 1500);
    } catch (err: any) {
      setError(err || 'Failed to send invitation.');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setUpdateLoading(true);
    try {
      await api.updateClient(id, editFormData);
      await fetchClientData();
      setIsEditModalOpen(false);
    } catch (err: any) {
      alert(err || 'Failed to update client');
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleCreateBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.createBrand(newBrandFormData);
      setIsAddBrandModalOpen(false);
      setNewBrandFormData({
        name: '',
        client_id: id || '',
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
      fetchClientData();
    } catch (err: any) {
      alert(err || 'Failed to create brand');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-20">
        <LoadingState message="Reconstructing Agency Tenant..." />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-20 text-center">
        <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-normal text-gray-900 font-outfit uppercase tracking-tight">Tenant Not Found</h2>
        <Link to="/clients" className="text-primary-600 font-normal mt-4 inline-block">Back to Directory</Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-20 animate-[fadeIn_0.3s_ease]">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-4">
          <Link to="/clients" className="inline-flex items-center text-[10px] font-normal text-gray-400 hover:text-primary-600 transition-colors group tracking-widest uppercase">
            <ArrowLeft size={14} className="mr-1 group-hover:-translate-x-1 transition-transform" /> BACK TO DIRECTORY
          </Link>
          <h1 className="text-4xl font-normal text-gray-900 font-outfit uppercase tracking-tight">{client.name}</h1>
        </div>

        <div className="flex flex-col items-end gap-2 pt-8">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-normal text-gray-400 uppercase tracking-widest">Tenant Status</span>
            {['super_admin', 'admin'].includes(currentUser?.role || '') ? (
              <>
                <button 
                  onClick={() => handleUpdateStatus(client.status === 'active' ? 'archived' : 'active')}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${client.status === 'active' ? 'bg-primary-600' : 'bg-gray-200'}`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${client.status === 'active' ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
                <span className={`text-[10px] font-bold uppercase tracking-widest ${client.status === 'active' ? 'text-primary-600' : 'text-gray-400'}`}>
                  {client.status === 'active' ? 'ON' : 'OFF'}
                </span>
              </>
            ) : (
              <div className="flex items-center gap-2">
                 <div className={`w-2 h-2 rounded-full ${client.status === 'active' ? 'bg-green-500' : 'bg-gray-300'}`} />
                 <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{client.status}</span>
              </div>
            )}
          </div>
          <StatusBadge status={client.status as any} />
        </div>
      </div>

      {/* 1. Client Intelligence Profile */}
      <Card className="border-none shadow-2xl bg-white overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
          <h2 className="text-sm font-normal text-gray-900 uppercase tracking-widest flex items-center gap-2">
            Client
          </h2>
          <div className="flex items-center gap-4">
             <span className="px-3 py-1 rounded bg-primary-50 text-primary-600 text-[10px] font-normal uppercase tracking-widest border border-primary-100">
               {client.plan_type} PLAN
             </span>
             <span className="px-3 py-1 rounded bg-gray-50 text-gray-500 text-[10px] font-normal uppercase tracking-widest border border-gray-100">
               BILLING: {client.billing_status.replace('_', ' ')}
             </span>
          </div>
        </div>
        
        <div className="p-8 grid grid-cols-3 gap-8 divide-x divide-gray-50">
          <div className="space-y-6">
            <div>
              <h4 className="text-[10px] font-normal text-gray-400 uppercase tracking-widest mb-1.5">Legal Identity</h4>
              <p className="text-gray-900 font-normal text-lg">{client.legal_name || 'Not provided'}</p>
            </div>
            <div>
              <h4 className="text-[10px] font-normal text-gray-400 uppercase tracking-widest mb-1.5">Industry Sector</h4>
              <p className="text-gray-900 font-normal flex items-center gap-2">
                <Tag size={16} className="text-primary-400" />
                {client.industry || 'General Business'}
              </p>
            </div>
          </div>

          <div className="pl-8 space-y-6">
            <div>
              <h4 className="text-[10px] font-normal text-gray-400 uppercase tracking-widest mb-1.5">Primary Website</h4>
              <a href={client.website} target="_blank" rel="noreferrer" className="text-primary-600 font-normal flex items-center gap-2 hover:underline">
                <Globe size={16} />
                {client.website ? client.website.replace(/^https?:\/\//, '') : 'No website'}
                <ExternalLink size={12} />
              </a>
            </div>
          </div>

          <div className="pl-8 space-y-6">
            <div>
               <h4 className="text-[10px] font-normal text-gray-400 uppercase tracking-widest mb-1.5">Key Account Contact</h4>
               <p className="text-gray-900 font-normal">{client.primary_contact_name || 'Unassigned'}</p>
               <div className="space-y-1 mt-2">
                  <div className="flex items-center gap-2 text-xs text-gray-500 font-normal">
                    <Mail size={14} className="text-primary-400" /> {client.primary_contact_email || 'No email'}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 font-normal">
                    <Phone size={14} className="text-primary-400" /> {client.primary_contact_phone || 'No phone'}
                  </div>
               </div>
            </div>
          </div>
        </div>

        {client.notes && (
          <div className="px-8 pb-8">
            <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-xl">
              <h4 className="text-[9px] font-normal text-amber-600 uppercase tracking-widest mb-1 flex items-center gap-1">
                <FileText size={12} /> Internal Notes
              </h4>
              <p className="text-sm text-gray-600 italic leading-relaxed">{client.notes}</p>
            </div>
          </div>
        )}
      </Card>

      {/* 2. Managed Brands Table */}
      <Card className="border-none shadow-2xl overflow-hidden bg-white">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-sm font-normal text-gray-900 uppercase tracking-widest flex items-center gap-2">
            Brands
          </h3>
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-normal text-gray-400 uppercase tracking-widest">
              {client.brands?.length || 0} Registered Entities
            </span>
            {['super_admin', 'admin', 'client_admin', 'client_marketing'].includes(currentUser?.role || '') && (
              <Button 
                size="sm" 
                onClick={() => setIsAddBrandModalOpen(true)}
                icon={<Plus size={16} />}
                className="bg-primary-600 hover:bg-primary-700 shadow-lg shadow-primary-500/20"
              >
                Add Brand
              </Button>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 text-[10px] font-normal text-gray-400 uppercase tracking-widest border-b border-gray-100">
                <th className="px-8 py-4">Brand Identity</th>
                <th className="px-8 py-4">Industry Sector</th>
                <th className="px-8 py-4">Primary URL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {client.brands?.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-16 text-center text-gray-400 italic font-normal">
                    No brands have been mapped to this agency tenant yet.
                  </td>
                </tr>
              ) : (
                client.brands?.map(brand => (
                  <tr key={brand.id} 
                    onClick={() => navigate(`/brands/${brand.id}`)}
                    className="hover:bg-primary-50/30 transition-colors group cursor-pointer"
                  >
                    <td className="px-8 py-5">
                      <div className="font-normal text-gray-900 text-base leading-tight group-hover:text-primary-600 transition-colors">{brand.name}</div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="px-2.5 py-1 rounded bg-gray-100 text-gray-600 text-[10px] font-normal uppercase tracking-wider border border-gray-200">
                        {brand.industry || 'General'}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <a href={brand.website} target="_blank" rel="noreferrer" className="text-sm font-normal text-gray-500 hover:text-primary-600 flex items-center gap-1.5 transition-colors" onClick={(e) => e.stopPropagation()}>
                        {brand.website ? brand.website.replace(/^https?:\/\//, '') : 'N/A'} <ExternalLink size={12} />
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 3. Authorized Staff Table */}
      <Card className="border-none shadow-2xl overflow-hidden bg-white">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-sm font-normal text-gray-900 uppercase tracking-widest flex items-center gap-2">
            Users
          </h3>
          {['super_admin', 'admin', 'client_admin'].includes(currentUser?.role || '') && (
            <Button 
              size="sm" 
              onClick={() => setIsInviteModalOpen(true)}
              icon={<UserPlus size={16} />}
              className="bg-primary-600 hover:bg-primary-700 shadow-lg shadow-primary-500/20"
            >
              Invite Users
            </Button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 text-[10px] font-normal text-gray-400 uppercase tracking-widest border-b border-gray-100">
                <th className="px-8 py-4">Professional Identity</th>
                <th className="px-8 py-4">Assigned Role</th>
                <th className="px-8 py-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {client.users?.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-16 text-center text-gray-400 italic font-normal">
                    No authorized staff found. Use the invitation portal to add members.
                  </td>
                </tr>
              ) : (
                client.users?.map(user => (
                  <tr key={user.id} className="hover:bg-primary-50/30 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center font-normal text-sm group-hover:bg-primary-600 group-hover:text-white transition-all">
                          {user.full_name?.charAt(0)}
                        </div>
                        <div>
                          <div className="font-normal text-gray-900 leading-tight font-outfit uppercase tracking-tight">{user.full_name}</div>
                          <div className="text-xs text-gray-400 font-normal">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="px-2.5 py-1 rounded bg-primary-50 text-primary-600 text-[10px] font-normal uppercase tracking-wider border border-primary-100">
                        {user.role.replace('client_', '').replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className={`w-2 h-2 rounded-full ${user.status === 'active' ? 'bg-green-500' : 'bg-gray-300'}`} />
                        <span className="text-[10px] font-normal text-gray-500 uppercase tracking-widest">{user.status}</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Floating Edit Button */}
      {['super_admin', 'admin', 'client_admin'].includes(currentUser?.role || '') && (
        <button 
          onClick={() => setIsEditModalOpen(true)}
          className="fixed bottom-8 right-8 w-14 h-14 bg-white text-primary-600 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40 group"
        >
          <Edit2 size={24} className="group-hover:rotate-12 transition-transform" />
        </button>
      )}

      {/* Edit Client Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden p-0 border-none shadow-3xl animate-in zoom-in-95 duration-200 bg-white flex flex-col">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-white shrink-0">
              <div>
                <h2 className="text-2xl font-light text-gray-900 font-outfit uppercase tracking-tight flex items-center gap-3">
                  <Shield className="text-primary-600" size={28} /> Modify Tenant Profile
                </h2>
                <p className="text-slate-400 text-[10px] font-light mt-1 uppercase tracking-widest font-outfit leading-relaxed">Update agency identity and service parameters.</p>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              <form id="edit-client-form" onSubmit={handleUpdateClient} className="space-y-8">
                {/* Basic Info Section */}
                <div className="space-y-6">
                  <h3 className="text-xs font-light text-slate-400 font-outfit uppercase tracking-widest flex items-center gap-2 mb-4">
                    <Building2 size={14} className="text-primary-600" /> Agency Identity
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-8 items-start">
                    <Input
                      label="Display Name (Agency Name)"
                      required
                      value={editFormData.name || ''}
                      onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                      placeholder="e.g. ATS Global"
                    />
                    <Input
                      label="Legal Entity Name"
                      value={editFormData.legal_name || ''}
                      onChange={e => setEditFormData({ ...editFormData, legal_name: e.target.value })}
                      placeholder="Full registered company name"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-8 items-start">
                    <div className="space-y-1.5">
                      <label className="text-xs font-light text-slate-500 block font-outfit uppercase tracking-widest">Website URL</label>
                      <input
                        type="url"
                        value={editFormData.website || ''}
                        onChange={e => setEditFormData({ ...editFormData, website: e.target.value })}
                        className="w-full bg-white/50 backdrop-blur-sm border border-slate-200 rounded-xl py-2.5 px-4 text-slate-900 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all font-outfit placeholder:text-slate-400"
                        placeholder="https://..."
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-light text-slate-500 block font-outfit uppercase tracking-widest">Industry Sector</label>
                      <input
                        type="text"
                        value={editFormData.industry || ''}
                        onChange={e => setEditFormData({ ...editFormData, industry: e.target.value })}
                        className="w-full bg-white/50 backdrop-blur-sm border border-slate-200 rounded-xl py-2.5 px-4 text-slate-900 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all font-outfit placeholder:text-slate-400"
                        placeholder="e.g. Fashion, Tech, etc."
                      />
                    </div>
                  </div>
                </div>

                {/* Primary Contact Section */}
                <div className="space-y-6">
                  <h3 className="text-xs font-light text-slate-400 font-outfit uppercase tracking-widest flex items-center gap-2 mb-4">
                    <UserIcon size={14} className="text-primary-600" /> Primary Contact Person
                  </h3>
                  <div className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100/50 space-y-6">
                    <div className="grid grid-cols-2 gap-8 items-start">
                      <Input
                        label="Full Name"
                        placeholder="Contact person name"
                        value={editFormData.primary_contact_name || ''}
                        onChange={e => setEditFormData({ ...editFormData, primary_contact_name: e.target.value })}
                      />
                      <Input
                        label="Work Email"
                        placeholder="email@agency.com"
                        type="email"
                        required
                        value={editFormData.primary_contact_email || ''}
                        onChange={e => setEditFormData({ ...editFormData, primary_contact_email: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-8 items-start">
                      <Input
                        label="Phone Number"
                        placeholder="e.g. +1234567890"
                        type="tel"
                        pattern="[\+0-9\- ]*"
                        value={editFormData.primary_contact_phone || ''}
                        onChange={e => setEditFormData({ ...editFormData, primary_contact_phone: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Configuration Section */}
                <div className="space-y-6">
                  <h3 className="text-xs font-light text-slate-400 font-outfit uppercase tracking-widest flex items-center gap-2 mb-4">
                    <Shield size={14} className="text-primary-600" /> Service Configuration
                  </h3>
                  <div className="grid grid-cols-3 gap-6 items-start">
                    <div className="space-y-1.5">
                      <label className="text-xs font-light text-slate-500 block font-outfit uppercase tracking-widest">Plan Type</label>
                      <select
                        value={editFormData.plan_type || ''}
                        onChange={e => setEditFormData({ ...editFormData, plan_type: e.target.value })}
                        className="w-full bg-white/50 backdrop-blur-sm border border-slate-200 rounded-xl py-2.5 px-4 text-slate-900 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all font-outfit"
                      >
                        <option value="internal">Internal</option>
                        <option value="pilot">Pilot</option>
                        <option value="standard">Standard</option>
                        <option value="premium">Premium</option>
                        <option value="enterprise">Enterprise</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-light text-slate-500 block font-outfit uppercase tracking-widest">Billing Status</label>
                      <select
                        value={editFormData.billing_status || ''}
                        onChange={e => setEditFormData({ ...editFormData, billing_status: e.target.value })}
                        className="w-full bg-white/50 backdrop-blur-sm border border-slate-200 rounded-xl py-2.5 px-4 text-slate-900 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all font-outfit"
                      >
                        <option value="not_applicable">N/A</option>
                        <option value="trial">Trial</option>
                        <option value="active">Active</option>
                        <option value="past_due">Past Due</option>
                        <option value="paused">Paused</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-light text-slate-500 block font-outfit uppercase tracking-widest">Account Status</label>
                      <select
                        value={editFormData.status || ''}
                        onChange={e => setEditFormData({ ...editFormData, status: e.target.value })}
                        className="w-full bg-white/50 backdrop-blur-sm border border-slate-200 rounded-xl py-2.5 px-4 text-slate-900 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all font-outfit"
                      >
                        <option value="active">Active</option>
                        <option value="paused">Paused</option>
                        <option value="archived">Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 pb-4">
                  <label className="text-xs font-light text-slate-500 block font-outfit uppercase tracking-widest">Internal Notes</label>
                  <textarea
                    value={editFormData.notes || ''}
                    onChange={e => setEditFormData({ ...editFormData, notes: e.target.value })}
                    rows={3}
                    className="w-full bg-white/50 backdrop-blur-sm border border-slate-200 rounded-xl p-4 text-slate-900 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all font-outfit placeholder:text-slate-400"
                    placeholder="Private notes about this client..."
                  />
                </div>
              </form>
            </div>

            <div className="p-8 border-t border-gray-100 bg-white rounded-b-2xl shrink-0 flex gap-4">
              <Button variant="ghost" className="flex-1 font-light uppercase tracking-widest text-[10px] font-outfit" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
              <Button 
                type="submit" 
                form="edit-client-form"
                loading={updateLoading}
                className="flex-[2] bg-primary-600 hover:bg-primary-700 shadow-xl shadow-primary-500/30 font-light uppercase tracking-widest text-[10px] font-outfit"
              >
                Update Tenant Profile
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Add Brand Modal (New Brand Registration) */}
      {isAddBrandModalOpen && (
        <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-md z-50 flex items-start justify-center p-4 overflow-y-auto pt-10 pb-10">
          <Card className="w-full max-w-4xl p-0 border-none shadow-3xl animate-in zoom-in-95 duration-200 bg-white flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-white z-10 rounded-t-2xl shrink-0">
              <div>
                <h2 className="text-2xl font-light text-gray-900 uppercase tracking-tight flex items-center gap-2 font-outfit">
                  <ShoppingBag className="text-primary-600" size={28} /> Register New Brand
                </h2>
                 <p className="text-slate-400 text-[10px] font-light mt-1 uppercase tracking-widest font-outfit leading-relaxed">Configure brand identity and operational parameters.</p>
              </div>
              <button onClick={() => setIsAddBrandModalOpen(false)} className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              <form id="brand-form" onSubmit={handleCreateBrand} className="space-y-8">
                <div className="space-y-6">
                  <h3 className="text-xs font-light text-slate-400 font-outfit uppercase tracking-widest flex items-center gap-2 mb-4">
                    <Building2 size={14} className="text-primary-600" /> Core Identity & Market
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-8 items-start">
                    <div className="space-y-1.5">
                      <label className="text-xs font-light text-slate-500 block font-outfit uppercase tracking-widest">Parent Agency</label>
                      <div className="w-full bg-gray-50 border border-slate-200 rounded-xl py-2.5 px-4 text-slate-900 font-outfit font-medium">
                        {client.name}
                      </div>
                    </div>
                    <Input
                      label="Industry Sector"
                      value={newBrandFormData.industry}
                      onChange={e => setNewBrandFormData({ ...newBrandFormData, industry: e.target.value })}
                      placeholder="e.g. Beauty & Fashion"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-8 items-start">
                    <Input
                      label="Brand Name"
                      required
                      value={newBrandFormData.name}
                      onChange={e => setNewBrandFormData({ ...newBrandFormData, name: e.target.value })}
                      placeholder="e.g. Luxury Cosmetics"
                    />
                    <Input
                      label="Product Category"
                      value={newBrandFormData.product_category}
                      onChange={e => setNewBrandFormData({ ...newBrandFormData, product_category: e.target.value })}
                      placeholder="e.g. Skincare / Organic"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-8 items-start">
                    <Input
                      label="Primary Website"
                      value={newBrandFormData.website}
                      onChange={e => setNewBrandFormData({ ...newBrandFormData, website: e.target.value })}
                      placeholder="https://example.com"
                      icon={<Globe size={16} />}
                    />
                    <div className="grid grid-cols-2 gap-4 items-start">
                      <div className="space-y-1.5">
                        <label className="text-xs font-light text-slate-500 block font-outfit uppercase tracking-widest">Commission (%)</label>
                        <div className="relative">
                          <Input
                            type="number"
                            value={newBrandFormData.default_commission_percent}
                            onChange={e => setNewBrandFormData({ ...newBrandFormData, default_commission_percent: parseFloat(e.target.value) })}
                            placeholder="10"
                          />
                          <Percent className="absolute right-3 top-3 text-slate-300" size={16} />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-light text-slate-500 block font-outfit uppercase tracking-widest">Brand Status</label>
                        <select
                          value={newBrandFormData.status}
                          onChange={e => setNewBrandFormData({ ...newBrandFormData, status: e.target.value })}
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

                <div className="space-y-6">
                  <h3 className="text-xs font-light text-slate-400 font-outfit uppercase tracking-widest flex items-center gap-2 mb-4">
                    <Target size={14} className="text-primary-600" /> Brand Intelligence
                  </h3>
                  <div className="grid grid-cols-2 gap-8 items-start">
                    <div className="space-y-1.5">
                      <label className="text-xs font-normal text-slate-500 block font-outfit uppercase tracking-widest">Brand Description</label>
                      <textarea
                        value={newBrandFormData.brand_description}
                        onChange={e => setNewBrandFormData({ ...newBrandFormData, brand_description: e.target.value })}
                        className="w-full bg-white/50 backdrop-blur-sm border border-slate-200 rounded-xl p-4 text-sm font-normal text-slate-900 h-24 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all font-outfit placeholder:text-slate-400"
                        placeholder="What makes this brand unique?"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-normal text-slate-500 block font-outfit uppercase tracking-widest">Target Audience</label>
                      <textarea
                        value={newBrandFormData.target_audience}
                        onChange={e => setNewBrandFormData({ ...newBrandFormData, target_audience: e.target.value })}
                        className="w-full bg-white/50 backdrop-blur-sm border border-slate-200 rounded-xl p-4 text-sm font-normal text-slate-900 h-24 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all font-outfit placeholder:text-slate-400"
                        placeholder="Who is the ideal customer?"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-xs font-normal text-slate-400 font-outfit uppercase tracking-widest flex items-center gap-2 mb-4">
                    <Megaphone size={14} className="text-primary-600" /> Operational Parameters
                  </h3>
                  <div className="grid grid-cols-2 gap-8 items-start">
                    <Input
                      label="Brand Voice"
                      value={newBrandFormData.brand_voice}
                      onChange={e => setNewBrandFormData({ ...newBrandFormData, brand_voice: e.target.value })}
                      placeholder="e.g. Professional, Bold, Minimalist"
                    />
                    <Input
                      label="Content Restrictions"
                      value={newBrandFormData.restrictions}
                      onChange={e => setNewBrandFormData({ ...newBrandFormData, restrictions: e.target.value })}
                      placeholder="e.g. No profanity, specific mentions"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-8 items-start">
                    <div className="space-y-1.5">
                      <label className="text-xs font-normal text-slate-500 block font-outfit uppercase tracking-widest">Affiliate & Commission Terms</label>
                      <textarea
                        value={newBrandFormData.affiliate_terms}
                        onChange={e => setNewBrandFormData({ ...newBrandFormData, affiliate_terms: e.target.value })}
                        className="w-full bg-white/50 backdrop-blur-sm border border-slate-200 rounded-xl p-4 text-sm font-normal text-slate-900 h-24 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all font-outfit placeholder:text-slate-400"
                        placeholder="Standard commission structure and payment terms..."
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-normal text-slate-500 block font-outfit uppercase tracking-widest">Product Offer Notes</label>
                      <textarea
                        value={newBrandFormData.product_offer_notes}
                        onChange={e => setNewBrandFormData({ ...newBrandFormData, product_offer_notes: e.target.value })}
                        className="w-full bg-white/50 backdrop-blur-sm border border-slate-200 rounded-xl p-4 text-sm font-normal text-slate-900 h-24 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all font-outfit placeholder:text-slate-400"
                        placeholder="Details about product samples or creator offers..."
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 pb-4">
                  <label className="text-xs font-normal text-slate-500 block font-outfit uppercase tracking-widest">Notes</label>
                  <textarea
                    value={newBrandFormData.notes}
                    onChange={e => setNewBrandFormData({ ...newBrandFormData, notes: e.target.value })}
                    className="w-full bg-white/50 backdrop-blur-sm border border-slate-200 rounded-xl p-4 text-sm font-normal text-slate-900 h-20 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all font-outfit placeholder:text-slate-400"
                    placeholder="Private operational notes..."
                  />
                </div>
              </form>
            </div>

            <div className="p-8 border-t border-gray-100 bg-white rounded-b-2xl shrink-0 flex gap-4">
              <Button variant="ghost" className="flex-1 font-normal uppercase tracking-widest text-[10px] font-outfit" onClick={() => setIsAddBrandModalOpen(false)}>Cancel Registration</Button>
              <Button 
                type="submit" 
                form="brand-form"
                loading={isSubmitting}
                className="flex-[2] bg-primary-600 hover:bg-primary-700 shadow-xl shadow-primary-500/30 font-normal uppercase tracking-widest text-[10px] font-outfit"
              >
                Finalize Brand Identity
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Invite Modal (Unified with Users.tsx) */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200 bg-white">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 rounded-t-xl">
              <h2 className="text-xl font-light font-outfit uppercase tracking-tight flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary-600" /> Invite Users
              </h2>
              <button onClick={() => setIsInviteModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmitInvite} className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-light text-gray-500 font-outfit uppercase tracking-widest mb-1.5">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="John Doe"
                    className="pl-10"
                    value={inviteFormData.full_name}
                    onChange={(e) => setInviteFormData({ ...inviteFormData, full_name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-light text-gray-500 font-outfit uppercase tracking-widest mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input
                    type="email"
                    placeholder="john@example.com"
                    className="pl-10"
                    value={inviteFormData.email}
                    onChange={(e) => setInviteFormData({ ...inviteFormData, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-light text-gray-500 font-outfit uppercase tracking-widest mb-1.5">User Type</label>
                  <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 font-medium font-outfit">
                    Client User
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-light text-gray-500 font-outfit uppercase tracking-widest mb-1.5">Role</label>
                  <select 
                    className="w-full rounded-lg border border-gray-200 p-2.5 text-sm font-outfit"
                    value={inviteFormData.role}
                    onChange={(e) => setInviteFormData({ ...inviteFormData, role: e.target.value })}
                  >
                    <option value="client_admin">Client Admin</option>
                    <option value="client_marketing">Marketing</option>
                    <option value="client_viewer">Viewer</option>
                  </select>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm flex items-center gap-2 font-light">
                  <AlertCircle className="w-4 h-4" /> {error}
                </div>
              )}

              {success && (
                <div className="p-3 bg-green-50 text-green-600 rounded-lg text-sm flex items-center gap-2 font-light">
                  <CheckCircle2 className="w-4 h-4" /> Invitation sent!
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1 font-outfit font-light text-[10px] uppercase tracking-widest" onClick={() => setIsInviteModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 font-outfit font-light text-[10px] uppercase tracking-widest" disabled={inviteLoading}>
                  {inviteLoading ? <LoadingState mini /> : 'Send Invite'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
