import { clickable } from '../lib/a11y';
import { hasRole, ROLE_GROUPS } from '../lib/constants';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { inviteUser, getClients, resendInvite } from '../lib/api';
import { useUsers } from '../hooks/queries';
import { useInvalidate } from '../hooks/useInvalidate';
import { queryKeys } from '../lib/queryKeys';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import {
  UserPlus,
  Mail,
  Shield,
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  Wand2,
  Search,
  X,
  Building2,
} from 'lucide-react';
import { LoadingState } from '../components/ui/LoadingState';

export default function Users() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const { data: users = [], isLoading: loading } = useUsers();
  // Clients are only needed (and permitted) for admins assigning a tenant.
  const { data: clients = [] } = useQuery({
    queryKey: queryKeys.clients.all,
    queryFn: getClients,
    enabled: isAdmin,
  });
  const invalidate = useInvalidate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [isNewClient, setIsNewClient] = useState(false);

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    role: 'client_admin',
    user_type: 'client',
    client_id: user?.client_id || '',
  });

  const generateUUID = () => {
    const uuid = crypto.randomUUID();
    setFormData({ ...formData, client_id: uuid });
  };

  const handleResendInvite = async (e: React.MouseEvent, userId: string) => {
    e.stopPropagation(); // Prevent navigation to detail page
    setActionLoading(userId);
    try {
      await resendInvite(userId);
      showToast('Invitation resent successfully!', 'success');
    } catch (err: any) {
      showToast(err || 'Failed to resend invitation.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await inviteUser(formData);
      setSuccess(true);
      setFormData({ ...formData, full_name: '', email: '' });
      invalidate(queryKeys.users.all); // Refresh list
      setTimeout(() => {
        setIsModalOpen(false);
        setSuccess(false);
      }, 1500);
    } catch (err: any) {
      setError(err || 'Failed to send invitation.');
    } finally {
      setInviteLoading(false);
    }
  };

  const filteredUsers = users.filter((u) =>
    (u.full_name || '').toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6 animate-[fadeIn_0.2s_ease] max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-normal text-gray-900 font-outfit uppercase tracking-tight">
            User Management
          </h1>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          className="hidden sm:inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 shadow-xl shadow-primary-500/20 font-normal uppercase tracking-widest text-[10px] h-11 whitespace-nowrap"
        >
          <UserPlus size={16} /> Invite New User
        </Button>
      </div>

      {/* User Table */}
      <Card className="overflow-hidden border-none shadow-2xl bg-white/80 backdrop-blur-md">
        <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gray-50/30">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-4 top-3.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Filter by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-xl text-sm font-normal text-gray-900 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all shadow-sm"
            />
          </div>
          <div className="text-[10px] font-normal text-gray-400 uppercase tracking-widest bg-white px-3 py-1.5 rounded-lg border border-gray-100 whitespace-nowrap">
            {filteredUsers.length} Registered Identities
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-8 py-5 text-[10px] font-normal text-gray-400 uppercase tracking-widest">
                  User Profile
                </th>
                <th className="px-8 py-5 text-[10px] font-normal text-gray-400 uppercase tracking-widest text-center">
                  Identity Type
                </th>
                <th className="px-8 py-5 text-[10px] font-normal text-gray-400 uppercase tracking-widest">
                  Administrative Role
                </th>
                <th className="px-8 py-5 text-[10px] font-normal text-gray-400 uppercase tracking-widest">
                  Client
                </th>
                <th className="px-8 py-5 text-[10px] font-normal text-gray-400 uppercase tracking-widest text-center">
                  Status
                </th>
                <th className="px-8 py-5 text-[10px] font-normal text-gray-400 uppercase tracking-widest text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-20">
                    <LoadingState message="Retrieving User Access..." />
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-8 py-20 text-center text-gray-400 font-normal uppercase tracking-widest text-[10px]"
                  >
                    No users found matching your search.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr
                    key={u.id}
                    onClick={() => navigate(`/users/${u.id}`)}
                    className="hover:bg-primary-50/30 transition-all cursor-pointer group"
                  >
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary-100 text-primary-700 flex items-center justify-center font-normal text-lg shadow-sm group-hover:scale-110 transition-transform font-outfit">
                          {u.full_name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="font-normal text-gray-900 group-hover:text-primary-600 transition-colors uppercase tracking-tight text-sm leading-tight font-outfit">
                            {u.full_name}
                          </p>
                          <p className="text-[10px] font-normal text-gray-400 uppercase tracking-widest mt-1 font-outfit">
                            {u.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-[9px] font-normal uppercase tracking-widest border font-outfit ${
                          u.user_type === 'internal'
                            ? 'bg-indigo-50 text-indigo-600 border-indigo-100'
                            : 'bg-amber-50 text-amber-600 border-amber-100'
                        }`}
                      >
                        {u.user_type}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 text-sm font-normal text-gray-900 uppercase tracking-tight font-outfit">
                        <Shield className="w-3.5 h-3.5 text-primary-400" />
                        {u.role.replace('_', ' ')}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="text-sm font-normal text-gray-900 uppercase tracking-tight font-outfit">
                        {u.Client?.name || (u.user_type === 'internal' ? 'Internal Team' : '---')}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span
                        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-normal uppercase tracking-widest border ${
                          u.status === 'active'
                            ? 'bg-green-50 text-green-600 border-green-100'
                            : u.status === 'inactive'
                              ? 'bg-gray-100 text-gray-600 border-gray-200'
                              : 'bg-amber-50 text-amber-600 border-amber-100'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            u.status === 'active'
                              ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]'
                              : u.status === 'inactive'
                                ? 'bg-gray-400'
                                : 'bg-amber-500 animate-pulse'
                          }`}
                        />
                        {u.status === 'inactive' ? 'deactive' : u.status}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      {u.status === 'invited' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => handleResendInvite(e, u.id)}
                          disabled={actionLoading === u.id}
                          className="text-primary-600 border-primary-100 hover:bg-primary-50 px-3 py-1.5 rounded-lg transition-all font-normal uppercase tracking-widest text-[9px]"
                        >
                          {actionLoading === u.id ? <LoadingState mini /> : 'Resend Invite'}
                        </Button>
                      )}
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
              <LoadingState message="Retrieving User Access..." />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="px-8 py-20 text-center text-gray-400 font-normal uppercase tracking-widest text-[10px]">
              No users found matching your search.
            </div>
          ) : (
            filteredUsers.map((u) => (
              <div
                key={u.id}
                {...clickable(() => navigate(`/users/${u.id}`))}
                className="p-5 active:bg-gray-50 transition-all cursor-pointer space-y-4"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="w-12 h-12 rounded-2xl bg-primary-100 text-primary-700 flex flex-shrink-0 items-center justify-center font-normal text-lg shadow-sm font-outfit">
                      {u.full_name?.charAt(0) || 'U'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-normal text-gray-900 uppercase tracking-tight text-sm leading-tight font-outfit truncate">
                        {u.full_name}
                      </p>
                      <p className="text-[10px] font-normal text-gray-400 uppercase tracking-widest mt-1 font-outfit truncate">
                        {u.email}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`flex-shrink-0 inline-flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-normal uppercase tracking-widest border ${
                      u.status === 'active'
                        ? 'bg-green-50 text-green-600 border-green-100'
                        : u.status === 'inactive'
                          ? 'bg-gray-100 text-gray-600 border-gray-200'
                          : 'bg-amber-50 text-amber-600 border-amber-100'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        u.status === 'active'
                          ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]'
                          : u.status === 'inactive'
                            ? 'bg-gray-400'
                            : 'bg-amber-500 animate-pulse'
                      }`}
                    />
                    {u.status === 'inactive' ? 'deactive' : u.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 pt-1 text-xs">
                  <div>
                    <span className="text-[10px] font-normal text-gray-400 uppercase tracking-widest block mb-0.5">
                      Identity Type
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-normal uppercase tracking-widest border font-outfit ${
                        u.user_type === 'internal'
                          ? 'bg-indigo-50 text-indigo-600 border-indigo-100'
                          : 'bg-amber-50 text-amber-600 border-amber-100'
                      }`}
                    >
                      {u.user_type}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-normal text-gray-400 uppercase tracking-widest block mb-0.5">
                      Role
                    </span>
                    <span className="flex items-center gap-1 font-normal text-gray-900 uppercase tracking-tight font-outfit">
                      <Shield className="w-3.5 h-3.5 text-primary-400" />
                      {u.role.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] font-normal text-gray-400 uppercase tracking-widest block mb-0.5">
                      Client
                    </span>
                    <span className="font-normal text-gray-900 uppercase tracking-tight font-outfit">
                      {u.Client?.name || (u.user_type === 'internal' ? 'Internal Team' : '---')}
                    </span>
                  </div>
                </div>

                {u.status === 'invited' && (
                  <div className="pt-3 border-t border-gray-50 flex justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => handleResendInvite(e, u.id)}
                      disabled={actionLoading === u.id}
                      className="text-primary-600 border-primary-100 hover:bg-primary-50 px-4 py-2 rounded-lg transition-all font-normal uppercase tracking-widest text-[9px]"
                    >
                      {actionLoading === u.id ? <LoadingState mini /> : 'Resend Invite'}
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Invite Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/80 backdrop-blur-md p-4">
          <Card className="w-full max-w-md border-none shadow-3xl animate-in zoom-in-95 duration-200 bg-white rounded-2xl flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/30 rounded-t-2xl shrink-0">
              <h2 className="text-xl font-normal uppercase tracking-tight flex items-center gap-2 text-gray-900 font-outfit">
                <UserPlus className="text-primary-600" size={24} /> Invite New User
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-900 p-1 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto flex-1">
              <div className="space-y-1.5">
                <label
                  htmlFor="users-2001"
                  className="text-[10px] font-normal text-gray-400 uppercase tracking-widest"
                >
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-3.5 w-4 h-4 text-gray-400" />
                  <Input
                    id="users-2001"
                    placeholder="John Doe"
                    className="pl-12 py-3 border-gray-100 bg-gray-50 font-normal"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="users-2002"
                  className="text-[10px] font-normal text-gray-400 uppercase tracking-widest"
                >
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-3.5 w-4 h-4 text-gray-400" />
                  <Input
                    id="users-2002"
                    type="email"
                    placeholder="john@example.com"
                    className="pl-12 py-3 border-gray-100 bg-gray-50 font-normal"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="users-5001"
                    className="text-[10px] font-normal text-gray-400 uppercase tracking-widest"
                  >
                    User Type
                  </label>
                  {hasRole(user?.role, ROLE_GROUPS.ADMINS) ? (
                    <select
                      id="users-5001"
                      className="w-full rounded-xl border border-gray-100 bg-gray-50 p-3 text-sm font-normal text-gray-900 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all"
                      value={formData.user_type}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          user_type: e.target.value,
                          role: e.target.value === 'internal' ? 'operator' : 'client_admin',
                        })
                      }
                    >
                      <option value="client">Client User</option>
                      <option value="internal">Internal Team</option>
                    </select>
                  ) : (
                    <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm text-gray-900 font-normal">
                      Client User
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="users-1"
                    className="text-[10px] font-normal text-gray-400 uppercase tracking-widest"
                  >
                    Role
                  </label>
                  <select
                    id="users-1"
                    className="w-full rounded-xl border border-gray-100 bg-gray-50 p-3 text-sm font-normal text-gray-900 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  >
                    {formData.user_type === 'internal' ? (
                      <>
                        <option value="super_admin">Super Admin</option>
                        <option value="admin">Admin</option>
                        <option value="operator">Operator</option>
                        <option value="analyst">Analyst</option>
                      </>
                    ) : (
                      <>
                        <option value="client_admin">Client Admin</option>
                        <option value="client_marketing">Marketing</option>
                        <option value="client_viewer">Viewer</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {hasRole(user?.role, ROLE_GROUPS.ADMINS) && formData.user_type === 'client' && (
                <div className="space-y-1.5 p-4 bg-primary-50 rounded-2xl border border-primary-100">
                  <label
                    htmlFor="users-5002"
                    className="text-[10px] font-normal text-primary-600 uppercase tracking-widest flex items-center gap-2"
                  >
                    <Building2 size={14} /> Client Assignment
                  </label>

                  {!isNewClient ? (
                    <div className="flex gap-2 mt-2">
                      <select
                        id="users-5002"
                        className="flex-1 rounded-xl border border-gray-100 bg-white p-3 text-sm font-normal text-gray-900 outline-none shadow-sm uppercase tracking-tight font-outfit"
                        value={formData.client_id}
                        onChange={(e) => {
                          if (e.target.value === 'new') {
                            setIsNewClient(true);
                            setFormData({ ...formData, client_id: '' });
                          } else {
                            setFormData({ ...formData, client_id: e.target.value });
                          }
                        }}
                      >
                        <option value="">Select Existing Client</option>
                        {clients.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                        <option value="new">-- Enter New Tenant ID --</option>
                      </select>
                    </div>
                  ) : (
                    <div className="flex gap-2 mt-2 flex-col">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter new Tenant UUID"
                          className="flex-1 bg-white font-mono text-xs"
                          value={formData.client_id}
                          onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={generateUUID}
                          className="h-[46px] w-[46px] p-0 border border-primary-100 bg-white flex shrink-0 items-center justify-center rounded-xl hover:bg-white transition-all shadow-sm"
                          title="Generate Random UUID"
                        >
                          <Wand2 size={18} className="text-primary-600" />
                        </Button>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsNewClient(false);
                          setFormData({ ...formData, client_id: '' });
                        }}
                        className="text-[10px] font-normal text-gray-400 hover:text-gray-900 text-left uppercase tracking-widest transition-colors mt-1 inline-flex w-fit"
                      >
                        ← Back to existing clients
                      </button>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded-xl text-xs font-normal flex items-center gap-2 border border-red-100 uppercase tracking-widest">
                  <AlertCircle className="w-4 h-4" /> {error}
                </div>
              )}

              {success && (
                <div className="p-4 bg-green-50 text-green-600 rounded-xl text-xs font-normal flex items-center gap-2 border border-green-100 uppercase tracking-widest">
                  <CheckCircle2 className="w-4 h-4" /> Invitation sent!
                </div>
              )}

              <div className="flex gap-4 pt-4 border-t border-gray-50">
                <Button
                  type="button"
                  variant="ghost"
                  className="flex-1 font-normal uppercase text-[10px] tracking-widest"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-[2] bg-primary-600 hover:bg-primary-700 shadow-xl shadow-primary-500/30 font-normal uppercase text-[10px] tracking-widest h-11"
                  disabled={inviteLoading}
                >
                  {inviteLoading ? <LoadingState mini /> : 'Send Invitation'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
      {/* Floating Action Button for Mobile */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="sm:hidden fixed bottom-6 right-6 z-50 bg-primary-600 hover:bg-primary-700 text-white rounded-full p-4 shadow-2xl shadow-primary-500/40 flex items-center justify-center transition-transform active:scale-95 border border-primary-500/20"
        aria-label="Invite New User"
      >
        <UserPlus size={24} />
      </button>
    </div>
  );
}
