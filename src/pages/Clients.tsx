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
  Users as UsersIcon
} from 'lucide-react';
import * as api from '../lib/api';

interface Client {
  id: string;
  name: string;
  status: string;
  created_at: string;
  _count?: {
    campaigns: number;
    users: number;
  };
}

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');

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
    if (!newClientName) return;
    try {
      await api.createClient({ name: newClientName });
      setNewClientName('');
      setIsInviteModalOpen(false);
      fetchClients();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create client');
    }
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Clients Management</h1>
          <p className="text-gray-400">Manage tenant accounts and their access levels.</p>
        </div>
        <button 
          onClick={() => setIsInviteModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors shadow-lg shadow-blue-900/20"
        >
          <Plus size={20} />
          <span>New Client</span>
        </button>
      </div>

      <div className="bg-[#111] border border-white/5 rounded-xl overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-white/5 flex flex-col md:flex-row gap-4 justify-between bg-white/5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input
              type="text"
              placeholder="Search clients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 text-gray-400 text-sm uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Client Name</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-center">Campaigns</th>
                <th className="px-6 py-4 font-semibold text-center">Users</th>
                <th className="px-6 py-4 font-semibold">Joined</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <Activity className="animate-spin mx-auto mb-2 text-blue-500" />
                    <span>Loading clients data...</span>
                  </td>
                </tr>
              ) : filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No clients found matching your search.
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20">
                          <Building2 size={20} />
                        </div>
                        <div>
                          <div className="font-medium text-white group-hover:text-blue-400 transition-colors">{client.name}</div>
                          <div className="text-xs text-gray-500">ID: {client.id.substring(0, 8)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                        client.status === 'active' 
                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                          : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                      }`}>
                        {client.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-gray-300">
                      {client._count?.campaigns || 0}
                    </td>
                    <td className="px-6 py-4 text-center text-gray-300">
                      {client._count?.users || 0}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {client.created_at || (client as any).createdAt 
                        ? new Date(client.created_at || (client as any).createdAt).toLocaleDateString() 
                        : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all">
                          <ExternalLink size={18} />
                        </button>
                        <button className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all">
                          <MoreVertical size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Placeholder */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Building2 className="text-blue-500" />
                <span>Onboard New Client</span>
              </h2>
              <button onClick={() => setIsInviteModalOpen(false)} className="text-gray-500 hover:text-white">
                <Plus size={24} className="rotate-45" />
              </button>
            </div>
            
            <form onSubmit={handleCreateClient} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Company Name</label>
                <input
                  type="text"
                  required
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  className="w-full bg-black/40 border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-blue-500 transition-colors shadow-inner"
                />
              </div>
              
              <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-4 text-sm text-blue-400/80 leading-relaxed mb-4">
                <Shield size={16} className="inline mr-2 mb-1" />
                Adding a new client creates a dedicated tenant environment with strict data isolation.
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl shadow-lg shadow-blue-900/40 transition-all flex items-center justify-center gap-2 group"
              >
                <span>Initialize Client</span>
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
