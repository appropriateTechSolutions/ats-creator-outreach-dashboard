import { clickable } from '../lib/a11y';
import { toast } from '../lib/toast';
import { hasRole, ROLE_GROUPS } from '../lib/constants';
import React, { useState, useMemo } from 'react';
import { Building2, Plus, Search, Shield, User, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as api from '../lib/api';
import { useClients, useCampaigns } from '../hooks/queries';
import { useInvalidate } from '../hooks/useInvalidate';
import { queryKeys } from '../lib/queryKeys';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { LoadingState } from '../components/ui/LoadingState';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';

import type { Client } from '../types';

export default function Clients() {
  const { user } = useAuth();
  const { data: clientsData = [], isLoading: loading } = useClients();
  const { data: campaignsData = [] } = useCampaigns();
  const invalidate = useInvalidate();

  // Enrich each client with a campaign count computed from the campaigns list.
  const clients = useMemo<Client[]>(
    () =>
      clientsData.map((client) => ({
        ...client,
        campaign_count: campaignsData.filter(
          (c) => c.client_id === client.id || c.Client?.id === client.id,
        ).length,
      })),
    [clientsData, campaignsData],
  );
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
    notes: '',
  });

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
        notes: '',
      });
      invalidate(queryKeys.clients.all);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create client');
    }
  };

  const filteredClients = clients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-[fadeIn_0.2s_ease]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-normal text-gray-900 font-outfit uppercase tracking-tight">
            Clients
          </h1>
        </div>
        {hasRole(user?.role, ROLE_GROUPS.ADMINS) && (
          <Button
            onClick={() => setIsModalOpen(true)}
            className="hidden sm:inline-flex bg-primary-600 hover:bg-primary-700 shadow-xl shadow-primary-500/20 whitespace-nowrap"
            icon={<Plus size={20} />}
          >
            Register New Client
          </Button>
        )}
      </div>

      <Card className="overflow-hidden border-none shadow-2xl bg-white/80 backdrop-blur-md">
        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gray-50/30">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Filter by client..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-gray-100 rounded-xl py-2.5 pl-10 pr-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all shadow-sm"
            />
          </div>
          <div className="text-[10px] font-normal text-gray-400 uppercase tracking-widest bg-white px-3 py-1.5 rounded-lg border border-gray-100 whitespace-nowrap">
            {filteredClients.length} Active Tenants
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 text-gray-400 text-[10px] font-normal uppercase tracking-widest border-b border-gray-100">
                <th className="px-8 py-5">Client</th>
                <th className="px-8 py-5 text-center">Status</th>
                <th className="px-8 py-5 text-center">Service Tier</th>
                <th className="px-8 py-5 text-center">Ecosystem</th>
                <th className="px-8 py-5 text-right">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-20">
                    <LoadingState message="Synchronizing Agency Infrastructure..." />
                  </td>
                </tr>
              ) : filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center text-gray-400 italic">
                    No agency tenants found in the directory.
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => (
                  <tr
                    key={client.id}
                    onClick={() => navigate(`/clients/${client.id}`)}
                    className="hover:bg-primary-50/30 transition-colors group cursor-pointer"
                  >
                    <td className="px-8 py-6">
                      <div>
                        <div className="font-normal text-gray-900 text-sm leading-tight uppercase tracking-tight font-outfit group-hover:text-primary-600 transition-colors">
                          {client.name}
                        </div>
                        <div className="text-[9px] text-gray-400 font-normal uppercase tracking-widest mt-1">
                          {client.industry || 'General Sector'}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <div className="flex justify-center">
                        <StatusBadge status={client.status as any} />
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className="px-3 py-1 rounded-full bg-primary-50 text-primary-600 border border-primary-100 text-[10px] font-normal uppercase tracking-widest">
                        {client.plan_type}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <div className="flex justify-center gap-6">
                        <div className="text-center">
                          <div className="text-lg font-normal text-gray-900 font-outfit">
                            {client.brands?.length || 0}
                          </div>
                          <div className="text-[9px] text-gray-400 font-normal uppercase tracking-widest mt-0.5">
                            Brands
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-normal text-gray-900 font-outfit">
                            {client.campaign_count || 0}
                          </div>
                          <div className="text-[9px] text-gray-400 font-normal uppercase tracking-widest mt-0.5">
                            Campaigns
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-normal text-gray-900 font-outfit">
                            {client.users?.length || 0}
                          </div>
                          <div className="text-[9px] text-gray-400 font-normal uppercase tracking-widest mt-0.5">
                            Users
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="text-sm font-normal text-gray-900 uppercase tracking-tight font-outfit whitespace-nowrap">
                        {client.created_at || (client as any).createdAt
                          ? format(
                              new Date(client.created_at || (client as any).createdAt),
                              'MMM d, yyyy',
                            )
                          : '---'}
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
              <LoadingState message="Synchronizing Agency Infrastructure..." />
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="px-8 py-20 text-center text-gray-400 italic bg-white rounded-xl">
              No agency tenants found in the directory.
            </div>
          ) : (
            filteredClients.map((client) => (
              <div
                key={client.id}
                {...clickable(() => navigate(`/clients/${client.id}`))}
                className="p-5 active:bg-gray-50 transition-all cursor-pointer space-y-4"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-normal text-gray-900 text-sm leading-tight uppercase tracking-tight font-outfit truncate">
                      {client.name}
                    </h4>
                    <p className="text-[9px] text-gray-400 font-normal uppercase tracking-widest mt-1 truncate">
                      {client.industry || 'General Sector'}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <StatusBadge status={client.status as any} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 pt-1 text-xs">
                  <div>
                    <span className="text-[10px] font-normal text-gray-400 uppercase tracking-widest block mb-0.5">
                      Service Tier
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-primary-50 text-primary-600 border border-primary-100 text-[10px] font-normal uppercase tracking-widest font-outfit">
                      {client.plan_type}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-normal text-gray-400 uppercase tracking-widest block mb-0.5">
                      Joined
                    </span>
                    <span className="font-normal text-gray-900 uppercase tracking-tight font-outfit">
                      {client.created_at || (client as any).createdAt
                        ? format(
                            new Date(client.created_at || (client as any).createdAt),
                            'MMM d, yyyy',
                          )
                        : '---'}
                    </span>
                  </div>

                  <div className="col-span-2 pt-2 border-t border-slate-50 flex gap-6">
                    <div>
                      <span className="text-[10px] font-normal text-gray-400 uppercase tracking-widest block mb-0.5">
                        Brands
                      </span>
                      <span className="text-base font-normal text-gray-900 font-outfit">
                        {client.brands?.length || 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-normal text-gray-400 uppercase tracking-widest block mb-0.5">
                        Campaigns
                      </span>
                      <span className="text-base font-normal text-gray-900 font-outfit">
                        {client.campaign_count || 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-normal text-gray-400 uppercase tracking-widest block mb-0.5">
                        Users
                      </span>
                      <span className="text-base font-normal text-gray-900 font-outfit">
                        {client.users?.length || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* New Client Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-0 border-none shadow-3xl animate-in zoom-in-95 duration-200 bg-white rounded-2xl">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10 rounded-t-2xl shrink-0">
              <div>
                <h2 className="text-2xl font-normal text-gray-900 font-outfit uppercase tracking-tight flex items-center gap-3">
                  <Shield className="text-primary-600" size={28} /> Register New Tenant
                </h2>
                <p className="text-slate-400 text-[10px] font-normal mt-1 uppercase tracking-widest font-outfit leading-relaxed">
                  Initialize a secure agency environment.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              <form id="client-form" onSubmit={handleCreateClient} className="space-y-8">
                {/* Basic Info Section */}
                <div className="space-y-6">
                  <h3 className="text-xs font-normal text-slate-400 font-outfit uppercase tracking-widest flex items-center gap-2 mb-4">
                    <Building2 size={14} className="text-primary-600" /> Agency Identity
                  </h3>

                  {/* Row 1: Display Name & Legal Name */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
                    <Input
                      label="Display Name (Agency Name)"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. ATS Global"
                    />
                    <Input
                      label="Legal Entity Name"
                      value={formData.legal_name}
                      onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
                      placeholder="Full registered company name"
                    />
                  </div>

                  {/* Row 2: Website & Industry */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
                    <div className="space-y-1.5">
                      <label
                        htmlFor="clients-1"
                        className="text-xs font-normal text-slate-500 block font-outfit uppercase tracking-widest"
                      >
                        Website URL
                      </label>
                      <input
                        id="clients-1"
                        type="url"
                        value={formData.website}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                        className="w-full bg-white/50 backdrop-blur-sm border border-slate-200 rounded-xl py-2.5 px-4 text-slate-900 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all font-outfit placeholder:text-slate-400"
                        placeholder="https://..."
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label
                        htmlFor="clients-2"
                        className="text-xs font-normal text-slate-500 block font-outfit uppercase tracking-widest"
                      >
                        Industry Sector
                      </label>
                      <input
                        id="clients-2"
                        type="text"
                        value={formData.industry}
                        onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                        className="w-full bg-white/50 backdrop-blur-sm border border-slate-200 rounded-xl py-2.5 px-4 text-slate-900 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all font-outfit placeholder:text-slate-400"
                        placeholder="e.g. Fashion, Tech, etc."
                      />
                    </div>
                  </div>
                </div>

                {/* Primary Contact Section */}
                <div className="space-y-6">
                  <h3 className="text-xs font-normal text-slate-400 font-outfit uppercase tracking-widest flex items-center gap-2 mb-4">
                    <User size={14} className="text-primary-600" /> Primary Contact Person
                  </h3>
                  <div className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100/50 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
                      <Input
                        label="Full Name"
                        placeholder="Contact person name"
                        value={formData.primary_contact_name}
                        onChange={(e) =>
                          setFormData({ ...formData, primary_contact_name: e.target.value })
                        }
                      />
                      <Input
                        label="Work Email"
                        placeholder="email@agency.com"
                        type="email"
                        required
                        value={formData.primary_contact_email}
                        onChange={(e) =>
                          setFormData({ ...formData, primary_contact_email: e.target.value })
                        }
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
                      <Input
                        label="Phone Number"
                        placeholder="e.g. +1234567890"
                        type="tel"
                        pattern="[\+0-9\- ]*"
                        value={formData.primary_contact_phone}
                        onChange={(e) =>
                          setFormData({ ...formData, primary_contact_phone: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Configuration Section */}
                <div className="space-y-6">
                  <h3 className="text-xs font-normal text-slate-400 font-outfit uppercase tracking-widest flex items-center gap-2 mb-4">
                    <Shield size={14} className="text-primary-600" /> Service Configuration
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
                    <div className="space-y-1.5">
                      <label
                        htmlFor="clients-3"
                        className="text-xs font-normal text-slate-500 block font-outfit uppercase tracking-widest"
                      >
                        Plan Type
                      </label>
                      <select
                        id="clients-3"
                        value={formData.plan_type}
                        onChange={(e) => setFormData({ ...formData, plan_type: e.target.value })}
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
                      <label
                        htmlFor="clients-4"
                        className="text-xs font-normal text-slate-500 block font-outfit uppercase tracking-widest"
                      >
                        Billing Status
                      </label>
                      <select
                        id="clients-4"
                        value={formData.billing_status}
                        onChange={(e) =>
                          setFormData({ ...formData, billing_status: e.target.value })
                        }
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
                      <label
                        htmlFor="clients-5"
                        className="text-xs font-normal text-slate-500 block font-outfit uppercase tracking-widest"
                      >
                        Account Status
                      </label>
                      <select
                        id="clients-5"
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="w-full bg-white/50 backdrop-blur-sm border border-slate-200 rounded-xl py-2.5 px-4 text-slate-900 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all font-outfit"
                      >
                        <option value="active">Active</option>
                        <option value="paused">Paused</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 pb-4">
                  <label
                    htmlFor="clients-6"
                    className="text-xs font-normal text-slate-500 block font-outfit uppercase tracking-widest"
                  >
                    Internal Notes
                  </label>
                  <textarea
                    id="clients-6"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full bg-white/50 backdrop-blur-sm border border-slate-200 rounded-xl p-4 text-slate-900 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all font-outfit placeholder:text-slate-400"
                    placeholder="Private notes about this client..."
                  />
                </div>
              </form>
            </div>

            {/* Sticky Footer */}
            <div className="p-8 border-t border-gray-100 bg-white rounded-b-2xl shrink-0 flex gap-4">
              <Button
                variant="ghost"
                className="flex-1 font-normal uppercase tracking-widest text-[10px] font-outfit"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="client-form"
                className="flex-[2] bg-primary-600 hover:bg-primary-700 shadow-xl shadow-primary-500/30 font-normal uppercase tracking-widest text-[10px] font-outfit"
              >
                Initialize Agency Tenant
              </Button>
            </div>
          </Card>
        </div>
      )}
      {/* Floating Action Button for Mobile */}
      {hasRole(user?.role, ROLE_GROUPS.ADMINS) && (
        <button
          onClick={() => setIsModalOpen(true)}
          className="sm:hidden fixed bottom-6 right-6 z-50 bg-primary-600 hover:bg-primary-700 text-white rounded-full p-4 shadow-2xl shadow-primary-500/40 flex items-center justify-center transition-transform active:scale-95 border border-primary-500/20"
          aria-label="Register New Client"
        >
          <Plus size={24} />
        </button>
      )}
    </div>
  );
}
