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
  CheckCircle2
} from 'lucide-react';
import * as api from '../lib/api';

interface Brand {
  id: string;
  name: string;
  client_id: string;
  created_at: string;
  Client?: {
    name: string;
  };
  _count?: {
    campaigns: number;
  };
}

interface Client {
  id: string;
  name: string;
}

export default function Brands() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // New Brand Form
  const [newName, setNewName] = useState('');
  const [newClientId, setNewClientId] = useState('');

  const fetchData = async () => {
    try {
      const [brandsData, clientsData] = await Promise.all([
        api.getBrands(selectedClientId === 'all' ? undefined : selectedClientId),
        api.getClients()
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
  }, [selectedClientId]);

  const handleCreateBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newClientId) return;
    try {
      await api.createBrand({ name: newName, client_id: newClientId });
      setNewName('');
      setNewClientId('');
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create brand');
    }
  };

  const filteredBrands = brands.filter(b => 
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white font-outfit">Brands Management</h1>
          <p className="text-gray-400">Organize and track performance by brand within each client.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-all shadow-lg shadow-emerald-900/20 active:scale-95"
        >
          <Plus size={20} />
          <span>New Brand</span>
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input
            type="text"
            placeholder="Search brands..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#111] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-emerald-500 transition-all shadow-xl"
          />
        </div>
        <div className="flex items-center gap-2 bg-[#111] border border-white/10 rounded-xl px-4 py-2">
          <Filter size={18} className="text-gray-500" />
          <select 
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="bg-transparent text-gray-300 focus:outline-none cursor-pointer"
          >
            <option value="all">All Clients</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 bg-white/5 animate-pulse rounded-2xl border border-white/5" />
          ))
        ) : filteredBrands.length === 0 ? (
          <div className="col-span-full py-20 text-center text-gray-500 bg-white/5 rounded-2xl border border-dashed border-white/10">
            <ShoppingBag size={48} className="mx-auto mb-4 opacity-20" />
            <p>No brands found. Start by adding one!</p>
          </div>
        ) : (
          filteredBrands.map((brand) => (
            <div key={brand.id} className="group relative bg-[#111] border border-white/10 rounded-2xl p-6 hover:border-emerald-500/50 transition-all shadow-2xl overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl -mr-16 -mt-16 group-hover:bg-emerald-500/10 transition-colors" />
              
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                  <ShoppingBag size={24} />
                </div>
                <button className="text-gray-500 hover:text-white transition-colors">
                  <MoreVertical size={20} />
                </button>
              </div>

              <h3 className="text-xl font-bold text-white mb-1 group-hover:text-emerald-400 transition-colors">{brand.name}</h3>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
                <Building2 size={14} />
                <span>{brand.Client?.name || 'Unassigned'}</span>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Campaigns</div>
                  <div className="flex items-center gap-2">
                    <BarChart3 size={16} className="text-emerald-500" />
                    <span className="text-lg font-bold text-white">{brand._count?.campaigns || 0}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Created</div>
                  <div className="text-sm text-gray-300">
                    {brand.created_at || (brand as any).createdAt 
                      ? new Date(brand.created_at || (brand as any).createdAt).toLocaleDateString() 
                      : 'N/A'}
                  </div>
                </div>
              </div>

              <button className="mt-6 w-full py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-gray-300 flex items-center justify-center gap-2 transition-all group-hover:border-white/10 border border-transparent">
                <span>View Details</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl w-full max-w-lg p-8 shadow-[0_0_50px_-12px_rgba(16,185,129,0.2)] animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <ShoppingBag className="text-emerald-500" />
                  <span>Create New Brand</span>
                </h2>
                <p className="text-gray-500 text-sm mt-1">Add a new brand identity under a client tenant.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-white p-2 hover:bg-white/5 rounded-full transition-colors">
                <Plus size={28} className="rotate-45" />
              </button>
            </div>
            
            <form onSubmit={handleCreateBrand} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Parent Client</label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  <select
                    required
                    value={newClientId}
                    onChange={(e) => setNewClientId(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-emerald-500 transition-all appearance-none cursor-pointer"
                  >
                    <option value="" disabled className="bg-[#111]">Select a client...</option>
                    {clients.map(c => <option key={c.id} value={c.id} className="bg-[#111]">{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Brand Name</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Nike, Apple, etc."
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-emerald-500 transition-all placeholder:text-gray-600"
                />
              </div>

              <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex items-start gap-3">
                <CheckCircle2 size={20} className="text-emerald-500 mt-0.5 shrink-0" />
                <p className="text-sm text-emerald-400/80">
                  Brands are used to group campaigns and track specific marketing budgets across influencer segments.
                </p>
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl shadow-xl shadow-emerald-900/40 transition-all flex items-center justify-center gap-2 group transform active:scale-[0.98]"
              >
                <span>Launch Brand</span>
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
