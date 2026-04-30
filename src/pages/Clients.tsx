import React, { useEffect, useState } from 'react';
import { 
  Building2, 
  Plus, 
  Search, 
  MoreVertical,
  ArrowRight,
  ExternalLink,
  Shield,
  Activity,
  User,
  Globe,
  Tag,
  Mail,
  Phone,
  FileText,
  RefreshCw,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as api from '../lib/api';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

interface Client {
  id: string;
  name: string;
  status: string;
  plan_type: string;
  billing_status: string;
  created_at: string;
  brands?: any[];
  users?: any[];
}

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  // New Client Form State
  const [formData, setFormData] = useState({
    name: '',
    legal_name: '',
    website: '',
    industry: '',
    primary_contact_name: '',
    primary_contact_email: '',
    primary_contact_phone: '',
    plan_type: 'pilot',
    billing_status: 'not_applicable',
    status: 'active',
    notes: ''
  });

  const fetchClients = async () => {
    try {
      const data = await api.getClients();
      setClients(data);
    } catch (err) {
      console.error('Failed to fetch clients', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createClient(formData);
      setIsModalOpen(false);
      setFormData({
        name: '',
        legal_name: '',
        website: '',
        industry: '',
        primary_contact_name: '',
        primary_contact_email: '',
        primary_contact_phone: '',
        plan_type: 'pilot',
        billing_status: 'not_applicable',
        status: 'active',
        notes: ''
      });
      fetchClients();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create client');
    }
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-normal text-gray-900 font-outfit uppercase tracking-tight">Client Hub</h1>
          <p className="text-gray-500 font-normal">Manage agency tenants and ecosystem isolation.</p>
        </div>
        <Button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary-600 hover:bg-primary-700 shadow-xl shadow-primary-500/20"
          icon={<Plus size={20} />}
        >
          Register New Client
        </Button>
      </div>

      <Card className="overflow-hidden border-none shadow-2xl bg-white/80 backdrop-blur-md">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Filter clients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2.5 pl-10 pr-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
            />
          </div>
          <div className="text-sm font-normal text-gray-400 uppercase tracking-widest">
            {filteredClients.length} Active Tenants
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 text-gray-400 text-[10px] font-normal uppercase tracking-widest border-b border-gray-100">
                <th className="px-6 py-4">Agency Identity</th>
                <th className="px-6 py-4 text-center">Security Status</th>
                <th className="px-6 py-4 text-center">Service Tier</th>
                <th className="px-6 py-4 text-center">Ecosystem</th>
                <th className="px-6 py-4 text-right">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-gray-400">
                    <RefreshCw className="animate-spin mx-auto mb-3 text-primary-500" size={32} />
                    <p className="font-normal">Syncing tenant data...</p>
                  </td>
                </tr>
              ) : filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-gray-500">
                    No agency tenants found.
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => (
                  <tr 
                    key={client.id} 
                    onClick={() => navigate(`/clients/${client.id}`)}
                    className="hover:bg-primary-50/30 transition-colors group cursor-pointer"
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-gray-100 flex items-center justify-center text-primary-600 group-hover:scale-110 transition-transform">
                          <Building2 size={24} />
                        </div>
                        <div>
                          <div className="font-normal text-gray-900 text-lg leading-tight uppercase tracking-tight font-outfit">{client.name}</div>
                          <div className="text-[9px] text-gray-400 font-normal uppercase tracking-widest mt-0.5">{client.industry || 'General Sector'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className={`px-3 py-1 rounded text-[10px] font-normal uppercase tracking-wider border ${
                        client.status === 'active' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                      }`}>
                        {client.status}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="px-3 py-1 rounded bg-primary-50 text-primary-600 border border-primary-100 text-[10px] font-normal uppercase tracking-wider">
                        {client.plan_type}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                       <div className="flex justify-center gap-4">
                          <div className="text-center">
                            <div className="text-lg font-normal text-gray-900">{client.brands?.length || 0}</div>
                            <div className="text-[9px] text-gray-400 font-normal uppercase">Brands</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-normal text-gray-900">{client.users?.length || 0}</div>
                            <div className="text-[9px] text-gray-400 font-normal uppercase">Users</div>
                          </div>
                       </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                       <div className="text-sm font-normal text-gray-900 uppercase tracking-tighter">
                         {client.created_at || (client as any).createdAt ? new Date(client.created_at || (client as any).createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '---'}
                       </div>
                       <div className="text-[9px] text-gray-400 font-normal uppercase tracking-widest">Account Created</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* New Client Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-0 border-none shadow-3xl animate-in zoom-in-95 duration-200 bg-white">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-2xl font-normal text-gray-900 font-outfit uppercase tracking-tight flex items-center gap-3">
                  <Shield className="text-primary-600" /> Register New Tenant
                </h2>
                <p className="text-gray-500 text-sm font-normal mt-1">Initialize a secure agency environment.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleCreateClient} className="p-8 space-y-8">
              {/* Basic Info Section */}
              <div className="grid grid-cols-2 gap-6">
                <Input
                  label="Display Name (Agency Name)"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. ATS Global"
                />
                <Input
                  label="Legal Entity Name"
                  value={formData.legal_name}
                  onChange={e => setFormData({ ...formData, legal_name: e.target.value })}
                  placeholder="Full registered company name"
                />
                <div className="space-y-1.5">
                  <label className="text-sm font-normal text-gray-600 font-outfit flex items-center gap-2">
                    <Globe size={14} className="text-gray-400" /> Website URL
                  </label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={e => setFormData({ ...formData, website: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2.5 px-4 text-gray-900 focus:outline-none focus:border-primary-500"
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-normal text-gray-600 font-outfit flex items-center gap-2">
                    <Tag size={14} className="text-gray-400" /> Industry Sector
                  </label>
                  <input
                    type="text"
                    value={formData.industry}
                    onChange={e => setFormData({ ...formData, industry: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2.5 px-4 text-gray-900 focus:outline-none focus:border-primary-500"
                    placeholder="e.g. Fashion, Tech, etc."
                  />
                </div>
              </div>

              {/* Primary Contact Section */}
              <div className="p-6 bg-gray-50 rounded-2xl space-y-4">
                <h3 className="text-xs font-bold text-gray-400 font-outfit uppercase tracking-widest flex items-center gap-2">
                  <User size={14} className="text-primary-600" /> Primary Contact Person
                </h3>
                <div className="grid grid-cols-2 gap-4">
                   <Input
                    placeholder="Full Name"
                    value={formData.primary_contact_name}
                    onChange={e => setFormData({ ...formData, primary_contact_name: e.target.value })}
                  />
                   <Input
                    placeholder="Work Email"
                    type="email"
                    value={formData.primary_contact_email}
                    onChange={e => setFormData({ ...formData, primary_contact_email: e.target.value })}
                  />
                   <Input
                    placeholder="Phone Number"
                    value={formData.primary_contact_phone}
                    onChange={e => setFormData({ ...formData, primary_contact_phone: e.target.value })}
                  />
                </div>
              </div>

              {/* Configuration Section */}
              <div className="grid grid-cols-3 gap-6">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-600 font-outfit">Plan Type</label>
                  <select
                    value={formData.plan_type}
                    onChange={e => setFormData({ ...formData, plan_type: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2.5 px-3 text-gray-900"
                  >
                    <option value="internal">Internal</option>
                    <option value="pilot">Pilot</option>
                    <option value="standard">Standard</option>
                    <option value="premium">Premium</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-600 font-outfit">Billing Status</label>
                  <select
                    value={formData.billing_status}
                    onChange={e => setFormData({ ...formData, billing_status: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2.5 px-3 text-gray-900"
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
                  <label className="text-sm font-medium text-gray-600 font-outfit">Account Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2.5 px-3 text-gray-900"
                  >
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-600 font-outfit flex items-center gap-2">
                  <FileText size={14} className="text-gray-400" /> Internal Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 text-gray-900 focus:outline-none focus:border-primary-500"
                  placeholder="Private notes about this client..."
                />
              </div>

              <div className="flex gap-4 pt-4 border-t border-gray-100 sticky bottom-0 bg-white pb-8">
                <Button variant="ghost" className="flex-1" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="flex-[2] bg-primary-600 hover:bg-primary-700 shadow-xl shadow-primary-500/30">
                  Initialize Agency Tenant
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
