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
  Wand2
} from 'lucide-react';
import * as api from '../lib/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
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
  const navigate = useNavigate();
  
  // Invite Form State
  const [inviteLoading, setInviteLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    role: 'client_admin',
    user_type: 'client',
    client_id: id || ''
  });

  const fetchClientData = async () => {
    if (!id) return;
    try {
      const data = await api.getClientById(id);
      setClient(data);
    } catch (err) {
      console.error('Failed to fetch client details', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientData();
  }, [id]);

  const handleSubmitInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await api.inviteUser(formData);
      setSuccess(true);
      setFormData({ ...formData, full_name: '', email: '' });
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

  if (loading) {
    return (
      <div className="p-20 text-center text-gray-400">
        <RefreshCw className="animate-spin mx-auto mb-4 text-primary-500" size={40} />
        <p className="font-normal text-lg">Reconstructing Agency Tenant...</p>
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
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-3xl bg-white shadow-xl border border-gray-100 flex items-center justify-center text-primary-600">
              <Building2 size={40} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-4xl font-normal text-gray-900 font-outfit uppercase tracking-tight">{client.name}</h1>
                <span className={`px-3 py-1 rounded text-[10px] font-normal uppercase tracking-widest border ${
                  client.status === 'active' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                }`}>
                  {client.status}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 1. Client Intelligence Profile */}
      <Card className="border-none shadow-2xl bg-white overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
          <h2 className="text-sm font-normal text-gray-900 uppercase tracking-widest flex items-center gap-2">
            <FileText size={18} className="text-primary-600" /> Client Intelligence Profile
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
            <ShoppingBag size={18} className="text-primary-600" /> Managed Brands Identity
          </h3>
          <span className="text-[10px] font-normal text-gray-400 uppercase tracking-widest">
            {client.brands?.length || 0} Registered Entities
          </span>
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
                  <tr key={brand.id} className="hover:bg-primary-50/30 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="font-normal text-gray-900 text-base leading-tight group-hover:text-primary-600 transition-colors">{brand.name}</div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="px-2.5 py-1 rounded bg-gray-100 text-gray-600 text-[10px] font-normal uppercase tracking-wider border border-gray-200">
                        {brand.industry || 'General'}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <a href={brand.website} target="_blank" rel="noreferrer" className="text-sm font-normal text-gray-500 hover:text-primary-600 flex items-center gap-1.5 transition-colors">
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
            <Users size={18} className="text-primary-600" /> Authorized Staff Network
          </h3>
          <Button 
            size="sm" 
            onClick={() => setIsInviteModalOpen(true)}
            icon={<UserPlus size={16} />}
            className="bg-primary-600 hover:bg-primary-700 shadow-lg shadow-primary-500/20"
          >
            Invite Users
          </Button>
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

      {/* Invite Modal (Unified with Users.tsx) */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200 bg-white">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 rounded-t-xl">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary-600" /> Invite Users
              </h2>
              <button onClick={() => setIsInviteModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmitInvite} className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="John Doe"
                    className="pl-10"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input
                    type="email"
                    placeholder="john@example.com"
                    className="pl-10"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">User Type</label>
                  <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 font-medium">
                    Client User
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Role</label>
                  <select 
                    className="w-full rounded-lg border border-gray-200 p-2.5 text-sm"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  >
                    <option value="client_admin">Client Admin</option>
                    <option value="client_marketing">Marketing</option>
                    <option value="client_viewer">Viewer</option>
                  </select>
                </div>
              </div>



              {error && (
                <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> {error}
                </div>
              )}

              {success && (
                <div className="p-3 bg-green-50 text-green-600 rounded-lg text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Invitation sent!
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setIsInviteModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={inviteLoading}>
                  {inviteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Invite'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
