import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  User as UserIcon, 
  ArrowLeft, 
  Mail, 
  Shield, 
  Calendar,
  Building2,
  RefreshCw,
  AlertCircle,
  Clock,
  Fingerprint,
  UserCheck,
  UserX,
  History,
  Activity,
  Trash2,
  Loader2,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as api from '../lib/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { LoadingState } from '../components/ui/LoadingState';

interface UserDetailData {
  id: string;
  full_name: string;
  email: string;
  role: string;
  status: string;
  user_type: string;
  client_id: string;
  created_at: string;
  last_login_at: string | null;
  Client?: {
    id: string;
    name: string;
  };
}

import { useAuth } from '../contexts/AuthContext';

export default function UserDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [userData, setUserData] = useState<UserDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      if (!id) return;
      try {
        const data = await api.getUserById(id);
        setUserData(data);
      } catch (err) {
        console.error('Failed to fetch user intelligence', err);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [id]);
  
  const fetchUser = async () => {
    if (!id) return;
    try {
      const data = await api.getUserById(id);
      setUserData(data);
    } catch (err) {
      console.error('Failed to fetch user intelligence', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!id || !userData) return;
    setActionLoading(true);
    try {
      await api.disableUser(id);
      await fetchUser();
    } catch (err: any) {
      alert(err || 'Failed to update user status.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResendInvite = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      await api.resendInvite(id);
      alert('Invitation resent successfully!');
    } catch (err: any) {
      alert(err || 'Failed to resend invitation.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!id || !userData) return;
    if (!window.confirm(`Are you sure you want to delete?`)) return;
    
    setActionLoading(true);
    try {
      await api.deleteUser(id);
      navigate('/users');
    } catch (err: any) {
      alert(err || 'Failed to delete user.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-20">
        <LoadingState message="Retrieving User Intelligence..." />
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="p-20 text-center">
        <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-normal text-gray-900 font-outfit uppercase tracking-tight">User Identity Not Found</h2>
        <Link to="/users" className="text-primary-600 font-normal mt-4 inline-block uppercase tracking-widest text-xs">Back to Directory</Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-20 animate-[fadeIn_0.3s_ease]">
      {/* Header with responsive stacking */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-4">
          <Link to="/users" className="inline-flex items-center text-[10px] font-normal text-gray-400 hover:text-primary-600 transition-colors group tracking-widest uppercase">
            <ArrowLeft size={14} className="mr-1 group-hover:-translate-x-1 transition-transform" /> BACK TO DIRECTORY
          </Link>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-primary-100 text-primary-700 shadow-xl border border-primary-50 flex items-center justify-center font-normal text-2xl font-outfit uppercase shrink-0">
              {userData.full_name?.charAt(0) || 'U'}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-normal text-gray-900 font-outfit uppercase tracking-tight leading-tight">{userData.full_name}</h1>
                <span className={`px-2 py-0.5 rounded text-[10px] font-normal uppercase tracking-widest border ${
                  userData.status === 'active' ? 'bg-green-50 text-green-600 border-green-100' : 
                  userData.status === 'inactive' ? 'bg-gray-100 text-gray-600 border-gray-200' :
                  'bg-amber-50 text-amber-600 border-amber-100'
                }`}>
                  {userData.status === 'inactive' ? 'deactive' : userData.status}
                </span>
              </div>
            </div>
          </div>
        </div>
 
         {['super_admin', 'admin', 'client_admin'].includes(currentUser?.role || '') && (
           <div className="flex flex-wrap gap-6 items-center">
            {!['invited', 'deleted'].includes(userData.status) && (
              <Button 
                variant="outline"
                onClick={handleDeleteUser}
                disabled={actionLoading}
                className="flex items-center gap-2 border-red-100 text-red-600 hover:bg-red-50 px-4 py-2 rounded-xl transition-all font-normal uppercase tracking-widest text-[10px] font-outfit h-[40px]"
              >
                 <Trash2 size={16} />
                 Delete User
              </Button>
            )}

            {userData.status === 'invited' ? (
              <Button 
                variant="outline" 
                onClick={handleResendInvite}
                disabled={actionLoading}
                className="flex items-center gap-2"
              >
                {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw size={16} />}
                Resend Invite
              </Button>
            ) : (
              <div className="flex flex-col items-start sm:items-end gap-2 sm:pl-6 sm:border-l border-gray-100">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-normal text-gray-500 uppercase tracking-widest">Account Status</span>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={handleToggleStatus}
                      disabled={actionLoading}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${userData.status === 'active' ? 'bg-primary-600' : 'bg-gray-200'}`}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${userData.status === 'active' ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${userData.status === 'active' ? 'text-primary-600' : 'text-gray-400'}`}>
                      {userData.status === 'active' ? 'ON' : 'OFF'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 1. Profile Intelligence Table */}
      <Card className="border-none shadow-2xl overflow-hidden bg-white">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <h2 className="text-xs font-normal text-gray-900 uppercase tracking-widest flex items-center gap-2 font-outfit">
            <UserIcon size={16} className="text-primary-600" /> Core User Intelligence
          </h2>
          <div className={`text-[10px] font-normal px-3 py-1 rounded-full uppercase tracking-widest border ${
            userData.user_type === 'internal' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-amber-50 text-amber-600 border-amber-100'
          }`}>
            {userData.user_type} IDENTITY
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <tbody className="divide-y divide-gray-50">
              <tr>
                <td className="px-8 py-5 w-64 bg-gray-50/30 text-[10px] font-normal text-gray-400 uppercase tracking-widest border-r border-gray-50">Full Name</td>
                <td className="px-8 py-5 text-sm font-normal text-gray-900 uppercase tracking-tight font-outfit">{userData.full_name}</td>
              </tr>
              <tr>
                <td className="px-8 py-5 bg-gray-50/30 text-[10px] font-normal text-gray-400 uppercase tracking-widest border-r border-gray-50">Email Address</td>
                <td className="px-8 py-5">
                  <div className="text-primary-600 font-normal text-sm flex items-center gap-2">
                    <Mail size={14} /> {userData.email}
                  </div>
                </td>
              </tr>
              <tr>
                <td className="px-8 py-5 bg-gray-50/30 text-[10px] font-normal text-gray-400 uppercase tracking-widest border-r border-gray-50">System Identity Type</td>
                <td className="px-8 py-5">
                  <span className="text-sm font-normal text-gray-900 uppercase tracking-widest">{userData.user_type}</span>
                </td>
              </tr>
              <tr>
                <td className="px-8 py-5 bg-gray-50/30 text-[10px] font-normal text-gray-400 uppercase tracking-widest border-r border-gray-50">Assigned Client</td>
                <td className="px-8 py-5 text-sm font-normal text-gray-900 uppercase tracking-tight flex items-center gap-2 font-outfit">
                  <Building2 size={14} className="text-gray-400" />
                  {userData.Client?.name || 'Internal - All Access'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* 2. Security & Access Parameters */}
      <Card className="border-none shadow-2xl overflow-hidden bg-white">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-xs font-normal text-gray-900 uppercase tracking-widest flex items-center gap-2 font-outfit">
            <Fingerprint size={16} className="text-primary-600" /> Security & Access Control
          </h3>
        </div>
        <table className="w-full text-left">
          <tbody className="divide-y divide-gray-50">
            <tr>
              <td className="px-8 py-5 w-64 bg-gray-50/30 text-[10px] font-normal text-gray-400 uppercase tracking-widest border-r border-gray-50">Authorization Level</td>
              <td className="px-8 py-5">
                <div className="flex items-center gap-2">
                   <Shield size={14} className="text-amber-500" />
                   <span className="text-sm font-normal text-gray-900 uppercase tracking-widest">{userData.role.replace('_', ' ')}</span>
                </div>
              </td>
            </tr>
            <tr>
              <td className="px-8 py-5 bg-gray-50/30 text-[10px] font-normal text-gray-400 uppercase tracking-widest border-r border-gray-50">Identity Status</td>
              <td className="px-8 py-5">
                <div className="flex items-center gap-2">
                  {userData.status === 'active' ? <UserCheck className="text-green-500" size={16} /> : 
                   userData.status === 'inactive' ? <AlertCircle className="text-gray-400" size={16} /> :
                   <UserX className="text-amber-500" size={16} />}
                  <span className={`text-sm font-normal uppercase tracking-widest ${
                    userData.status === 'active' ? 'text-green-600' : 
                    userData.status === 'inactive' ? 'text-gray-600' :
                    'text-amber-600'
                  }`}>
                    {userData.status === 'inactive' ? 'deactive' : userData.status}
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </Card>

      {/* 3. Activity Tracking */}
      <Card className="border-none shadow-2xl overflow-hidden bg-white">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <h2 className="text-xs font-normal text-gray-900 uppercase tracking-widest flex items-center gap-2 font-outfit">
            <Activity size={16} className="text-primary-600" /> Activity Intelligence
          </h2>
        </div>
        <table className="w-full text-left">
          <tbody className="divide-y divide-gray-50">
            <tr>
              <td className="px-8 py-5 w-64 bg-gray-50/30 text-[10px] font-normal text-gray-400 uppercase tracking-widest border-r border-gray-50">Intelligence Creation</td>
              <td className="px-8 py-5 text-sm font-normal text-gray-900">
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-gray-400" />
                  {userData.created_at || (userData as any).createdAt ? new Date(userData.created_at || (userData as any).createdAt).toLocaleDateString(undefined, { dateStyle: 'full' }) : '---'}
                </div>
              </td>
            </tr>
            <tr>
              <td className="px-8 py-5 bg-gray-50/30 text-[10px] font-normal text-gray-400 uppercase tracking-widest border-r border-gray-50">Last Active Presence</td>
              <td className="px-8 py-5 text-sm font-normal text-gray-900">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-gray-400" />
                  {userData.last_login_at 
                    ? new Date(userData.last_login_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
                    : 'No Activity Registered'}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </Card>
    </div>
  );
}
