import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { inviteUser, getClients, getUsers, resendInvite, disableUser } from '../lib/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { UserPlus, Mail, Shield, User as UserIcon, Loader2, CheckCircle2, AlertCircle, Wand2, Search, Filter, X, Building2 } from 'lucide-react';

export default function Users() {
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    role: 'client_admin',
    user_type: 'client',
    client_id: user?.client_id || ''
  });

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersData, clientsData] = await Promise.all([
        getUsers(),
        (user?.role === 'admin' || user?.role === 'super_admin') ? getClients() : Promise.resolve([])
      ]);
      setUsers(usersData);
      setClients(clientsData);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateUUID = () => {
    const uuid = crypto.randomUUID();
    setFormData({ ...formData, client_id: uuid });
  };

  const handleResend = async (id: string) => {
    try {
      await resendInvite(id);
      alert('Invitation resent successfully!');
      fetchData();
    } catch (err: any) {
      alert(`Error: ${err}`);
    }
  };

  const handleDisable = async (id: string) => {
    try {
      await disableUser(id);
      fetchData();
    } catch (err: any) {
      alert(`Error: ${err}`);
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
      fetchData(); // Refresh list
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500">Manage internal team members and client accounts.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
          <UserPlus size={18} /> Invite User
        </Button>
      </div>

      {/* User Table */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-4 bg-gray-50/50">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search users..." 
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>
          <Button variant="outline" className="flex items-center gap-2 text-gray-600 border-gray-200">
            <Filter size={16} /> Filter
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/30">
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">User</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Client ID</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary-500 mb-2" />
                    <p className="text-gray-400 text-sm">Loading users...</p>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm uppercase">
                          {u.full_name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{u.full_name}</p>
                          <p className="text-sm text-gray-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${
                        u.user_type === 'internal' ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'
                      }`}>
                        {u.user_type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-sm text-gray-600">
                        <Shield className="w-3.5 h-3.5 text-gray-400" />
                        {u.role.replace('_', ' ')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-xs text-gray-400 font-mono bg-gray-50 px-1.5 py-0.5 rounded">
                        {u.client_id?.slice(0, 8) || 'N/A'}
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`flex items-center gap-1.5 text-xs font-medium ${
                        u.status === 'active' ? 'text-green-600' : 'text-amber-500'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          u.status === 'active' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-amber-500 animate-pulse'
                        }`} />
                        {u.status.charAt(0).toUpperCase() + u.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {u.status === 'invited' && (
                          <Button 
                            variant="outline" 
                            className="text-[10px] h-7 px-2 border-amber-200 text-amber-600 hover:bg-amber-50"
                            onClick={() => handleResend(u.id)}
                          >
                            Resend
                          </Button>
                        )}
                        <Button 
                          variant="outline" 
                          className={`text-[10px] h-7 px-2 ${u.status === 'disabled' ? 'border-green-200 text-green-600 hover:bg-green-50' : 'border-red-200 text-red-600 hover:bg-red-50'}`}
                          onClick={() => handleDisable(u.id)}
                        >
                          {u.status === 'disabled' ? 'Enable' : 'Disable'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Invite Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 rounded-t-xl">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary-600" /> Invite New User
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
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
                  {['super_admin', 'admin'].includes(user?.role || '') ? (
                    <select 
                      className="w-full rounded-lg border border-gray-200 p-2.5 text-sm"
                      value={formData.user_type}
                      onChange={(e) => setFormData({ ...formData, user_type: e.target.value, role: e.target.value === 'internal' ? 'operator' : 'client_admin' })}
                    >
                      <option value="client">Client User</option>
                      <option value="internal">Internal Team</option>
                    </select>
                  ) : (
                    <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 font-medium">
                      Client User
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Role</label>
                  <select 
                    className="w-full rounded-lg border border-gray-200 p-2.5 text-sm"
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

              {['super_admin', 'admin'].includes(user?.role || '') && formData.user_type === 'client' && (
                <div className="space-y-1.5 p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <Building2 size={14} /> Client Assignment
                  </label>
                  <div className="flex gap-2">
                    <select 
                      className="flex-1 rounded-lg border border-gray-200 p-2.5 text-sm"
                      value={formData.client_id}
                      onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                    >
                      <option value="">Select Existing Client</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                      <option value="new">-- New Tenant ID --</option>
                    </select>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={generateUUID}
                      className="h-10 px-3 border-dashed bg-white"
                    >
                      <Wand2 size={16} />
                    </Button>
                  </div>
                  {formData.client_id === 'new' && (
                    <Input
                      placeholder="Enter new Tenant UUID"
                      className="mt-2 bg-white"
                      value={formData.client_id}
                      onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                    />
                  )}
                </div>
              )}

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
                <Button type="button" variant="outline" className="flex-1" onClick={() => setIsModalOpen(false)}>
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
